// Shared types for the Correlation Engine.

/** A curated, long-deceased subject. The picklist of these is the safety gate. */
export interface Subject {
  id: string;
  name: string;
  /** Wikipedia page title (e.g. "Nikola_Tesla"), used for the REST summary fetch. */
  wikipedia: string;
  died: string;
  rationale?: string;
}

/** A hand-authored archetype of correlation-as-causation reasoning. */
export interface Category {
  id: string;
  name: string;
  tags: string[];
  description: string;
  correlation_patterns: string[];
  fallacy_illustrated: string;
}

/** Bring-your-own-key provider config. The key lives in memory only. */
export interface Provider {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/** A structured, real data sheet derived from the Wikipedia summary. */
export interface DataSheet {
  name: string;
  extract: string;
  url: string;
  associations: string[];
}

/** A single real, sourced correlation. */
export interface Correlation {
  fact: string;
  source: string;
  url: string;
}

/** The result of the LLM category match. */
export interface CategoryMatch {
  categoryId: string;
  reasoning: string;
}

/** Everything gathered before generation — the exhibit shown in the UI. */
export interface WorkFile {
  subject: Subject;
  dataSheet: DataSheet;
  correlations: Correlation[];
  match?: CategoryMatch;
}

/** A claim in the generated article, tagged with the real fact it rests on. */
export interface Claim {
  text: string;
  basedOn: string;
}

/** The generated, deliberately fallacious article. */
export interface Narrative {
  headline: string;
  subhead: string;
  body: string;
  claims: Claim[];
}

/** One rhetorical move named in the reveal, with the fallacy it relies on. */
export interface DeconstructionMove {
  move: string;
  fallacy: string;
}

/** The "show the reasoning" payload that turns the trick into a lesson. */
export interface Deconstruction {
  summary: string;
  moves: DeconstructionMove[];
}
