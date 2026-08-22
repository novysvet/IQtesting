import test from "node:test";
import assert from "node:assert/strict";
import { symbolSearch } from "../src/items/gs-symsearch.ts";
import type { Item, ItemRender } from "../src/core/types.ts";

// ============================================================================
// Symbol Scan: every key and every construction rule of the bank contract
// is re-derived here from the render payload alone. The bank never
// hand-authors an answer - the trial builder derives answer = row index of
// the embedded target, or row.length (NO sentinel) when neither target
// occurs - and this file re-derives that independently, plus the hit/no-hit
// balance, near-miss coverage, slot balance, index spread, uniqueness rules,
// per-trial caps, and the guess-penalty contract.
// ============================================================================

type SymScanRender = Extract<ItemRender, { kind: "symscan" }>;

const SHAPES = new Set(["tri", "sq", "cir", "dia", "hex", "arw", "cross", "star"]);
const FILLS = new Set(["none", "half", "solid", "hatch"]);

const items = symbolSearch.items;

function scan(item: Item): SymScanRender {
  const r = item.render;
  if (!r || r.kind !== "symscan") {
    throw new Error(item.id + ": expected a symscan render payload");
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

/** Independent key derivation: the row index holding a target, else the row
 *  length (the NO-symbol sentinel). */
function derivedKey(r: SymScanRender): number {
  const idx = r.row.findIndex((g) => g === r.targets[0] || g === r.targets[1]);
  return idx === -1 ? r.row.length : idx;
}

test("subtest metadata matches the frozen spec", () => {
  assert.equal(symbolSearch.id, "symbolSearch");
  assert.equal(symbolSearch.name, "Symbol Scan");
  assert.equal(symbolSearch.broad, "Gs");
  assert.deepEqual(symbolSearch.narrow, ["P"]);
  assert.equal(symbolSearch.guessPenalty, true, "the guess-penalty flag must be set");
  assert.equal(symbolSearch.budgetMin, 2, "the block is a strict two-minute clock");
  assert.deepEqual(symbolSearch.routing, {
    maxItems: 40, minItems: 40, ceilingMisses: 6, targetSe: 0.5, entryTheta: 0,
  });
  assert.equal(items.length, 48);
  // Clock-bound administration: no adaptive stop may fire before the section
  // clock, so a precision stop can never censor the fastest examinees.
  assert.equal(symbolSearch.routing.minItems, symbolSearch.routing.maxItems);
  assert.ok(symbolSearch.routing.maxItems <= items.length);
});

test("guess-penalty disclosure: instructions and prompt state the cost of errors", () => {
  assert.match(
    symbolSearch.instructions,
    /penalis|penalize|subtract/i,
    "instructions must state that wrong presses are penalised",
  );
  assert.match(
    symbolSearch.instructions,
    /NO SYMBOL/i,
    "instructions must explain the NO-symbol control",
  );
  const prompts = new Set(items.map((i) => i.prompt));
  assert.equal(prompts.size, 1, "prompt must be uniform");
  assert.match([...prompts][0]!, /NO SYMBOL/, "prompt must offer the NO-symbol control");
});

test("item shells: ids ssr-001..048, unique, c=0, numeric keys, per-trial caps", () => {
  assert.equal(new Set(items.map((i) => i.id)).size, 48, "duplicate ids");
  items.forEach((item, i) => {
    const r = scan(item);
    assert.equal(item.id, "ssr-" + String(i + 1).padStart(3, "0"), "id sequence");
    assert.equal(item.subtest, "symbolSearch");
    assert.equal(item.broad, "Gs");
    assert.equal(item.narrow, "P");
    assert.equal(item.c, 0, item.id + " c must be 0 under the guess-penalty contract");
    assert.equal(item.options, undefined, item.id + " must not use an options grid");
    assert.equal(typeof item.answer, "number", item.id + " key must be numeric");
    assert.ok(
      (item.answer as number) >= 0 && (item.answer as number) <= r.row.length,
      item.id + " key out of range",
    );
    assert.equal(
      item.timeLimitSec,
      r.row.length + 3,
      item.id + " per-trial cap must be row length + 3",
    );
  });
});

test("every glyph in targets and rows parses against the Figure grammar", () => {
  for (const item of items) {
    const r = scan(item);
    assert.equal(r.targets.length, 2, item.id + " needs exactly 2 targets");
    assert.ok(
      r.row.length >= 5 && r.row.length <= 8,
      item.id + " search row must hold 5-8 glyphs",
    );
    for (const g of [...r.targets, ...r.row]) {
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

test("rows never repeat a glyph (a duplicate would create two valid targets)", () => {
  for (const item of items) {
    const r = scan(item);
    assert.equal(new Set(r.row).size, r.row.length, item.id + " duplicate glyph in row");
    assert.notEqual(r.targets[0], r.targets[1], item.id + " targets not distinct");
  }
});

test("keys are re-derived from the render payload alone", () => {
  for (const item of items) {
    assert.equal(item.answer, derivedKey(scan(item)), item.id + " key does not follow the payload");
  }
});

test("hit trials: exactly one target exactly once, >=1 near-miss of the absent target", () => {
  const hits = items.filter((i) => (i.answer as number) < scan(i).row.length);
  assert.ok(hits.length >= 20 && hits.length <= 30, "hit count " + hits.length + " outside the designed band");
  for (const item of hits) {
    const r = scan(item);
    const occurring = r.targets.filter((t) => r.row.includes(t));
    assert.equal(occurring.length, 1, item.id + " must embed exactly one target");
    const present = occurring[0]!;
    assert.equal(
      r.row.filter((g) => g === present).length,
      1,
      item.id + " embedded target must occur exactly once",
    );
    const absent = r.targets.find((t) => t !== present)!;
    assert.ok(
      r.row.some((g) => nearMissOf(g, absent)),
      item.id + " needs >=1 near-miss of the absent target",
    );
  }
});

test("no-match trials: neither target present, >=2 near-misses, key is the row length", () => {
  const nos = items.filter((i) => (i.answer as number) === scan(i).row.length);
  assert.ok(nos.length >= 16 && nos.length <= 26, "no-match count " + nos.length + " outside the designed band");
  for (const item of nos) {
    const r = scan(item);
    for (const g of r.row) {
      assert.ok(!r.targets.includes(g), item.id + " no-match row contains a target: " + g);
    }
    const nearMisses = r.row.filter((g) => r.targets.some((t) => nearMissOf(g, t)));
    assert.ok(
      nearMisses.length >= 2,
      item.id + " needs >=2 near-misses, has " + nearMisses.length,
    );
  }
});

test("embedded targets split across the two target slots (no single-target scan strategy)", () => {
  const hits = items.filter((i) => (i.answer as number) < scan(i).row.length);
  const slot0 = hits.filter((i) => {
    const r = scan(i);
    return r.row.includes(r.targets[0]!);
  }).length;
  assert.ok(
    slot0 >= Math.floor(hits.length * 0.35) && slot0 <= Math.ceil(hits.length * 0.65),
    "first-slot embedding " + slot0 + "/" + hits.length + " is unbalanced",
  );
});

test("embedded index spreads across the row (position habits pay nothing)", () => {
  const placements = items
    .filter((i) => (i.answer as number) < scan(i).row.length)
    .map((i) => i.answer as number);
  assert.ok(new Set(placements).size >= 4, "fewer than 4 distinct embedded indices");
  assert.ok(!placements.every((p) => p <= 1), "embedded targets confined to the first two positions");
  const lens = items
    .filter((i) => (i.answer as number) < scan(i).row.length)
    .map((i) => scan(i).row.length);
  assert.ok(
    !placements.every((p, k) => p >= lens[k]! - 2),
    "embedded targets confined to the last two positions",
  );
  // Modal-answer guard: no single key value may dominate (an always-press-
  // position-k spammer must stay near chance).
  const counts = new Map<number, number>();
  for (const a of items.map((i) => i.answer as number)) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  const modal = Math.max(...counts.values()) / items.length;
  assert.ok(modal < 0.35, "modal answer share " + modal.toFixed(2) + " is exploitable");
});

test("fairness: no circle confuser differs from a target circle only by rotation", () => {
  // Circles are rotation-invariant, so a "rot twin" of a circle IS the
  // target visually; circle near-misses must differ in fill.
  for (const item of items) {
    const r = scan(item);
    for (const t of r.targets) {
      if (shapeOf(t) !== "cir") continue;
      for (const g of r.row) {
        if (shapeOf(g) !== "cir") continue;
        if (g === t) continue; // the embedded target itself, not a confuser
        const [, , fillT] = t.split(":");
        const [, , fillG] = g.split(":");
        assert.ok(
          fillT !== fillG,
          item.id + " circle " + g + " differs from target " + t + " only by (invisible) rotation",
        );
      }
    }
  }
});

test("stimuli are not recycled: >=16 distinct row multisets, all 48 stimuli unique", () => {
  const rowKeys = items.map((i) => [...scan(i).row].sort().join("|"));
  assert.ok(new Set(rowKeys).size >= 16, "fewer than 16 distinct search rows");
  const stimulusKeys = items.map((i) =>
    [...scan(i).targets].sort().join("|") + "||" + [...scan(i).row].sort().join("|"),
  );
  assert.equal(new Set(stimulusKeys).size, 48, "two items share an identical stimulus");
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

test("authored a is not lockstepped to difficulty", () => {
  // Guard for the parameters-by-position anti-pattern (DIFFICULTY_AUDIT.md
  // section 1): discrimination must not climb with difficulty in lockstep.
  const n = items.length;
  const ma = items.reduce((s, i) => s + i.a, 0) / n;
  const mb = items.reduce((s, i) => s + i.b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const i of items) {
    const da = i.a - ma;
    const db = i.b - mb;
    sxy += da * db;
    sxx += da * da;
    syy += db * db;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  assert.ok(
    Math.abs(r) < 0.9,
    "corr(a,b) = " + r.toFixed(3) + " - discrimination has re-lockstepped to difficulty",
  );
});

test("practice demonstrates both responses and stays untimed", () => {
  const practice = symbolSearch.practice ?? [];
  assert.equal(practice.length, 2);
  const [hit, no] = practice;
  assert.equal(hit!.timeLimitSec, undefined, "samples must be untimed");
  assert.equal(no!.timeLimitSec, undefined, "samples must be untimed");
  assert.equal(hit!.answer, 1, "first sample must be a locate-and-press hit");
  assert.equal(no!.answer, scan(no!).row.length, "second sample must key the NO-symbol control");
  for (const p of practice) {
    assert.equal(p.answer, derivedKey(scan(p)), p.id + " sample key does not follow the payload");
  }
});
