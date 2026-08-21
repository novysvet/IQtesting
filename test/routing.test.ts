import { test } from "node:test";
import assert from "node:assert/strict";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import type { Item, RoutingConfig, Response } from "../src/core/types.ts";

function mk(id: string, b: number): Item {
  return { id, subtest: "t", broad: "Gf", narrow: "I", a: 1.4, b, c: 0.2, prompt: id, answer: 0 };
}
const pool: Item[] = Array.from({ length: 30 }, (_, k) => mk(`i${k}`, -3 + k * 0.2));
const cfg: RoutingConfig = {
  maxItems: 12, minItems: 4, ceilingMisses: 3, targetSe: 0.3, entryTheta: 0,
};
function resp(itemId: string, correct: boolean): Response {
  return { itemId, correct, latencyMs: 500, timedOut: false };
}

test("routing starts at entry theta and serves an item", () => {
  const st = initRouting(cfg);
  assert.equal(st.theta, 0);
  const { item, stopReason } = nextItem(pool, st, cfg);
  assert.ok(item);
  assert.equal(stopReason, null);
});

test("never exceeds maxItems", () => {
  let st = initRouting(cfg);
  let guard = 0;
  while (guard++ < 100) {
    const { item } = nextItem(pool, st, cfg);
    if (!item) break;
    st = applyResponse(st, item, resp(item.id, guard % 2 === 0));
  }
  assert.ok(st.responses.length <= cfg.maxItems, `administered ${st.responses.length}`);
});

test("ceiling rule is floor-gated: descent continues until the bank floor is reached", () => {
  // Pool spans b -3..+2.8. Four straight misses from entry theta 0 leave the
  // estimate far above the pool floor, so routing must KEEP DESCENDING (the
  // old bare miss-streak stop censored the low end and inflated chance-level
  // scores). The stop may only fire once theta is within FLOOR_BAND of the
  // pool's easiest item.
  let st = initRouting(cfg);
  for (let i = 0; i < 4; i++) {
    const { item } = nextItem(pool, st, cfg);
    assert.ok(item, "should still serve items below minItems");
    st = applyResponse(st, item, resp(item.id, false));
  }
  assert.equal(st.consecutiveMisses, 4);
  const floor = Math.min(...pool.map((i) => i.b));
  assert.ok(st.theta > floor + 0.75, "precondition: estimate still above the floor band");
  const stillGoing = nextItem(pool, st, cfg);
  assert.ok(stillGoing.item, "miss streak above the floor must not stop routing");
  // Drive all-wrong until a stop fires: it must be the floor-gated ceiling
  // rule, reached with the estimate inside the floor band.
  let guard = 0;
  let stopped = stillGoing;
  while (stopped.item && guard++ < 60) {
    st = applyResponse(st, stopped.item!, resp(stopped.item!.id, false));
    stopped = nextItem(pool, st, cfg);
  }
  assert.equal(stopped.stopReason, "ceiling", "expected the floor-gated ceiling stop");
  assert.ok(st.theta <= floor + 0.75, "ceiling stop fired above the floor band");
  assert.ok(st.responses.length <= cfg.maxItems);
});

test("a miss streak near the floor stops immediately once minItems are satisfied", () => {
  // Simulate an examinee already at the bottom of the pool: seed the state
  // with misses at floor items so theta sits inside the floor band.
  const floorItems = [...pool].sort((a, b) => a.b - b.b).slice(0, 5);
  let st = initRouting(cfg);
  for (const item of floorItems) {
    st = applyResponse(st, item, resp(item.id, false));
  }
  assert.ok(st.theta <= Math.min(...pool.map((i) => i.b)) + 0.75, "precondition: at-floor estimate");
  const { item, stopReason } = nextItem(pool, st, cfg);
  if (st.responses.length >= cfg.minItems) {
    assert.equal(item, null);
    assert.equal(stopReason, "ceiling");
  } else {
    assert.ok(item, "below minItems the ceiling rule must not fire yet");
  }
});

test("a correct answer resets the miss streak", () => {
  let st = initRouting(cfg);
  const a = nextItem(pool, st, cfg).item!;
  st = applyResponse(st, a, resp(a.id, false));
  const b = nextItem(pool, st, cfg).item!;
  st = applyResponse(st, b, resp(b.id, false));
  assert.equal(st.consecutiveMisses, 2);
  const c = nextItem(pool, st, cfg).item!;
  st = applyResponse(st, c, resp(c.id, true));
  assert.equal(st.consecutiveMisses, 0);
});

test("no item is administered twice", () => {
  let st = initRouting(cfg);
  let guard = 0;
  while (guard++ < 100) {
    const { item } = nextItem(pool, st, cfg);
    if (!item) break;
    st = applyResponse(st, item, resp(item.id, guard % 3 !== 0));
  }
  const ids = st.administered.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate item administered");
});

test("exhausted pool stops cleanly", () => {
  const tiny = [mk("only", 0)];
  const loose: RoutingConfig = { ...cfg, minItems: 1, maxItems: 10, targetSe: 0.001 };
  let st = initRouting(loose);
  const first = nextItem(tiny, st, loose);
  st = applyResponse(st, first.item!, resp(first.item!.id, true));
  const second = nextItem(tiny, st, loose);
  assert.equal(second.item, null);
  assert.equal(second.stopReason, "exhausted");
});
