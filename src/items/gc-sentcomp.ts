import type { Item, Subtest } from "../core/types.ts";

/**
 * Gc - Sentence Completion (sc-001..032), narrow ability LD (language
 * development).
 *
 * FORMAT LINEAGE: the Sentence Completion section of the pre-1994 SAT/GRE
 * verbal battery. One blank (or, from sc-029, TWO blanks) in a sentence
 * whose surrounding structure — causal connectives, contrast frames ("far
 * from", "although"), elaboration colons — constrains the missing sense;
 * five choices, exactly one defensible. Two-blank items carry semicolon-
 * joined word pairs as options and are operationally harder: both blanks
 * must be satisfied and there is no partial credit (ETS sentence-completion
 * coding, Carlton/GREB).
 *
 * CALIBRATION STATUS: a/b are AUTHORED ESTIMATES anchored to two content
 * features (noted per item): the rarity of the keyed word and the density of
 * the logical constraints the sentence places on it. This bank is NOT
 * corpus-calibrated — completion difficulty is joint between vocabulary and
 * logic, and a blank word's lone zipf misprices items whose sentences carry
 * strong or weak scaffolding. Floor -2.0 (everyday vocabulary, one direct
 * causal cue), ceiling +2.6 (two-blank frame with register contrast).
 * a rises 1.1 -> 1.45 with constraint density. c = 1/5.
 *
 * The 2026-08-22 expansion (sc-021..032) widened the bank from 20 to 32
 * items: 20 items under maxItems 10 exposed half the bank per sitting and
 * nearly all of it after a few sittings.
 *
 * AUTHORING CONTRACT (machine-checked in test/sentence-completion.test.ts):
 * exactly one keyed choice; five distinct lowercase options (single words,
 * or semicolon-joined pairs on two-blank items); no option word appears
 * inside its own sentence; distractors are grammatical in the blank (same
 * part of speech as the key) so only semantics separate them.
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
  {
    // 2026-08-22 expansion (bank was 20 items for adaptive routing —
    // near-total exposure after a few sittings). sc-021..028 are single-blank
    // frames filling mid/top gaps; sc-029..032 are TWO-BLANK frames whose
    // options are semicolon-joined word pairs — operationally harder than
    // one-blank (both blanks must be satisfied; no partial credit), per the
    // ETS sentence-completion coding (Carlton, GREB coding scheme).
    sentence: "The trail was so ______ that even experienced hikers lost their way twice.",
    key: "winding", distract: ["short", "gentle", "crowded", "familiar"], a: 1.15, b: -1.4,
  },
  {
    sentence: "Instead of ______ the mistake, the report repeated it in bolder language.",
    key: "correcting", distract: ["noting", "hiding", "translating", "defending"], a: 1.2, b: -0.5,
  },
  {
    sentence: "Her essay was ______ in the best sense: not a word too many.",
    key: "economical", distract: ["verbose", "florid", "lengthy", "hasty"], a: 1.3, b: 0.2,
  },
  {
    sentence: "The bridge's collapse was not sudden; corrosion had ______ its cables for decades.",
    key: "weakened", distract: ["inspected", "strengthened", "bypassed", "shortened"], a: 1.3, b: 0.4,
  },
  {
    sentence: "A ______ administrator, he delegated freely and took credit sparingly.",
    key: "secure", distract: ["vain", "nervous", "petty", "domineering"], a: 1.35, b: 0.8,
  },
  {
    sentence: "The novel's charm is ______: it survives translation that flattens its wordplay.",
    key: "indestructible", distract: ["fragile", "linguistic", "momentary", "invisible"], a: 1.35, b: 1.0,
  },
  {
    sentence: "Far from ______, his loyalty was a thing bought and sold to the highest bidder each season.",
    key: "steadfast", distract: ["fickle", "recent", "noted", "sincere"], a: 1.4, b: 1.55,
    // far-from frame: "fickle" sits on the frame's wrong side and is the trap
  },
  {
    sentence: "The philosopher's prose is so ______ that each sentence must be unpacked like a statute.",
    key: "dense", distract: ["lucid", "brief", "elegant", "dated"], a: 1.4, b: 1.6,
  },
  {
    sentence: "The memoir is ______ yet never ______: every scandal is recounted, none is embellished.",
    key: "candid;sensational", distract: ["discreet;accurate", "frank;plodding", "brief;lurid", "dated;checked"], a: 1.4, b: 1.3,
    // two blanks: honesty affirmed, exaggeration denied by the gloss
  },
  {
    sentence: "Rather than ______ the dispute, the letter only ______ it, reviving grievances both sides had buried.",
    key: "settle;inflamed", distract: ["resolved;recorded", "escalated;soothed", "ignored;settled", "framed;concluded"], a: 1.45, b: 1.8,
  },
  {
    sentence: "Her criticism was ______ rather than ______: each objection targeted a specific flaw, and none was wasted on general complaint.",
    key: "surgical;scattershot", distract: ["vague;precise", "harsh;mild", "novel;familiar", "brief;angry"], a: 1.45, b: 2.3,
  },
  {
    sentence: "The policy's effects were ______: prosperity in the capitals, ______ decline in the provinces they no longer bothered to count.",
    key: "uneven;steady", distract: ["uniform;swift", "delayed;mild", "modest;chaotic", "brief;irregular"], a: 1.45, b: 2.6,
  },
];

function buildItem(datum: CompletionDatum, id: string): Item {
  const options = [datum.key, ...datum.distract];
  if (new Set(options).size !== 5) throw new Error(id + " duplicate option");
  // Leak check per WORD: on two-blank items the pair's halves must not
  // already sit in the sentence.
  for (const option of options) {
    for (const word of option.split(";")) {
      if (datum.sentence.toLowerCase().includes(word.toLowerCase())) {
        throw new Error(id + " leaks option word '" + word + "' in its own sentence");
      }
    }
  }
  // Two-blank items must carry exactly two blanks; single-blank exactly one.
  const blanks = (datum.sentence.match(/______/g) ?? []).length;
  const wordsPerOption = datum.key.split(";").length;
  if (blanks !== wordsPerOption) throw new Error(id + " has " + blanks + " blanks but " + wordsPerOption + " words per option");
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
    "Each sentence contains one or two blanks. Choose the option that best completes the sentence in both meaning and tone. Consider every choice before deciding. This section measures your own vocabulary and knowledge: answer without dictionaries, translators, search engines, or any other outside help.",
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
