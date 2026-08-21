import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import {
  initSession, beginBattery, startSubtest, answerItem, answerPractice, answerMatching, answerMatchingDemo,
} from "../src/core/session.ts";
import { scoreComposite } from "../src/core/scoring.ts";
import type { Item } from "../src/core/types.ts";

/**
 * SCALE-FLOOR REGRESSION (2026-08-21, docs/DIFFICULTY_AUDIT.md §9).
 *
 * Before this revision a completely random examinee scored IQ 72-75: the
 * unit-prior EAP shrank chance-level evidence up toward the population mean,
 * and the bare miss-streak discontinue stopped routing before the descent
 * reached items that could actually discriminate at the bottom. Two engine
 * changes fix the floor:
 *
 *   1. Reported subtest estimates use the wide reporting prior
 *      (REPORT_PRIOR_SD, src/core/irt.ts) so likelihood evidence at the
 *      bottom of the scale is not outweighed by the prior.
 *   2. The ceiling-discontinue rule is floor-gated (src/core/routing.ts):
 *      miss streaks only stop a subtest once the estimate has descended to
 *      within FLOOR_BAND of the pool's easiest item.
 *
 * Supporting bank work added basal items below the old floors (rotation,
 * folding, number series, quant comparison, block counting).
 *
 * These tests pin the two properties that matter:
 *   - pure random responding reports near IQ 50 (the scale floor), and
 *   - genuine ability levels still land where they should (no over-correction).
 */

/** Deterministic PRNG (mulberry32) so the regression never flakes. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One answer from a responder, given the item and a uniform source. */
type Responder = (item: Item, rng: () => number) => number | string;

function randomResponder(item: Item, rng: () => number): number | string {
  if (item.multi !== undefined) {
    const n = item.options?.length ?? 6;
    const picks = new Set<number>();
    while (picks.size < item.multi) picks.add(Math.floor(rng() * n));
    return [...picks].sort((a, b) => a - b).join(",");
  }
  if (typeof item.answer === "number") {
    return Math.floor(rng() * (item.options?.length ?? 5));
  }
  // Recall formats: typed noise (never matches the key).
  const len = 3 + Math.floor(rng() * 5);
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(rng() * 10);
  return s;
}

/** Bernoulli responder at a true ability level (the 3PL itself). */
function engagedResponder(thetaTrue: number): Responder {
  return (item, rng) => {
    const z = item.a * (thetaTrue - item.b);
    const p = item.c + (1 - item.c) * (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
    const correct = rng() < p;
    if (item.multi !== undefined) {
      if (correct) return item.answer as string;
      // A guaranteed-wrong pick: the first `multi` option indices NOT in the
      // key. (The former hardcoded "0,1,2" was the real key of vpz-014, so
      // every intended-incorrect trial on that item scored CORRECT.)
      const key = new Set((item.answer as string).split(",").map(Number));
      const wrong: number[] = [];
      for (let i = 0; wrong.length < item.multi; i++) {
        if (!key.has(i)) wrong.push(i);
      }
      return wrong.join(",");
    }
    if (typeof item.answer === "number") {
      return correct ? (item.answer as number) : ((item.answer as number) + 1) % (item.options?.length ?? 4);
    }
    return correct ? (item.answer as string) : "zz";
  };
}

/** Drive one full battery through the real session state machine. */
function runBattery(respond: Responder, seed: number) {
  const rng = mulberry32(seed);
  let s = beginBattery(initSession(BATTERY, { sessionId: "floor-" + seed }), 0);
  let t = 0;
  let guard = 0;
  // Speeded subtests carry a per-item timeLimitSec; the responder answers
  // those in ~2 s, well inside the cap. A flat 15 s/event pace silently
  // truncated symbolSearch/symbolSelection at 12 items + 1 omitted response
  // on every seed (section expiry fired at item 13), making the "random
  // responder" unknowingly a truncated-form responder for Gs.
  const timedOutFirst = new Set<number>();
  while (s.phase.kind !== "results" && guard++ < 8000) {
    const phase = s.phase;
    if (phase.kind === "item" && phase.item.timeLimitSec !== undefined) {
      if (!timedOutFirst.has(phase.subtestIndex)) {
        // First administered item of each speeded subtest runs the per-item
        // cap dry and is auto-submitted by the UI (answerItem's timedOut
        // path — the only honest way this harness can exercise it).
        timedOutFirst.add(phase.subtestIndex);
        t += phase.item.timeLimitSec * 1000;
        s = answerItem(s, respond(phase.item, rng), t, true);
        continue;
      }
      t += 2_000; // engaged pace: validity screening must not drive scores
      s = answerItem(s, respond(phase.item, rng), t);
      continue;
    }
    t += 15_000; // engaged pace for unspeeded formats
    if (phase.kind === "instructions") s = startSubtest(s, phase.subtestIndex, t);
    else if (phase.kind === "checkpoint") s = { ...s, phase: { kind: "instructions", subtestIndex: phase.subtestIndex + 1 } };
    else if (phase.kind === "practice") s = answerPractice(s, t);
    else if (phase.kind === "item") s = answerItem(s, respond(phase.item, rng), t);
    else if (phase.kind === "matchingDemo") s = answerMatchingDemo(s, t);
    else if (phase.kind === "matching") {
      const subtest = s.subtests[phase.subtestIndex]!;
      const bank = subtest.matching?.bank ?? [];
      const assignments = bank.map(() => 1 + Math.floor(rng() * Math.max(1, subtest.items.length)));
      s = answerMatching(s, assignments, t);
    }
  }
  assert.equal(s.phase.kind, "results", "battery did not terminate");
  return s;
}

function gScoreOf(s: ReturnType<typeof runBattery>): number {
  return scoreComposite(s.subtests, s.responses).g.score;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

test("completely random responding reports near the IQ 50 scale floor", () => {
  const iqs: number[] = [];
  for (let seed = 1; seed <= 30; seed++) iqs.push(gScoreOf(runBattery(randomResponder, seed)));
  const m = mean(iqs);
  assert.ok(
    m >= 46 && m <= 56,
    `random responders must average near IQ 50, got mean ${m.toFixed(1)} (${Math.min(...iqs)}..${Math.max(...iqs)})`,
  );
  for (const iq of iqs) {
    assert.ok(iq >= 40 && iq <= 64, `a single random administration landed at ${iq}`);
  }
});

test("the harness administers full forms: no speeded subtest is truncated by section expiry", () => {
  // Regression for the old flat 15 s/event pace: symbolSearch and
  // symbolSelection (budgetMin 3, per-item timeLimitSec) were cut off at 12
  // items + 1 OMITTED response on every seed — the section clock expired at
  // item 13 — so the "random responder" was secretly a truncated-form
  // responder and the timed-out recording path was never exercised. At the
  // modeled pace every speeded subtest must now end on a ROUTING decision:
  // symbolSearch (binary, ~50% random-correct) runs to its max-items stop,
  // while symbolSelection legitimately discontinue-stops at the floor
  // (random typed noise never matches the full key sequence).
  const speededIdx = BATTERY
    .map((s, i) => (s.items.some((i2) => i2.timeLimitSec !== undefined) ? i : -1))
    .filter((i) => i >= 0);
  assert.ok(speededIdx.length >= 2, "expected at least two speeded subtests in the battery");
  const ssrIdx = BATTERY.findIndex((s) => s.id === "symbolSearch");
  assert.ok(ssrIdx >= 0, "symbolSearch missing from the battery");
  for (let seed = 1; seed <= 6; seed++) {
    const s = runBattery(randomResponder, seed);
    const omitted = s.responses.filter((r) => r.omitted);
    assert.deepEqual(omitted, [], "section/battery expiry censored responses mid-form (truncated administration)");
    for (const idx of speededIdx) {
      assert.notEqual(s.stopReasons[idx], "time-limit", BATTERY[idx]!.id + " ended on the section clock");
      const subtestId = BATTERY[idx]!.id;
      assert.ok(
        s.responses.some((r) => r.subtestId === subtestId && r.timedOut),
        subtestId + " never recorded a timed-out response",
      );
    }
    assert.equal(s.stopReasons[ssrIdx], "max-items", "symbolSearch must run its full form for a ~50% random responder");
    assert.equal(s.routing[ssrIdx]!.administered.length, BATTERY[ssrIdx]!.routing.maxItems, "symbolSearch truncated (regression)");
  }
});

test("genuine ability levels survive the floor fix", () => {
  // Ceiling note: theta +2 compresses toward ~126 because the banks' honest
  // ceilings sit near b +2.2-3.2 (audit §7.4); measuring beyond IQ ~135 is
  // explicitly out of scope until norming data exists.
  const conditions: { theta: number; lo: number; hi: number }[] = [
    { theta: -2, lo: 62, hi: 78 },
    { theta: -1, lo: 78, hi: 92 },
    { theta: 0, lo: 94, hi: 106 },
    { theta: 1, lo: 106, hi: 120 },
    { theta: 2, lo: 118, hi: 134 },
  ];
  const means: number[] = [];
  for (const { theta, lo, hi } of conditions) {
    const iqs: number[] = [];
    for (let seed = 101; seed <= 112; seed++) iqs.push(gScoreOf(runBattery(engagedResponder(theta), seed)));
    const m = mean(iqs);
    means.push(m);
    assert.ok(
      m >= lo && m <= hi,
      `true theta ${theta} must report ${lo}..${hi}, got ${m.toFixed(1)}`,
    );
  }
  for (let k = 1; k < means.length; k++) {
    assert.ok(means[k]! > means[k - 1]!, `ability ordering broken at condition ${k}`);
  }
});

test("random responding scores strictly below every genuine ability level tested", () => {
  const randomIq = mean(Array.from({ length: 12 }, (_, k) => gScoreOf(runBattery(randomResponder, 500 + k))));
  const lowIq = mean(Array.from({ length: 8 }, (_, k) => gScoreOf(runBattery(engagedResponder(-2.5), 600 + k))));
  assert.ok(
    randomIq < lowIq,
    `random mean ${randomIq.toFixed(1)} must sit below the true-theta -2.5 mean ${lowIq.toFixed(1)}`,
  );
});
