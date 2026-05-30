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
2. The app fetches a **real Wikipedia data sheet** (client-side, public REST API).
3. It assembles a **work-file** of real, sourced correlations — each links back to its Wikipedia
   source.
4. An LLM picks the best-fit **conspiracy pattern** from a hand-authored dataset of archetypes.
5. The LLM writes a **sensationalized article** that amplifies the *interpretation* of those facts
   without inventing any new ones. Every claim is tagged with the real fact it rests on.
6. A **deconstruction panel** names each persuasive move and the fallacy it illustrates.

## Files

```
index.html      entry point: import map, fonts, and all the Spektrum bindings
app.js          UI state + flow wiring (imports "spektrum" from the CDN)
engine.js       work-file → category match → narrative → deconstruction
wikipedia.js    real data-sheet fetch + association extraction
llm.js          direct browser → provider client + tolerant JSON parse
data.js         curated subjects (the gate) + conspiracy archetypes
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
