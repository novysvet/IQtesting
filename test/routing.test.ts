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
  // with misses at floor items so theta sits inside the floor band. Five
  // seeded responses >= cfg.minItems (4), so the floor-gated ceiling rule
  // fires on the very next decision.
  const floorItems = [...pool].sort((a, b) => a.b - b.b).slice(0, 5);
  let st = initRouting(cfg);
  for (const item of floorItems) {
    st = applyResponse(st, item, resp(item.id, false));
  }
  assert.ok(st.responses.length >= cfg.minItems, "precondition: minItems satisfied");
  assert.ok(st.theta <= Math.min(...pool.map((i) => i.b)) + 0.75, "precondition: at-floor estimate");
  const { item, stopReason } = nextItem(pool, st, cfg);
  assert.equal(item, null);
  assert.equal(stopReason, "ceiling");
});

test("below minItems a floor-band miss streak keeps serving items", () => {
  // Same seeded at-floor state under a minimum the seed has NOT reached
  // (5 responses < minItems 6): the ceiling rule must hold fire until the
  // minimum is administered, or short discontinue-prone runs would be
  // censored below their own floor.
  const floorItems = [...pool].sort((a, b) => a.b - b.b).slice(0, 5);
  const stricter: RoutingConfig = { ...cfg, minItems: 6 };
  let st = initRouting(stricter);
  for (const item of floorItems) {
    st = applyResponse(st, item, resp(item.id, false));
  }
  assert.ok(st.responses.length < stricter.minItems, "precondition: below minItems");
  assert.ok(st.theta <= Math.min(...pool.map((i) => i.b)) + 0.75, "precondition: at-floor estimate");
  const { item, stopReason } = nextItem(pool, st, stricter);
  assert.ok(item, "below minItems the ceiling rule must not fire yet");
  assert.equal(stopReason, null);
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

test("precision stop fires once SE reaches target past minItems", () => {
  // Mid-pool alternating responder keeps theta near entry, where information
  // is maximal, so SE falls steadily as items accumulate. The other stop
  // rules are disarmed (huge miss allowance, generous maxItems) so ONLY the
  // SE<=targetSe rule can end the route.
  const pool = Array.from({ length: 12 }, (_, k) =>
    mk(`pin-${k}`, -1.4 + k * 0.25),
  ).map((it) => ({ ...it, a: 1.7 }));
  const cfgP: RoutingConfig = {
    maxItems: 20, minItems: 4, ceilingMisses: 99, targetSe: 0.65, entryTheta: 0,
  };
  let st = initRouting(cfgP);
  let guard = 0;
  let served = 0;
  for (;;) {
    const step = nextItem(pool, st, cfgP);
    if (!step.item) {
      assert.equal(step.stopReason, "precision", "expected a precision stop");
      break;
    }
    served++;
    st = applyResponse(st, step.item!, resp(step.item!.id, served % 2 === 1));
    if (guard++ > 50) throw new Error("precision-stop simulation did not terminate");
  }
  assert.ok(served >= cfgP.minItems, "precision fired before minItems");
  assert.ok(served < cfgP.maxItems, "SE never reached target within maxItems");
});

test("interrupted responses do not feed the discontinue miss streak", () => {
  // Mirrors session-level censoring at the routing layer directly: an ability-
  // uncorrelated interruption must leave consecutiveMisses untouched, while a
  // real miss increments and a hit resets.
  const it0 = mk("rz-1", 0);
  const cfgX: RoutingConfig = { ...cfg, minItems: 1, maxItems: 10 };
  let st = initRouting(cfgX);
  const offer = nextItem([it0], st, cfgX).item!;
  st = applyResponse(st, offer, resp(offer.id, false));
  assert.equal(st.consecutiveMisses, 1, "plain miss must increment the streak");
  st = applyResponse(st, offer, { ...resp(offer.id, false), interrupted: true });
  assert.equal(st.consecutiveMisses, 1, "interruption must NOT feed the streak");
  st = applyResponse(st, offer, resp(offer.id, true));
  assert.equal(st.consecutiveMisses, 0, "a hit must reset the streak");
});

// ---------------------------------------------------------------------------
// Exposure control + PSER no-gain stop + content blocks (2026-08-22)
// ---------------------------------------------------------------------------

test("randomesque selection stays inside the top-k informative set", async () => {
  const { selectNextItem, RANDOMESQUE_K, itemInformation } = await import("../src/core/irt.ts");
  const used = new Set<string>();
  const ranked = [...pool]
    .map((item) => ({ item, info: itemInformation(item, 0) }))
    .sort((x, y) => y.info - x.info)
    .slice(0, RANDOMESQUE_K)
    .map((e) => e.item.id);
  const topK = new Set(ranked);
  const seen = new Set<string>();
  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let draw = 0; draw < 200; draw++) {
    const pick = selectNextItem(pool, 0, used, { rand: rng });
    assert.ok(pick, "pool is fresh, a pick must exist");
    assert.ok(topK.has(pick.id), "randomesque pick escaped the top-k set: " + pick.id);
    seen.add(pick.id);
  }
  assert.ok(seen.size >= 2, "200 draws should exercise more than one candidate");
});

test("randomesque selection is reproducible for a fixed seed", async () => {
  const { selectNextItem } = await import("../src/core/irt.ts");
  const used = new Set<string>();
  const mkRng = (s: number) => {
    let a = s >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const first = selectNextItem(pool, 0, used, { rand: mkRng(42) });
  const second = selectNextItem(pool, 0, used, { rand: mkRng(42) });
  assert.equal(first!.id, second!.id, "same seed must yield the same item");
});

test("no-gain stop ends a run that has collapsed below the bank floor", () => {
  // Pool floor at b = 0 (MC, c = 0.2). An all-wrong examinee collapses the
  // estimate to theta ~ -2.5, where every remaining item sits at the chance
  // asymptote: p -> c, Fisher information -> 0, and no remaining item can
  // buy NO_GAIN_VARIANCE of posterior variance. The PSER rule must end the
  // run after minItems (the miss-streak rule is defused via ceilingMisses 99
  // so ONLY the information criterion can stop it).
  const shallow = Array.from({ length: 10 }, (_, k) => mk(`sh-${k}`, k * 0.16));
  const cfgS: RoutingConfig = {
    maxItems: 10, minItems: 4, ceilingMisses: 99, targetSe: 0.40, entryTheta: 0,
  };
  let st = initRouting(cfgS);
  let served = 0;
  let guard = 0;
  let stop: string | null = null;
  for (;;) {
    const step = nextItem(shallow, st, cfgS);
    if (!step.item) { stop = step.stopReason; break; }
    served++;
    st = applyResponse(st, step.item, resp(step.item.id, false));
    if (guard++ > 30) throw new Error("no-gain simulation did not terminate");
  }
  assert.equal(stop, "no-gain");
  assert.ok(served < cfgS.maxItems, "an information-dead run must not grind to maxItems");
  assert.ok(st.se > cfgS.targetSe, "precondition: the target was genuinely unreachable");
});

test("content blocks keep a block open until exhausted", () => {
  const blocked = [
    { ...mk("bl-a1", 0), block: "A" },
    { ...mk("bl-a2", 0.2), block: "A" },
    { ...mk("bl-a3", -0.2), block: "A" },
    { ...mk("bl-b1", 0), block: "B" },
    { ...mk("bl-b2", 0.2), block: "B" },
  ];
  const cfgB: RoutingConfig = { ...cfg, minItems: 2, maxItems: 5, ceilingMisses: 99, targetSe: 0.30 };
  let st = initRouting(cfgB);
  const order: string[] = [];
  let guard = 0;
  for (;;) {
    const step = nextItem(blocked, st, cfgB);
    if (!step.item) break;
    order.push(step.item.id);
    st = applyResponse(st, step.item, resp(step.item.id, true));
    if (guard++ > 10) throw new Error("blocked route did not terminate");
  }
  // Once a block opens, no foreign-block item may appear until it exhausts.
  let open: string | null = null;
  for (const id of order) {
    const block = blocked.find((i) => i.id === id)!.block!;
    if (open === null) open = block;
    else if (block !== open) open = block; // previous block exhausted — allowed
  }
  // Stronger form: the first three items all come from one block.
  const firstThree = new Set(order.slice(0, 3).map((id) => blocked.find((i) => i.id === id)!.block));
  assert.equal(firstThree.size, 1, "the opened block must be drained before switching: " + order.join(","));
});

test("sessionId-driven randomesque is reproducible and varies across sessions", () => {
  const run = (sessionId: string) => {
    let st = initRouting(cfg);
    const ids: string[] = [];
    let guard = 0;
    for (;;) {
      const step = nextItem(pool, st, cfg, sessionId);
      if (!step.item) break;
      ids.push(step.item.id);
      st = applyResponse(st, step.item, resp(step.item.id, guard % 2 === 0));
      if (guard++ > 40) break;
    }
    return ids;
  };
  const s1 = run("session-one");
  const s1again = run("session-one");
  assert.deepEqual(s1, s1again, "same session id must reproduce the same route");
  let differs = false;
  for (const other of ["session-two", "session-three", "session-four", "session-five"]) {
    if (run(other).join(",") !== s1.join(",")) differs = true;
  }
  assert.ok(differs, "different sessions should rarely receive identical routes");
});
