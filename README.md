# The Correlation Engine

An educational tool that demonstrates why **correlation is not causation**. It builds a
convincing, fully-sourced conspiracy narrative from real facts about a long-deceased historical
figure — then deconstructs exactly how the trick was done, naming each rhetorical move and the
logical fallacy it relies on.

> ⚠️ **This is a media-literacy demonstration.** Every article it produces is *deliberately
> fallacious*. It exists to show how easily real, true facts can be arranged into a false story of
> hidden causation. Nothing it outputs should be taken as a factual claim.

## How it works

1. **Pick a subject** from a curated list of long-deceased historical figures. There is no
   free-text name entry — the list *is* the safety gate, so the engine can never be pointed at a
   living person.
2. The app fetches a **real Wikipedia data sheet** for that figure (client-side, public REST API).
3. It assembles a **work-file** of real, sourced correlations — every correlation links back to its
   Wikipedia source.
4. An LLM picks the best-fit **conspiracy pattern** from a hand-authored dataset of false-causation
   archetypes.
5. The LLM writes a **sensationalized article** that amplifies the *interpretation* of those facts
   — without inventing any new ones. Every claim is tagged with the real fact it rests on.
6. A **deconstruction panel** then names each persuasive move and the fallacy it illustrates.

## Architecture

- **Static site**, no backend. Vite + TypeScript, deployed to GitHub Pages.
- **Bring-your-own-key.** The browser calls an OpenAI-compatible endpoint (OpenRouter by default)
  directly. The key is held in the tab only — never persisted, never logged, never sent to a server
  we control.

```
data/subjects.json   -> curated subject pool (the gate)
data/categories.json -> hand-authored conspiracy "pattern" dataset
src/wikipedia.ts     -> fetches the real data sheet
src/engine.ts        -> work-file -> match -> narrative -> deconstruction
src/llm.ts           -> direct browser -> provider client
src/main.ts          -> UI + flow wiring
.github/workflows/   -> build + test + deploy to Pages
```

## Develop

```bash
npm install
npm run dev        # local dev server
npm run test       # unit tests (vitest)
npm run build      # typecheck + production build
```

## Deploy

Pushing to `main` (or the active feature branch) triggers the GitHub Actions workflow, which runs
the tests, builds with the correct Pages base path, and deploys. In the repo settings set
**Settings → Pages → Source: GitHub Actions** (one-time). The site lands at
`https://<you>.github.io/<repo>/`.

## Bring your own key

The default provider is **OpenRouter** (`https://openrouter.ai/api/v1`) with model
`tencent/hy3-preview`. Any OpenAI-compatible `/chat/completions` endpoint works — set the base URL,
model, and your key in the UI. The base URL and model are remembered in `sessionStorage`; the API
key is kept in memory only and is gone when you close the tab.
