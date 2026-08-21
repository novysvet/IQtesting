import test from "node:test";
import assert from "node:assert/strict";
import { symbolSearch } from "../src/items/gs-symsearch.ts";
import type { Item, ItemRender } from "../src/core/types.ts";

// ============================================================================
// Symbol Search: every key and every construction rule of the bank contract
// is re-derived here from the render payload alone. The bank never
// hand-authors an answer - answer = 1 iff some target glyph string occurs
// in the search array - and this file enforces that, plus the Yes/No
// balance, near-miss coverage, index spread and stimulus-uniqueness rules.
// ============================================================================

type SymSearchRender = Extract<ItemRender, { kind: "symsearch" }>;

const SHAPES = new Set(["tri", "sq", "cir", "dia", "hex", "arw", "cross", "star"]);
const FILLS = new Set(["none", "half", "solid", "hatch"]);
const PROMPT = "Is either target symbol present in the search group?";

const items = symbolSearch.items;

function ss(item: Item): SymSearchRender {
  const r = item.render;
  if (!r || r.kind !== "symsearch") {
    throw new Error(item.id + ": expected a symsearch render payload");
  }
  return r;
}

function shapeOf(g: string): string {
  return g.split(":")[0] ?? "";
}

/** Near-miss per the bank contract: same shape family, different glyph
 *  (differs in fill, or in rotation, or both). */
function nearMissOf(g: string, target: string): boolean {
  return shapeOf(g) === shapeOf(target) && g !== target;
}

test("subtest metadata matches the frozen spec", () => {
  assert.equal(symbolSearch.id, "symbolSearch");
  assert.equal(symbolSearch.name, "Symbol Search");
  assert.equal(symbolSearch.broad, "Gs");
  assert.deepEqual(symbolSearch.narrow, ["P"]);
  assert.equal(symbolSearch.budgetMin, 3);
  assert.deepEqual(symbolSearch.routing, {
    maxItems: 24, minItems: 10, ceilingMisses: 6, targetSe: 0.5, entryTheta: 0,
  });
  assert.equal(items.length, 30);
});

test("item shells: ids ssr-001..030, unique, options/c/prompt/subtest tags", () => {
  assert.equal(new Set(items.map((i) => i.id)).size, 30, "duplicate ids");
  items.forEach((item, i) => {
    assert.equal(item.id, "ssr-" + String(i + 1).padStart(3, "0"), "id sequence");
    assert.equal(item.subtest, "symbolSearch");
    assert.equal(item.broad, "Gs");
    assert.equal(item.narrow, "P");
    assert.deepEqual(item.options, ["No", "Yes"], item.id + " options");
    assert.equal(item.c, 0.5, item.id + " c");
    assert.ok(item.answer === 0 || item.answer === 1, item.id + " answer not 0/1");
    assert.equal(item.prompt, PROMPT, item.id + " prompt must be uniform");
  });
});

test("every glyph in targets and search parses against the Figure grammar", () => {
  for (const item of items) {
    const r = ss(item);
    assert.equal(r.targets.length, 2, item.id + " needs exactly 2 targets");
    assert.ok(
      r.search.length >= 5 && r.search.length <= 8,
      item.id + " search row must hold 5-8 glyphs",
    );
    for (const g of [...r.targets, ...r.search]) {
      const bits = g.split(":");
      assert.equal(bits.length, 4, item.id + " glyph not shape:1:fill:rot: " + g);
      assert.ok(SHAPES.has(bits[0] ?? ""), item.id + " bad shape in " + g);
      assert.equal(bits[1], "1", item.id + " count must be 1 in " + g);
      assert.ok(FILLS.has(bits[2] ?? ""), item.id + " bad fill in " + g);
      const rot = bits[3] ?? "";
      assert.ok(
        rot === "0" || rot === "45",
        item.id + " rot must be the integer 0 or 45 in " + g,
      );
    }
  }
});

test("answers are re-derived from set membership over the render payload", () => {
  for (const item of items) {
    const r = ss(item);
    const derived = r.targets.some((t) => r.search.includes(t)) ? 1 : 0;
    assert.equal(derived, item.answer, item.id + " key does not follow membership");
  }
});

test("exactly 15 Yes and 15 No items", () => {
  const yes = items.filter((i) => i.answer === 1).length;
  const no = items.filter((i) => i.answer === 0).length;
  assert.equal(yes, 15);
  assert.equal(no, 15);
});

test("No items: no target present, distinct targets, >=2 near-misses", () => {
  for (const item of items.filter((i) => i.answer === 0)) {
    const r = ss(item);
    assert.notEqual(r.targets[0], r.targets[1], item.id + " targets not distinct");
    for (const g of r.search) {
      assert.ok(!r.targets.includes(g), item.id + " search row contains a target: " + g);
    }
    const nearMisses = r.search.filter((g) => r.targets.some((t) => nearMissOf(g, t)));
    assert.ok(
      nearMisses.length >= 2,
      item.id + " needs >=2 near-misses, has " + nearMisses.length,
    );
  }
});

test("Yes items: exactly one target exactly once, >=1 near-miss of the absent target, index band", () => {
  for (const item of items.filter((i) => i.answer === 1)) {
    const r = ss(item);
    const occurring = r.targets.filter((t) => r.search.includes(t));
    assert.equal(occurring.length, 1, item.id + " must embed exactly one target");
    const present = occurring[0]!;
    assert.equal(
      r.search.filter((g) => g === present).length,
      1,
      item.id + " embedded target must occur exactly once",
    );
    const absent = r.targets.find((t) => t !== present)!;
    assert.ok(
      r.search.some((g) => nearMissOf(g, absent)),
      item.id + " needs >=1 near-miss of the absent target",
    );
    // Index band: 1-based positions 1-4 for 5-glyph rows, 2-6 for 7-8 glyph
    // rows; 6-glyph rows sit between (0-based 1-4).
    const idx = r.search.indexOf(present);
    const len = r.search.length;
    const band: [number, number] = len <= 5 ? [0, 3] : len === 6 ? [1, 4] : [1, 5];
    assert.ok(
      idx >= band[0] && idx <= band[1],
      item.id + " embedded index " + idx + " outside band for length " + len,
    );
  }
});

test("embedded-target index spread across Yes items", () => {
  const placements = items
    .filter((i) => i.answer === 1)
    .map((i) => ({ id: i.id, idx: ss(i).search.indexOf(ss(i).targets.find((t) => ss(i).search.includes(t))!), len: ss(i).search.length }));
  const distinct = new Set(placements.map((p) => p.idx));
  assert.ok(distinct.size >= 4, "fewer than 4 distinct embedded indices");
  assert.ok(
    !placements.every((p) => p.idx <= 1),
    "embedded targets confined to the first two positions",
  );
  assert.ok(
    !placements.every((p) => p.idx >= p.len - 2),
    "embedded targets confined to the last two positions",
  );
});

// 2026-08-21 slot-balance regression: 13 of 15 Yes items embedded
// targets[0] while no No item contains any target, so "scan only the
// FIRST listed target; answer Yes iff found" scored 28/30 - the 15 No
// items are free hits for any exact-glyph target scan. Because every Yes
// item embeds exactly one target (test above), the two single-slot
// strategies sum to a constant: (15 + slot0) + (15 + slot1) = 45/30. A
// near-even split is therefore the optimum, pinning both at 22-23/30.
test("slot balance: embedded target sits in each targets slot ~half of the Yes items", () => {
  const yes = items.filter((i) => i.answer === 1);
  const slot0 = yes.filter((i) => ss(i).search.includes(ss(i).targets[0]!)).length;
  assert.ok(
    slot0 >= 6 && slot0 <= 9,
    "first-target embedding " + slot0 + "/15 outside the balanced 6..9 band",
  );
  // Direct strategy guard: scanning only one listed target must stay
  // near the 50%-base-rate floor (<= 24/30; chance-adjusted ceiling the
  // 6..9 band permits is 15 + 9 = 24).
  for (const slot of [0, 1] as const) {
    const hits = items.filter(
      (i) => (ss(i).search.includes(ss(i).targets[slot]!) ? 1 : 0) === i.answer,
    ).length;
    assert.ok(hits <= 24, "scan-only-targets[" + slot + "] scores " + hits + "/30");
  }
});

test("no duplicate glyphs in any search row; target pairs always distinct", () => {
  for (const item of items) {
    const r = ss(item);
    assert.equal(new Set(r.search).size, r.search.length, item.id + " duplicate search glyph");
    assert.notEqual(r.targets[0], r.targets[1], item.id + " duplicate target");
  }
});

test("b floor/ceiling span and a discrimination band", () => {
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.0 + 1e-9, "floor must reach -2.0");
  assert.ok(Math.max(...bs) >= 1.2 - 1e-9, "ceiling must reach +1.2");
  for (const item of items) {
    assert.ok(item.b >= -2.0 - 1e-9 && item.b <= 1.2 + 1e-9, item.id + " b out of span");
    assert.ok(item.a >= 1.1 && item.a <= 1.5, item.id + " a out of band");
  }
});

test("stimuli are not recycled: >=12 distinct search-row glyph multisets, all 30 stimuli unique", () => {
  const rowKeys = items.map((i) => [...ss(i).search].sort().join("|"));
  assert.ok(new Set(rowKeys).size >= 12, "fewer than 12 distinct search rows");
  const stimulusKeys = items.map((i) =>
    [...ss(i).targets].sort().join("|") + "||" + [...ss(i).search].sort().join("|"),
  );
  assert.equal(new Set(stimulusKeys).size, 30, "two items share an identical stimulus");
});

// 2026-08-20 adversarial-verification regression: the bank originally
// alternated Yes/No with item parity, making the key a deterministic
// function of difficulty position. The fixed bankOrder permutation exists
// to break that; these assertions pin it.
test("keys do not alternate with item parity or track difficulty position", () => {
  const keys = items.map((i) => i.answer as number);
  const parityMatches = keys.filter((k, i) => k === (i + 1) % 2).length;
  assert.ok(parityMatches < 20, "keys track item parity (" + parityMatches + "/30)");
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < keys.length; i++) {
    run = keys[i] !== keys[i - 1] ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  assert.ok(maxRun <= 5, "alternation run of " + maxRun + " is exploitable in a 2-option format");
  // Yes-rate must not differ sharply across the difficulty halves.
  const hi = items.filter((i) => i.b >= 0).map((i) => i.answer as number);
  const lo = items.filter((i) => i.b < 0).map((i) => i.answer as number);
  const rate = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(Math.abs(rate(hi) - rate(lo)) < 0.4, "Yes-rate splits by difficulty (" + rate(lo).toFixed(2) + " low vs " + rate(hi).toFixed(2) + " high)");
});
