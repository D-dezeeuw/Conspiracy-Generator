# The Correlation Engine

An educational tool that demonstrates why **correlation is not causation**. It builds a
convincing, fully-sourced conspiracy narrative from real facts about a long-deceased historical
figure — then deconstructs exactly how the trick was done, naming each rhetorical move and the
logical fallacy it relies on.

> ⚠️ **This is a media-literacy demonstration.** Every article it produces is *deliberately
> fallacious*. It exists to show how easily real, true facts can be arranged into a false story of
> hidden causation. Nothing it outputs should be taken as a factual claim.

## No build step, no dependencies

This is a plain static site — open `index.html` and it runs. There is **nothing to install or
build**:

- ES modules loaded directly by the browser.
- The UI is wired with [**Spektrum**](https://www.npmjs.com/package/spektrum), a tiny zero-dependency
  reactive engine with declarative HTML bindings, pulled from a CDN via an import map.
- TypeScript editor support comes from a vendored `spektrum.d.ts` + `jsconfig.json` — used for
  authoring only, never at runtime.

Because it's just static files, **serving it from a branch is enough** — no GitHub Actions, no
bundler.

## How it works

1. **Pick a subject** from a curated dropdown of long-deceased figures. There is no free-text name
   entry — the list *is* the safety gate, so the engine can never be pointed at a living person.
2. The app gathers **real material from several keyless public sources, concurrently**: the
   Wikipedia REST summary (the bio), Wikipedia **related pages** (adjacent topics), and **Wikinews**
   coverage. Each source is best-effort — if one is unavailable the run continues on the rest.
3. It assembles a **work-file** of real, sourced correlations — every one links back to its own
   checkable source URL (Wikipedia, Wikipedia-related, or Wikinews).
4. An LLM picks the best-fit **conspiracy pattern** from a hand-authored dataset of archetypes, then
   pauses so you can confirm or change the pattern **and choose the report language**.
5. The LLM writes a **sensationalized article** that amplifies the *interpretation* of those facts
   without inventing any new ones, **in your chosen language**. Every claim is tagged with the real
   fact it rests on. Woven through it are **manufactured authority quotes** — real phrases pulled
   *verbatim* from the source and reframed with an ominous gloss (the words are never altered or
   invented; a post-generation guard drops any quote that isn't a literal substring of the source).
   The article ends on an **"it never ended" closer** that insinuates the pattern persists to this
   day without asserting any new fact.
6. A **deconstruction panel** (also in your chosen language) names each persuasive move and the
   fallacy it illustrates — explicitly including the quote-out-of-context and unfalsifiable-
   continuation techniques, so every device the article used is exposed.

> **On the source pool:** the engine only ingests *real, independently published* facts that carry a
> verifiable URL — it deliberately does **not** scrape conspiracy sites, because injecting fabricated
> "facts" would break both the safety model and the entire correlation-vs-causation lesson. The pool
> grows by adding more *trustworthy* sources, not more sensational ones.

## Files

```
index.html      entry point: import map, fonts, and all the Spektrum bindings
app.js          UI state + flow wiring (imports "spektrum" from the CDN)
engine.js       work-file → category match → narrative → deconstruction (language-aware)
wikipedia.js    real source gathering: data sheet + related pages + Wikinews
llm.js          direct browser → provider client + tolerant JSON parse
data.js         curated subjects (the gate) + conspiracy archetypes + report languages
format.js       small pure text helper
style.css       broadsheet styling
spektrum.d.ts   vendored types for editor/jsconfig mapping (authoring only)
tests/          Node built-in test runner specs (no deps)
```

## Develop & test

```bash
npm test          # runs the unit tests with Node's built-in runner (zero deps)
npm start         # serves the folder at http://localhost:8088 (python3 http.server)
# ...or any static server, e.g.  npx serve .
```

## Deploy (static, from a branch)

In the repo: **Settings → Pages → Build and deployment → Source: `Deploy from a branch`**, then pick
the branch and the `/ (root)` folder. The site is served as-is — the import map fetches Spektrum
from the CDN at runtime. No workflow required.

## Bring your own key

The default provider is **OpenRouter** (`https://openrouter.ai/api/v1`) with model
`tencent/hy3-preview`. Any OpenAI-compatible `/chat/completions` endpoint works — set the base URL,
model, and your key in the UI. The base URL and model are remembered in `sessionStorage`; the API
key is kept in memory only and is gone when you close the tab.
