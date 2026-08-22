import test from "node:test";
import assert from "node:assert/strict";
import { sentenceCompletion } from "../src/items/gc-sentcomp.ts";

/**
 * Sentence Completion (sc-001..020): keys are double-entered — this file
 * holds an independent sentence-fragment -> key table, and the keyed option
 * is located by lookup, never by trusting the bank's index. Structural
 * authoring contract (distinct lowercase options, no key leakage into the
 * sentence) is re-checked here.
 */

const KEY_TABLE: [RegExp, string][] = [
  [/forgotten my umbrella/, "soaked"],
  [/glass of water in one/, "gulp"],
  [/cake looked beautiful/, "bitter"],
  [/champion praised her opponent/, "boastful"],
  [/struggled to stay awake/, "dull"],
  [/spoonful of honey/, "mask"],
  [/carefully prepared over several weeks/, "spontaneous"],
  [/removed every quotation/, "scathing"],
  [/rejected the budget/, "unrealistic"],
  [/no two listeners could agree/, "vague"],
  [/payments from both sides/, "venal"],
  [/independent replications/, "outlandish"],
  [/circumstantial, the prosecutor/, "proof"],
  [/admired and .* in equal measure/, "resented"],
  [/pared to the bone/, "spare"],
  [/dismantle its very foundations/, "uphold"],
  [/performance of remorse/, "hollow"],
  [/compromise resolution/, "endorse"],
  [/dreamed in footnotes/, "prodigious"],
  [/figure in the ledger/, "chimerical"],
  // 2026-08-22 expansion (sc-021..032); the last four are two-blank frames.
  [/experienced hikers lost their way/, "winding"],
  [/repeated it in bolder language/, "correcting"],
  [/not a word too many/, "economical"],
  [/corrosion had .* its cables/, "weakened"],
  [/delegated freely and took credit sparingly/, "secure"],
  [/survives translation/, "indestructible"],
  [/bought and sold to the highest bidder/, "steadfast"],
  [/unpacked like a statute/, "dense"],
  [/every scandal is recounted/, "candid;sensational"],
  [/reviving grievances/, "settle;inflamed"],
  [/none was wasted on general complaint/, "surgical;scattershot"],
  [/provinces they no longer bothered to count/, "uneven;steady"],
];

test("subtest metadata and routing match the frozen spec", () => {
  assert.equal(sentenceCompletion.id, "sentenceCompletion");
  assert.equal(sentenceCompletion.name, "Sentence Completion");
  assert.equal(sentenceCompletion.broad, "Gc");
  assert.deepEqual(sentenceCompletion.narrow, ["LD"]);
  assert.equal(sentenceCompletion.budgetMin, 10);
  assert.deepEqual(sentenceCompletion.routing, {
    maxItems: 10, minItems: 5, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0,
  });
});

test("ids are exactly sc-001..sc-032 plus two practice items; prompts unique", () => {
  assert.deepEqual(
    sentenceCompletion.items.map((i) => i.id),
    Array.from({ length: 32 }, (_, k) => "sc-" + String(k + 1).padStart(3, "0")),
  );
  assert.equal(new Set(sentenceCompletion.items.map((i) => i.prompt)).size, 32);
});

test("every item matches exactly one table entry and keys resolve to it", () => {
  const seen = new Set<number>();
  for (const item of sentenceCompletion.items) {
    const hits = KEY_TABLE.map(([re], idx) => (re.test(item.prompt) ? idx : -1)).filter((i) => i >= 0);
    assert.equal(hits.length, 1, item.id + " matches " + hits.length + " table entries");
    seen.add(hits[0]!);
    const expected = KEY_TABLE[hits[0]!]![1];
    assert.equal(item.options![item.answer as number], expected, item.id + " keyed option is not the table's word");
  }
  assert.equal(seen.size, KEY_TABLE.length, "a table entry matched no item");
});

test("authoring contract: five distinct lowercase options, no stem leakage, blank count matches option shape", () => {
  for (const item of [...sentenceCompletion.items, ...(sentenceCompletion.practice ?? [])]) {
    assert.equal(item.options!.length, 5, item.id + " must offer five choices");
    assert.equal(new Set(item.options).size, 5, item.id + " repeats an option");
    // Options are single lowercase words, or (two-blank items) semicolon-
    // joined pairs of lowercase words — both blanks must be satisfiable.
    for (const o of item.options!) {
      assert.match(o!, /^[a-z]+(;[a-z]+)?$/, item.id + " option not lowercase word(s)");
    }
    const sentence = item.prompt.split("\n")[0]!;
    const blanks = (sentence.match(/______/g) ?? []).length;
    const wordsPerOption = item.options![0]!.split(";").length;
    assert.ok(blanks >= 1, item.id + " sentence has no blank");
    assert.equal(blanks, wordsPerOption, item.id + " blank count does not match option shape");
    for (const o of item.options!) {
      for (const word of o.split(";")) {
        assert.ok(!sentence.toLowerCase().includes(word), item.id + " leaks option word " + word + " in its own sentence");
      }
    }
  }
});

test("authored span -2.0..+2.6 with a/c contract", () => {
  const bs = sentenceCompletion.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.0, "floor must reach -2.0");
  assert.ok(Math.max(...bs) >= +2.6, "ceiling must reach +2.6");
  for (const item of sentenceCompletion.items) {
    assert.equal(item.c, 0.2, item.id + " c must equal 1/5");
    assert.ok(item.a >= 1.1 && item.a <= 1.5, item.id + " a outside band");
    assert.ok(item.b > item.a - 10); // sanity
  }
});
