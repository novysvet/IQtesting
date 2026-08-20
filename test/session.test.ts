import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initSession, beginBattery, startSubtest, answerItem, expireSubtest, isCorrect,
  normalise, isBreakPoint, remainingMs, sectionRemainingMs, totalBudgetMin, BATTERY_BUDGET_MIN,
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
    } else if (s.phase.kind === "break") {
      s = startSubtest(s, s.phase.subtestIndex + 1, t);
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

test("remainingMs never goes negative", () => {
  const s = beginBattery(initSession([subA]), 0);
  assert.equal(remainingMs(s, 999 * 60000), 0);
  assert.equal(remainingMs(s, 0), BATTERY_BUDGET_MIN * 60000);
});

test("break points fall every third subtest but never last", () => {
  assert.equal(isBreakPoint(2, 9), true);
  assert.equal(isBreakPoint(0, 9), false);
  assert.equal(isBreakPoint(8, 9), false, "no break after the final subtest");
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
    else if (s.phase.kind === "break") s = startSubtest(s, s.phase.subtestIndex + 1, t);
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
  assert.equal(s.phase.kind, "instructions");
});

test("a late answer is omitted and the section ends", () => {
  const short = mkSub("short", [mcItem("late", "short", 0)], 1);
  let s = beginBattery(initSession([short, subB]), 0);
  s = startSubtest(s, 0, 0);
  s = answerItem(s, 2, 60001);
  assert.equal(s.responses.length, 0);
  assert.equal(s.stopReasons[0], "time-limit");
});
