import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import {
  initSession, beginBattery, startSubtest, answerItem, answerPractice, expireSubtest,
} from "../src/core/session.ts";
import { exportSession } from "../src/core/telemetry.ts";

/**
 * EXPORT ENRICHMENT (2026-08-21, pre-norming hardening).
 *
 * The calibration record now carries the administration context (device,
 * viewport, locale), the routing decision log (exposure/DIF analysis),
 * consent + demographics + retest linkage, and the censoring flags.
 */

function drive(subtests = BATTERY, count = 8) {
  let state = initSession(subtests, {
    sessionId: "exp-1",
    participantId: "tester-42",
    consent: { acceptedAt: 1_000, version: "2026-08-21" },
    demographics: { ageBand: "25-34", nativeLanguage: "English" },
  });
  state = beginBattery(state, 2_000);
  state = startSubtest(state, 0, 3_000);
  let now = 3_000;
  for (let i = 0; i < count; i++) {
    while (state.phase.kind === "practice") state = answerPractice(state, (now += 1_000));
    if (state.phase.kind !== "item") break;
    const item = state.phase.item;
    state = answerItem(
      state,
      typeof item.answer === "number" ? (item.answer as number) : String(item.answer),
      (now += 12_000),
      false,
      { awayMs: 1500 },
    );
  }
  return state;
}

test("the export carries identity, consent, demographics, and form", () => {
  const doc = exportSession(drive());
  assert.equal(doc.participantId, "tester-42");
  assert.equal(doc.consent?.version, "2026-08-21");
  assert.equal(doc.demographics?.ageBand, "25-34");
  assert.equal(doc.form, "adaptive");
  assert.equal(doc.comprehensionAttempts, 0);
});

test("the administration context is captured with device classification", () => {
  const doc = exportSession(drive());
  // In Node there is no window/navigator; the block must exist and degrade
  // to nulls / "unknown" rather than throw.
  assert.ok(doc.administration, "administration block missing");
  assert.equal(typeof doc.administration!.userAgent, "string");
  assert.ok(["desktop", "tablet", "phone", "unknown"].includes(doc.administration!.deviceClass));
});

test("every subtest exports its routing decision log", () => {
  const doc = exportSession(drive(BATTERY, 10));
  const first = doc.subtests[0]!;
  assert.ok(first.decisions.length >= 1, "no decisions recorded for the opened subtest");
  for (const d of first.decisions) {
    assert.ok(typeof d.theta === "number" && Number.isFinite(d.theta));
    assert.ok(typeof d.se === "number" && d.se > 0);
    if (d.itemId === null) assert.ok(d.stopReason, "a stop decision must carry its reason");
    else assert.equal(d.stopReason, null);
  }
  // The offered items must match what was actually administered.
  const administered = new Set(doc.responses.filter((r) => r.subtestId === first.id).map((r) => r.itemId));
  const offered = new Set(first.decisions.map((d) => d.itemId).filter((id): id is string => id !== null));
  for (const id of administered) assert.ok(offered.has(id), id + " administered but never offered");
});

test("censoring flags survive into the export", () => {
  let s = beginBattery(initSession(BATTERY, { sessionId: "cens-1" }), 0);
  s = startSubtest(s, 0, 1000);
  while (s.phase.kind === "practice") s = answerPractice(s, 2000);
  // An interrupted memory-style answer on an MC item still records the flag.
  s = answerItem(s, "", 3000, true, { interrupted: true, awayMs: 4000 });
  // Then force a section expiry with an item on screen -> omitted.
  s = expireSubtest(s, 999 * 60_000);
  const doc = exportSession(s);
  const interrupted = doc.responses.find((r) => r.interrupted);
  assert.ok(interrupted, "interrupted response missing from export");
  assert.equal(interrupted!.awayMs, 4000);
  const omitted = doc.responses.filter((r) => r.omitted);
  assert.ok(omitted.length >= 1, "omitted response missing from export");
  for (const r of [...doc.responses]) {
    if (r.omitted) assert.equal(r.rawAnswer, null, "omitted responses carry no raw answer");
  }
});

test("keyedPosition records the display slot of the key", () => {
  const state = drive(BATTERY, 6);
  const doc = exportSession(state);
  for (const r of doc.responses) {
    const sub = BATTERY.find((s) => s.id === r.subtestId)!;
    const item = sub.items.find((i) => i.id === r.itemId)!;
    if (typeof item.answer === "number" && item.multi === undefined && (item.options?.length ?? 0) >= 3) {
      assert.ok(
        typeof r.keyedPosition === "number" && r.keyedPosition >= 1 && r.keyedPosition <= item.options!.length,
        r.itemId + " keyedPosition out of range",
      );
    } else {
      assert.equal(r.keyedPosition ?? null, null, r.itemId + " non-permuted formats must record null");
    }
  }
});
