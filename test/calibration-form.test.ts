import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import {
  initSession, beginBattery, startSubtest, answerItem, answerPractice, buildFixedOrder,
} from "../src/core/session.ts";
import { bankVersion, CALIBRATION_FORM_TAG } from "../src/core/telemetry.ts";

/**
 * FIXED CALIBRATION FORMS (2026-08-21, pre-norming hardening).
 *
 * IRT calibration and DIF analysis need every examinee to see the SAME items
 * in the SAME order. Calibration mode pins each subtest to a deterministic,
 * difficulty-stratified linear form and disables the adaptive stop rules.
 */

test("buildFixedOrder is deterministic, stratified, and bounded by maxItems", () => {
  for (const subtest of BATTERY) {
    const order1 = buildFixedOrder(subtest);
    const order2 = buildFixedOrder(subtest);
    assert.deepEqual(order1, order2, subtest.id + " form is not deterministic");
    assert.ok(order1.length <= subtest.routing.maxItems, subtest.id + " form exceeds maxItems");
    assert.ok(order1.length >= Math.min(subtest.routing.maxItems, subtest.items.length) - 1, subtest.id + " form too short");
    assert.equal(new Set(order1).size, order1.length, subtest.id + " form repeats an item");
    const ids = new Set(subtest.items.map((i) => i.id));
    for (const id of order1) assert.ok(ids.has(id), subtest.id + " form references a foreign item");
  }
});

test("fixed forms span the bank's difficulty range", () => {
  for (const subtest of BATTERY) {
    const bs = buildFixedOrder(subtest)
      .map((id) => subtest.items.find((i) => i.id === id)!.b)
      .sort((a, b) => a - b);
    const all = subtest.items.map((i) => i.b).sort((a, b) => a - b);
    // The stratified sample must reach within one item of the pool's floor
    // and ceiling — no form may silently drop the tails.
    assert.ok(bs[0]! <= (all[1] ?? all[0]!)!, subtest.id + " form misses the basal");
    assert.ok(
      bs[bs.length - 1]! >= (all[all.length - 2] ?? all[all.length - 1])!,
      subtest.id + " form misses the ceiling",
    );
  }
});

test("calibration sessions serve the fixed order and ignore stop rules", () => {
  const subtest = BATTERY.find((s) => s.id === "numberSeries")!;
  let s = beginBattery(initSession([subtest], { sessionId: "cal-1", form: "calibration" }), 0);
  assert.equal(s.form, "calibration");
  s = startSubtest(s, 0, 1000);
  while (s.phase.kind === "practice") s = answerPractice(s, 2000);
  assert.equal(s.phase.kind, "item");
  const expectedOrder = buildFixedOrder(subtest);
  // Answer everything WRONG: adaptive routing would descend and discontinue;
  // the fixed form must march through its full list regardless.
  let served = 0;
  let guard = 0;
  while (s.phase.kind === "item" && guard++ < 500) {
    assert.equal(s.phase.item.id, expectedOrder[served], `position ${served}: served ${s.phase.item.id}, expected ${expectedOrder[served]}`);
    served++;
    s = answerItem(s, typeof s.phase.item.answer === "number" ? -1 : "zz", 3000 + served * 1000);
  }
  assert.equal(served, expectedOrder.length, "fixed form stopped early under an all-wrong pattern");
  assert.equal(s.stopReasons[0], "max-items");
});

test("adaptive sessions are unaffected by calibration machinery", () => {
  const s = initSession(BATTERY, { sessionId: "adp-1" });
  assert.equal(s.form, "adaptive");
  for (let i = 0; i < s.subtests.length; i++) {
    assert.equal(s.routing[i]!.decisions.length, 0);
  }
  // Adaptive routing config carries no fixedOrder.
  for (const subtest of s.subtests) assert.equal(subtest.routing.fixedOrder, undefined);
});

test("the form variant is stamped into bankVersion", () => {
  // CALIBRATION_FORM_TAG is imported, not re-typed as a literal: the link
  // `session.form === "calibration"` -> variant stamp (session.ts formVariant)
  // must survive a tag rename, and renaming it without updating consumers
  // has to turn this suite red, not silently fork the hash space.
  const adaptive = bankVersion(BATTERY);
  const calibration = bankVersion(BATTERY, CALIBRATION_FORM_TAG);
  assert.notEqual(adaptive, calibration);
  assert.equal(bankVersion(BATTERY, CALIBRATION_FORM_TAG), calibration, "variant hash must be deterministic");
  assert.equal(bankVersion(BATTERY), adaptive);
});
