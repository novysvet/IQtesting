import test from "node:test";
import assert from "node:assert/strict";
import { optionPermutation, keyedDisplayPosition, seededPermutation } from "../src/core/presentation.ts";

/**
 * PER-SESSION OPTION PERMUTATION (2026-08-21, pre-norming hardening).
 *
 * Option positions were previously fixed per item across all examinees; a
 * seeded per-session permutation breaks that correlation. The mapping is
 * display slot -> original index; grading always happens on ORIGINAL indices.
 */

test("permutation is deterministic for a session+item pair", () => {
  const a = optionPermutation("session-1", "mx-001", 5);
  const b = optionPermutation("session-1", "mx-001", 5);
  assert.deepEqual(a, b);
});

test("different sessions or items get different orders (with high probability)", () => {
  let collisions = 0;
  const reference = optionPermutation("session-A", "item-X", 5)!;
  for (let k = 0; k < 50; k++) {
    const other = optionPermutation("session-" + k, "item-X", 5)!;
    if (other.join() === reference.join()) collisions++;
  }
  assert.ok(collisions <= 2, `orders barely vary across sessions (${collisions}/50 identical)`);
  const otherItem = optionPermutation("session-A", "item-Y", 5)!;
  assert.notEqual(otherItem.join(), reference.join());
});

test("permutations are bijections over the option range", () => {
  for (const n of [3, 4, 5, 6]) {
    for (let s = 0; s < 40; s++) {
      const perm = optionPermutation("s" + s, "i" + n, n)!;
      assert.equal(perm.length, n);
      assert.deepEqual([...perm].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
    }
  }
});

test("binary and degenerate formats are never permuted", () => {
  assert.equal(optionPermutation("s", "i", 2), null, "Yes/No formats stay fixed");
  assert.equal(optionPermutation("s", "i", 1), null);
  assert.equal(optionPermutation("", "i", 5), null, "missing session id");
  assert.equal(optionPermutation("s", "", 5), null, "missing item id");
});

test("keyedDisplayPosition reports where the key was shown", () => {
  const perm = [2, 0, 4, 1, 3];
  assert.equal(keyedDisplayPosition(perm, 0), 2);
  assert.equal(keyedDisplayPosition(perm, 3), 5);
  assert.equal(keyedDisplayPosition(null, 0), null, "unpermuted formats record null");
});

test("positions are balanced across many sessions (no systematic bias)", () => {
  // Across many sessions the key must not favour any display slot: each slot
  // should hold the key roughly 1/n of the time.
  const n = 5;
  const trials = 2000;
  const counts = new Array<number>(n).fill(0);
  for (let s = 0; s < trials; s++) {
    const pos = keyedDisplayPosition(optionPermutation("balance-" + s, "bias-item", n), 0)!;
    counts[pos - 1]!++;
  }
  const expected = trials / n;
  for (const count of counts) {
    assert.ok(
      Math.abs(count - expected) < expected * 0.12,
      `slot imbalance: ${counts.join(",")} vs expected ~${expected}`,
    );
  }
});

test("seededPermutation is a pure Fisher-Yates over the hash seed", () => {
  assert.deepEqual(seededPermutation("x", 0), []);
  assert.deepEqual(seededPermutation("x", 1), [0]);
  const p = seededPermutation("abc", 7);
  assert.deepEqual([...p].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
});
