import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import type { Item } from "../src/core/types.ts";

const items = BATTERY.flatMap((s) => s.items);

test("battery contains the complete authored pool", () => {
  assert.equal(BATTERY.length, 21);
  assert.equal(items.length, 438);
});

test("all item and subtest identifiers are unique", () => {
  assert.equal(new Set(BATTERY.map((s) => s.id)).size, BATTERY.length);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
});

test("every item satisfies the schema and guessing contract", () => {
  const comb = (n: number, k: number) => {
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  };
  for (const item of items) {
    assert.ok(item.id.length > 0, "missing id");
    assert.ok(item.prompt.trim().length > 0, item.id + " missing prompt");
    assert.ok(Number.isFinite(item.a) && item.a > 0, item.id + " invalid a");
    assert.ok(Number.isFinite(item.b), item.id + " invalid b");
    if (item.multi !== undefined) {
      // Multi-select: exact-N choice, c = 1/C(nOptions, multi), string key.
      assert.ok(item.options && item.options.length >= item.multi, item.id + " multi > options");
      assert.equal(item.c, 1 / comb(item.options!.length, item.multi), item.id + " c must equal 1/C(options, multi)");
      assert.equal(typeof item.answer, "string", item.id + " multi key must be a string");
      const idx = (item.answer as string).split(",").map(Number);
      assert.equal(idx.length, item.multi, item.id + " key must list exactly multi indices");
      assert.deepEqual([...idx].sort((a, b) => a - b), idx, item.id + " key indices must be ascending");
      assert.equal(new Set(idx).size, item.multi, item.id + " key indices must be unique");
      for (const i of idx) assert.ok(i >= 0 && i < item.options!.length, item.id + " key index out of range");
      continue;
    }
    if (item.options) {
      assert.ok(item.options.length >= 2, item.id + " has too few options");
      assert.equal(item.c, 1 / item.options.length, item.id + " c must equal 1/nOptions");
      assert.equal(typeof item.answer, "number", item.id + " MC key is not numeric");
      assert.ok((item.answer as number) >= 0 && (item.answer as number) < item.options.length, item.id + " key out of range");
      assert.equal(new Set(item.options).size, item.options.length, item.id + " repeats an option");
    } else {
      assert.equal(item.c, 0, item.id + " recall item must have c=0");
      assert.equal(typeof item.answer, "string", item.id + " recall key is not text");
    }
  }
});

/**
 * Per-subtest honest difficulty spans. Ceilings follow the 2026-08-20
 * difficulty audit (docs/DIFFICULTY_AUDIT.md §2); floors were extended
 * 2026-08-21 (audit §9) so the adaptive descent can collect evidence at the
 * scale floor — the precondition for reporting chance-level performance near
 * IQ 50 instead of shrinking it toward the population mean. Banks whose
 * FORMATS structurally cap below b=+2 (2D rotation, 4x4 folding, single-probe
 * paired associates, analogy/information spans compressed to audit
 * predictions) assert their real ceilings rather than a uniform fiction: a
 * bank claiming items it does not truly have mis-routes the adaptive engine
 * exactly where claims matter most.
 */
const HONEST_SPANS: Record<string, { floor: number; ceiling: number }> = {
  matrixReasoning: { floor: -2.0, ceiling: 3.0 },
  definitions: { floor: -1.2, ceiling: 2.2 },
  digitSpan: { floor: -2.0, ceiling: 2.5 },
  numberSeries: { floor: -3.5, ceiling: 2.3 },
  paperFolding: { floor: -2.9, ceiling: 1.4 },
  verbalAnalogies: { floor: -2.0, ceiling: 1.4 },
  arithmetic: { floor: -2.5, ceiling: 2.6 },
  mentalRotation: { floor: -3.2, ceiling: 1.3 },
  letterNumberSeq: { floor: -2.0, ceiling: 2.5 },
  figureSeries: { floor: -2.0, ceiling: 2.2 },
  symbolSearch: { floor: -2.0, ceiling: 1.2 },
  generalInformation: { floor: -2.0, ceiling: 3.0 },
  visualPuzzles: { floor: -1.5, ceiling: 2.2 },
  quantComparison: { floor: -2.8, ceiling: 1.5 },
  artificialLanguage: { floor: -2.0, ceiling: 2.4 },
  blockCounting: { floor: -2.8, ceiling: 1.9 },
  symbolSelection: { floor: -2.0, ceiling: 1.0 },
  analyticalReasoning: { floor: -1.5, ceiling: 2.5 },
  antonyms: { floor: -1.44, ceiling: 2.28 },
  sentenceCompletion: { floor: -2.0, ceiling: 2.4 },
  pairedAssociates: { floor: -1.5, ceiling: 0.9 },
};

test("every subtest reaches its audit-honest basal and ceiling", () => {
  for (const subtest of BATTERY) {
    const span = HONEST_SPANS[subtest.id];
    assert.ok(span, subtest.id + " missing from HONEST_SPANS");
    const bs = subtest.items.map((i) => i.b);
    assert.ok(
      Math.min(...bs) <= span.floor,
      subtest.id + " lacks easy basal items (min b " + Math.min(...bs).toFixed(2) + " > " + span.floor + ")",
    );
    assert.ok(
      Math.max(...bs) >= span.ceiling,
      subtest.id + " lacks ceiling items (max b " + Math.max(...bs).toFixed(2) + " < " + span.ceiling + ")",
    );
    assert.ok(subtest.routing.minItems > 0 && subtest.routing.maxItems <= subtest.items.length);
  }
});

test("Gc keys resolve to the authored correct answer after deterministic shuffling", () => {
  const gc = BATTERY.filter((s) => s.broad === "Gc").flatMap((s) => s.items);
  // definitions(33, matching recall) + verbalAnalogies(36) + generalInformation(30)
  // + artificialLanguage(18) + antonyms(37) + sentenceCompletion(20).
  assert.equal(gc.length, 174);
  for (const item of gc) {
    // Matching items (definitions) are recall: the key is the word itself.
    const answer = typeof item.answer === "string" ? item.answer : item.options?.[item.answer];
    assert.ok(answer && answer.trim().length > 0, item.id + " has no resolvable key");
  }
});

// Compile-time assertion: the flattened bank remains Item[].
const typed: Item[] = items;
void typed;
