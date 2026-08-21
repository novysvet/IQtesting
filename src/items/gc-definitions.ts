import type { Item, Subtest } from "../core/types.ts";
import { lexiconData } from "./gc.ts";

/**
 * Definitions: the 1926-SAT Definitions subtest rebuilt on the precision
 * lexicon bank and administered as ONE whole page (see Subtest.matching in
 * core/types.ts). Thirty-three numbered definitions each have the defined
 * word replaced by "(n)" (n = the definition's 1-based page number); a
 * 66-word bank holds the 33 keys plus 33 fillers; the examinee types a
 * definition number beside each bank word. Item i is scored correct when the
 * number typed next to ITS key word equals i+1 — scoring lives in the session
 * layer, which reads items[i].answer (the key word) and the page position.
 *
 * FORMAT MODEL — the original 1926 SAT "Definitions" section (33 definitions,
 * 66-word bank, e.g. "The (5) is the 1,440th part of a day." -> minute). Each
 * definition below is a 1926-style encyclopedic restyling of its lexiconData
 * row: the distinguishing clause is carried over with its sense exactly
 * intact ("That is (n) which ..." for states, "To be (n) is to ..." for
 * dispositions, "To (n) is to ..." for acts), and "(n)" stands in for the key.
 *
 * SELECTION. 33 of the 50 lexiconData rows. Mandated: the 5 easiest keys by
 * Zipf (important 5.44, early 5.43, wrong 5.39, easy 5.29, strong 5.22) and
 * the 4 hardest (equivocate 1.72, ineluctable 1.75, supercilious 1.94,
 * inchoate 2.06). The other 24 rows (the task memo's "5+4+25" sums to 34, so
 * 24 fill-ins give the specified 33) are chosen so the sorted-b ladder has no
 * step > 0.45 except ONE lexicon-forced jump: no lexicon key has b in
 * (1.44, 1.94), so the mandated inchoate (b 1.94) sits 0.50 above ameliorate
 * (b 1.44) whatever rows are chosen. Page order is decorrelated from
 * difficulty: |Pearson r(position, b)| ~ 0.10, and the 9 mandated extremes
 * land on positions {2, 5, 9, 10, 13, 18, 22, 25, 30}.
 *
 * CALIBRATION STATUS. b provenance = wordfreq 'en' Zipf of the keyed word
 * (b = 4 - zipf; bIQ = 160 - 15*zipf), read live from lexiconData — a
 * corpus-calibrated prior, not a fitted regression; absolute placement stays
 * provisional until response data exists (same heuristic as
 * precisionLexicon). a = 1.2 is an authored estimate: the matching page adds
 * clerical noise the five-option MC lexicon does not have (scanning a
 * 66-word bank, transcribing numbers, keeping 33 threads open against a
 * 1/66-ish chance floor), which lowers expected per-item discrimination from
 * the MC bank's 1.35 to 1.2. c = 0: no item-level guessing asymptote is
 * modeled for the recall-style matching response.
 *
 * BANK. 33 keys + 33 distractors = 66, alphabetical, all lowercase. The
 * distractors are 16 keys of non-chosen lexicon rows plus 17 words drawn
 * from lexicon distractor pools; register balance: mean distractor Zipf 4.49
 * vs mean key Zipf 3.86 (|delta| = 0.63 <= 1.2).
 *
 * SEMANTIC GUARD (cross-item, matching-specific; enforced here by authorship
 * and in test/definitions.test.ts by machine for the mechanical rules). In
 * the matching format a filler that satisfies ANY of the 33 definitions
 * creates a second defensible answer, so every near-synonym pool was left
 * untouched: wealthy (= rich), hard (= difficult), arcane/obscure (=
 * esoteric), utilitarian/realistic/sensible (= pragmatic), fleeting/
 * momentary/transient/evanescent (= ephemeral), haughty/aloof/disdainful/
 * arrogant (= supercilious), moody/impulsive/erratic/unstable (=
 * capricious), persistent/resolute/unyielding/dogged (= tenacious),
 * inexorable/predestined (= ineluctable), quibble (= equivocate),
 * annotate/gloss/illustrate (= elucidate), hesitant (= reluctant), guarded/
 * cautious (= prudent), secure/poised (= confident), mend/relieve (=
 * ameliorate), rudimentary/undeveloped (= inchoate), succinct/compact/crisp
 * (= brief), vacant/hollow/bare/blank (= empty), neat (= clean), first (=
 * early), popular (= famous), central (= crucial), suitable/mediocre/fair (=
 * adequate), patient as a filler was also passed over ("accepting poor
 * treatment without protest" reads too close). Stem-leak exclusions: bad
 * (ameliorate's "make a bad situation better"), great (important/strong
 * stems), clear (elucidate stem), usual (early stem), careful (prudent
 * stem), widespread (too close to famous's "very many people").
 */

/** [keyed word, 1926-style definition; "(n)" stands in for the word at page position n]. */
const PAGE: readonly (readonly [string, string])[] = [
  ["adequate", "That is (1) which is enough for what is needed, acceptable though not outstanding."],
  ["supercilious", "To be (2) is to regard others as beneath one's notice, with a casually contemptuous air."],
  ["clean", "That is (3) which is free from dirt or stains."],
  ["meek", "To be (4) is to be submissive to an unreasonable degree, accepting poor treatment without protest."],
  ["important", "That is (5) which has great value, influence, or effect."],
  ["disparage", "To (6) is to speak of a person or thing as if of little worth."],
  ["ancient", "That is (7) which dates from a very remote period."],
  ["skeptical", "To be (8) is to be inclined to question a claim until proof is offered."],
  ["equivocate", "To (9) is to use vague or shifting language in order to avoid committing to the truth."],
  ["easy", "That is (10) which needs little effort or skill to do."],
  ["tenacious", "That is (11) which grips or holds firmly and refuses to let go."],
  ["confident", "To be (12) is to feel sure of one's own abilities or of success."],
  ["inchoate", "That is (13) which is only just begun, barely formed or taking shape."],
  ["private", "That school, company, or arrangement is (14) which is run by individuals or a group rather than by the government."],
  ["capricious", "To be (15) is to change one's course or mood suddenly and for no apparent reason."],
  ["famous", "That is (16) which is known about by very many people."],
  ["prudent", "To be (17) is to be careful and far-sighted in avoiding unnecessary risk."],
  ["early", "That is (18) which happens or arrives before the usual or expected time."],
  ["elucidate", "To (19) is to make an obscure matter clear by full explanation."],
  ["difficult", "That is (20) which requires much effort or skill to accomplish."],
  ["generous", "To be (21) is to be willing to give more time, help, or money than is expected."],
  ["ineluctable", "That is (22) which is impossible to escape or avoid, however one strives."],
  ["empty", "That is (23) which contains nothing inside."],
  ["pragmatic", "To be (24) is to judge by what actually works rather than by theory or fixed principle."],
  ["wrong", "That is (25) which is not correct or true, or which contains a mistake."],
  ["ephemeral", "That is (26) which passes away almost as soon as it appears, like dew or a fashion."],
  ["crucial", "That is (27) which is of decisive importance to the outcome."],
  ["esoteric", "That is (28) which is understood by, or intended for, only a small inner circle."],
  ["reluctant", "To be (29) is to be unwilling to act or agree, because of doubt or dislike."],
  ["strong", "That is (30) which is able to exert great physical force."],
  ["brief", "That is (31) which is short in time or expression, with nothing wasted."],
  ["rich", "That is (32) which possesses a great deal of money or valuable property."],
  ["ameliorate", "To (33) is to make a bad situation or condition itself better."],
];

/**
 * The 33 fillers. First 16: keys of non-chosen lexicon rows (their own
 * definitions are not on the page). Remaining 17: lexicon distractor-pool
 * words (pool owner in parentheses) screened by the semantic guard above.
 */
const DISTRACTORS: readonly string[] = [
  // Non-chosen row keys.
  "dark", // 5.04
  "dangerous", // 4.79
  "cheap", // 4.71
  "quiet", // 4.65
  "obvious", // 4.63
  "hungry", // 4.45
  "curious", // 4.45
  "brave", // 4.33
  "frequent", // 4.27
  "urgent", // 4.15
  "polite", // 3.92
  "ubiquitous", // 3.42
  "meticulous", // 3.24
  "diligent", // 3.23
  "inept", // 3.13
  "cogent", // 2.71
  // Pool words (Zipf in comment).
  "new", // 6.25 (early)
  "big", // 5.67 (strong)
  "official", // 5.14 (important)
  "fast", // 5.13 (early/strong)
  "serious", // 5.10 (important/difficult/crucial)
  "chief", // 5.11 (famous)
  "kind", // 5.45 (easy)
  "quick", // 4.98 (early)
  "secret", // 4.92 (private)
  "heavy", // 4.96 (important/difficult/rich)
  "fresh", // 4.83 (clean)
  "firm", // 4.79 (confident)
  "hidden", // 4.53 (private)
  "proper", // 4.72 (adequate)
  "strange", // 4.64 (wrong/difficult)
  "cynical", // 3.59 (skeptical)
  "frugal", // 3.11 (prudent)
];

function buildDefinitionItems(): Item[] {
  return PAGE.map(([key, text], index): Item => {
    // b provenance is the lexicon row itself, read live: b = 4 - zipf(key).
    const row = lexiconData.find((datum) => datum[1] === key);
    if (!row) throw new Error("definitions: keyed word missing from lexiconData: " + key);
    return {
      id: "dfn-" + String(index + 1).padStart(3, "0"),
      subtest: "definitions",
      broad: "Gc",
      narrow: "VL",
      a: 1.2,
      b: Number((4 - row[3][0]).toFixed(2)),
      c: 0,
      prompt: text,
      answer: key,
      render: { kind: "text" } as const,
    };
  });
}

function buildBank(): string[] {
  const bank = [...PAGE.map(([key]) => key), ...DISTRACTORS];
  if (new Set(bank).size !== 66) throw new Error("definitions: bank must hold 66 distinct words");
  return [...new Set(bank)].sort();
}

export const definitions: Subtest = {
  id: "definitions",
  name: "Definitions",
  broad: "Gc",
  narrow: ["VL"],
  // Adapted from the 1926 SAT Definitions directions (33 definitions / 66 words).
  instructions:
    "Thirty-three definitions are given. From each definition the word defined has been omitted and a number substituted. " +
    "Beside each word in the list of sixty-six, enter the number of the definition it satisfies. " +
    "Thirty-three of the words fit the definitions exactly; thirty-three do not.",
  budgetMin: 8,
  // Whole-page administration: routing never stops the run (see Subtest.matching).
  routing: { maxItems: 33, minItems: 33, ceilingMisses: 99, targetSe: 0.01, entryTheta: 0 },
  items: buildDefinitionItems(),
  matching: { bank: buildBank() },
  // Unscored demonstration page: three definitions against six words, the
  // mechanic in miniature. The scored page opens only after it is submitted.
  matchingPractice: {
    defs: [
      "To (1) is to put money into a bank.",
      "(2) is the liquid that falls as rain.",
      "That is (3) which has four sides of equal length.",
    ],
    bank: ["square", "deposit", "water", "copper", "bicycle", "winter"],
  },
};
