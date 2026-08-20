import type { Item, NarrowAbility, Subtest } from "../core/types.ts";

/**
 * Gc bank: lexical knowledge, verbal relations, and general information.
 * Parameters are authored estimates, not calibrated values. Answer positions,
 * difficulty spacing, c-values, and identifiers are derived here rather than
 * hand-copied into every item.
 */
type Datum = readonly [prompt: string, correct: string, distractors: readonly [string, string, string, string]];

/**
 * Expert ordinal review overrides obvious content/rank inversions while keeping
 * stable item ids. These are routing heuristics, not empirical calibrations.
 */
const DIFFICULTY_ORDER: Record<string, readonly number[]> = {
  ant: [1, 2, 3, 5, 6, 7, 8, 10, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 27, 32, 34, 36, 39, 4, 9, 11, 12, 14, 24, 25, 26, 28, 29, 30, 31, 33, 35, 37, 38, 40],
  van: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 14, 15, 17, 20, 5, 6, 16, 18, 19, 21, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 35, 36, 13, 22, 28, 30],
  gin: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 24, 11, 10, 13, 14, 15, 17, 18, 19, 20, 25, 26, 27, 28, 29, 30, 21, 22, 23],
};

function stablePosition(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 5;
}

function buildItems(prefix: string, subtest: string, narrow: NarrowAbility, data: readonly Datum[]): Item[] {
  const order = DIFFICULTY_ORDER[prefix] ?? data.map((_, i) => i + 1);
  return data.map(([prompt, correct, distractors], index) => {
    const answer = stablePosition(prefix + "-" + String(index + 1).padStart(3, "0"));
    const rank = order.indexOf(index + 1);
    if (rank < 0 || new Set(order).size !== data.length) throw new Error("invalid difficulty order for " + prefix);
    const options = [...distractors];
    options.splice(answer, 0, correct);
    return {
      id: prefix + "-" + String(index + 1).padStart(3, "0"),
      subtest,
      broad: "Gc",
      narrow,
      // Constant a avoids pretending later vocabulary is more discriminating.
      a: 1.35,
      b: Number((-3 + (rank / Math.max(1, data.length - 1)) * 7).toFixed(2)),
      c: 1 / options.length,
      prompt,
      options,
      answer,
      render: { kind: "text" },
    };
  });
}

const antonymData: readonly Datum[] = [
  ["Choose the word most nearly opposite in meaning to ABUNDANT.", "scarce", ["ample", "plentiful", "copious", "sufficient"]],
  ["Choose the word most nearly opposite in meaning to BENEVOLENT.", "malevolent", ["generous", "charitable", "benign", "tolerant"]],
  ["Choose the word most nearly opposite in meaning to CANDID.", "evasive", ["frank", "honest", "open", "direct"]],
  ["Choose the word most nearly opposite in meaning to AMPLIFY.", "attenuate", ["enlarge", "intensify", "augment", "magnify"]],
  ["Choose the word most nearly opposite in meaning to DILIGENT.", "indolent", ["careful", "earnest", "assiduous", "methodical"]],
  ["Choose the word most nearly opposite in meaning to EPHEMERAL.", "enduring", ["fleeting", "brief", "transient", "momentary"]],
  ["Choose the word most nearly opposite in meaning to GREGARIOUS.", "reclusive", ["sociable", "affable", "convivial", "outgoing"]],
  ["Choose the word most nearly opposite in meaning to IMMUTABLE.", "changeable", ["fixed", "permanent", "constant", "invariable"]],
  ["Choose the word most nearly opposite in meaning to LACONIC.", "loquacious", ["terse", "reserved", "brief", "pithy"]],
  ["Choose the word most nearly opposite in meaning to MAGNANIMOUS.", "petty", ["noble", "forgiving", "generous", "unselfish"]],
  ["Choose the word most nearly opposite in meaning to OBDURATE.", "yielding", ["stubborn", "adamant", "hardened", "unyielding"]],
  ["Choose the word most nearly opposite in meaning to PELLUCID.", "opaque", ["clear", "limpid", "lucid", "transparent"]],
  ["Choose the word most nearly opposite in meaning to QUIESCENT.", "active", ["dormant", "still", "resting", "inactive"]],
  ["Choose the word most nearly opposite in meaning to RECONDITE.", "familiar", ["abstruse", "obscure", "arcane", "esoteric"]],
  ["Choose the word most nearly opposite in meaning to SAGACIOUS.", "foolish", ["wise", "prudent", "shrewd", "discerning"]],
  ["Choose the word most nearly opposite in meaning to TACITURN.", "talkative", ["silent", "reticent", "reserved", "uncommunicative"]],
  ["Choose the word most nearly opposite in meaning to UBIQUITOUS.", "localized", ["pervasive", "universal", "omnipresent", "widespread"]],
  ["Choose the word most nearly opposite in meaning to VACILLATE.", "resolve", ["waver", "hesitate", "fluctuate", "dither"]],
  ["Choose the word most nearly opposite in meaning to WINSOME.", "repellent", ["charming", "engaging", "appealing", "attractive"]],
  ["Choose the word most nearly opposite in meaning to ZEALOUS.", "apathetic", ["fervent", "ardent", "eager", "devoted"]],
  ["Choose the word most nearly opposite in meaning to ABSTEMIOUS.", "gluttonous", ["temperate", "moderate", "sparing", "restrained"]],
  ["Choose the word most nearly opposite in meaning to ACERBIC.", "mild", ["caustic", "sharp", "biting", "tart"]],
  ["Choose the word most nearly opposite in meaning to ANODYNE.", "provocative", ["soothing", "bland", "innocuous", "palliative"]],
  ["Choose the word most nearly opposite in meaning to APODICTIC.", "doubtful", ["certain", "conclusive", "incontrovertible", "demonstrable"]],
  ["Choose the word most nearly opposite in meaning to CALIGINOUS.", "luminous", ["murky", "dark", "misty", "tenebrous"]],
  ["Choose the word most nearly opposite in meaning to CONTUMACIOUS.", "compliant", ["rebellious", "insubordinate", "defiant", "obstinate"]],
  ["Choose the word most nearly opposite in meaning to DELETERIOUS.", "beneficial", ["harmful", "injurious", "noxious", "damaging"]],
  ["Choose the word most nearly opposite in meaning to DESULTORY.", "systematic", ["disconnected", "aimless", "fitful", "rambling"]],
  ["Choose the word most nearly opposite in meaning to DIAPHANOUS.", "dense", ["gauzy", "sheer", "translucent", "filmy"]],
  ["Choose the word most nearly opposite in meaning to EREMITIC.", "sociable", ["solitary", "secluded", "anchoritic", "withdrawn"]],
  ["Choose the word most nearly opposite in meaning to FULIGINOUS, meaning soot-blackened or dusky.", "bright", ["sooty", "smoky", "dusky", "grimy"]],
  ["Choose the word most nearly opposite in meaning to INIMICAL.", "favorable", ["hostile", "adverse", "unfriendly", "harmful"]],
  ["Choose the word most nearly opposite in meaning to JEJUNE, as used of an argument lacking intellectual substance.", "substantive", ["insipid", "superficial", "meager", "naive"]],
  ["Choose the word most nearly opposite in meaning to MERETRICIOUS.", "genuine", ["gaudy", "specious", "tawdry", "flashy"]],
  ["Choose the word most nearly opposite in meaning to NUGATORY.", "consequential", ["trifling", "futile", "worthless", "ineffectual"]],
  ["Choose the word most nearly opposite in meaning to PROLIX.", "terse", ["lengthy", "diffuse", "wordy", "discursive"]],
  ["Choose the word most nearly opposite in meaning to RHADAMANTHINE.", "lenient", ["inflexible", "severe", "rigorous", "unyielding"]],
  ["Choose the word most nearly opposite in meaning to SESQUIPEDALIAN.", "monosyllabic", ["polysyllabic", "grandiloquent", "long-winded", "magniloquent"]],
  ["Choose the word most nearly opposite in meaning to TRUCULENT.", "conciliatory", ["belligerent", "ferocious", "aggressive", "pugnacious"]],
  ["Choose the word most nearly opposite in meaning to VITUPERATIVE.", "laudatory", ["abusive", "scathing", "reproachful", "invective"]],
];

const analogyData: readonly Datum[] = [
  ["BIRD is to NEST as BEE is to ____.", "hive", ["web", "den", "burrow", "stable"]],
  ["PUPPY is to DOG as FOAL is to ____.", "horse", ["cow", "sheep", "goat", "deer"]],
  ["GLOVE is to HAND as SHOE is to ____.", "foot", ["sock", "sole", "toe", "leg"]],
  ["AUTHOR is to NOVEL as COMPOSER is to ____.", "symphony", ["gallery", "statue", "stage", "audience"]],
  ["THERMOMETER is to TEMPERATURE as BAROMETER is to ____.", "pressure", ["altitude", "humidity", "velocity", "volume"]],
  ["ARCHIPELAGO is to ISLANDS as CONSTELLATION is to ____.", "stars", ["orbits", "planets", "comets", "moons"]],
  ["SCALPEL is to SURGEON as GAVEL is to ____.", "judge", ["carpenter", "clerk", "bailiff", "lawyer"]],
  ["FAMINE is to FOOD as DROUGHT is to ____.", "water", ["heat", "soil", "harvest", "wind"]],
  ["CENSUS is to POPULATION as INVENTORY is to ____.", "stock", ["price", "sales", "ledger", "profit"]],
  ["EPILOGUE is to NOVEL as CODA is to ____.", "composition", ["painting", "speech", "building", "equation"]],
  ["ARBOREAL is to TREE as AQUATIC is to ____.", "water", ["air", "desert", "cave", "grassland"]],
  ["MALLEABLE is to BE SHAPED as SOLUBLE is to ____.", "be dissolved", ["be frozen", "be expanded", "be evaporated", "be hardened"]],
  ["AERIE is to EAGLE as FORMICARY is to ____.", "ant", ["bee", "termite", "spider", "wasp"]],
  ["NUMISMATIST is to COINS as PHILATELIST is to ____.", "stamps", ["maps", "books", "fossils", "medals"]],
  ["SOMNOLENT is to SLEEP as FAMISHED is to ____.", "eat", ["drink", "rest", "wander", "work"]],
  ["ICONOCLAST is to TRADITION as HERETIC is to ____.", "doctrine", ["ritual", "law", "custom", "language"]],
  ["RUDDER is to DIRECTION as THROTTLE is to ____.", "speed", ["balance", "altitude", "distance", "pressure"]],
  ["PAEAN is to PRAISE as DIRGE is to ____.", "mourning", ["victory", "worship", "celebration", "satire"]],
  ["LEXICON is to WORDS as BESTIARY is to ____.", "animals", ["plants", "stars", "diseases", "minerals"]],
  ["CHRONOMETER is to TIME as ODOMETER is to ____.", "distance", ["speed", "weight", "force", "direction"]],
  ["ANACHRONISM is to TIME as SOLECISM is to ____.", "grammar", ["geography", "music", "etiquette", "logic"]],
  ["PALIMPSEST is to WRITING as PENTIMENTO is to ____.", "painting", ["sculpture", "music", "drama", "dance"]],
  ["APHELION is to SUN as APOGEE is to ____.", "Earth", ["Moon", "Mars", "horizon", "ecliptic"]],
  ["EPISTEMOLOGY is to KNOWLEDGE as AXIOLOGY is to ____.", "value", ["language", "mind", "being", "nature"]],
  ["STENTORIAN is to SOUND as EFFULGENT is to ____.", "light", ["motion", "heat", "odor", "texture"]],
  ["EXEGETE is to TEXT as CARTOGRAPHER is to ____.", "terrain", ["weather", "language", "history", "number"]],
  ["ACROSTIC is to INITIAL LETTERS as TELESTICH is to ____.", "final letters", ["rhyming words", "section titles", "metrical feet", "opening lines"]],
  ["PARHELION is to SUN as PARASELENE is to ____.", "Moon", ["Earth", "star", "comet", "cloud"]],
  ["ALVEOLUS is to LUNG as NEPHRON is to ____.", "kidney", ["liver", "heart", "spleen", "pancreas"]],
  ["CHREMATISTICS is to WEALTH as POLEMICS is to ____.", "controversy", ["peace", "beauty", "memory", "measurement"]],
  ["GRANGER is to FARM as COAL MINER is to ____.", "mine", ["forest", "harbor", "mill", "forge"]],
  ["INCUNABULUM is to PRINTING as DAGUERREOTYPE is to ____.", "photography", ["telegraphy", "cinema", "engraving", "sculpture"]],
  ["NOCTIVAGANT is to NIGHT as DIURNAL is to ____.", "day", ["dawn", "season", "year", "twilight"]],
  ["PROSOPOGRAPHY is to PERSONS as TOPOGRAPHY is to ____.", "places", ["periods", "languages", "species", "numbers"]],
  ["ONOMASTIC is to NAMES as DEONTIC is to ____.", "duty", ["truth", "beauty", "chance", "cause"]],
  ["PSITTACISM is to REPETITION as CACOGRAPHY is to ____.", "bad writing", ["fine speech", "false memory", "slow reading", "secret code"]],
];

const informationData: readonly Datum[] = [
  ["Which planet is closest to the Sun?", "Mercury", ["Venus", "Earth", "Mars", "Jupiter"]],
  ["What gas do plants chiefly absorb during photosynthesis?", "carbon dioxide", ["oxygen", "nitrogen", "hydrogen", "helium"]],
  ["Who wrote Hamlet?", "William Shakespeare", ["John Milton", "Geoffrey Chaucer", "Charles Dickens", "Samuel Johnson"]],
  ["What is the largest ocean on Earth?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Southern Ocean"]],
  ["The Magna Carta was sealed in which country?", "England", ["France", "Spain", "Italy", "Germany"]],
  ["What is the chemical symbol for iron?", "Fe", ["Ir", "In", "I", "Fr"]],
  ["Which organ produces insulin?", "pancreas", ["liver", "kidney", "spleen", "thyroid"]],
  ["Who composed The Four Seasons?", "Antonio Vivaldi", ["Johann Sebastian Bach", "George Frideric Handel", "Joseph Haydn", "Franz Schubert"]],
  ["What is the SI unit of electric current?", "ampere", ["volt", "watt", "ohm", "coulomb"]],
  ["Champollion's study of the Rosetta Stone enabled the decipherment of which monumental writing system?", "Egyptian hieroglyphs", ["Linear B", "cuneiform", "Sanskrit", "Mayan glyphs"]],
  ["Which treaty formally ended World War I between Germany and the Allies?", "Treaty of Versailles", ["Treaty of Utrecht", "Treaty of Tordesillas", "Treaty of Paris", "Treaty of Ghent"]],
  ["What process changes a solid directly into a gas?", "sublimation", ["condensation", "deposition", "fusion", "vaporization"]],
  ["Who formulated the laws of planetary motion?", "Johannes Kepler", ["Tycho Brahe", "Galileo Galilei", "Nicolaus Copernicus", "Edmond Halley"]],
  ["In economics, what does comparative advantage explain?", "gains from specialization and trade", ["inflation from money growth", "prices under monopoly", "income from land", "declining marginal utility"]],
  ["Which philosopher wrote Critique of Pure Reason?", "Immanuel Kant", ["David Hume", "Baruch Spinoza", "John Locke", "G. W. F. Hegel"]],
  ["What is the most abundant element in Earth's crust by mass?", "oxygen", ["silicon", "aluminum", "iron", "calcium"]],
  ["The Peace of Westphalia ended which major conflict?", "Thirty Years' War", ["Seven Years' War", "War of Spanish Succession", "Crimean War", "Hundred Years' War"]],
  ["What is the term for animals active chiefly at dawn and dusk?", "crepuscular", ["nocturnal", "diurnal", "fossorial", "arboreal"]],
  ["Which language family includes Finnish, Estonian, and Hungarian?", "Uralic", ["Slavic", "Romance", "Turkic", "Baltic"]],
  ["What does Avogadro's constant count per mole?", "elementary entities", ["joules of energy", "liters of gas", "grams of mass", "units of charge"]],
  ["Who wrote the medieval philosophical work Sic et Non?", "Peter Abelard", ["Thomas Aquinas", "Anselm of Canterbury", "Duns Scotus", "William of Ockham"]],
  ["In prosody, what is a metrical foot of two stressed syllables?", "spondee", ["iamb", "trochee", "anapest", "dactyl"]],
  ["Which mathematician introduced transfinite numbers?", "Georg Cantor", ["David Hilbert", "Bernhard Riemann", "Kurt Gödel", "Leopold Kronecker"]],
  ["What is the boundary around a black hole beyond which light cannot escape?", "event horizon", ["ergosphere", "accretion disk", "photon sphere", "singularity"]],
  ["Which Byzantine emperor commissioned the Corpus Juris Civilis?", "Justinian I", ["Theodosius I", "Heraclius", "Basil II", "Constantine XI"]],
  ["What is the study of inscriptions called?", "epigraphy", ["paleography", "numismatics", "codicology", "heraldry"]],
  ["Which enzyme joins Okazaki fragments during DNA replication?", "DNA ligase", ["DNA helicase", "primase", "topoisomerase", "telomerase"]],
  ["Which West African empire reached its greatest fame under Mansa Musa?", "Mali Empire", ["Songhai Empire", "Ghana Empire", "Kanem–Bornu Empire", "Benin Empire"]],
  ["In rhetoric, what is anaphora?", "repetition at the beginnings of successive clauses", ["deliberate understatement", "inversion of normal word order", "address to an absent person", "omission of conjunctions"]],
  ["What is the astronomical term for the point where an orbiting body crosses a reference plane northward?", "ascending node", ["periapsis", "opposition", "inferior conjunction", "libration point"]],
];

export const antonyms: Subtest = {
  id: "antonyms", name: "Antonyms", broad: "Gc", narrow: ["VL"],
  instructions: "Choose the option most nearly opposite in meaning to the word in capitals. Select the best answer even when more than one option seems loosely related.",
  budgetMin: 11,
  routing: { maxItems: 18, minItems: 8, ceilingMisses: 4, targetSe: 0.28, entryTheta: 0 },
  items: buildItems("ant", "antonyms", "VL", antonymData),
};

export const verbalAnalogies: Subtest = {
  id: "verbalAnalogies", name: "Verbal Analogies", broad: "Gc", narrow: ["LD"],
  instructions: "Identify the relationship in the first word pair, then choose the word that completes the second pair in the same way.",
  budgetMin: 11,
  routing: { maxItems: 17, minItems: 8, ceilingMisses: 4, targetSe: 0.28, entryTheta: 0 },
  items: buildItems("van", "verbalAnalogies", "LD", analogyData),
};

export const generalInformation: Subtest = {
  id: "generalInformation", name: "General Information", broad: "Gc", narrow: ["K0"],
  instructions: "Choose the best answer to each question. Questions sample learned knowledge across science, history, language, and the humanities.",
  budgetMin: 11,
  routing: { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.30, entryTheta: 0 },
  items: buildItems("gin", "generalInformation", "K0", informationData),
};
