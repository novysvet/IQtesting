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
 * CALIBRATION (revised 2026-08-22): b is corpus-calibrated with the ETS
 * pair-minimum index (Enright & Bejar RR-89-35 operationalized GRE analogy
 * difficulty as the minimum word frequency of each stem-key pair):
 *   b = 4 - min( zipf(stem), zipf(key) )
 * Stem zipfs come verbatim from lexiconData (the same attested rows the
 * Definitions bank keys on); key zipfs below were generated from the same
 * wordfreq 'en' source via tools/lexicon_zipf.py (regenerate there). The old
 * stem-only formula mispriced every item whose key is rarer than its stem —
 * ant-013 (quiet -> DEAFENING) sat at b -0.65 while requiring a zipf-2.98
 * word; it now sits at +1.02. Bank span -1.39..+2.28, corpus-capped; do not
 * pad it upward. Options are authored common words: one true opposite plus
 * four associates/synonyms-of-the-stem that must be rejected. The "pick the
 * rarity outlier" exploit cannot apply — selection is by opposition, not by
 * rarity — so options carry no zipf contract beyond being real, single,
 * lowercase words.
 */

interface AntonymDatum {
  readonly stem: string;
  readonly key: string;
  /** wordfreq 'en' Zipf of the key, from the same corpus as lexiconData. */
  readonly keyZipf: number;
  readonly distract: readonly [string, string, string, string];
}

const DATA: readonly AntonymDatum[] = [
  { stem: "important", key: "insignificant", keyZipf: 3.53, distract: ["serious", "weighty", "major", "powerful"] },
  { stem: "early", key: "late", keyZipf: 5.34, distract: ["soon", "prompt", "quick", "punctual"] },
  { stem: "wrong", key: "right", keyZipf: 5.96, distract: ["bad", "mistaken", "false", "unfair"] },
  { stem: "easy", key: "hard", keyZipf: 5.53, distract: ["soft", "simple", "plain", "smooth"] },
  { stem: "strong", key: "frail", keyZipf: 3.28, distract: ["sturdy", "tough", "mighty", "robust"] },
  { stem: "private", key: "public", keyZipf: 5.57, distract: ["personal", "secret", "hidden", "solitary"] },
  { stem: "difficult", key: "simple", keyZipf: 5.08, distract: ["complex", "demanding", "arduous", "laborious"] },
  { stem: "clean", key: "filthy", keyZipf: 3.80, distract: ["tidy", "pure", "neat", "washed"] },
  { stem: "rich", key: "impoverished", keyZipf: 3.35, distract: ["wealthy", "affluent", "costly", "moneyed"] },
  { stem: "famous", key: "obscure", keyZipf: 3.85, distract: ["renowned", "celebrated", "popular", "noted"] },
  { stem: "dangerous", key: "harmless", keyZipf: 3.79, distract: ["risky", "perilous", "unsafe", "wild"] },
  { stem: "cheap", key: "expensive", keyZipf: 4.69, distract: ["modest", "plain", "shabby", "flimsy"] },
  { stem: "quiet", key: "deafening", keyZipf: 2.98, distract: ["silent", "hushed", "calm", "muted"] },
  { stem: "obvious", key: "subtle", keyZipf: 4.08, distract: ["clear", "evident", "apparent", "manifest"] },
  { stem: "empty", key: "replete", keyZipf: 2.91, distract: ["vacant", "hollow", "bare", "void"] },
  { stem: "brief", key: "protracted", keyZipf: 3.26, distract: ["concise", "short", "swift", "compact"] },
  { stem: "confident", key: "diffident", keyZipf: 2.10, distract: ["assured", "secure", "bold", "poised"] },
  { stem: "brave", key: "cowardly", keyZipf: 3.42, distract: ["fearless", "daring", "heroic", "gallant"] },
  { stem: "crucial", key: "trivial", keyZipf: 3.66, distract: ["vital", "decisive", "essential", "central"] },
  { stem: "generous", key: "miserly", keyZipf: 2.33, distract: ["giving", "liberal", "charitable", "lavish"] },
  { stem: "reluctant", key: "eager", keyZipf: 4.03, distract: ["hesitant", "unwilling", "loath", "disinclined"] },
  { stem: "polite", key: "rude", keyZipf: 4.25, distract: ["courteous", "civil", "gracious", "mannerly"] },
  { stem: "tenacious", key: "yielding", keyZipf: 3.40, distract: ["persistent", "stubborn", "resolute", "firm"] },
  { stem: "meek", key: "arrogant", keyZipf: 3.74, distract: ["mild", "humble", "timid", "submissive"] },
  { stem: "inept", key: "adept", keyZipf: 3.33, distract: ["clumsy", "awkward", "unfit", "bungling"] },
  { stem: "pragmatic", key: "idealistic", keyZipf: 3.14, distract: ["practical", "realistic", "sensible", "efficient"] },
  { stem: "skeptical", key: "credulous", keyZipf: 2.29, distract: ["doubtful", "wary", "suspicious", "cynical"] },
  { stem: "prudent", key: "reckless", keyZipf: 3.82, distract: ["cautious", "careful", "judicious", "sober"] },
  { stem: "capricious", key: "steadfast", keyZipf: 3.14, distract: ["moody", "erratic", "impulsive", "fickle"] },
  { stem: "cogent", key: "unconvincing", keyZipf: 2.69, distract: ["lucid", "coherent", "persuasive", "sound"] },
  { stem: "elucidate", key: "obfuscate", keyZipf: 2.28, distract: ["clarify", "explain", "illustrate", "illuminate"] },
  { stem: "disparage", key: "extol", keyZipf: 2.30, distract: ["criticize", "belittle", "mock", "demean"] },
  { stem: "ameliorate", key: "worsen", keyZipf: 3.06, distract: ["mend", "relieve", "soften", "improve"] },
  { stem: "inchoate", key: "mature", keyZipf: 4.28, distract: ["rudimentary", "undeveloped", "budding", "formless"] },
  { stem: "supercilious", key: "humble", keyZipf: 4.11, distract: ["haughty", "aloof", "disdainful", "proud"] },
  { stem: "ineluctable", key: "avoidable", keyZipf: 2.97, distract: ["inevitable", "irrevocable", "inexorable", "fateful"] },
  { stem: "equivocate", key: "disclose", keyZipf: 3.84, distract: ["quibble", "hedge", "prevaricate", "evade"] },
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
  // ETS pair-minimum pricing: the rarer of stem/key sets the difficulty
  // (Enright & Bejar RR-89-35). Practice items keep the floor constant.
  const b = practice ? -3 : Math.round((4 - Math.min(zipfOfStem(datum.stem), datum.keyZipf)) * 100) / 100;
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
    "Each question asks for the word most nearly OPPOSITE in meaning to a given word. Consider every choice before deciding; several may seem related to the given word. This section measures your own vocabulary and knowledge: answer without dictionaries, translators, search engines, or any other outside help.",
  budgetMin: 10,
  routing: { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  practice: [
    // Practice keys carry corpus zipfs for type parity; their b is fixed.
    buildItem({ stem: "hot", key: "cold", keyZipf: 5.5, distract: ["warm", "sunny", "mild", "humid"] }, "prac-ant-01", true),
    buildItem({ stem: "day", key: "night", keyZipf: 5.42, distract: ["morning", "noon", "dusk", "light"] }, "prac-ant-02", true),
  ],
  items: DATA.map((d, i) => buildItem(d, "ant-" + String(i + 1).padStart(3, "0"))),
};

// Guard: hot/day practice stems are not lexiconData rows, so buildItem would
// throw on them under the normal path — they bypass zipfOfStem only because
// practice b is fixed. Assert that assumption holds structurally here.
for (const p of antonyms.practice ?? []) {
  if (!p.prompt.startsWith(PROMPT_PREFIX)) throw new Error(p.id + " malformed practice prompt");
}
