import "./style.css";
import subjectsData from "../data/subjects.json";
import type {
  Deconstruction,
  Narrative,
  Provider,
  Subject,
  WorkFile,
} from "./types";
import {
  buildWorkFile,
  categories,
  deconstruct,
  generateNarrative,
  getCategory,
  matchCategory,
} from "./engine";
import { escapeHtml, paragraphsToHtml } from "./format";

const subjects = subjectsData as Subject[];

const DEFAULTS = {
  baseUrl: "https://openrouter.ai/api/v1",
  model: "tencent/hy3-preview",
};

// API key lives in memory only — never persisted, never logged.
let apiKey = "";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="masthead">
    <div class="kicker">A Media-Literacy Demonstration</div>
    <h1>The Correlation Engine</h1>
    <p class="dek">How true facts are arranged into a false story of hidden causation — and how to spot the trick.</p>
  </header>

  <div class="banner">
    <strong>⚠ This is a demonstration.</strong> Every article below is <strong>deliberately fallacious</strong>.
    It takes real, sourced facts about a long-deceased figure and amplifies the <em>interpretation</em> to fake a
    chain of causation. Nothing it prints is a factual claim. The reveal panel names exactly how it cheats.
  </div>

  <section class="card">
    <h2>1 · Provider (bring your own key)</h2>
    <div class="field">
      <label for="baseUrl">Base URL</label>
      <input id="baseUrl" type="text" spellcheck="false" />
    </div>
    <div class="field">
      <label for="model">Model</label>
      <input id="model" type="text" spellcheck="false" />
    </div>
    <div class="field">
      <label for="apiKey">API key</label>
      <input id="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-..." />
      <div class="hint">Held in this tab's memory only. Base URL + model are remembered; the key is never stored or logged.</div>
    </div>
  </section>

  <section class="card">
    <h2>2 · Subject (the safety gate)</h2>
    <div class="field">
      <label for="subject">Long-deceased historical figure</label>
      <select id="subject"></select>
      <p class="rationale" id="rationale"></p>
      <div class="hint">No free-text entry by design — the curated list is what keeps this engine off living people.</div>
    </div>
    <button class="primary" id="run">Run the engine</button>
    <div class="status" id="status"></div>
  </section>

  <div id="output"></div>

  <footer>
    The Correlation Engine · correlation ≠ causation · sources are real, the conclusions are not.
  </footer>
`;

const el = {
  baseUrl: app.querySelector<HTMLInputElement>("#baseUrl")!,
  model: app.querySelector<HTMLInputElement>("#model")!,
  apiKey: app.querySelector<HTMLInputElement>("#apiKey")!,
  subject: app.querySelector<HTMLSelectElement>("#subject")!,
  rationale: app.querySelector<HTMLParagraphElement>("#rationale")!,
  run: app.querySelector<HTMLButtonElement>("#run")!,
  status: app.querySelector<HTMLDivElement>("#status")!,
  output: app.querySelector<HTMLDivElement>("#output")!,
};

// --- Restore non-secret provider settings --------------------------------
el.baseUrl.value = sessionStorage.getItem("ce_baseUrl") || DEFAULTS.baseUrl;
el.model.value = sessionStorage.getItem("ce_model") || DEFAULTS.model;
el.baseUrl.addEventListener("change", () =>
  sessionStorage.setItem("ce_baseUrl", el.baseUrl.value.trim()),
);
el.model.addEventListener("change", () =>
  sessionStorage.setItem("ce_model", el.model.value.trim()),
);
el.apiKey.addEventListener("input", () => {
  apiKey = el.apiKey.value;
});

// --- Populate the curated subject picklist -------------------------------
for (const s of subjects) {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = `${s.name} (d. ${s.died})`;
  el.subject.append(opt);
}
function showRationale() {
  const s = subjects.find((x) => x.id === el.subject.value);
  el.rationale.textContent = s?.rationale ? `“${s.rationale}”` : "";
}
el.subject.addEventListener("change", showRationale);
showRationale();

// --- Status helpers -------------------------------------------------------
function setStatus(msg: string, opts: { error?: boolean; busy?: boolean } = {}) {
  el.status.textContent = msg;
  el.status.className =
    "status" + (opts.error ? " error" : "") + (opts.busy ? " spinner" : "");
}

function provider(): Provider {
  return { baseUrl: el.baseUrl.value.trim(), model: el.model.value.trim(), apiKey };
}

// --- Main flow ------------------------------------------------------------
el.run.addEventListener("click", () => void run());

async function run() {
  const subject = subjects.find((x) => x.id === el.subject.value);
  if (!subject) return;
  if (!apiKey.trim()) {
    setStatus("Enter your API key first.", { error: true });
    return;
  }

  el.run.disabled = true;
  el.output.innerHTML = "";
  try {
    setStatus("Fetching the real Wikipedia data sheet…", { busy: true });
    const workFile = await buildWorkFile(subject);

    setStatus("Matching a conspiracy archetype to the facts…", { busy: true });
    workFile.match = await matchCategory(provider(), workFile);
    const category = getCategory(workFile.match.categoryId) ?? categories[0];

    renderWorkFile(workFile);

    setStatus("Generating the (deliberately fallacious) article…", { busy: true });
    const narrative = await generateNarrative(provider(), workFile, category);
    renderArticle(narrative, workFile);

    setStatus("Deconstructing the trick…", { busy: true });
    const reveal = await deconstruct(provider(), narrative, workFile);
    renderReveal(reveal);

    setStatus("Done. Scroll down — then read the reveal.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Something went wrong.", {
      error: true,
    });
  } finally {
    el.run.disabled = false;
  }
}

// --- Renderers ------------------------------------------------------------
function append(html: string) {
  const section = document.createElement("div");
  section.innerHTML = html;
  el.output.append(section);
}

function renderWorkFile(wf: WorkFile) {
  const category = wf.match ? getCategory(wf.match.categoryId) : undefined;
  const cors = wf.correlations.length
    ? wf.correlations
        .map(
          (c) =>
            `<li>${escapeHtml(c.fact)}<span class="src"><a href="${escapeHtml(
              c.url,
            )}" target="_blank" rel="noopener">${escapeHtml(c.source)} ↗</a></span></li>`,
        )
        .join("")
    : "<li>No notable associations were extracted; only the summary extract was used.</li>";

  append(`
    <section class="card exhibit">
      <h2>Exhibit · The work-file (real, sourced facts)</h2>
      ${
        category
          ? `<p class="match-note">Matched archetype: <span class="cat">${escapeHtml(
              category.name,
            )}</span> — <em>${escapeHtml(
              category.fallacy_illustrated,
            )}</em><br>Why: ${escapeHtml(wf.match!.reasoning)}</p>`
          : ""
      }
      <ul>${cors}</ul>
    </section>
  `);
}

function renderArticle(n: Narrative, wf: WorkFile) {
  const claims = n.claims.length
    ? `<section class="card"><h2>Claims, traced to their facts</h2>${n.claims
        .map(
          (c) =>
            `<div class="claim">${escapeHtml(c.text)}<span class="based">↳ based on: ${escapeHtml(
              c.basedOn,
            )}</span></div>`,
        )
        .join("")}</section>`
    : "";

  append(`
    <article class="article">
      <span class="label">Deliberately Fallacious · Demonstration</span>
      <h2 class="headline">${escapeHtml(n.headline)}</h2>
      ${n.subhead ? `<p class="subhead">${escapeHtml(n.subhead)}</p>` : ""}
      <div class="body">${paragraphsToHtml(n.body)}</div>
      <p class="match-note">Source of every underlying fact: <a href="${escapeHtml(
        wf.dataSheet.url,
      )}" target="_blank" rel="noopener">Wikipedia ↗</a></p>
    </article>
    ${claims}
  `);
}

function renderReveal(d: Deconstruction) {
  const moves = d.moves
    .map(
      (m) =>
        `<div class="move"><span class="name">${escapeHtml(
          m.move,
        )}</span><span class="fallacy">Fallacy: ${escapeHtml(m.fallacy)}</span></div>`,
    )
    .join("");
  append(`
    <section class="card reveal">
      <h2>The reveal · How the trick was done</h2>
      <p class="summary">${escapeHtml(d.summary)}</p>
      ${moves || "<p>No specific moves were returned.</p>"}
    </section>
  `);
}
