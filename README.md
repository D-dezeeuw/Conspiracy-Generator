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

1. **Pick a target** from a curated dropdown of long-deceased figures and hit **Gather the sources**.
   There is no free-text name entry — the list *is* the safety gate, so the engine can never be
   pointed at a living person.
2. The app gathers **real material from several keyless public sources, concurrently**: the
   Wikipedia REST summary (the bio), Wikipedia **related pages** (adjacent topics), and **Wikinews**
   coverage. Each source is best-effort — if one is unavailable the run continues on the rest. The
   gathered **source information** is shown.
3. It assembles a **work-file** of real, sourced correlations — every one links back to its own
   checkable source URL (Wikipedia, Wikipedia-related, or Wikinews).
4. The run **pauses on the Conspiracy step**, where two orthogonal axes are pre-filled with the
   engine's recommendation: an **Angle** (the thematic lens — Deep State, Secret Societies, Flat
   Earth, UFO Cover-Up, … 20 in all) and a **Pattern** (the rhetorical fallacy — cherry-picking,
   meaningful coincidence, hidden network, …). You can confirm or change either, pick the report
   language, then press **Generate the report**.
5. The LLM writes a **tabloid exposé** that amplifies the *interpretation* of those facts without
   inventing any new ones, **in your chosen language**. The article is locked to a fixed tabloid arc —
   **The Hook → The Official Story → The Evidence → Connect the Dots → Who Benefited? → The Verdict** —
   under a screaming kicker + headline, and signed off with the **"it never ended" closer**. Every
   claim is tagged with the real fact it rests on, and woven through are **manufactured authority
   quotes** — real phrases pulled *verbatim* from the source and reframed with an ominous gloss (a
   post-generation guard drops any quote that isn't a literal substring of the source).
6. A **deconstruction panel** (also in your chosen language) walks the tabloid sections in order and
   names the trick each one played — the Official Story building false trust, Connect the Dots
   manufacturing a pattern from coincidence, Who Benefited using cui-bono as proof, the Verdict
   stating as fact what was never shown — plus the quote-out-of-context and unfalsifiable-continuation
   techniques, so every device the article used is exposed.

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
data.js         curated subjects (the gate) + patterns + angles + report languages
params.js       resolve URL prefill params (?target/angle/pattern/lang) → selections
format.js       small pure text helper
style.css       broadsheet styling
spektrum.d.ts   vendored types for editor/jsconfig mapping (authoring only)
tests/          Node built-in test runner specs (no deps)
```

## Prefill via URL

You can deep-link a starting selection with query params — handy for sharing a specific setup:

```
?target=nicola+tesla&angle=religious/occult&pattern=the+stolen+legacy&lang=Dutch
```

Values are matched **fuzzily** by id or display name (case-insensitive, punctuation-tolerant, and
forgiving of light misspellings — `nicola` still finds `Nikola Tesla`). `pattern` and `category` are
interchangeable, as are `lang` and `language`. Anything that doesn't resolve falls through to the
default. **A `target` that doesn't match a curated figure is ignored** — the URL is not a free-text
back door around the safety gate. A URL-pinned angle/pattern is respected and not overwritten by the
engine's recommendation.

### Dev escape hatch: `&unlock=1`

Adding `&unlock=1` **skips the fuzzy resolver** and passes the raw URL values straight through as
ids. It's a convenience for testing exact ids (e.g. a new angle or pattern) before they're wired into
the dropdowns — security by obscurity, a soft layer only. It does **not** weaken the real gate: a run
still requires a curated subject (with a Wikipedia title), so a raw `target` that isn't a curated id
simply no-ops. Example: `?unlock=1&target=tesla&angle=mind_control&pattern=stolen_legacy`.

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
