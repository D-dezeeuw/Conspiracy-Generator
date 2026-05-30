// UI wiring for The Correlation Engine, built on Spektrum's declarative
// bindings. No build step: this loads as a plain ES module, importing the
// engine from CDN via the importmap in index.html. State drives the DOM;
// the markup in index.html holds every binding.

import { setValue, computed, addSystem, defineFn, bindDOM, run } from "spektrum";
import { SUBJECTS, CATEGORIES } from "./data.js";
import { buildWorkFile, matchCategory, generateNarrative, deconstruct, getCategory } from "./engine.js";
import { toParagraphs } from "./format.js";

const DEFAULTS = { baseUrl: "https://openrouter.ai/api/v1", model: "tencent/hy3-preview" };

// The work-file from phase 1 (run) is held here so phase 2 (continue) can
// generate from it with whatever category the user settled on.
let currentWorkFile = null;

// --- Initial state --------------------------------------------------------
let storedBase = DEFAULTS.baseUrl;
let storedModel = DEFAULTS.model;
try {
  storedBase = sessionStorage.getItem("ce_baseUrl") || DEFAULTS.baseUrl;
  storedModel = sessionStorage.getItem("ce_model") || DEFAULTS.model;
} catch { /* sessionStorage unavailable; fall back to defaults */ }

// The curated option lists are static, so build them imperatively. (A
// data-each on <select> can't bind :value on the <option> root — Spektrum
// only binds clone descendants — and <select> permits no wrapper element.)
function fillSelect(id, items, label) {
  const sel = document.getElementById(id);
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = label(it);
    sel.append(opt);
  }
}
fillSelect("subject", SUBJECTS, (s) => `${s.name} (d. ${s.died})`);
fillSelect("category", CATEGORIES, (c) => c.name);

setValue("subjectId", SUBJECTS[0].id);
setValue("categoryId", CATEGORIES[0].id); // overwritten with the best match after run
setValue("baseUrl", storedBase);
setValue("model", storedModel);
setValue("apiKey", ""); // memory only — never persisted

setValue("status", "Pick a subject and run the engine.");
setValue("busy", false);
setValue("statusError", false);

setValue("correlations", []);
setValue("sourceUrl", "");
setValue("hasMatch", false);
setValue("hasCategoryChoice", false);
setValue("matchName", "");
setValue("matchReason", "");
setValue("hasArticle", false);
setValue("articleHeadline", "");
setValue("articleSubhead", "");
setValue("bodyParas", []);
setValue("claims", []);
setValue("hasReveal", false);
setValue("revealSummary", "");
setValue("moves", []);

// --- Derived + side effects ----------------------------------------------
computed("rationale", ["subjectId"], (s) => {
  const sub = SUBJECTS.find((x) => x.id === s.subjectId);
  return sub?.rationale ? `“${sub.rationale}”` : "";
});

// The currently selected category (defaults to the best match, but the user
// can change the dropdown before continuing). Drives the choice panel.
computed("selCatName", ["categoryId"], (s) => getCategory(CATEGORIES, s.categoryId)?.name || "");
computed("selCatDescription", ["categoryId"], (s) => getCategory(CATEGORIES, s.categoryId)?.description || "");
computed("selCatFallacy", ["categoryId"], (s) => getCategory(CATEGORIES, s.categoryId)?.fallacy_illustrated || "");
computed("isRecommended", ["categoryId", "recommendedId"], (s) => s.categoryId === s.recommendedId);
setValue("recommendedId", "");

computed("statusClass", ["statusError", "busy"], (s) =>
  "status" + (s.statusError ? " error" : "") + (s.busy ? " spinner" : ""),
);

// Persist only the non-secret provider settings.
addSystem(["baseUrl", "model"], (s) => {
  try {
    sessionStorage.setItem("ce_baseUrl", s.baseUrl ?? "");
    sessionStorage.setItem("ce_model", s.model ?? "");
  } catch { /* ignore */ }
});

// --- Helpers --------------------------------------------------------------
function providerFrom(state) {
  return {
    baseUrl: (state.baseUrl || "").trim(),
    model: (state.model || "").trim(),
    apiKey: state.apiKey,
  };
}

function clearGenerated() {
  setValue("hasArticle", false);
  setValue("bodyParas", []);
  setValue("claims", []);
  setValue("hasReveal", false);
  setValue("moves", []);
}

// --- Phase 1: gather facts and recommend a category -----------------------
defineFn(
  "runEngine",
  async (_el, state) => {
    const subject = SUBJECTS.find((x) => x.id === state.subjectId);
    if (!subject) return;
    if (!state.apiKey || !state.apiKey.trim()) {
      setValue("statusError", true);
      setValue("status", "Enter your API key first.");
      return;
    }

    const provider = providerFrom(state);
    currentWorkFile = null;
    setValue("statusError", false);
    setValue("busy", true);
    setValue("correlations", []);
    setValue("hasMatch", false);
    setValue("hasCategoryChoice", false);
    clearGenerated();

    try {
      setValue("status", "Fetching the real Wikipedia data sheet…");
      const workFile = await buildWorkFile(subject);

      setValue("status", "Matching a conspiracy archetype to the facts…");
      workFile.match = await matchCategory(provider, workFile, CATEGORIES);
      const recommended = getCategory(CATEGORIES, workFile.match.categoryId) || CATEGORIES[0];
      currentWorkFile = workFile;

      setValue("correlations", workFile.correlations);
      setValue("sourceUrl", workFile.dataSheet.url);
      setValue("hasMatch", true);

      // Recommend, but let the user decide before continuing.
      setValue("matchName", recommended.name);
      setValue("matchReason", workFile.match.reasoning);
      setValue("recommendedId", recommended.id);
      setValue("categoryId", recommended.id); // preselect the dropdown
      setValue("hasCategoryChoice", true);

      setValue("status", "Review the recommended pattern, adjust if you like, then continue.");
    } catch (err) {
      setValue("statusError", true);
      setValue("status", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setValue("busy", false);
    }
  },
  { description: "Phase 1: fetch the data sheet, build correlations, recommend a category." },
);

// --- Phase 2: generate the article + reveal for the chosen category -------
defineFn(
  "continueEngine",
  async (_el, state) => {
    if (!currentWorkFile) return;
    if (!state.apiKey || !state.apiKey.trim()) {
      setValue("statusError", true);
      setValue("status", "Enter your API key first.");
      return;
    }

    const provider = providerFrom(state);
    const category = getCategory(CATEGORIES, state.categoryId) || CATEGORIES[0];
    currentWorkFile.match = { categoryId: category.id, reasoning: state.matchReason || "" };

    setValue("statusError", false);
    setValue("busy", true);
    clearGenerated();

    try {
      setValue("status", `Generating the (deliberately fallacious) article as “${category.name}”…`);
      const narrative = await generateNarrative(provider, currentWorkFile, category);
      setValue("articleHeadline", narrative.headline);
      setValue("articleSubhead", narrative.subhead);
      setValue("bodyParas", toParagraphs(narrative.body));
      setValue("claims", narrative.claims);
      setValue("hasArticle", true);

      setValue("status", "Deconstructing the trick…");
      const reveal = await deconstruct(provider, narrative, currentWorkFile);
      setValue("revealSummary", reveal.summary);
      setValue("moves", reveal.moves);
      setValue("hasReveal", true);

      setValue("status", "Done. Read the article — then open the reveal.");
    } catch (err) {
      setValue("statusError", true);
      setValue("status", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setValue("busy", false);
    }
  },
  { description: "Phase 2: generate the article + deconstruction for the chosen category." },
);

// --- Boot -----------------------------------------------------------------
bindDOM();
run();
