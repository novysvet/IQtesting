import test from "node:test";
import assert from "node:assert/strict";
import { antonyms } from "../src/items/gc-antonyms.ts";
import { lexiconData } from "../src/items/gc.ts";

/**
 * Antonyms (ant-001..037): keys are double-entered — this file holds an
 * INDEPENDENT stem->opposite table and an INDEPENDENT key-zipf table, and
 * the keyed option is located in the item's display order by lookup, never
 * by trusting the bank's index. Difficulty uses the ETS pair-minimum index
 * (Enright & Bejar RR-89-35): b = 4 - min(zipf(stem), zipf(key)). Stem zipfs
 * are cross-checked against lexiconData; key zipfs against this table
 * (values generated from the same wordfreq 'en' source via
 * tools/lexicon_zipf.py).
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

/** Independent wordfreq 'en' zipf of each KEY (double entry vs the bank). */
const KEY_ZIPF: Record<string, number> = {
  insignificant: 3.53, late: 5.34, right: 5.96, hard: 5.53, frail: 3.28,
  public: 5.57, simple: 5.08, filthy: 3.80, impoverished: 3.35, obscure: 3.85,
  harmless: 3.79, expensive: 4.69, deafening: 2.98, subtle: 4.08,
  replete: 2.91, protracted: 3.26, diffident: 2.10, cowardly: 3.42,
  trivial: 3.66, miserly: 2.33, eager: 4.03, rude: 4.25, yielding: 3.40,
  arrogant: 3.74, adept: 3.33, idealistic: 3.14, credulous: 2.29,
  reckless: 3.82, steadfast: 3.14, unconvincing: 2.69, obfuscate: 2.28,
  extol: 2.30, worsen: 3.06, mature: 4.28, humble: 4.11, avoidable: 2.97,
  disclose: 3.84,
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

test("every stem is an attested lexiconData key; b prices the PAIR minimum", () => {
  for (const item of antonyms.items) {
    const stem = stemOf(item.prompt);
    const row = lexiconData.find(([, w]) => w === stem);
    assert.ok(row, stem + " is not a lexiconData key word");
    const stemZipf = row![3]![0]!;
    const key = KEY_TABLE[stem]!;
    const keyZipf = KEY_ZIPF[key];
    assert.ok(keyZipf !== undefined, key + " missing from the independent key-zipf table");
    // ETS pair-minimum index (Enright & Bejar RR-89-35): the RARER of the
    // stem and the key sets difficulty — knowing "quiet -> DEAFENING"
    // requires the zipf-2.98 key, so b must reflect 2.98, not the stem's 4.65.
    const expected = Math.round((4 - Math.min(stemZipf, keyZipf)) * 100) / 100;
    assert.equal(
      item.b, expected,
      stem + "/" + key + " b drifts from the pair-minimum calibration (stem " +
        stemZipf + ", key " + keyZipf + ")",
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

test("corpus-capped honest span: floor <= -1.39, ceiling >= +2.28; a/c contract", () => {
  const bs = antonyms.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -1.39, "floor must reach -1.39 (the definable pool cap)");
  assert.ok(Math.max(...bs) >= +2.28, "ceiling must reach +2.28 (equivocate)");
  for (const item of antonyms.items) {
    assert.equal(item.c, 0.2, item.id + " c must equal 1/5");
    assert.ok(item.a >= 1.2 && item.a <= 1.5, item.id + " a outside band");
    assert.equal(item.subtest, "antonyms");
    assert.equal(item.narrow, "VL");
  }
});
