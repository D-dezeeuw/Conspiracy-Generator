// UI wiring for The Correlation Engine, built on Spektrum's declarative
// bindings. No build step: this loads as a plain ES module, importing the
// engine from CDN via the importmap in index.html. State drives the DOM;
// the markup in index.html holds every binding.

import { setValue, computed, addSystem, defineFn, bindDOM, run } from "spektrum";
import { SUBJECTS, CATEGORIES } from "./data.js";
import { buildWorkFile, matchCategory, generateNarrative, deconstruct, getCategory } from "./engine.js";
import { toParagraphs } from "./format.js";

const DEFAULTS = { baseUrl: "https://openrouter.ai/api/v1", model: "tencent/hy3-preview" };

// --- Initial state --------------------------------------------------------
let storedBase = DEFAULTS.baseUrl;
let storedModel = DEFAULTS.model;
try {
  storedBase = sessionStorage.getItem("ce_baseUrl") || DEFAULTS.baseUrl;
  storedModel = sessionStorage.getItem("ce_model") || DEFAULTS.model;
} catch { /* sessionStorage unavailable; fall back to defaults */ }

// The curated subject options are static, so build them imperatively. (A
// data-each on <select> can't bind :value on the <option> root — Spektrum
// only binds clone descendants — and <select> permits no wrapper element.)
const subjectSelect = document.getElementById("subject");
for (const s of SUBJECTS) {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = `${s.name} (d. ${s.died})`;
  subjectSelect.append(opt);
}

setValue("subjectId", SUBJECTS[0].id);
setValue("baseUrl", storedBase);
setValue("model", storedModel);
setValue("apiKey", ""); // memory only — never persisted

setValue("status", "Pick a subject and run the engine.");
setValue("busy", false);
setValue("statusError", false);

setValue("correlations", []);
setValue("sourceUrl", "");
setValue("hasMatch", false);
setValue("matchName", "");
setValue("matchFallacy", "");
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

// --- The flow -------------------------------------------------------------
function resetOutput() {
  setValue("correlations", []);
  setValue("hasMatch", false);
  setValue("hasArticle", false);
  setValue("bodyParas", []);
  setValue("claims", []);
  setValue("hasReveal", false);
  setValue("moves", []);
}

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

    const provider = {
      baseUrl: (state.baseUrl || "").trim(),
      model: (state.model || "").trim(),
      apiKey: state.apiKey,
    };

    setValue("statusError", false);
    setValue("busy", true);
    resetOutput();

    try {
      setValue("status", "Fetching the real Wikipedia data sheet…");
      const workFile = await buildWorkFile(subject);

      setValue("status", "Matching a conspiracy archetype to the facts…");
      workFile.match = await matchCategory(provider, workFile, CATEGORIES);
      const category = getCategory(CATEGORIES, workFile.match.categoryId) || CATEGORIES[0];

      setValue("correlations", workFile.correlations);
      setValue("sourceUrl", workFile.dataSheet.url);
      setValue("matchName", category.name);
      setValue("matchFallacy", category.fallacy_illustrated);
      setValue("matchReason", workFile.match.reasoning);
      setValue("hasMatch", true);

      setValue("status", "Generating the (deliberately fallacious) article…");
      const narrative = await generateNarrative(provider, workFile, category);
      setValue("articleHeadline", narrative.headline);
      setValue("articleSubhead", narrative.subhead);
      setValue("bodyParas", toParagraphs(narrative.body));
      setValue("claims", narrative.claims);
      setValue("hasArticle", true);

      setValue("status", "Deconstructing the trick…");
      const reveal = await deconstruct(provider, narrative, workFile);
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
  { description: "Run the full pipeline: data sheet → match → article → reveal." },
);

// --- Boot -----------------------------------------------------------------
bindDOM();
run();
