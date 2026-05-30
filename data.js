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
 * @property {string} context  Authoring guidance handed to the model: how to apply this rhetorical pattern.
 */

/**
 * @typedef {Object} Angle
 * @property {string} id
 * @property {string} name
 * @property {string[]} tags
 * @property {string} description
 * @property {string} context  Authoring guidance handed to the model: the worldview/lens to tell the story through.
 */

/**
 * @typedef {Object} Language
 * @property {string} id    BCP-47-ish short code, used as the option value.
 * @property {string} name  Display name passed to the model as the target language.
 */

/** @type {Language[]} */
export const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "nl", name: "Dutch (Nederlands)" },
  { id: "es", name: "Spanish (Español)" },
  { id: "fr", name: "French (Français)" },
  { id: "de", name: "German (Deutsch)" },
  { id: "it", name: "Italian (Italiano)" },
  { id: "pt", name: "Portuguese (Português)" },
  { id: "pl", name: "Polish (Polski)" },
  { id: "ru", name: "Russian (Русский)" },
  { id: "tr", name: "Turkish (Türkçe)" },
  { id: "ja", name: "Japanese (日本語)" },
  { id: "zh", name: "Chinese (中文)" },
];

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

/**
 * PATTERNS — the *rhetorical fallacy* axis. Each is a way of manufacturing a
 * false sense of causation. Kept orthogonal to ANGLES (the thematic lens):
 * a report applies one pattern through one angle.
 * @type {Category[]}
 */
export const CATEGORIES = [
  {
    id: "cherry_picked_pattern",
    name: "The Cherry-Picked Pattern",
    tags: ["selective evidence", "ignored context", "pattern from noise", "confirmation"],
    description: "A handful of supportive facts are spotlighted while everything that complicates the story is quietly dropped.",
    correlation_patterns: ["a few facts that line up with the thesis", "abundant context that would undercut it", "no mention of the disconfirming evidence"],
    fallacy_illustrated: "Builds a case by selecting confirming facts and omitting the rest (cherry-picking / confirmation bias).",
    context: "Spotlight only the handful of facts that fit the thesis and present them as the whole picture. Never acknowledge the documented context that would complicate or deflate them. The persuasion comes from what you leave out.",
  },
  {
    id: "meaningful_coincidence",
    name: "The Meaningful Coincidence",
    tags: ["coincidence", "numerology", "uncanny timing", "synchronicity", "apophenia"],
    description: "Ordinary overlaps of dates, places, names, or numbers are treated as signs of a deliberate hidden design.",
    correlation_patterns: ["dates, places, or numbers that happen to align", "shared names or locations", "coincidental timing of unrelated events"],
    fallacy_illustrated: "Mistakes random coincidence for intentional design (apophenia — seeing patterns in noise).",
    context: "Treat every coincidence of date, place, number, or name as if it cannot possibly be chance. Pile the coincidences up so their sheer accumulation feels designed, while never offering the mundane explanation.",
  },
  {
    id: "hidden_network",
    name: "The Hidden Network",
    tags: ["secret society", "powerful friends", "membership", "correspondence", "patronage"],
    description: "Real associations, memberships, and correspondents are inflated into a coordinating secret cabal.",
    correlation_patterns: ["documented membership in real societies or institutions", "letters or ties to influential contemporaries", "overlapping social circles"],
    fallacy_illustrated: "Mistakes co-occurrence and acquaintance for coordinated conspiracy (guilt by association).",
    context: "Take every documented acquaintance, membership, or correspondence and present it as evidence of a coordinating cabal. Imply that knowing someone is the same as conspiring with them.",
  },
  {
    id: "manufactured_rivalry",
    name: "The Manufactured Rivalry",
    tags: ["rival", "competitor", "feud", "professional dispute", "jealousy"],
    description: "A documented professional rivalry is escalated into a secret war with sabotage and hidden motives.",
    correlation_patterns: ["a named contemporary rival or competitor", "a public dispute over priority, credit, or markets", "a later reversal of fortune for one party"],
    fallacy_illustrated: "Reads ordinary competition as covert sabotage (false attribution of intent).",
    context: "Escalate any ordinary professional competition into a secret war. Read every setback the figure suffered as deliberate sabotage by the rival, attributing hidden malicious intent the facts never state.",
  },
  {
    id: "stolen_legacy",
    name: "The Stolen Legacy",
    tags: ["credit dispute", "uncredited work", "attribution", "collaborator", "priority"],
    description: "A genuine question of credit is rewritten as deliberate theft orchestrated to erase the figure.",
    correlation_patterns: ["a collaborator or institution that received the credit", "a documented dispute over priority or authorship", "the figure's contribution being downplayed in their lifetime"],
    fallacy_illustrated: "Converts a credit dispute into proven intent to steal (assuming malice over messiness).",
    context: "Rewrite any messy question of credit as deliberate, orchestrated theft. Treat the ordinary fog of who-did-what as proof of a plot to erase the figure from history.",
  },
  {
    id: "hidden_patron",
    name: "The Hidden Patron",
    tags: ["secret funding", "powerful backer", "wealthy sponsor", "benefactor", "influence"],
    description: "Real patronage or funding is reframed as a hidden hand steering the figure toward a concealed agenda.",
    correlation_patterns: ["documented patrons, sponsors, or financial backers", "a sudden change in the figure's fortunes or direction", "the backer holding power or wealth"],
    fallacy_illustrated: "Assumes that funding equals control and a concealed agenda (follow-the-money as proof).",
    context: "Treat any documented patron or funder as a hidden hand pulling the strings. Imply that because money changed hands, the backer secretly controlled the figure toward a concealed agenda.",
  },
  {
    id: "knew_too_much",
    name: "They Knew Too Much",
    tags: ["dangerous knowledge", "exposé", "whistleblower", "secrets", "silenced"],
    description: "The figure's real expertise or public stance is recast as dangerous knowledge that someone needed silenced.",
    correlation_patterns: ["the figure publicly challenged a powerful interest or belief", "a setback, decline, or death following that challenge", "knowledge or evidence said to have gone missing"],
    fallacy_illustrated: "Reads sequence as cause: because trouble followed the challenge, the challenge caused it (post hoc).",
    context: "Frame the figure's real expertise or public stance as dangerous knowledge. Because some setback or decline followed it, imply the challenge caused the silencing — sequence presented as cause.",
  },
];

/**
 * ANGLES — the *thematic lens* axis (the worldview the story is told through).
 * Orthogonal to PATTERNS. `auto` lets the engine pick whatever angle the real
 * facts most readily support.
 * @type {Angle[]}
 */
export const ANGLES = [
  {
    id: "auto",
    name: "Auto (let the engine choose)",
    tags: [],
    description: "Let the engine pick the angle the real facts most naturally support.",
    context: "Choose whatever thematic lens the supplied facts most naturally support, and commit to it fully.",
  },
  {
    id: "politics",
    name: "Politics & Power",
    tags: ["faction", "statecraft", "influence", "regime"],
    description: "The figure was a pawn or player in a hidden political game; everything served a faction.",
    context: "Tell the story as hidden statecraft: every association and act secretly served a political faction maneuvering for power.",
  },
  {
    id: "deep_state",
    name: "The Deep State",
    tags: ["establishment", "unelected", "bureaucracy", "shadow government"],
    description: "An unelected permanent establishment quietly steered or erased the figure.",
    context: "Frame an unelected permanent establishment as quietly steering the figure's rise and erasing them when inconvenient.",
  },
  {
    id: "secret_societies",
    name: "Secret Societies",
    tags: ["freemasons", "illuminati", "rosicrucians", "initiation"],
    description: "A secret order pulled the strings behind the figure's work and fate.",
    context: "Present the figure's memberships and ties as proof of control by an initiatory secret order working a long agenda.",
  },
  {
    id: "flat_earth",
    name: "Flat Earth",
    tags: ["suppressed cosmology", "forbidden geography", "globe lie"],
    description: "Their science was suppressed because it threatened the 'true' shape of the world.",
    context: "Frame the figure's science as a threat to a hidden truth about the shape of the world, which authorities therefore had to bury.",
  },
  {
    id: "hollow_earth",
    name: "Hollow Earth",
    tags: ["inner world", "subterranean", "polar opening"],
    description: "Their discoveries pointed to a concealed inner world the authorities buried.",
    context: "Insinuate that the figure's work brushed against evidence of a concealed inner world that powerful interests needed hidden.",
  },
  {
    id: "suppressed_tech",
    name: "Suppressed Technology",
    tags: ["lost invention", "buried patent", "confiscated device"],
    description: "A world-changing invention was confiscated to protect entrenched industries.",
    context: "Cast the figure's real work as a world-changing invention that entrenched industries confiscated or buried to protect their profits.",
  },
  {
    id: "big_pharma",
    name: "Big Pharma / Medical",
    tags: ["suppressed cure", "medical interests", "health truth"],
    description: "A cure or health truth they held was buried by medical interests.",
    context: "Frame any health-related fact as a suppressed cure or medical truth that powerful medical interests buried.",
  },
  {
    id: "religious_occult",
    name: "Religious / Occult",
    tags: ["forbidden knowledge", "heresy", "esoteric", "the Church"],
    description: "They guarded forbidden esoteric knowledge that religious authority wanted hidden.",
    context: "Frame the figure as a keeper of forbidden esoteric knowledge that religious authorities moved to suppress as heresy.",
  },
  {
    id: "aliens",
    name: "Aliens & Ancient Astronauts",
    tags: ["non-human contact", "seeded knowledge", "ancient astronauts"],
    description: "Their genius was really contact with — or seeding by — non-human intelligence.",
    context: "Insinuate that the figure's brilliance is best explained by contact with non-human intelligence, never quite asserting it outright.",
  },
  {
    id: "ufo_coverup",
    name: "UFO Cover-Up",
    tags: ["classified sighting", "denial", "recovered craft"],
    description: "They saw or built something the government classified and denied.",
    context: "Frame the figure as having seen or built something the authorities classified, then publicly denied ever existed.",
  },
  {
    id: "financial_cabal",
    name: "The Financial Cabal",
    tags: ["bankers", "money power", "debt", "control"],
    description: "A money power funded and then destroyed the figure for control.",
    context: "Frame bankers or a money power as financing the figure and then destroying them once control was no longer assured.",
  },
  {
    id: "media_manipulation",
    name: "Media Manipulation",
    tags: ["press", "narrative", "image-making", "propaganda"],
    description: "The press of the day was weaponized to build or bury the figure's image.",
    context: "Frame the press of the era as a weapon deliberately deployed to inflate or bury the figure's reputation to order.",
  },
  {
    id: "faked_death",
    name: "Faked Death / Survival",
    tags: ["staged death", "disappearance", "secret survival"],
    description: "They never really died — the death was staged to let them disappear.",
    context: "Treat the documented death as a staged exit, marshalling any ambiguity as evidence the figure secretly lived on.",
  },
  {
    id: "impostor",
    name: "Body Double / Impostor",
    tags: ["substitution", "double", "replacement"],
    description: "The 'real' figure was replaced; the famous one is a substitute.",
    context: "Insinuate that at some point the real figure was swapped for a double, treating ordinary changes over a life as the seam of the substitution.",
  },
  {
    id: "mind_control",
    name: "Mind Control",
    tags: ["programming", "psychological", "handlers"],
    description: "They were a subject — or architect — of secret psychological programming.",
    context: "Frame the figure as a subject or architect of covert psychological programming, reading their choices as evidence of handlers.",
  },
  {
    id: "lost_knowledge",
    name: "Time Travel / Lost Knowledge",
    tags: ["too advanced", "anachronism", "future knowledge"],
    description: "Their work was 'too advanced,' implying knowledge from outside their era.",
    context: "Insinuate the figure's work was impossibly advanced for its time, implying access to knowledge from outside their own era.",
  },
  {
    id: "energy_suppression",
    name: "Energy Suppression",
    tags: ["free energy", "clean power", "the grid"],
    description: "Free or clean energy they touched was killed to protect the energy economy.",
    context: "Frame any energy-related work as free or limitless power that the energy economy had killed to protect its grip.",
  },
  {
    id: "bloodline",
    name: "Royal / Dynastic Bloodline",
    tags: ["hidden lineage", "dynasty", "secret heir"],
    description: "A hidden lineage explains the figure's rise, fall, and protected secrets.",
    context: "Frame a secret bloodline or hidden lineage as the real explanation for the figure's rise, protection, and downfall.",
  },
  {
    id: "espionage",
    name: "Espionage & Spycraft",
    tags: ["intelligence asset", "cover", "handler", "tradecraft"],
    description: "They were really an intelligence asset; the public life was cover.",
    context: "Frame the figure's public career as cover for secret intelligence work, reading travels and contacts as tradecraft.",
  },
  {
    id: "surveillance",
    name: "The Surveillance State",
    tags: ["mass watching", "records", "early surveillance"],
    description: "They pioneered — or were an early victim of — mass watching and record-keeping.",
    context: "Frame the figure as a pioneer or early victim of mass surveillance, casting ordinary record-keeping as a watching apparatus.",
  },
];
