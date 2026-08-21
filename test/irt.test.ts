import { test } from "node:test";
import assert from "node:assert/strict";
import { pCorrect, itemInformation, estimateAbility, selectNextItem } from "../src/core/irt.ts";
import type { Item, Response } from "../src/core/types.ts";

function mk(id: string, a: number, b: number, c = 0.2): Item {
  return { id, subtest: "t", broad: "Gf", narrow: "I", a, b, c, prompt: id, answer: 0 };
}
function resp(itemId: string, correct: boolean): Response {
  return { itemId, correct, latencyMs: 1000, timedOut: false };
}

test("pCorrect respects the lower asymptote", () => {
  const item = mk("i1", 1.5, 0, 0.25);
  // Far below difficulty -> approaches guessing floor, never 0.
  assert.ok(pCorrect(item, -6) > 0.24);
  assert.ok(pCorrect(item, -6) < 0.26);
  // Far above -> approaches 1.
  assert.ok(pCorrect(item, 6) > 0.99);
  // At b -> exactly midway between c and 1.
  assert.ok(Math.abs(pCorrect(item, 0) - (0.25 + 0.75 * 0.5)) < 1e-9);
});

test("pCorrect is monotonic increasing in theta", () => {
  const item = mk("i1", 1.2, 0.5);
  let prev = -Infinity;
  for (let th = -4; th <= 4; th += 0.1) {
    const p = pCorrect(item, th);
    assert.ok(p > prev, `not monotonic at ${th}`);
    prev = p;
  }
});

test("information peaks near b and rises with a", () => {
  const easy = mk("e", 1.0, -2);
  const hard = mk("h", 1.0, 2);
  assert.ok(itemInformation(easy, -2) > itemInformation(easy, 2));
  assert.ok(itemInformation(hard, 2) > itemInformation(hard, -2));

  const sharp = mk("s", 2.0, 0);
  const flat = mk("f", 0.6, 0);
  assert.ok(itemInformation(sharp, 0) > itemInformation(flat, 0));
});

test("EAP returns prior when there is no evidence", () => {
  const est = estimateAbility([mk("a", 1, 0)], []);
  assert.equal(est.theta, 0);
  assert.equal(est.se, 1);
  assert.equal(est.n, 0);
});

test("EAP stays finite for all-correct and all-incorrect patterns", () => {
  const items = [mk("a", 1.2, -1), mk("b", 1.2, 0), mk("c", 1.2, 1)];
  const allRight = estimateAbility(items, items.map((i) => resp(i.id, true)));
  const allWrong = estimateAbility(items, items.map((i) => resp(i.id, false)));
  assert.ok(Number.isFinite(allRight.theta), "all-correct theta must be finite");
  assert.ok(Number.isFinite(allWrong.theta), "all-incorrect theta must be finite");
  assert.ok(allRight.theta > allWrong.theta);
  // ML would diverge here; EAP must stay in a sane band.
  assert.ok(allRight.theta < 4.5 && allWrong.theta > -4.5);
});

test("more correct answers monotonically raise theta", () => {
  const items = Array.from({ length: 8 }, (_, k) => mk(`i${k}`, 1.3, -2 + k * 0.5));
  let prev = -Infinity;
  for (let nCorrect = 0; nCorrect <= 8; nCorrect++) {
    const rs = items.map((it, idx) => resp(it.id, idx < nCorrect));
    const est = estimateAbility(items, rs);
    assert.ok(est.theta > prev, `theta did not increase at ${nCorrect} correct`);
    prev = est.theta;
  }
});

test("SE shrinks as informative items accumulate", () => {
  const items = Array.from({ length: 20 }, (_, k) => mk(`i${k}`, 1.5, (k % 5) * 0.4 - 0.8));
  const few = estimateAbility(items.slice(0, 3), items.slice(0, 3).map((i, n) => resp(i.id, n % 2 === 0)));
  const many = estimateAbility(items, items.map((i, n) => resp(i.id, n % 2 === 0)));
  assert.ok(many.se < few.se, `SE should shrink: ${many.se} vs ${few.se}`);
});

test("EAP ignores responses to unknown items", () => {
  const items = [mk("a", 1, 0)];
  const est = estimateAbility(items, [resp("a", true), resp("ghost", true)]);
  assert.equal(est.n, 1);
});

test("selectNextItem maximizes information and skips used items", () => {
  const pool = [mk("low", 1.4, -2), mk("mid", 1.4, 0), mk("high", 1.4, 2)];
  assert.equal(selectNextItem(pool, 0, new Set())?.id, "mid");
  assert.equal(selectNextItem(pool, 2, new Set())?.id, "high");
  // With "mid" used, the winner is "low": under the 3PL the information of a
  // b = -2 item at theta 0 beats its b = +2 mirror (the guessing floor c
  // penalizes items whose p collapses toward c), so this is a genuine value,
  // not a tie-break accident.
  assert.equal(selectNextItem(pool, 0, new Set(["mid"]))?.id, "low");
  assert.equal(selectNextItem(pool, 0, new Set(["low", "mid", "high"])), null);
});

test("selectNextItem is deterministic under ties", () => {
  const pool = [mk("b", 1.0, 0), mk("a", 1.0, 0)];
  const first = selectNextItem(pool, 0, new Set())?.id;
  // Documented tie-break: equal information and equal b-distance fall to the
  // lexicographically smaller id ("a"), not first-seen order ("b").
  assert.equal(first, "a");
  for (let i = 0; i < 5; i++) {
    assert.equal(selectNextItem(pool, 0, new Set())?.id, first);
  }
});
