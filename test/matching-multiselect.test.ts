import test from "node:test";
import assert from "node:assert/strict";
import type { Item, Subtest } from "../src/core/types.ts";
import { initSession, startSubtest, answerMatching, expireSubtest, sectionRemainingMs, isCorrect, BATTERY_BUDGET_MIN } from "../src/core/session.ts";
import { bankVersion } from "../src/core/telemetry.ts";
import { optionPermutation } from "../src/core/presentation.ts";
import { visualPuzzles } from "../src/items/gv-puzzle.ts";
import { scoreComposite } from "../src/core/scoring.ts";

/** Synthetic matching subtest in the 1926-definitions format. */
function mkMatching(): Subtest {
  const item = (n: number, word: string): Item => ({
    id: "dfn-" + n, subtest: "defs", broad: "Gc", narrow: "VL",
    a: 1.2, b: 0, c: 0, prompt: "Definition number " + n, answer: word,
  });
  return {
    id: "defs", name: "Definitions", broad: "Gc", narrow: ["VL"],
    instructions: "Match each definition to its word.",
    budgetMin: 8,
    routing: { maxItems: 3, minItems: 3, ceilingMisses: 99, targetSe: 0.01, entryTheta: 0 },
    items: [item(1, "alpha"), item(2, "beta"), item(3, "gamma")],
    matching: { bank: ["alpha", "beta", "decoy", "gamma", "filler", "noise"] },
  };
}

/** Minimal adaptive subtest placed after the matching page. */
function mkFollowing(): Subtest {
  return {
    id: "next", name: "Next", broad: "Gc", narrow: ["VL"],
    instructions: "-", budgetMin: 5,
    routing: { maxItems: 4, minItems: 2, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 },
    items: [{
      id: "nx-1", subtest: "next", broad: "Gc", narrow: "VL",
      a: 1, b: 0, c: 0.2, prompt: "x", options: ["a", "b", "c", "d", "e"], answer: 0, render: { kind: "text" },
    }],
  };
}

function begun(subtests: Subtest[]) {
  const s = initSession(subtests);
  return startSubtest({ ...s, startedAt: 1000, phase: { kind: "instructions", subtestIndex: 0 } }, 0, 1000);
}

test("startSubtest enters the matching phase without routing", () => {
  const s = begun([mkMatching()]);
  assert.equal(s.phase.kind, "matching");
  if (s.phase.kind !== "matching") return;
  assert.equal(s.phase.subtestIndex, 0);
  assert.equal(s.sectionStartedAt, 1000);
});

test("answerMatching scores each definition against the number typed next to its key word", () => {
  // bank: alpha=0, beta=1, decoy=2, gamma=3, filler=4, noise=5.
  // Correct: 1 -> alpha (type 1 at index 0), 3 -> gamma (type 3 at index 3).
  // Wrong: 2 -> beta, but 2 typed next to decoy.
  const out = answerMatching(begun([mkMatching(), mkFollowing()]), [1, 0, 2, 3, 0, 0], 200_000);
  assert.equal(out.phase.kind, "checkpoint"); // advances past the section
  assert.equal(out.responses.length, 3);
  assert.deepEqual(out.responses.map((r) => r.correct), [true, false, true]);
  // beta was left blank: no raw answer, flagged as not attempted.
  assert.deepEqual(out.responses.map((r) => r.rawAnswer), [1, null, 3]);
  assert.deepEqual(out.responses.map((r) => r.timedOut), [false, true, false]);
  assert.equal(out.stopReasons[0], "max-items");
  const route = out.routing[0]!;
  assert.equal(route.administered.length, 3);
  assert.ok(Number.isFinite(route.theta) && Number.isFinite(route.se));
  assert.equal(route.done, true);
  // Positions within the subtest are the definition numbers.
  assert.deepEqual(out.responses.map((r) => r.positionInSubtest), [1, 2, 3]);
});

test("timeout submit flags blank items and records the time-limit stop", () => {
  const s = begun([mkMatching()]);
  // Only gamma answered, 40 s into an 8-minute page.
  const out = answerMatching(s, [0, 0, 0, 3, 0, 0], 140_000, true);
  assert.equal(out.stopReasons[0], "time-limit");
  // Blanks are incorrect, flagged timedOut, with null raw answers.
  assert.equal(out.responses[0]!.correct, false);
  assert.equal(out.responses[0]!.timedOut, true);
  assert.equal(out.responses[0]!.rawAnswer, null);
  // The answered one keeps its raw answer but the page is still a timeout.
  assert.equal(out.responses[2]!.correct, true);
  assert.equal(out.responses[2]!.rawAnswer, 3);
  assert.equal(out.responses[2]!.timedOut, true);
});

test("expireSubtest on a matching page scores everything blank", () => {
  const s = begun([mkMatching()]);
  const out = expireSubtest(s, 500_000);
  assert.equal(out.stopReasons[0], "time-limit");
  assert.equal(out.responses.filter((r) => r.correct).length, 0);
  assert.equal(out.responses.length, 3);
});

test("battery-budget expiry with the matching page open records the page, then results", () => {
  // Regression for the App battery-expiry tick: it used to flip straight to
  // results (and answerMatching's budget guard dropped the page with 0
  // responses). The page must be RECORDED blank/timedOut before closing.
  const s = begun([mkMatching(), mkFollowing()]); // scored segment opens at t=1000
  const out = expireSubtest(s, (BATTERY_BUDGET_MIN + 1) * 60_000);
  assert.equal(out.phase.kind, "results", "an exhausted battery ends in results");
  assert.equal(out.responses.length, 3, "the open page must be recorded, not dropped");
  assert.ok(out.responses.every((r) => r.timedOut === true), "battery-expired blanks are timedOut");
  assert.ok(out.responses.every((r) => r.rawAnswer === null), "battery-expired blanks carry no raw answer");
  assert.ok(out.responses.every((r) => r.correct === false));
  assert.equal(out.stopReasons[0], "time-limit");
  assert.equal(out.segmentStart, null, "the scored segment must close with the battery");
});

test("answerMatching past the battery budget records the blank page before closing", () => {
  // The session-layer guard itself: even a submit that lands after the budget
  // ran out records the page blank/timedOut (the assignments are void — the
  // page expired mid-display) instead of returning results with 0 responses.
  const s = begun([mkMatching(), mkFollowing()]);
  const out = answerMatching(s, [1, 0, 2, 3, 0, 0], (BATTERY_BUDGET_MIN + 1) * 60_000);
  assert.equal(out.phase.kind, "results");
  assert.equal(out.responses.length, 3);
  assert.ok(out.responses.every((r) => r.timedOut === true && r.rawAnswer === null && r.correct === false));
  assert.equal(out.segmentStart, null);
});

test("section clock runs during the matching phase and closes afterward", () => {
  const s = begun([mkMatching()]);
  const mid = sectionRemainingMs(s, 1000 + 60_000);
  assert.ok(mid !== null && mid > 0 && mid < 8 * 60_000);
  const done = answerMatching(s, [1, 2, 0, 3, 0, 0], 200_000);
  assert.equal(sectionRemainingMs(done, 200_000), null);
});

test("multi-select answers compare canonically through normalise", () => {
  const item: Item = {
    id: "vpz-x", subtest: "vpz", broad: "Gv", narrow: "Vz",
    a: 1.2, b: 0.4, c: 0.05, prompt: "pick three", multi: 3,
    options: ["a", "b", "c", "d", "e", "f"], answer: "0,3,4",
  };
  assert.equal(isCorrect(item, "0,3,4"), true);
  assert.equal(isCorrect(item, "1,3,4"), false);
});

test("multi-select UI mapping grades exactly-correct picks correct under every display permutation", () => {
  // Regression for the ItemScreen submit order: picked DISPLAY indices must
  // be mapped to ORIGINAL option indices FIRST, then sorted ascending. The
  // old sort-display-then-map order graded correct picks wrong 5/6 of the
  // time whenever the session permutation was not order-preserving.
  const multiItems = visualPuzzles.items.filter((i) => (i.multi ?? 0) >= 2);
  assert.ok(multiItems.length > 0, "visualPuzzles multi items not found");
  let orderSensitiveSeeds = 0;
  for (const item of multiItems) {
    const keys = String(item.answer).split(",").map(Number);
    for (let seed = 0; seed < 40; seed++) {
      const sessionId = "perm-seed-" + seed;
      const perm = optionPermutation(sessionId, item.id, item.options!.length);
      assert.ok(perm, "multi items always have >= 3 options, so a permutation exists");
      // The examinee clicks the display slots where the keyed pieces landed.
      const pickedDisplay = new Set(
        perm.flatMap((original, display) => (keys.includes(original) ? [display] : [])),
      );
      assert.equal(pickedDisplay.size, keys.length);
      // The old, buggy submit expression (sort display slots, then map).
      const buggy = [...pickedDisplay].sort((a, b) => a - b).map((d) => perm[d]!).join(",");
      if (buggy !== item.answer) orderSensitiveSeeds++;
      // The fixed submit expression from App.tsx ItemScreen.submit.
      const submitted = [...pickedDisplay].map((d) => perm[d]!).sort((a, b) => a - b).join(",");
      assert.equal(submitted, item.answer, item.id + " key string mangled under permutation");
      assert.equal(isCorrect(item, submitted), true, item.id + " correct picks graded wrong");
    }
  }
  assert.ok(orderSensitiveSeeds > 0, "no permutation reordered the picks — the regression guard is vacuous");
});

test("Gs has a g-weight and flows through composite scoring", () => {
  const gs: Subtest = {
    id: "sym", name: "Symbol Search", broad: "Gs", narrow: ["P"],
    instructions: "fast",
    budgetMin: 3,
    routing: { maxItems: 10, minItems: 5, ceilingMisses: 6, targetSe: 0.5, entryTheta: 0 },
    items: Array.from({ length: 10 }, (_, i) => ({
      id: "ssr-" + i, subtest: "sym", broad: "Gs" as const, narrow: "P" as const,
      a: 1.2, b: i * 0.2 - 1, c: 0.5, prompt: "yes or no", options: ["No", "Yes"], answer: i % 2,
      render: { kind: "text" as const },
    })),
  };
  const s0 = initSession([gs]);
  const score = scoreComposite(s0.subtests, []);
  assert.equal(score.broad.length, 0); // no responses yet
  const responses = gs.items.slice(0, 6).map((it, i) => ({
    itemId: it.id, correct: i < 4, latencyMs: 900, timedOut: false,
  }));
  const score2 = scoreComposite(s0.subtests, responses);
  const gsWithItems = score2.broad.find((b) => b.broad === "Gs");
  assert.ok(gsWithItems, "Gs factor missing from composite");
});

test("editing the matching word bank changes the bank version", () => {
  const a = mkMatching();
  const b = mkMatching();
  b.matching!.bank[2] = "changed";
  assert.notEqual(bankVersion([a]), bankVersion([b]));
});

test("answerMatching outside the matching phase is a no-op", () => {
  const s = initSession([mkMatching()]);
  assert.equal(answerMatching(s, [1, 2, 3, 1, 0, 0], 999), s);
});
