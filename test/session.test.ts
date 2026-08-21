import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initSession, beginBattery, startSubtest, answerItem, expireSubtest, isCorrect,
  normalise, remainingMs, sectionRemainingMs, totalBudgetMin, BATTERY_BUDGET_MIN,
  resumeSavedSession,
} from "../src/core/session.ts";
import type { Item, Subtest } from "../src/core/types.ts";

function mcItem(id: string, sub: string, b: number): Item {
  return {
    id, subtest: sub, broad: "Gf", narrow: "I", a: 1.5, b, c: 0.2,
    prompt: id, options: ["a", "b", "c", "d", "e"], answer: 2,
  };
}
function crItem(id: string, sub: string, b: number, ans: string): Item {
  return { id, subtest: sub, broad: "Gwm", narrow: "MS", a: 1.5, b, c: 0, prompt: id, answer: ans };
}
function mkSub(id: string, items: Item[], budgetMin = 10): Subtest {
  return {
    id, name: id, broad: "Gf", narrow: ["I"], instructions: "go", budgetMin,
    routing: { maxItems: 6, minItems: 2, ceilingMisses: 3, targetSe: 0.25, entryTheta: 0 },
    items,
  };
}

const subA = mkSub("A", Array.from({ length: 10 }, (_, i) => mcItem("a" + i, "A", -2 + i * 0.4)));
const subB = mkSub("B", Array.from({ length: 10 }, (_, i) => mcItem("b" + i, "B", -2 + i * 0.4)));

test("normalise strips case, spaces and punctuation", () => {
  assert.equal(normalise(" 4 9 1-7 "), "4917");
  assert.equal(normalise("knife"), "KNIFE");
  assert.equal(normalise("3 7 b k"), "37BK");
});

test("isCorrect handles multiple choice by index", () => {
  const it = mcItem("x", "A", 0);
  assert.equal(isCorrect(it, 2), true);
  assert.equal(isCorrect(it, 0), false);
  assert.equal(isCorrect(it, "2"), false);
});

test("isCorrect handles constructed response with loose formatting", () => {
  const it = crItem("y", "W", 0, "7194");
  assert.equal(isCorrect(it, "7194"), true);
  assert.equal(isCorrect(it, " 7 1 9 4 "), true);
  assert.equal(isCorrect(it, "7195"), false);
  assert.equal(isCorrect(it, 7194), false);
});

test("battery walks intro to instructions to item", () => {
  let s = initSession([subA, subB]);
  assert.equal(s.phase.kind, "intro");
  s = beginBattery(s, 0);
  assert.equal(s.phase.kind, "instructions");
  s = startSubtest(s, 0, 0);
  assert.equal(s.phase.kind, "item");
});

test("answering advances within a subtest then moves on", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  let guard = 0;
  let t = 0;
  while (s.phase.kind === "item" && s.phase.subtestIndex === 0 && guard++ < 50) {
    t += 1000;
    s = answerItem(s, 2, t);
  }
  assert.ok(guard < 50, "subtest A did not terminate");
  assert.ok(s.stopReasons[0] !== null, "no stop reason recorded for A");
});

test("a full two-subtest battery reaches results", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  let t = 0;
  let guard = 0;
  while (s.phase.kind !== "results" && guard++ < 200) {
    t += 1000;
    if (s.phase.kind === "item") {
      s = answerItem(s, 2, t);
    } else if (s.phase.kind === "instructions") {
      s = startSubtest(s, s.phase.subtestIndex, t);
    } else if (s.phase.kind === "checkpoint") {
      s = { ...s, phase: { kind: "instructions", subtestIndex: s.phase.subtestIndex + 1 } };
    }
  }
  assert.equal(s.phase.kind, "results", "battery never reached results");
  assert.ok(s.responses.length > 0);
  assert.ok(s.stopReasons.every((r) => r !== null), "a subtest was left open");
});

test("latency is recorded from item presentation", () => {
  let s = beginBattery(initSession([subA]), 0);
  s = startSubtest(s, 0, 5000);
  s = answerItem(s, 2, 8500);
  assert.equal(s.responses[0]!.latencyMs, 3500);
});

test("timed-out responses are flagged and scored incorrect", () => {
  let s = beginBattery(initSession([subA]), 0);
  s = startSubtest(s, 0, 0);
  s = answerItem(s, -1, 1000, true);
  assert.equal(s.responses[0]!.timedOut, true);
  assert.equal(s.responses[0]!.correct, false);
});

test("exhausting the battery budget forces results", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  s = answerItem(s, 2, (BATTERY_BUDGET_MIN + 1) * 60000);
  assert.equal(s.phase.kind, "results");
});

test("remainingMs never goes negative and freezes while no segment is open", () => {
  const s = beginBattery(initSession([subA]), 0);
  // No scored segment open (instructions phase): the clock is frozen.
  assert.equal(remainingMs(s, 999 * 60000), BATTERY_BUDGET_MIN * 60000);
  assert.equal(remainingMs(s, 0), BATTERY_BUDGET_MIN * 60000);
  // Once a segment opens, active time counts down.
  const started = startSubtest(s, 0, 0);
  assert.equal(remainingMs(started, BATTERY_BUDGET_MIN * 60_000 + 5000), 0);
});

test("the battery clock runs only while sections are open (multi-sitting)", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  // Idle for an hour at instructions: nothing is consumed.
  s = startSubtest(s, 0, 3_600_000);
  assert.equal(remainingMs(s, 3_600_000), BATTERY_BUDGET_MIN * 60000, "segment must freeze the clock at open");
  let t = 3_600_000;
  let guard = 0;
  while (s.phase.kind === "item" && s.phase.subtestIndex === 0 && guard++ < 50) {
    t += 1000;
    s = answerItem(s, 2, t);
  }
  // Section closed into a checkpoint: clock frozen again.
  if (s.phase.kind === "checkpoint") {
    const frozenAt = remainingMs(s, t + 86_400_000);
    assert.equal(frozenAt, remainingMs(s, t), "checkpoint must freeze the battery clock");
    // Next day: resume the next section; the budget resumes untouched.
    s = { ...s, phase: { kind: "instructions", subtestIndex: s.phase.subtestIndex + 1 } };
    s = startSubtest(s, 1, t + 86_400_000);
    assert.ok(remainingMs(s, t + 86_400_000) > 0, "a resumed sitting must keep its remaining budget");
  } else {
    assert.ok(s.stopReasons[0] !== null, "subtest did not close");
  }
});

test("resuming a save taken mid-section bills only work time, then voids the section", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 1000); // segment opens at t=1s
  // Examinee answers one item at t=16s, then abandons the tab mid-item.
  assert.equal(s.phase.kind, "item");
  s = answerItem(s, 2, 16_000);
  const savedAt = 20_000;
  const daysLater = savedAt + 86_400_000;
  // Restore: only the ~19s of real work is billed; the absence is free.
  const resumed = resumeSavedSession(s, savedAt, daysLater);
  assert.equal(resumed.segmentStart, daysLater);
  assert.ok(
    Math.abs(remainingMs(resumed, daysLater) - (BATTERY_BUDGET_MIN * 60_000 - 19_000)) <= 1,
    "only pre-save work time may be billed",
  );
  // The abandoned SECTION clock was NOT re-based: it expired while away.
  assert.equal(sectionRemainingMs(resumed, daysLater), 0, "the open section must show expired");
  // The normal expiry path then voids exactly that one section into a checkpoint.
  const closed = expireSubtest(resumed, daysLater + 1);
  assert.equal(closed.stopReasons[0], "time-limit");
  assert.equal(closed.phase.kind, "checkpoint");
});

test("every section boundary lands on a checkpoint", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  let t = 0;
  let guard = 0;
  while (s.phase.kind === "item" && guard++ < 50) {
    t += 1000;
    s = answerItem(s, 2, t);
  }
  assert.equal(s.phase.kind, "checkpoint", "finishing a section must open a checkpoint");
  assert.equal(s.segmentStart, null, "no scored segment may stay open across a checkpoint");
  // Continue from the checkpoint into subtest B.
  s = { ...s, phase: { kind: "instructions", subtestIndex: s.phase.subtestIndex + 1 } };
  s = startSubtest(s, 1, t += 1000);
  assert.equal(s.phase.kind, "item");
});

test("totalBudgetMin sums authored budgets", () => {
  assert.equal(totalBudgetMin([subA, subB]), 20);
});

test("no item is ever served twice across a whole battery", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  let t = 0;
  let guard = 0;
  while (s.phase.kind !== "results" && guard++ < 200) {
    t += 1000;
    if (s.phase.kind === "item") s = answerItem(s, guard % 3 === 0 ? 2 : 0, t);
    else if (s.phase.kind === "instructions") s = startSubtest(s, s.phase.subtestIndex, t);
    else if (s.phase.kind === "checkpoint") s = { ...s, phase: { kind: "instructions", subtestIndex: s.phase.subtestIndex + 1 } };
  }
  const ids = s.responses.map((r) => r.itemId);
  assert.equal(new Set(ids).size, ids.length, "an item was administered twice");
});

test("section clock starts with scored administration and counts down", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  assert.equal(sectionRemainingMs(s, 1000), null);
  s = startSubtest(s, 0, 5000);
  assert.equal(sectionRemainingMs(s, 5000), 10 * 60000);
  assert.equal(sectionRemainingMs(s, 65000), 9 * 60000);
});

test("section expiry closes the route with a time-limit reason", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  s = expireSubtest(s, 10 * 60000);
  assert.equal(s.stopReasons[0], "time-limit");
  assert.equal(s.sectionStartedAt, null);
  assert.equal(s.phase.kind, "checkpoint");
});

test("a late answer is recorded as omitted and the section ends", () => {
  const short = mkSub("short", [mcItem("late", "short", 0)], 1);
  let s = beginBattery(initSession([short, subB]), 0);
  s = startSubtest(s, 0, 0);
  s = answerItem(s, 2, 60001);
  // The in-flight item is censored, not silently dropped: it stays in the
  // record flagged omitted, excluded from scoring.
  assert.equal(s.responses.length, 1);
  assert.equal(s.responses[0]!.omitted, true);
  assert.equal(s.responses[0]!.correct, false);
  assert.equal(s.stopReasons[0], "time-limit");
});

test("section expiry records the on-screen item as omitted", () => {
  let s = beginBattery(initSession([subA, subB]), 0);
  s = startSubtest(s, 0, 0);
  const before = s.responses.length;
  s = expireSubtest(s, 10 * 60000);
  assert.equal(s.responses.length, before + 1);
  assert.equal(s.responses.at(-1)!.omitted, true);
  assert.equal(s.stopReasons[0], "time-limit");
});

test("interrupted memory responses do not feed the discontinue streak", () => {
  let s = beginBattery(initSession([subA]), 0);
  s = startSubtest(s, 0, 0);
  s = answerItem(s, "", 1000, true, { interrupted: true });
  assert.equal(s.routing[0]!.consecutiveMisses, 0, "interruption must not count as a miss");
  assert.equal(s.responses[0]!.interrupted, true);
  s = answerItem(s, 0, 2000);
  assert.equal(s.routing[0]!.consecutiveMisses, 1, "a real miss still counts");
});
