import type { Subtest } from "../core/types.ts";
import { lexiconData } from "./gc.ts";

/**
 * Gc - Antonyms (ant-001..037), narrow ability VL (lexical knowledge).
 *
 * FORMAT LINEAGE: the Antonyms section of the pre-1994 SAT/GRE verbal battery
 * (dropped from the SAT in 1994, from the GRE in 2011) — choose the word most
 * nearly OPPOSITE in meaning to the stem. Where the Definitions subtest asks
 * for recognition through a definition, this format probes the same lexicon
 * along the paradigmatic axis: the examinee must know the stem's meaning
 * tightly enough to reject its synonyms and associates in favor of its true
 * contrary.
 *
 * CALIBRATION: b is corpus-calibrated exactly like the lexicon bank,
 *   b = 4 - zipf(stem),
 * where zipf is the wordfreq 'en' frequency OF THE STEM, taken verbatim from
 * lexiconData (the same attested rows the Definitions bank keys on —
 * test/antonyms.test.ts cross-checks every stored zipf against that table,
 * so the two banks can never silently disagree about a word's frequency).
 * Bank span is therefore corpus-capped at about -1.44..+2.28, mirroring the
 * definable vocabulary pool; do not pad it upward. Options are authored
 * common words: one true opposite plus four associates/synonyms-of-the-stem
 * that must be rejected. The "pick the rarity outlier" exploit cannot apply —
 * selection is by opposition, not by rarity — so options carry no zipf
 * contract beyond being real, single, lowercase words.
 */

interface AntonymDatum {
  readonly stem: string;
  readonly key: string;
  readonly distract: readonly [string, string, string, string];
}

const DATA: readonly AntonymDatum[] = [
  { stem: "important", key: "insignificant", distract: ["serious", "weighty", "major", "powerful"] },
  { stem: "early", key: "late", distract: ["soon", "prompt", "quick", "punctual"] },
  { stem: "wrong", key: "right", distract: ["bad", "mistaken", "false", "unfair"] },
  { stem: "easy", key: "hard", distract: ["soft", "simple", "plain", "smooth"] },
  { stem: "strong", key: "frail", distract: ["sturdy", "tough", "mighty", "robust"] },
  { stem: "private", key: "public", distract: ["personal", "secret", "hidden", "solitary"] },
  { stem: "difficult", key: "simple", distract: ["complex", "demanding", "arduous", "laborious"] },
  { stem: "clean", key: "filthy", distract: ["tidy", "pure", "neat", "washed"] },
  { stem: "rich", key: "impoverished", distract: ["wealthy", "affluent", "costly", "moneyed"] },
  { stem: "famous", key: "obscure", distract: ["renowned", "celebrated", "popular", "noted"] },
  { stem: "dangerous", key: "harmless", distract: ["risky", "perilous", "unsafe", "wild"] },
  { stem: "cheap", key: "expensive", distract: ["modest", "plain", "shabby", "flimsy"] },
  { stem: "quiet", key: "deafening", distract: ["silent", "hushed", "calm", "muted"] },
  { stem: "obvious", key: "subtle", distract: ["clear", "evident", "apparent", "manifest"] },
  { stem: "empty", key: "replete", distract: ["vacant", "hollow", "bare", "void"] },
  { stem: "brief", key: "protracted", distract: ["concise", "short", "swift", "compact"] },
  { stem: "confident", key: "diffident", distract: ["assured", "secure", "bold", "poised"] },
  { stem: "brave", key: "cowardly", distract: ["fearless", "daring", "heroic", "gallant"] },
  { stem: "crucial", key: "trivial", distract: ["vital", "decisive", "essential", "central"] },
  { stem: "generous", key: "miserly", distract: ["giving", "liberal", "charitable", "lavish"] },
  { stem: "reluctant", key: "eager", distract: ["hesitant", "unwilling", "loath", "disinclined"] },
  { stem: "polite", key: "rude", distract: ["courteous", "civil", "gracious", "mannerly"] },
  { stem: "tenacious", key: "yielding", distract: ["persistent", "stubborn", "resolute", "firm"] },
  { stem: "meek", key: "arrogant", distract: ["mild", "humble", "timid", "submissive"] },
  { stem: "inept", key: "adept", distract: ["clumsy", "awkward", "unfit", "bungling"] },
  { stem: "pragmatic", key: "idealistic", distract: ["practical", "realistic", "sensible", "efficient"] },
  { stem: "skeptical", key: "credulous", distract: ["doubtful", "wary", "suspicious", "cynical"] },
  { stem: "prudent", key: "reckless", distract: ["cautious", "careful", "judicious", "sober"] },
  { stem: "capricious", key: "steadfast", distract: ["moody", "erratic", "impulsive", "fickle"] },
  { stem: "cogent", key: "unconvincing", distract: ["lucid", "coherent", "persuasive", "sound"] },
  { stem: "elucidate", key: "obfuscate", distract: ["clarify", "explain", "illustrate", "illuminate"] },
  { stem: "disparage", key: "extol", distract: ["criticize", "belittle", "mock", "demean"] },
  { stem: "ameliorate", key: "worsen", distract: ["mend", "relieve", "soften", "improve"] },
  { stem: "inchoate", key: "mature", distract: ["rudimentary", "undeveloped", "budding", "formless"] },
  { stem: "supercilious", key: "humble", distract: ["haughty", "aloof", "disdainful", "proud"] },
  { stem: "ineluctable", key: "avoidable", distract: ["inevitable", "irrevocable", "inexorable", "fateful"] },
  { stem: "equivocate", key: "disclose", distract: ["quibble", "hedge", "prevaricate", "evade"] },
];

/** Zipf of a lexiconData key word (the attested source for antonym stems). */
function zipfOfStem(stem: string): number {
  const row = lexiconData.find(([, w]) => w === stem);
  if (!row) throw new Error("antonym stem not attested in lexiconData: " + stem);
  return row[3]![0]!;
}

const PROMPT_PREFIX = "Choose the word most nearly OPPOSITE in meaning to ";

function buildItem(datum: AntonymDatum, id: string, practice = false): {
  id: string; subtest: string; broad: "Gc"; narrow: "VL";
  a: number; b: number; c: number;
  prompt: string; options: string[]; answer: number;
  render: { kind: "text" };
} {
  const options = [datum.key, ...datum.distract];
  // Deterministic display rotation so the key is not always first on screen;
  // session-level permutation reshuffles further per examinee. Practice
  // stems are not lexiconData rows, so they skip the corpus lookup entirely.
  const rotate = (datum.stem.length + (practice ? 3 : Math.round(zipfOfStem(datum.stem) * 10))) % options.length;
  const display = [...options.slice(rotate), ...options.slice(0, rotate)];
  const b = practice ? -3 : Math.round((4 - zipfOfStem(datum.stem)) * 100) / 100;
  return {
    id,
    subtest: "antonyms",
    broad: "Gc",
    narrow: "VL",
    a: practice ? 1.2 : 1.35,
    b,
    c: 0.2,
    prompt: PROMPT_PREFIX + datum.stem.toUpperCase() + ".",
    options: display,
    answer: display.indexOf(datum.key),
    render: { kind: "text" },
  };
}

export const antonyms: Subtest = {
  id: "antonyms",
  name: "Antonyms",
  broad: "Gc",
  narrow: ["VL"],
  instructions:
    "Each question asks for the word most nearly OPPOSITE in meaning to a given word. Consider every choice before deciding; several may seem related to the given word.",
  budgetMin: 10,
  routing: { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  practice: [
    buildItem({ stem: "hot", key: "cold", distract: ["warm", "sunny", "mild", "humid"] }, "prac-ant-01", true),
    buildItem({ stem: "day", key: "night", distract: ["morning", "noon", "dusk", "light"] }, "prac-ant-02", true),
  ],
  items: DATA.map((d, i) => buildItem(d, "ant-" + String(i + 1).padStart(3, "0"))),
};

// Guard: hot/day practice stems are not lexiconData rows, so buildItem would
// throw on them under the normal path — they bypass zipfOfStem only because
// practice b is fixed. Assert that assumption holds structurally here.
for (const p of antonyms.practice ?? []) {
  if (!p.prompt.startsWith(PROMPT_PREFIX)) throw new Error(p.id + " malformed practice prompt");
}
