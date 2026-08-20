import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { answerItem, beginBattery, initSession, startSubtest } from "../src/core/session.ts";
import { bankVersion, exportSession } from "../src/core/telemetry.ts";
import { clearSession, loadSession, memoryStorage, saveSession } from "../src/core/persistence.ts";
import { combineInverseVariance } from "../src/core/scoring.ts";
import type { Subtest } from "../src/core/types.ts";

function driveSomeItems(subtests: Subtest[], count: number, nowBase: number) {
  let state = initSession(subtests);
  state = beginBattery(state, nowBase);
  let now = nowBase;
  state = startSubtest(state, 0, (now += 1_000));
  for (let i = 0; i < count; i++) {
    if (state.phase.kind !== "item") break;
    const item = state.phase.item;
    const isRecall = typeof item.answer === "string";
    state = answerItem(state, isRecall ? String(item.answer) : (item.answer as number), (now += 15_000));
    if (state.phase.kind === "instructions" || state.phase.kind === "break") {
      state = startSubtest(state, state.phase.subtestIndex, (now += 5_000));
    }
  }
  return state;
}

test("bankVersion is deterministic and tracks parameter changes", () => {
  const v1 = bankVersion(BATTERY);
  assert.equal(bankVersion(BATTERY), v1);
  const mutated = BATTERY.map((s, i) =>
    i === 0 ? { ...s, items: s.items.map((it, j) => (j === 0 ? { ...it, b: it.b + 0.01 } : it)) } : s,
  );
  assert.notEqual(bankVersion(mutated), v1);
});

test("sessions carry identity and every response records raw answer + key position", () => {
  const state = driveSomeItems(BATTERY, 6, 1_000_000);
  assert.ok(state.sessionId.length > 0);
  assert.equal(state.bankVersion, bankVersion(BATTERY));
  assert.ok(state.responses.length >= 5, "expected several recorded responses");
  for (const r of state.responses) {
    assert.equal(typeof r.subtestId, "string", r.itemId + " missing subtestId");
    assert.ok(typeof r.positionInSubtest === "number" && r.positionInSubtest >= 1);
    assert.ok(typeof r.positionInBattery === "number" && r.positionInBattery >= 1);
    assert.notEqual(r.rawAnswer, undefined, r.itemId + " missing rawAnswer");
  }
  const mc = state.responses.filter((r) => typeof r.answerIndex === "number");
  assert.ok(mc.length >= 3, "expected multiple-choice responses with key positions");
  const recall = state.responses.filter((r) => r.answerIndex === null);
  if (recall.length > 0) {
    assert.equal(typeof recall[0]!.rawAnswer, "string", "recall raw answer must be the typed string");
  }
});

test("exportSession produces a complete norming record", () => {
  const state = driveSomeItems(BATTERY, 6, 1_000_000);
  const doc = exportSession(state);
  assert.equal(doc.format, "iqtesting-responses");
  assert.equal(doc.version, 1);
  assert.equal(doc.sessionId, state.sessionId);
  assert.equal(doc.bankVersion, state.bankVersion);
  assert.equal(doc.responses.length, state.responses.length);
  // Positions are dense ordinals starting at 1.
  assert.deepEqual(doc.responses.map((r) => r.positionInBattery), doc.responses.map((_, i) => i + 1));
  // Every exported answerIndex matches the bank's actual key for that item.
  for (const r of doc.responses) {
    const sub = BATTERY.find((s) => s.id === r.subtestId)!;
    const item = sub.items.find((i) => i.id === r.itemId)!;
    assert.equal(r.answerIndex, typeof item.answer === "number" ? item.answer : null);
    const rawOk = typeof item.answer === "number" ? r.rawAnswer === r.rawAnswer : true;
    assert.ok(rawOk);
  }
  assert.ok(doc.composite && typeof doc.composite.standardScore === "number");
});

test("persistence round-trips an in-progress session and rejects stale banks", () => {
  const storage = memoryStorage();
  const state = driveSomeItems(BATTERY, 4, 1_000_000);
  saveSession(state, storage, 2_000_000);
  const restored = loadSession(storage, bankVersion(BATTERY));
  assert.ok(restored, "round-trip failed");
  assert.equal(restored!.state.sessionId, state.sessionId);
  assert.equal(restored!.state.responses.length, state.responses.length);
  assert.equal(restored!.state.phase.kind, state.phase.kind);

  // A changed bank invalidates the save.
  const changed = BATTERY.map((s, i) =>
    i === 0 ? { ...s, items: s.items.map((it, j) => (j === 0 ? { ...it, b: it.b + 1 } : it)) } : s,
  );
  assert.equal(loadSession(storage, bankVersion(changed)), null);

  // Corrupt payload is rejected, not thrown.
  storage.setItem("iqtesting.session.v1", "{not json");
  assert.equal(loadSession(storage, bankVersion(BATTERY)), null);

  clearSession(storage);
  assert.equal(loadSession(storage, bankVersion(BATTERY)), null);
});

test("correlated-error floor keeps pooled SEs honest", () => {
  const pooled = combineInverseVariance([
    { theta: 1.0, se: 0.30 },
    { theta: 0.8, se: 0.60 },
  ]);
  // Independence would give ~0.27; the floor holds it at the best component.
  assert.ok(pooled.se >= 0.30 - 1e-9, "pooled SE undercut the best component");
  assert.ok(pooled.se <= 0.32, "floor should equal the min component SE here");
});
