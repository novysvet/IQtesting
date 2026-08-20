import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import { estimateAbility, pCorrect } from "../src/core/irt.ts";
import { BATTERY_BUDGET_MIN, isBreakPoint, totalBudgetMin } from "../src/core/session.ts";

/** Per-item time by render kind (seconds), for the wall-clock simulation. */
function itemSeconds(kind: string | undefined, subtestId: string): number {
  if (subtestId === "arithmetic") return 65; // mental multi-step word problems
  switch (kind) {
    case "matrix": case "fold": case "rotation": return 75;
    case "span": case "pairs": return 55;
    case "symsearch": return 8;   // speeded scanning
    case "coding": return 12;    // key lookup + transcription
    case "blocks": return 35;    // isometric counting
    case "vpuzzle": return 40;   // assembly under exact-3 selection
    default: return 48;
  }
}

function simulate(theta: number, quantile: number) {
  let seconds = 0;
  let administered = 0;
  for (const subtest of BATTERY) {
    seconds += 45; // read instructions
    if (subtest.matching) {
      // Whole-page matching subtest: every item is presented and answered
      // on one timed page at the 1926-SAT pace (~14 s per definition).
      for (const item of subtest.items) {
        if (pCorrect(item, theta) >= quantile) administered += 1;
        seconds += 14;
      }
      continue;
    }
    let state = initRouting(subtest.routing);
    while (true) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      const correct = pCorrect(item, theta) >= quantile;
      const response = { itemId: item.id, correct, latencyMs: 0, timedOut: false };
      state = applyResponse(state, item, response);
      administered += 1;
      seconds += itemSeconds(item.render?.kind, item.subtest);
    }
  }
  const breaks = BATTERY.slice(0, -1).filter((_, i) => isBreakPoint(i, BATTERY.length)).length;
  seconds += breaks * 120;
  return { minutes: seconds / 60, administered };
}

test("authored section budgets sum to the battery hard limit", () => {
  assert.equal(totalBudgetMin(BATTERY), BATTERY_BUDGET_MIN);
});

test("adaptive routing simulations fit the battery limit across ability levels", () => {
  for (const theta of [-2.5, -1, 0, 1, 2.5, 4]) {
    const simulation = simulate(theta, 0.5);
    assert.ok(simulation.administered > 0);
    assert.ok(simulation.minutes <= BATTERY_BUDGET_MIN, "theta " + theta + " took " + simulation.minutes.toFixed(1) + " minutes");
  }
});

test("conservative slow-response simulation still fits the hard limit", () => {
  const simulation = simulate(1.5, 0.35);
  assert.ok(simulation.minutes <= BATTERY_BUDGET_MIN, "slow path took " + simulation.minutes.toFixed(1) + " minutes");
});

test("precision targets are honest: reachable and terminal SEs bounded", () => {
  // 2026-08-20 audit regression: the original targetSe (0.28-0.32) was never
  // reached in 144,000 simulated runs — a dead parameter. Targets are now
  // 0.50; with a consistent mid-range responder at least some subtests must
  // stop on precision, every subtest must end with SE <= 0.70, and no
  // ADAPTIVE subtest may claim a target below 0.45. Matching subtests are
  // exempt: their routing config is inert (the whole page is administered).
  for (const subtest of BATTERY) {
    if (subtest.matching) continue;
    assert.ok(
      subtest.routing.targetSe >= 0.45,
      subtest.id + " targets an unreachable precision (" + subtest.routing.targetSe + ")",
    );
  }
  let precisionStops = 0;
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      // Whole page: all items answered, one joint ability estimate.
      const responses = subtest.items.map((item) => ({
        itemId: item.id, correct: pCorrect(item, 0) >= 0.5, latencyMs: 0, timedOut: false,
      }));
      const est = estimateAbility(subtest.items, responses);
      assert.ok(est.se <= 0.70, subtest.id + " ended at SE " + est.se.toFixed(2) + " at theta 0");
      continue;
    }
    let state = initRouting(subtest.routing);
    while (true) {
      const { item, stopReason } = nextItem(subtest.items, state, subtest.routing);
      if (!item) {
        if (stopReason === "precision") precisionStops += 1;
        break;
      }
      const correct = pCorrect(item, 0) >= 0.5;
      state = applyResponse(state, item, { itemId: item.id, correct, latencyMs: 0, timedOut: false });
    }
    assert.ok(state.se <= 0.70, subtest.id + " ended at SE " + state.se.toFixed(2) + " at theta 0");
  }
  assert.ok(precisionStops >= 3, "precision stop never fires; expected several subtests to reach 0.50 at theta 0");
});
