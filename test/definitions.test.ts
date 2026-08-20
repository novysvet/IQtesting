import test from "node:test";
import assert from "node:assert/strict";
import { definitions } from "../src/items/gc-definitions.ts";
import { lexiconData } from "../src/items/gc.ts";

/**
 * Definitions (1926-SAT matching format) regression.
 *
 * The subtest is one whole page: 33 numbered definitions ("(n)" stands in
 * for the keyed word, n = the item's 1-based position in `items`) plus a
 * 66-word matching bank holding the 33 keys and 33 fillers. These tests pin
 * the frozen spec, the corpus-calibrated difficulty ladder (b = 4 - zipf of
 * the keyed lexiconData row), page-order decorrelation from difficulty, the
 * stem-leak rule (no bank word may occur inside ANY definition), and the
 * register balance between keys and fillers.
 */

const bank: string[] = definitions.matching?.bank ?? [];
const answers: string[] = definitions.items.map((item) => item.answer as string);

function rowOf(word: string) {
  return lexiconData.find((datum) => datum[1] === word);
}

/** Zipf of a bank word: zipfs[0] when it is a row key, else its pool slot. */
function zipfOf(word: string): number | undefined {
  const asKey = rowOf(word);
  if (asKey) return asKey[3][0];
  for (const datum of lexiconData) {
    const idx = datum[2].indexOf(word);
    if (idx >= 0) return datum[3][idx + 1] ?? undefined;
  }
  return undefined;
}

function keyZipf(word: string): number {
  const row = rowOf(word);
  assert.ok(row, "bank word is not a lexiconData key: " + word);
  return row![3][0];
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

test("definitions subtest matches the frozen 1926-format specification", () => {
  assert.equal(definitions.id, "definitions");
  assert.equal(definitions.name, "Definitions");
  assert.equal(definitions.broad, "Gc");
  assert.deepEqual(definitions.narrow, ["VL"]);
  assert.equal(definitions.budgetMin, 8);
  assert.deepEqual(definitions.routing, {
    maxItems: 33,
    minItems: 33,
    ceilingMisses: 99,
    targetSe: 0.01,
    entryTheta: 0,
  });
  assert.ok(definitions.matching, "matching (whole-page) config missing");
  assert.equal(
    definitions.instructions,
    "Thirty-three definitions are given. From each definition the word defined has been omitted and a number substituted. " +
      "Beside each word in the list of sixty-six, enter the number of the definition it satisfies. " +
      "Thirty-three of the words fit the definitions exactly; thirty-three do not.",
  );
  for (const item of definitions.items) {
    assert.equal(item.subtest, "definitions");
    assert.equal(item.broad, "Gc");
    assert.equal(item.narrow, "VL");
    assert.equal(item.c, 0, item.id + " must model no guessing floor");
    assert.equal(item.a, 1.2, item.id + " discrimination prior");
    assert.deepEqual(item.render, { kind: "text" });
    assert.equal(typeof item.answer, "string", item.id + " answer must be the key word string");
    assert.equal(item.options, undefined, item.id + " matching items carry no MC options");
    assert.ok(item.prompt.trim().length > 0, item.id + " empty prompt");
  }
});

test("33 items dfn-001..033 in page order; 66-word bank unique, lowercase, alphabetical", () => {
  assert.equal(definitions.items.length, 33);
  definitions.items.forEach((item, i) => {
    assert.equal(item.id, "dfn-" + String(i + 1).padStart(3, "0"), "id must encode 1-based page position");
  });
  assert.equal(bank.length, 66);
  assert.equal(new Set(bank).size, 66, "bank holds duplicate words");
  for (const word of bank) assert.match(word, /^[a-z]+$/, "bank word must be pure lowercase");
  for (let i = 1; i < bank.length; i++) {
    assert.ok((bank[i - 1] as string) < (bank[i] as string), "bank not strictly alphabetical at " + (bank[i] as string));
  }
  for (const answer of answers) {
    assert.equal(bank.filter((w) => w === answer).length, 1, '"' + answer + '" must appear in the bank exactly once');
  }
});

test("difficulty is exactly the lexicon calibration b = 4 - zipf(key); ladder has no unforced gap > 0.45", () => {
  const bs: number[] = [];
  for (const item of definitions.items) {
    const row = rowOf(item.answer as string);
    assert.ok(row, item.id + ' answer "' + item.answer + '" is not a lexiconData key');
    assert.equal(item.b, Number((4 - row![3][0]).toFixed(2)), item.id + " b does not match lexicon zipf");
    bs.push(item.b);
  }
  // Frozen selection mandates the 5 easiest and 4 hardest lexicon keys.
  for (const word of ["important", "early", "wrong", "easy", "strong", "inchoate", "supercilious", "ineluctable", "equivocate"]) {
    assert.ok(answers.includes(word), "mandated key missing from the page: " + word);
  }
  assert.ok(Math.min(...bs) <= -1.2, "no basal coverage");
  assert.ok(Math.max(...bs) >= 2.2, "no ceiling coverage");

  const sorted = [...bs].sort((p, q) => p - q);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(Number((sorted[i]! - sorted[i - 1]!).toFixed(4)));
  const wide = gaps.filter((g) => g > 0.45);
  // Exactly one >0.45 step is forced by the source bank: no lexiconData key
  // has b in (1.44, 1.94), so mandating inchoate (b 1.94) leaves a 0.50 jump
  // above ameliorate (b 1.44) no matter which 33 rows are chosen. Any other
  // wide gap — or a wide gap that some unchosen row could fill — is a fault.
  assert.equal(wide.length, 1, "expected only the forced ceiling jump; wide gaps: " + JSON.stringify(wide));
  assert.ok(wide[0]! <= 0.51, "forced ceiling jump larger than the lexicon minimum");
  const j = gaps.findIndex((g) => g > 0.45);
  const lo = sorted[j] as number;
  const hi = sorted[j + 1] as number;
  assert.ok(
    !lexiconData.some((datum) => {
      const b = 4 - datum[3][0];
      return b > lo + 1e-9 && b < hi - 1e-9;
    }),
    "a >0.45 ladder gap could have been filled from lexiconData",
  );
});

test("page order is decorrelated from difficulty (|Pearson r| < 0.5, extremes spread >= 20 positions)", () => {
  const numbers = definitions.items.map((_, i) => i + 1);
  const bs = definitions.items.map((item) => item.b);
  const r = pearson(numbers, bs);
  assert.ok(Math.abs(r) < 0.5, "|r| between definition number and b is " + r.toFixed(3));

  const byEase = [...answers].sort((p, q) => keyZipf(q) - keyZipf(p));
  const easiest5 = byEase.slice(0, 5);
  const hardest4 = byEase.slice(-4);
  assert.deepEqual([...easiest5].sort(), ["early", "easy", "important", "strong", "wrong"], "5 easiest keys");
  assert.deepEqual([...hardest4].sort(), ["equivocate", "inchoate", "ineluctable", "supercilious"], "4 hardest keys");
  const positions = [...easiest5, ...hardest4].map((word) => definitions.items.findIndex((item) => item.answer === word) + 1);
  assert.ok(positions.every((p) => p > 0), "an extreme key is missing from the page");
  assert.equal(new Set(positions).size, 9, "extreme keys must not share positions");
  // "Spread over >= 20 distinct positions": with one item per numbered slot,
  // the 9 extremes must span at least 20 numbered positions (range >= 19).
  const spread = Math.max(...positions) - Math.min(...positions) + 1;
  assert.ok(spread >= 20, "9 easiest/hardest keys span only " + spread + " positions");
});

test("no bank word leaks into any definition; each stem carries exactly its own (n)", () => {
  const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  definitions.items.forEach((item, i) => {
    const tokens = [...item.prompt.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
    assert.equal(tokens.length, 1, item.id + " must carry exactly one '(n)' token");
    assert.equal(tokens[0], i + 1, item.id + " (n) must equal its 1-based page position");
    assert.ok(
      !new RegExp("\\b" + escape(item.answer as string) + "\\b", "i").test(item.prompt),
      item.id + " definition contains its own key word",
    );
  });
  for (const word of bank) {
    const pattern = new RegExp("\\b" + escape(word) + "\\b", "i");
    for (const item of definitions.items) {
      assert.ok(!pattern.test(item.prompt), 'bank word "' + word + '" leaks into ' + item.id);
    }
  }
});

test("register balance: 33 fillers, none a chosen key, mean filler zipf within 1.2 of keys'", () => {
  const answerSet = new Set(answers);
  const fillers = bank.filter((w) => !answerSet.has(w));
  assert.equal(fillers.length, 33, "bank must hold exactly 33 non-key fillers");
  for (const filler of fillers) {
    assert.ok(!answerSet.has(filler), 'filler "' + filler + '" is the key of a chosen item');
  }
  const keyMean = answers.reduce((s, w) => s + keyZipf(w), 0) / answers.length;
  const fillerZipfs: number[] = [];
  for (const filler of fillers) {
    const z = zipfOf(filler);
    assert.ok(z !== undefined, 'filler "' + filler + '" has no lexiconData zipf');
    fillerZipfs.push(z ?? 0);
  }
  const fillerMean = fillerZipfs.reduce((s, z) => s + z, 0) / fillerZipfs.length;
  assert.ok(
    Math.abs(fillerMean - keyMean) <= 1.2,
    "filler mean zipf " + fillerMean.toFixed(2) + " vs key mean " + keyMean.toFixed(2),
  );
});
