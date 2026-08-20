import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import { pCorrect } from "../src/core/irt.ts";
import { totalBudgetMin } from "../src/core/session.ts";

function simulate(theta: number, quantile: number) {
  let seconds = 0;
  let administered = 0;
  for (const subtest of BATTERY) {
    let state = initRouting(subtest.routing);
    seconds += 45; // read instructions
    while (true) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      const correct = pCorrect(item, theta) >= quantile;
      const response = { itemId: item.id, correct, latencyMs: 0, timedOut: false };
      state = applyResponse(state, item, response);
      administered += 1;
      const modality = item.render?.kind;
      seconds += modality === "matrix" || modality === "fold" || modality === "rotation" ? 75
        : modality === "span" || modality === "pairs" ? 55 : 48;
    }
  }
  seconds += 3 * 120; // scheduled breaks
  return { minutes: seconds / 60, administered };
}

test("authored section budgets fit the 180-minute hard limit", () => {
  assert.equal(totalBudgetMin(BATTERY), 180);
});

test("adaptive routing simulations fit 180 minutes across ability levels", () => {
  for (const theta of [-2.5, -1, 0, 1, 2.5, 4]) {
    const simulation = simulate(theta, 0.5);
    assert.ok(simulation.administered > 0);
    assert.ok(simulation.minutes <= 180, "theta " + theta + " took " + simulation.minutes.toFixed(1) + " minutes");
  }
});

test("conservative slow-response simulation still fits the hard limit", () => {
  const simulation = simulate(1.5, 0.35);
  assert.ok(simulation.minutes <= 180, "slow path took " + simulation.minutes.toFixed(1) + " minutes");
});

test("precision targets are honest: reachable and terminal SEs bounded", () => {
  // 2026-08-20 audit regression: the original targetSe (0.28-0.32) was never
  // reached in 144,000 simulated runs — a dead parameter. Targets are now
  // 0.50; with a consistent mid-range responder at least some subtests must
  // stop on precision, every subtest must end with SE <= 0.70, and no
  // subtest may claim a target below 0.45.
  for (const subtest of BATTERY) {
    assert.ok(
      subtest.routing.targetSe >= 0.45,
      subtest.id + " targets an unreachable precision (" + subtest.routing.targetSe + ")",
    );
  }
  let precisionStops = 0;
  for (const subtest of BATTERY) {
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
