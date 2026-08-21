import type { Item, Subtest } from "../core/types.ts";

/**
 * Gc - Sentence Completion (sc-001..020), narrow ability LD (language
 * development).
 *
 * FORMAT LINEAGE: the Sentence Completion section of the pre-1994 SAT/GRE
 * verbal battery. One blank in a sentence whose surrounding structure —
 * causal connectives, contrast frames ("far from", "although"), elaboration
 * colons — constrains the missing sense; five choices, exactly one defensible.
 *
 * CALIBRATION STATUS: a/b are AUTHORED ESTIMATES anchored to two content
 * features (noted per item): the rarity of the keyed word and the density of
 * the logical constraints the sentence places on it. This bank is NOT
 * corpus-calibrated — completion difficulty is joint between vocabulary and
 * logic, and a blank word's lone zipf misprices items whose sentences carry
 * strong or weak scaffolding. Floor -2.0 (everyday vocabulary, one direct
 * causal cue), ceiling +2.4 (rare keyed word under an elaboration frame).
 * a rises 1.1 -> 1.4 with constraint density. c = 1/5.
 *
 * AUTHORING CONTRACT (machine-checked in test/sentence-completion.test.ts):
 * exactly one keyed choice; five distinct lowercase options; no option
 * appears inside its own sentence; distractors are grammatical in the blank
 * (same part of speech as the key) so only semantics separate them.
 */

interface CompletionDatum {
  readonly sentence: string;
  readonly key: string;
  readonly distract: readonly [string, string, string, string];
  readonly a: number;
  readonly b: number;
}

const DATA: readonly CompletionDatum[] = [
  {
    sentence: "Because I had forgotten my umbrella, I arrived at the office completely ______.",
    key: "soaked", distract: ["dry", "punctual", "early", "quiet"], a: 1.1, b: -2.0,
    // everyday vocab, one direct causal cue
  },
  {
    sentence: "After running for an hour, Marco drank the entire glass of water in one ______.",
    key: "gulp", distract: ["moment", "breath", "hand", "minute"], a: 1.1, b: -1.8,
  },
  {
    sentence: "Although the cake looked beautiful, it tasted terribly ______.",
    key: "bitter", distract: ["sweet", "delicious", "moist", "sugary"], a: 1.1, b: -1.6,
    // although-frame: appearance concedes, taste contradicts
  },
  {
    sentence: "Rather than being ______ about winning, the champion praised her opponent's skill.",
    key: "boastful", distract: ["gracious", "humble", "modest", "generous"], a: 1.15, b: -1.2,
    // rather-than frame: three distractors sit on the frame's required side
  },
  {
    sentence: "The professor's lecture was so ______ that several students struggled to stay awake.",
    key: "dull", distract: ["brief", "popular", "polite", "late"], a: 1.15, b: -1.0,
  },
  {
    sentence: "Because the medicine tasted foul, a spoonful of honey was given to ______ the flavor.",
    key: "mask", distract: ["spice", "worsen", "study", "pour"], a: 1.2, b: -0.8,
  },
  {
    sentence: "Far from being ______, his remarks were carefully prepared over several weeks.",
    key: "spontaneous", distract: ["written", "long", "formal", "public"], a: 1.2, b: -0.6,
  },
  {
    sentence: "The critic's review was so ______ that the theater removed every quotation from it in its advertisements.",
    key: "scathing", distract: ["lengthy", "belated", "admiring", "careless"], a: 1.25, b: -0.3,
  },
  {
    sentence: "Although the committee praised the plan's ambition, it rejected the budget as wholly ______.",
    key: "unrealistic", distract: ["modest", "detailed", "popular", "novel"], a: 1.25, b: -0.15,
  },
  {
    sentence: "The witness's account was ______: no two listeners could agree on what she had said.",
    key: "vague", distract: ["concise", "emotional", "rehearsed", "graphic"], a: 1.25, b: 0.0,
    // elaboration colon: the second clause defines the blank
  },
  {
    sentence: "Once feared as incorruptible, the judge was later exposed as ______, taking payments from both sides.",
    key: "venal", distract: ["strict", "punctual", "eloquent", "retired"], a: 1.3, b: 0.3,
  },
  {
    sentence: "The scientist's claims, though initially dismissed as ______, were vindicated by two independent replications.",
    key: "outlandish", distract: ["cautious", "statistical", "modest", "routine"], a: 1.3, b: 0.5,
  },
  {
    sentence: "Because the evidence was entirely circumstantial, the prosecutor's case rested on inference rather than ______.",
    key: "proof", distract: ["motive", "theater", "rumor", "instinct"], a: 1.3, b: 0.6,
  },
  {
    sentence: "A superb advocate but a poor colleague, she was admired and ______ in equal measure.",
    key: "resented", distract: ["promoted", "imitated", "consulted", "rewarded"], a: 1.35, b: 0.7,
    // paired-frame: the blank must mirror "admired" on the negative side
  },
  {
    sentence: "The manuscript's prose is ______: every clause is pared to the bone, yet nothing essential is lost.",
    key: "spare", distract: ["ornate", "rambling", "cluttered", "archaic"], a: 1.35, b: 0.9,
  },
  {
    sentence: "No longer content to ______ tradition, the young architects set out to dismantle its very foundations.",
    key: "uphold", distract: ["study", "critique", "mock", "question"], a: 1.35, b: 1.2,
    // three distractors already agree with the dismantling; only "uphold" opposes it
  },
  {
    sentence: "The dictator's apology struck many as ______: a public performance of remorse without a particle of it.",
    key: "hollow", distract: ["heartfelt", "sincere", "eloquent", "delayed"], a: 1.35, b: 1.4,
  },
  {
    sentence: "Neither willing to condemn the rebellion nor to ______ it, the senator proposed a compromise resolution.",
    key: "endorse", distract: ["suppress", "investigate", "postpone", "attend"], a: 1.4, b: 1.7,
    // neither/nor frame demands the pro-side verb; "suppress" doubles the anti-side
  },
  {
    sentence: "So ______ was the scholar's command of twelve languages that colleagues joked she dreamed in footnotes.",
    key: "prodigious", distract: ["pedantic", "casual", "recent", "narrow"], a: 1.4, b: 2.0,
  },
  {
    sentence: "His plan to revive the failed venture struck the board as ______, a fantasy unsupported by a single figure in the ledger.",
    key: "chimerical", distract: ["lucrative", "frugal", "timid", "mundane"], a: 1.4, b: 2.4,
    // rare keyed word under an apposition frame that glosses it
  },
];

function buildItem(datum: CompletionDatum, id: string): Item {
  const options = [datum.key, ...datum.distract];
  if (new Set(options).size !== 5) throw new Error(id + " duplicate option");
  if (datum.sentence.includes(datum.key)) throw new Error(id + " leaks the key in its own sentence");
  return {
    id,
    subtest: "sentenceCompletion",
    broad: "Gc",
    narrow: "LD",
    a: datum.a,
    b: datum.b,
    c: 0.2,
    prompt: datum.sentence + "\n\nFill the blank with the choice that best completes the sentence.",
    options,
    answer: 0,
    render: { kind: "text" },
  };
}

// The keyed option must NOT sit at a fixed display index: rotate each option
// set deterministically so the authored index varies across the bank.
function rotateOptions(item: Item, k: number): Item {
  const n = item.options!.length;
  const r = ((k * 3 + Math.round(item.b * 7)) % n + n) % n;
  const display = [...item.options!.slice(r), ...item.options!.slice(0, r)];
  return { ...item, options: display, answer: display.indexOf(item.options![0]!) };
}

export const sentenceCompletion: Subtest = {
  id: "sentenceCompletion",
  name: "Sentence Completion",
  broad: "Gc",
  narrow: ["LD"],
  instructions:
    "Each sentence contains one blank. Choose the word that best completes the sentence in both meaning and tone. Consider every choice before deciding.",
  budgetMin: 10,
  routing: { maxItems: 10, minItems: 5, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  practice: [
    {
      id: "prac-sc-01", subtest: "sentenceCompletion", broad: "Gc", narrow: "LD",
      a: 1.1, b: -3, c: 0.2,
      prompt: "Because it had not rained for weeks, the fields were extremely ______.\n\nFill the blank with the choice that best completes the sentence.",
      options: ["wet", "green", "dry", "planted", "large"],
      answer: 2,
      render: { kind: "text" },
    },
    {
      id: "prac-sc-02", subtest: "sentenceCompletion", broad: "Gc", narrow: "LD",
      a: 1.1, b: -3, c: 0.2,
      prompt: "Unlike her talkative brother, Mia was remarkably ______.\n\nFill the blank with the choice that best completes the sentence.",
      options: ["loud", "friendly", "tall", "quiet", "kind"],
      answer: 3,
      render: { kind: "text" },
    },
  ],
  items: DATA.map((d, i) =>
    rotateOptions(buildItem(d, "sc-" + String(i + 1).padStart(3, "0")), i),
  ),
};
