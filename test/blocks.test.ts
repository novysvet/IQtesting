import test from "node:test";
import assert from "node:assert/strict";
import type { Item } from "../src/core/types.ts";
import { blockCounting } from "../src/items/gv-blocks.ts";

/**
 * Executable statement of the Block Counting conventions. Every key is
 * re-derived from the height map with the frozen visibility model:
 * cube at (x,y,z) in a column of height h shows its top face iff z === h-1,
 * its right face iff x is the last column or the +x neighbour is <= z tall,
 * its left face iff y is the last row or the +y neighbour is <= z tall.
 * A cube is HIDDEN iff none of the three faces is visible.
 */

function blocksRender(item: Item) {
  const r = item.render;
  if (!r || r.kind !== "blocks") {
    assert.fail(item.id + " must carry a blocks render");
  }
  return r;
}

function analyze(cols: number, rows: number, heights: number[]) {
  let total = 0;
  let visible = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const h = heights[y * cols + x] ?? 0;
      for (let z = 0; z < h; z++) {
        total++;
        const topFaceVisible = z === h - 1;
        const rightFaceVisible = x + 1 >= cols || (heights[y * cols + (x + 1)] ?? 0) <= z;
        const leftFaceVisible = y + 1 >= rows || (heights[(y + 1) * cols + x] ?? 0) <= z;
        if (topFaceVisible || rightFaceVisible || leftFaceVisible) visible++;
      }
    }
  }
  return { total, visible, hidden: total - visible };
}

test("every key equals the pile total and distractors follow the fixed family", () => {
  for (const item of blockCounting.items) {
    const r = blocksRender(item);
    const { total, visible, hidden } = analyze(r.cols, r.rows, r.heights);
    const key = String(total);

    assert.ok(Array.isArray(item.options) && item.options.length === 5, item.id + " needs 5 options");
    for (const opt of item.options!) assert.match(opt, /^\d+$/, item.id + " options must be numeric strings");
    assert.equal(new Set(item.options).size, 5, item.id + " options must be distinct");

    assert.equal(typeof item.answer, "number", item.id + " keys a numeric option index");
    const idx = item.answer as number;
    assert.ok(Number.isInteger(idx) && idx >= 0 && idx < 5, item.id + " answer index out of range");
    assert.equal(item.options![idx], key, item.id + " keyed option must be String(total=" + total + ")");

    const distractors = item.options!.filter((_, i) => i !== idx).map(Number);
    for (const d of distractors) {
      assert.notEqual(d, total, item.id + " distractor equals the key");
      assert.ok(Math.abs(d - total) <= 3, item.id + " distractor " + d + " outside +/-3 of " + total);
    }
    assert.equal(new Set(distractors).size, 4, item.id + " distractors must be pairwise distinct");

    // Family membership: total-1 / total+1 / visible count / total+2, with
    // total-2 the sanctioned substitute on collision (e.g. hidden 0 or 1).
    const family = new Set([total - 2, total - 1, total + 1, total + 2, visible]);
    for (const d of distractors) {
      assert.ok(family.has(d), item.id + " distractor " + d + " outside the family (total " + total + ", visible " + visible + ", hidden " + hidden + ")");
    }
  }
});

test("height maps are well-formed and the hidden-cube difficulty anchors hold", () => {
  let withHiddenCube = 0;
  for (const item of blockCounting.items) {
    const r = blocksRender(item);
    assert.ok(r.cols >= 3 && r.cols <= 5 && r.rows >= 3 && r.rows <= 5, item.id + " footprint sides must be 3..5");
    assert.equal(r.heights.length, r.cols * r.rows, item.id + " heights must be row-major C*R");
    for (const h of r.heights) {
      assert.ok(Number.isInteger(h) && h >= 0 && h <= 4, item.id + " height " + h + " outside 0..4");
    }
    const { total, hidden } = analyze(r.cols, r.rows, r.heights);
    assert.ok(total >= 6 && total <= 24, item.id + " total " + total + " outside 6..24");
    if (hidden >= 1) withHiddenCube++;
  }
  assert.ok(withHiddenCube >= 9, "only " + withHiddenCube + " items bury a hidden cube (need >= 9)");

  const hardest5 = [...blockCounting.items].sort((a, b) => b.b - a.b).slice(0, 5);
  assert.equal(hardest5.length, 5, "bank must have at least 5 items");
  for (const item of hardest5) {
    const r = blocksRender(item);
    const { hidden } = analyze(r.cols, r.rows, r.heights);
    assert.ok(hidden >= 3, item.id + " (b=" + item.b + ") is in the hardest 5 but hides only " + hidden + " cubes");
  }
});

test("bank metadata, b anchors, and pile uniqueness are frozen", () => {
  assert.equal(blockCounting.id, "blockCounting");
  assert.equal(blockCounting.name, "Block Counting");
  assert.equal(blockCounting.broad, "Gv");
  assert.deepEqual(blockCounting.narrow, ["SR"]);
  assert.equal(blockCounting.budgetMin, 8);
  assert.deepEqual(blockCounting.routing, { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 });

  const items = blockCounting.items;
  assert.equal(items.length, 17, "bank must hold exactly 17 items");
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, 17, "item ids must be unique");
  assert.deepEqual([...ids].sort(), Array.from({ length: 17 }, (_, i) => "blc-" + String(i + 1).padStart(3, "0")), "ids must be blc-001..blc-017");

  const bs = items.map((i) => i.b);
  // Floor extended to -2.8 by the 2026-08-21 basal revision (audit §9).
  assert.ok(Math.min(...bs) <= -2.8, "b floor must reach -2.8");
  assert.ok(Math.max(...bs) >= 1.9, "b ceiling must reach +1.9");
  for (const b of bs) assert.ok(b >= -2.8 && b <= 1.9, "b=" + b + " outside the anchored -2.8..+1.9 span");

  const piles = new Set<string>();
  const footprints = new Set<string>();
  const keyPositions = new Set<number>();
  for (const item of items) {
    assert.equal(item.subtest, "blockCounting");
    assert.equal(item.broad, "Gv");
    assert.equal(item.narrow, "SR");
    assert.equal(item.c, 0.2, item.id + " c must be 1/5");
    assert.equal(item.prompt, "How many blocks are in the pile, including blocks you cannot see?", item.id + " prompt drift");
    const r = blocksRender(item);
    piles.add(r.cols + "x" + r.rows + ":" + r.heights.join(","));
    footprints.add(r.cols + "x" + r.rows);
    keyPositions.add(item.answer as number);
  }
  assert.equal(piles.size, 17, "no two items may show the same pile");
  assert.ok(footprints.size >= 3, "need at least 3 distinct footprints, found " + [...footprints].join(", "));
  assert.equal(keyPositions.size, 5, "key positions must be spread across all 5 option slots");
});

// 2026-08-20 adversarial-verification regression: the authored option orders
// stepped the key through positions 3,1,4,0,2 in bank order. rotateOptions
// breaks the cycle; this pins it.
test("key positions do not cycle with bank order", () => {
  const pos = blockCounting.items.map((i) => i.answer as number);
  assert.equal(pos.length, 17);
  const firstFive = pos.slice(0, 5).join(",");
  assert.notEqual(pos.slice(5, 10).join(","), firstFive, "key positions repeat with period 5 (first half)");
  assert.notEqual(pos.slice(10).join(","), firstFive, "key positions repeat with period 5 (second half)");
});
