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

test("ceiling rule fires after consecutive misses, not before minItems", () => {
  let st = initRouting(cfg);
  // Three misses immediately -- below minItems, so must NOT stop for ceiling.
  for (let i = 0; i < 3; i++) {
    const { item } = nextItem(pool, st, cfg);
    assert.ok(item, "should still serve items below minItems");
    st = applyResponse(st, item, resp(item.id, false));
  }
  assert.equal(st.consecutiveMisses, 3);
  const stillGoing = nextItem(pool, st, cfg);
  assert.ok(stillGoing.item, "minItems not reached, must continue");
  st = applyResponse(st, stillGoing.item, resp(stillGoing.item.id, false));
  // Now n=4 >= minItems and misses=4 >= ceilingMisses -> stop.
  const stopped = nextItem(pool, st, cfg);
  assert.equal(stopped.item, null);
  assert.equal(stopped.stopReason, "ceiling");
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
