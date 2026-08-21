import test from "node:test";
import assert from "node:assert/strict";
import { antonyms } from "../src/items/gc-antonyms.ts";
import { lexiconData } from "../src/items/gc.ts";

/**
 * Antonyms (ant-001..037): keys are double-entered — this file holds an
 * INDEPENDENT stem->opposite table, and the keyed option is located in the
 * item's display order by lookup, never by trusting the bank's index.
 * Difficulty is corpus-calibrated: b must equal 4 - zipf(stem), with every
 * stored zipf cross-checked against lexiconData so both Gc/VL banks can
 * never silently disagree about a word's frequency.
 */

const KEY_TABLE: Record<string, string> = {
  important: "insignificant", early: "late", wrong: "right", easy: "hard",
  strong: "frail", private: "public", difficult: "simple", clean: "filthy",
  rich: "impoverished", famous: "obscure", dangerous: "harmless",
  cheap: "expensive", quiet: "deafening", obvious: "subtle", empty: "replete",
  brief: "protracted", confident: "diffident", brave: "cowardly",
  crucial: "trivial", generous: "miserly", reluctant: "eager", polite: "rude",
  tenacious: "yielding", meek: "arrogant", inept: "adept",
  pragmatic: "idealistic", skeptical: "credulous", prudent: "reckless",
  capricious: "steadfast", cogent: "unconvincing", elucidate: "obfuscate",
  disparage: "extol", ameliorate: "worsen", inchoate: "mature",
  supercilious: "humble", ineluctable: "avoidable", equivocate: "disclose",
};

function stemOf(prompt: string): string {
  const m = /^Choose the word most nearly OPPOSITE in meaning to ([A-Z]+)\.$/.exec(prompt);
  assert.ok(m, "malformed antonym prompt: " + prompt);
  return m[1]!.toLowerCase();
}

test("subtest metadata and routing match the frozen spec", () => {
  assert.equal(antonyms.id, "antonyms");
  assert.equal(antonyms.name, "Antonyms");
  assert.equal(antonyms.broad, "Gc");
  assert.deepEqual(antonyms.narrow, ["VL"]);
  assert.equal(antonyms.budgetMin, 10);
  assert.deepEqual(antonyms.routing, {
    maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0,
  });
});

test("ids are exactly ant-001..ant-037 plus two practice items; stems unique", () => {
  assert.deepEqual(
    antonyms.items.map((i) => i.id),
    Array.from({ length: 37 }, (_, k) => "ant-" + String(k + 1).padStart(3, "0")),
  );
  const stems = antonyms.items.map((i) => stemOf(i.prompt));
  assert.equal(new Set(stems).size, stems.length, "a stem repeats");
});

test("every stem is an attested lexiconData key and its stored zipf matches", () => {
  for (const item of antonyms.items) {
    const stem = stemOf(item.prompt);
    const row = lexiconData.find(([, w]) => w === stem);
    assert.ok(row, stem + " is not a lexiconData key word");
    const attested = row![3]![0]!;
    const expected = Math.round((4 - attested) * 100) / 100;
    assert.equal(
      item.b, expected,
      stem + " b drifts from the corpus calibration (zipf " + attested + ")",
    );
  }
});

test("keys re-derive from the independent table; options are clean single words", () => {
  for (const item of [...antonyms.items]) {
    const stem = stemOf(item.prompt);
    const key = KEY_TABLE[stem];
    assert.ok(key, "no independent key entry for " + stem);
    assert.equal(item.options!.length, 5, item.id + " must offer five choices");
    assert.equal(new Set(item.options).size, 5, item.id + " repeats an option");
    for (const o of item.options!) {
      assert.match(o!, /^[a-z-]+$/, item.id + " option " + o + " is not a lowercase single word");
      assert.notEqual(o, stem, item.id + " offers its own stem as a choice");
    }
    assert.equal(item.options![item.answer as number], key, item.id + " keyed option is not the table's opposite");
    // The key may not be a synonym giveaway: it must differ from all distractors.
    assert.ok(item.options!.filter((o) => o === key).length === 1);
  }
});

test("corpus-capped honest span: floor <= -1.44, ceiling >= +2.28; a/c contract", () => {
  const bs = antonyms.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -1.44, "floor must reach -1.44 (the definable pool cap)");
  assert.ok(Math.max(...bs) >= +2.28, "ceiling must reach +2.28 (equivocate)");
  for (const item of antonyms.items) {
    assert.equal(item.c, 0.2, item.id + " c must equal 1/5");
    assert.ok(item.a >= 1.2 && item.a <= 1.5, item.id + " a outside band");
    assert.equal(item.subtest, "antonyms");
    assert.equal(item.narrow, "VL");
  }
});
