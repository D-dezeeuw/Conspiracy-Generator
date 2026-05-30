// Curated subject pool (the safety gate) and the hand-authored conspiracy
// archetype dataset. Plain ES module so it loads with no build step and is
// importable by the Node test runner. Edit these arrays to taste.

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {string} wikipedia  Wikipedia page title, e.g. "Nikola_Tesla".
 * @property {string} died
 * @property {string} [rationale]
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string[]} tags
 * @property {string} description
 * @property {string[]} correlation_patterns
 * @property {string} fallacy_illustrated
 */

/** @type {Subject[]} */
export const SUBJECTS = [
  { id: "tesla", name: "Nikola Tesla", wikipedia: "Nikola_Tesla", died: "1943", rationale: "Inventor whose disputed legacy and lonely death made him a magnet for myth." },
  { id: "rasputin", name: "Grigori Rasputin", wikipedia: "Grigori_Rasputin", died: "1916", rationale: "His murder is genuinely contested, which is exactly how a real ambiguity becomes a plot." },
  { id: "cleopatra", name: "Cleopatra", wikipedia: "Cleopatra", died: "30 BC", rationale: "Two millennia of retelling have buried the record under interpretation." },
  { id: "curie", name: "Marie Curie", wikipedia: "Marie_Curie", died: "1934", rationale: "A pioneer surrounded by rivals — fertile ground for a manufactured-suppression story." },
  { id: "mozart", name: "Wolfgang Amadeus Mozart", wikipedia: "Wolfgang_Amadeus_Mozart", died: "1791", rationale: "The Salieri rumour shows how a rivalry gets recast as a poisoning." },
  { id: "newton", name: "Isaac Newton", wikipedia: "Isaac_Newton", died: "1727", rationale: "Real alchemy notebooks make an easy springboard for hidden-knowledge claims." },
  { id: "lovelace", name: "Ada Lovelace", wikipedia: "Ada_Lovelace", died: "1852", rationale: "Credit disputes over her work model the 'stolen legacy' fallacy cleanly." },
  { id: "napoleon", name: "Napoleon", wikipedia: "Napoleon", died: "1821", rationale: "His cause of death was argued for two centuries — a real dispute, not an invented one." },
  { id: "van_gogh", name: "Vincent van Gogh", wikipedia: "Vincent_van_Gogh", died: "1890", rationale: "The circumstances of his death are genuinely debated by historians." },
  { id: "houdini", name: "Harry Houdini", wikipedia: "Harry_Houdini", died: "1926", rationale: "A showman who fought spiritualists — an irresistible 'they silenced him' template." },
  { id: "franklin", name: "Benjamin Franklin", wikipedia: "Benjamin_Franklin", died: "1790", rationale: "A web of real societies and correspondents is easy to inflate into a secret network." },
  { id: "edison", name: "Thomas Edison", wikipedia: "Thomas_Edison", died: "1931", rationale: "His real commercial rivalries are the seed of countless 'he stole it' legends." },
];

/** @type {Category[]} */
export const CATEGORIES = [
  {
    id: "suppressed_genius",
    name: "The Suppressed Genius",
    tags: ["lost invention", "censored work", "ahead of their time", "missing papers", "vanished research"],
    description: "A figure's real, documented work is recast as a world-changing breakthrough that powerful interests deliberately buried.",
    correlation_patterns: ["unfinished, lost, or destroyed work", "powerful institutions that opposed or competed with the figure", "claims the work was 'ahead of its time'"],
    fallacy_illustrated: "Treats the absence of a record as proof of deliberate suppression (argument from ignorance).",
  },
  {
    id: "faked_or_engineered_death",
    name: "The Engineered Death",
    tags: ["mysterious death", "poisoning", "convenient timing", "unfinished business", "disputed cause"],
    description: "A death is recast as too convenient to be natural, with an interested party assumed to be behind it.",
    correlation_patterns: ["ambiguous or disputed cause of death", "someone who benefited from the death", "the figure had recently made enemies or threats"],
    fallacy_illustrated: "Assumes that because someone benefited, they must have caused it (cui bono as proof).",
  },
  {
    id: "hidden_network",
    name: "The Hidden Network",
    tags: ["secret society", "powerful friends", "membership", "correspondence", "patronage"],
    description: "Real associations, memberships, and correspondents are inflated into a coordinating secret cabal.",
    correlation_patterns: ["documented membership in real societies or institutions", "letters or ties to influential contemporaries", "overlapping social circles"],
    fallacy_illustrated: "Mistakes co-occurrence and acquaintance for coordinated conspiracy (guilt by association).",
  },
  {
    id: "manufactured_rivalry",
    name: "The Manufactured Rivalry",
    tags: ["rival", "competitor", "feud", "professional dispute", "jealousy"],
    description: "A documented professional rivalry is escalated into a secret war with sabotage and hidden motives.",
    correlation_patterns: ["a named contemporary rival or competitor", "a public dispute over priority, credit, or markets", "a later reversal of fortune for one party"],
    fallacy_illustrated: "Reads ordinary competition as covert sabotage (false attribution of intent).",
  },
  {
    id: "stolen_legacy",
    name: "The Stolen Legacy",
    tags: ["credit dispute", "uncredited work", "attribution", "collaborator", "priority"],
    description: "A genuine question of credit is rewritten as deliberate theft orchestrated to erase the figure.",
    correlation_patterns: ["a collaborator or institution that received the credit", "a documented dispute over priority or authorship", "the figure's contribution being downplayed in their lifetime"],
    fallacy_illustrated: "Converts a credit dispute into proven intent to steal (assuming malice over messiness).",
  },
  {
    id: "hidden_patron",
    name: "The Hidden Patron",
    tags: ["secret funding", "powerful backer", "wealthy sponsor", "benefactor", "influence"],
    description: "Real patronage or funding is reframed as a hidden hand steering the figure toward a concealed agenda.",
    correlation_patterns: ["documented patrons, sponsors, or financial backers", "a sudden change in the figure's fortunes or direction", "the backer holding power or wealth"],
    fallacy_illustrated: "Assumes that funding equals control and a concealed agenda (follow-the-money as proof).",
  },
  {
    id: "knew_too_much",
    name: "They Knew Too Much",
    tags: ["dangerous knowledge", "exposé", "whistleblower", "secrets", "silenced"],
    description: "The figure's real expertise or public stance is recast as dangerous knowledge that someone needed silenced.",
    correlation_patterns: ["the figure publicly challenged a powerful interest or belief", "a setback, decline, or death following that challenge", "knowledge or evidence said to have gone missing"],
    fallacy_illustrated: "Reads sequence as cause: because trouble followed the challenge, the challenge caused it (post hoc).",
  },
];
