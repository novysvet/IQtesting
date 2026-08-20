import type { Item, NarrowAbility, Subtest } from "../core/types.ts";

/**
 * Gc bank: lexical knowledge, verbal relations, and general information.
 *
 * Calibration status: verbalAnalogies and generalInformation carry authored
 * estimate parameters. precisionLexicon difficulties are derived from corpus
 * data (see the lexicon block below); they are better grounded but still not
 * fitted to a respondent sample. Answer positions, c-values, and identifiers
 * are derived here rather than hand-copied into every item.
 */
type Datum = readonly [prompt: string, correct: string, distractors: readonly [string, string, string, string]];

/**
 * Expert ordinal review overrides obvious content/rank inversions while keeping
 * stable item ids. These are routing heuristics, not empirical calibrations.
 *
 * `span` bounds the interpolated b ladder (b = lo + rank/(n-1) * (hi - lo)).
 * Spans are audit-derived provisional values (docs/DIFFICULTY_AUDIT.md §2.11–2.12):
 * verbalAnalogies' empirical ceiling is ≈ +1.5 (the old −3..+4 ladder's upper
 * half was fiction — high-ability examinees would run the table), while
 * generalInformation keeps a genuine ≈ +3.2 ceiling (Abelard) on a real floor.
 */
const DIFFICULTY_ORDER: Record<string, { order: readonly number[]; span: readonly [number, number] }> = {
  van: {
    order: [3, 1, 2, 4, 8, 7, 6, 11, 5, 9, 20, 10, 12, 14, 15, 17, 31, 33, 34, 16, 19, 18, 13, 29, 26, 30, 32, 36, 24, 21, 27, 23, 25, 35, 22, 28],
    span: [-2.5, 1.5],
  },
  gin: {
    order: [3, 1, 4, 2, 5, 6, 11, 7, 9, 10, 8, 24, 13, 12, 15, 16, 20, 14, 29, 17, 28, 18, 27, 25, 19, 23, 26, 22, 30, 21],
    span: [-2.6, 3.2],
  },
};

function stablePosition(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 5;
}

function buildItems(prefix: string, subtest: string, narrow: NarrowAbility, data: readonly Datum[]): Item[] {
  const config = DIFFICULTY_ORDER[prefix] ?? { order: data.map((_, i) => i + 1), span: [-3, 4] as const };
  return data.map(([prompt, correct, distractors], index) => {
    const answer = stablePosition(prefix + "-" + String(index + 1).padStart(3, "0"));
    const rank = config.order.indexOf(index + 1);
    if (rank < 0 || new Set(config.order).size !== data.length) throw new Error("invalid difficulty order for " + prefix);
    const options = [...distractors];
    options.splice(answer, 0, correct);
    const [lo, hi] = config.span;
    return {
      id: prefix + "-" + String(index + 1).padStart(3, "0"),
      subtest,
      broad: "Gc",
      narrow,
      // Constant a avoids pretending later vocabulary is more discriminating.
      a: 1.35,
      // b is interpolated across the audit-derived provisional span for this
      // bank (see DIFFICULTY_ORDER above; docs/DIFFICULTY_AUDIT.md §2.11–2.12),
      // not across the retired uniform −3..+4 ladder.
      b: Number((lo + (rank / Math.max(1, data.length - 1)) * (hi - lo)).toFixed(2)),
      c: 1 / options.length,
      prompt,
      options,
      answer,
      render: { kind: "text" },
    };
  });
}

/**
 * Precision Lexicon: definition-to-word items with corpus-calibrated b.
 *
 * Each item gives one precise definition; all five options are drawn from the
 * same neighborhood of meaning, and exactly one word carries the stated
 * meaning precisely. This format removes the "rarest option is the key"
 * exploit of antonym/odd-one-out formats: every option is a plausible
 * neighbor, and rarity is constrained per item (see test/lexicon.test.ts).
 *
 * CALIBRATION PROVENANCE. b is derived from wordfreq (rspeer/wordfreq, 'en')
 * Zipf frequency of the keyed word: Zipf = log10(occurrences per billion
 * words); b_theta = 4 - zipf, i.e. IQ-units difficulty bIQ = 160 - 15*zipf
 * with 15 IQ points per zipf unit and bIQ = 100 at zipf = 4. This linear
 * heuristic is anchored to the published observation that word rarity tracks
 * the Rasch b parameter at r = -0.92 and to spot outputs of public
 * word-rarity calculators (e.g. perfunctory: zipf 2.45 -> IQ 123). It is a
 * principled prior, not a fitted regression: absolute placement stays
 * provisional until response data exists. Distractor zipfs are stored so the
 * register constraints are auditable offline; regenerate with
 * tools/lexicon_zipf.py (see tools/lexicon_candidates.csv).
 *
 * AUDIT REVISION (docs/DIFFICULTY_AUDIT.md §2.2): definitions were re-stemmed
 * and distractors swapped so (a) no option word appears inside its own
 * definition, (b) the definition's distinctive clause fits only the key
 * (dictionary synonyms of the key were removed as distractors), and (c) in the
 * common-word bands the key is never the uniquely rarest option — the
 * "rarest option is the key" exploit. Keyed words and their zipfs (hence b)
 * are unchanged by the revision.
 */
type LexDatum = readonly [
  definition: string,
  correct: string,
  distractors: readonly [string, string, string, string],
  /** wordfreq 'en' Zipf: [correct, ...distractors]. */
  zipfs: readonly [number, number, number, number, number],
];

function buildLexItems(data: readonly LexDatum[]): Item[] {
  return data.map(([definition, correct, distractors, zipfs], index) => {
    const id = "lex-" + String(index + 1).padStart(3, "0");
    const answer = stablePosition(id);
    const options = [...distractors];
    options.splice(answer, 0, correct);
    return {
      id,
      subtest: "precisionLexicon",
      broad: "Gc",
      narrow: "VL",
      a: 1.35,
      b: Number((4 - zipfs[0]).toFixed(2)),
      c: 1 / options.length,
      prompt: 'Which word most precisely fits this meaning: "' + definition + '"?',
      options,
      answer,
      render: { kind: "text" } as const,
    };
  });
}

export const lexiconData: readonly LexDatum[] = [
  ["happening or arriving before the usual or expected time", "early", ["first", "fast", "quick", "new"], [5.43, 6.11, 5.13, 4.98, 6.25]],
  ["having great value, influence, or effect", "important", ["serious", "heavy", "strong", "official"], [5.44, 5.1, 4.96, 5.22, 5.14]],
  ["not correct or true; containing a mistake", "wrong", ["bad", "strange", "lost", "weak"], [5.39, 5.53, 4.64, 5.39, 4.66]],
  ["needing little effort or skill to do", "easy", ["soft", "slow", "kind", "safe"], [5.29, 4.68, 4.85, 5.45, 5.07]],
  ["able to exert great physical force", "strong", ["big", "hard", "tall", "fast"], [5.22, 5.67, 5.53, 4.52, 5.13]],
  ["describing a school, company, or arrangement run by individuals or a group rather than by the government", "private", ["personal", "secret", "hidden", "alone"], [5.19, 5.2, 4.92, 4.53, 5.16]],
  ["requiring much effort or skill to accomplish", "difficult", ["complex", "heavy", "serious", "strange"], [5.07, 4.86, 4.96, 5.1, 4.64]],
  ["having little or no light, as at night", "dark", ["black", "sad", "grey", "cold"], [5.04, 5.46, 4.84, 4.48, 5.02]],
  ["free from dirt or stains", "clean", ["fresh", "neat", "pure", "bright"], [4.97, 4.83, 3.99, 4.64, 4.61]],
  ["possessing a great deal of money or valuable property", "rich", ["costly", "heavy", "strong", "fertile"], [4.91, 3.93, 4.96, 5.22, 3.62]],
  ["known about by very many people", "famous", ["popular", "great", "proud", "chief"], [4.84, 5.07, 5.88, 4.78, 5.11]],
  ["likely to cause injury, damage, or loss", "dangerous", ["wild", "angry", "cruel", "bad"], [4.79, 4.8, 4.66, 4.12, 5.53]],
  ["willing to wait a long time, or to accept delay or difficulty, without getting annoyed", "patient", ["calm", "slow", "gentle", "mild"], [4.77, 4.54, 4.85, 4.17, 4.11]],
  ["dating from a very remote period", "ancient", ["elderly", "historic", "aged", "past"], [4.68, 4.15, 4.49, 4.5, 5.36]],
  ["low in price; costing little money", "cheap", ["poor", "simple", "weak", "plain"], [4.71, 5.09, 5.08, 4.66, 4.43]],
  ["making little or no noise", "quiet", ["calm", "shy", "gentle", "timid"], [4.65, 4.54, 4.16, 4.17, 3.25]],
  ["so easily seen or understood that it hardly needs to be pointed out", "obvious", ["clear", "simple", "direct", "explicit"], [4.63, 5.25, 5.08, 4.91, 3.96]],
  ["containing nothing inside", "empty", ["blank", "bare", "vacant", "hollow"], [4.59, 4.14, 4.18, 3.8, 3.95]],
  ["short in time or expression, with nothing wasted", "brief", ["compact", "crisp", "swift", "thin"], [4.52, 4.06, 3.7, 4.15, 4.47]],
  ["feeling the body's need for food", "hungry", ["tired", "thirsty", "angry", "greedy"], [4.45, 4.71, 3.74, 4.66, 3.75]],
  ["eager to know or learn about something", "curious", ["attentive", "observant", "unusual", "clever"], [4.45, 3.3, 3.05, 4.45, 4.21]],
  ["feeling sure of one's own abilities or of success", "confident", ["firm", "secure", "calm", "poised"], [4.43, 4.79, 4.64, 4.54, 3.43]],
  ["showing no fear of danger, pain, or hardship", "brave", ["reckless", "proud", "stern", "wild"], [4.33, 3.82, 4.78, 3.9, 4.8]],
  ["happening often, or at short intervals", "frequent", ["rampant", "usual", "daily", "steady"], [4.27, 3.55, 4.62, 5.07, 4.31]],
  ["of decisive importance to the outcome", "crucial", ["serious", "urgent", "central", "final"], [4.28, 5.1, 4.15, 5.12, 5.28]],
  ["willing to give more time, help, or money than is expected", "generous", ["greedy", "wealthy", "gentle", "careful"], [4.2, 3.75, 4.21, 4.17, 4.59]],
  ["requiring immediate attention or action", "urgent", ["sudden", "dire", "quick", "grave"], [4.15, 4.4, 3.66, 4.98, 4.31]],
  ["enough for what is needed; acceptable though not outstanding", "adequate", ["suitable", "mediocre", "proper", "fair"], [4.05, 4.38, 3.52, 4.72, 4.99]],
  ["showing good manners and consideration for others", "polite", ["gentle", "formal", "prim", "decent"], [3.92, 4.17, 4.45, 2.87, 4.4]],
  ["unwilling to act or agree, because of doubt or dislike", "reluctant", ["hesitant", "slow", "cautious", "doubtful"], [3.81, 3.41, 4.85, 3.79, 3.52]],
  ["inclined to question a claim until proof is offered", "skeptical", ["suspicious", "critical", "wary", "cynical"], [3.68, 4.09, 4.83, 3.57, 3.59]],
  ["judging by what actually works rather than by theory or fixed principle", "pragmatic", ["efficient", "realistic", "sensible", "utilitarian"], [3.49, 4.42, 4.16, 3.98, 3.05]],
  ["careful and far-sighted in avoiding unnecessary risk", "prudent", ["frugal", "guarded", "rational", "sober"], [3.41, 3.11, 3.63, 4.06, 3.94]],
  ["seeming to be present everywhere at the same time", "ubiquitous", ["prevalent", "pervasive", "widespread", "universal"], [3.42, 3.78, 3.39, 4.19, 4.49]],
  ["submissive to an unreasonable degree; accepting poor treatment without protest", "meek", ["mild", "gentle", "modest", "reticent"], [3.32, 4.11, 4.17, 4.03, 2.62]],
  ["giving exact, careful attention to every small detail", "meticulous", ["thorough", "precise", "tidy", "exacting"], [3.24, 3.97, 4.13, 3.53, 2.95]],
  ["applying steady, careful effort to the task at hand", "diligent", ["methodical", "tireless", "earnest", "unrelenting"], [3.23, 3.02, 3.04, 3.66, 2.92]],
  ["understood by, or intended for, only a small inner circle", "esoteric", ["obscure", "arcane", "cryptic", "abstract"], [3.17, 3.85, 2.99, 3.23, 4.14]],
  ["altogether lacking in skill or good judgment", "inept", ["clumsy", "awkward", "hapless", "foolish"], [3.13, 3.44, 4.29, 2.88, 3.89]],
  ["gripping or holding firmly and refusing to let go", "tenacious", ["persistent", "resolute", "unyielding", "dogged"], [3.04, 3.9, 3.12, 2.67, 2.97]],
  ["passing away almost as soon as it appears, like dew or a fashion", "ephemeral", ["fleeting", "momentary", "transient", "evanescent"], [2.99, 3.32, 3.08, 3.37, 2.15]],
  ["changing one's course or mood suddenly and for no apparent reason", "capricious", ["moody", "impulsive", "erratic", "unstable"], [2.79, 3.7, 3.27, 3.34, 3.87]],
  ["so clearly and forcefully reasoned that it compels agreement", "cogent", ["lucid", "coherent", "succinct", "plausible"], [2.71, 3.27, 3.63, 2.9, 3.64]],
  ["to make an obscure matter clear by full explanation", "elucidate", ["illustrate", "refine", "annotate", "gloss"], [2.7, 3.71, 3.28, 2.29, 3.47]],
  ["to speak of a person or thing as if of little worth", "disparage", ["criticize", "condemn", "mock", "extol"], [2.58, 3.63, 3.72, 3.85, 2.3]],
  ["to make a bad situation or condition itself better", "ameliorate", ["mend", "soften", "relieve", "placate"], [2.56, 3.33, 3.36, 3.77, 2.77]],
  ["only just begun; barely formed or taking shape", "inchoate", ["undeveloped", "rudimentary", "imperfect", "unpromising"], [2.06, 3.11, 3.17, 3.45, 2.12]],
  ["regarding others as beneath one's notice, with a casually contemptuous air", "supercilious", ["haughty", "aloof", "disdainful", "arrogant"], [1.94, 2.68, 2.99, 2.35, 3.74]],
  ["impossible to escape or avoid, however one strives", "ineluctable", ["irrevocable", "inexorable", "fateful", "predestined"], [1.75, 2.76, 2.57, 3.06, 2.49]],
  ["to use vague or shifting language to avoid committing to the truth", "equivocate", ["declaim", "quibble", "retract", "digress"], [1.72, 1.57, 2.69, 3.03, 2.76]],
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
  ["GRANGER is to FARM as COAL MINER is to ____.", "mine", ["granary", "barn", "field", "orchard"]],
  ["INCUNABULUM is to PRINTING as DAGUERREOTYPE is to ____.", "photography", ["telegraphy", "cinema", "engraving", "sculpture"]],
  ["NOCTIVAGANT is to NIGHT as DIURNAL is to ____.", "day", ["sunrise", "noon", "dusk", "sunlight"]],
  ["PROSOPOGRAPHY is to PERSONS as TOPOGRAPHY is to ____.", "places", ["maps", "landmarks", "surfaces", "regions"]],
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

export const precisionLexicon: Subtest = {
  id: "precisionLexicon", name: "Precision Lexicon", broad: "Gc", narrow: ["VL"],
  instructions: "Each item states one precise meaning. All five options come from the same neighborhood of meaning; exactly one word carries the stated meaning precisely. Choose that word.",
  budgetMin: 11,
  routing: { maxItems: 18, minItems: 8, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  items: buildLexItems(lexiconData),
};

/**
 * Verbal Analogies. b spans the audit-derived provisional range −2.5..+1.5
 * (docs/DIFFICULTY_AUDIT.md §2.11: predicted empirical ceiling ≈ +1.5 — the
 * former −3..+4 ladder's upper half was fiction). Difficulty order and the
 * same-domain distractor rewrites for van-031/033/034 (second-pair giveaways)
 * come from the same audit; parameters remain authored estimates pending
 * response data.
 */
export const verbalAnalogies: Subtest = {
  id: "verbalAnalogies", name: "Verbal Analogies", broad: "Gc", narrow: ["LD"],
  instructions: "Identify the relationship in the first word pair, then choose the word that completes the second pair in the same way.",
  budgetMin: 11,
  routing: { maxItems: 17, minItems: 8, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  items: buildItems("van", "verbalAnalogies", "LD", analogyData),
};

/**
 * General Information. b spans −2.6..+3.2 (docs/DIFFICULTY_AUDIT.md §2.12:
 * floor and ceiling genuinely survive audit — hardest item Abelard ≈ +3.2,
 * ascending node ≈ +2.8 — but the mid-band order was substantially wrong,
 * e.g. the oxygen-crust misconception item demoted to its true hard-mid
 * place). Order is audit-derived; parameters remain authored estimates.
 */
export const generalInformation: Subtest = {
  id: "generalInformation", name: "General Information", broad: "Gc", narrow: ["K0"],
  instructions: "Choose the best answer to each question. Questions sample learned knowledge across science, history, language, and the humanities.",
  budgetMin: 11,
  routing: { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  items: buildItems("gin", "generalInformation", "K0", informationData),
};
