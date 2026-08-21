import { test } from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import { pCorrect } from "../src/core/irt.ts";
import { scoreComposite } from "../src/core/scoring.ts";
import {
  screenSession, validitySummary,
  MIN_SCREENABLE_RESPONSES, RAPID_POWER_MS, INTERRUPTION_QUESTIONABLE_FRACTION,
} from "../src/core/validity.ts";
import type { Item, Response, Subtest } from "../src/core/types.ts";

/**
 * Deterministic examinee models over the real adaptive routing engine:
 *  - engaged(theta, seed): answers each administered item correctly with
 *    probability pCorrect(item, theta) — a seeded Bernoulli ability pattern,
 *    which is what real engaged responding looks like (a hard quantile cutoff
 *    would fabricate pathological chosen-position runs and extreme lz).
 *  - spammer: picks option 0 on every MC item (long straight-line run),
 *    garbage text on recall items, at rapid-fire latency.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateEngaged(theta: number, latencyMs: number, seed = 42): Response[] {
  const rng = mulberry32(seed);
  const out: Response[] = [];
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      // Realistic typed answers: the definition's own page position when
      // correct, a different position when wrong (never a constant digit —
      // that would fabricate straight-line runs in the option-position scan).
      subtest.items.forEach((item, pos) => {
        const correct = rng() < pCorrect(item, theta);
        const n = subtest.items.length;
        out.push({
          itemId: item.id, correct, latencyMs: latencyMs + 4000, timedOut: false,
          subtestId: subtest.id,
          rawAnswer: correct ? pos + 1 : ((pos + 1 + Math.floor(rng() * (n - 1))) % n) + 1,
          answerIndex: typeof item.answer === "number" ? item.answer : null,
        });
      });
      continue;
    }
    let state = initRouting(subtest.routing);
    for (;;) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      const correct = rng() < pCorrect(item, theta);
      const chosen = mcChosen(item, correct);
      const response: Response = {
        itemId: item.id, correct, latencyMs, timedOut: false,
        subtestId: subtest.id,
        rawAnswer: chosen,
        answerIndex: typeof item.answer === "number" ? item.answer : null,
      };
      state = applyResponse(state, item, response);
      out.push(response);
    }
  }
  return out;
}

/** A consistent chosen-answer for MC items; recall items get plausible typed junk. */
function mcChosen(item: Item, correct: boolean): number | string {
  if (typeof item.answer === "number") return correct ? item.answer : (item.answer + 1) % (item.options?.length ?? 4);
  return "zz";
}

function simulateSpammer(): Response[] {
  const out: Response[] = [];
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      for (const item of subtest.items) {
        out.push({ itemId: item.id, correct: false, latencyMs: 60_000, timedOut: false, subtestId: subtest.id, rawAnswer: 3, answerIndex: null });
      }
      continue;
    }
    let state = initRouting(subtest.routing);
    for (;;) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      // Position-0 spam: correct only when the key happens to sit at index 0.
      const correct = item.answer === 0;
      const response: Response = {
        itemId: item.id, correct, latencyMs: 900, timedOut: false,
        subtestId: subtest.id, rawAnswer: typeof item.answer === "number" ? 0 : "qq",
        answerIndex: typeof item.answer === "number" ? item.answer : null,
      };
      state = applyResponse(state, item, response);
      out.push(response);
    }
  }
  return out;
}

test("an engaged, consistent administration screens valid", () => {
  for (const theta of [-1, 0, 1]) {
    const responses = simulateEngaged(theta, 18_000);
    const report = screenSession(BATTERY, responses);
    assert.equal(report.verdict, "valid", `theta ${theta}: ${validitySummary(report)} — ${report.reasons.join("; ")}`);
    assert.ok(Math.abs(report.personFitZ!) < 2, `fit z should be near zero, got ${report.personFitZ}`);
    assert.equal(report.rapidFraction, 0);
  }
});

test("an engaged LOW-ABILITY administration also screens valid (floor false-positive regression)", () => {
  // After the scoring-floor fix, low-ability examinees walk the adaptive
  // descent down to basal items. Their patterns must read as consistent
  // ability, not disengagement: the difficulty gradient is what separates
  // them from guessers, so it must stay strongly negative here.
  for (const theta of [-2.5, -2]) {
    const responses = simulateEngaged(theta, 18_000);
    const composite = scoreComposite(BATTERY, responses);
    const report = screenSession(BATTERY, responses);
    assert.equal(report.verdict, "valid", `theta ${theta}: ${validitySummary(report)} — ${report.reasons.join("; ")}`);
    assert.ok(
      report.difficultyCorrelation !== null && report.difficultyCorrelation <= -0.2,
      `theta ${theta}: gradient r ${report.difficultyCorrelation} must be clearly negative`,
    );
    assert.ok(composite.g.score > 55 && composite.g.score < 80, `theta ${theta} composite landed at ${composite.g.score}`);
  }
});

test("an engaged HIGH-ABILITY administration is not flagged invalid (straight-lining false-positive regression)", () => {
  // Regression for the cross-subtest run bug: the same-option run counter
  // carried across subtest boundaries, and subtests whose keys cluster at one
  // index (analyticalReasoning keyed every scored item at original index 0
  // before the bank was de-cycled) turned honest all-correct sections into
  // battery-wide "straight-line" runs — precisely the high-ability tail a
  // norming study needs. Runs are per-subtest now, so honest responders at
  // any ability level must never read as invalid. (Low theta is covered above;
  // multiple seeds because the flag depended on the seed's answer pattern.)
  for (const theta of [2, 2.5, 4]) {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const responses = simulateEngaged(theta, 18_000, seed);
      const report = screenSession(BATTERY, responses);
      assert.notEqual(
        report.verdict, "invalid",
        `theta ${theta} seed ${seed}: ${validitySummary(report)} — ${report.reasons.join("; ")}`,
      );
    }
  }
});

test("concentrated tab-hiding in a memory subtest flags questionable; a single interruption stays clean", () => {
  // Tab-hide exploit regression: interrupted responses are censored from
  // estimation and STAY censored here — but their concentration in one
  // subtest is the cheat signature (hide the tab during exactly the memory
  // exposures that would have failed). One real distraction must not flag.
  const censorWouldFail = (responses: Response[], count: number): number => {
    const dsp = responses.filter((r) => r.subtestId === "digitSpan");
    // Oracle cheat: censor the wrong (would-fail) items first, then enough
    // extra to reach `count` — mirroring App's interrupted-response record.
    const order = [...dsp].sort((a, b) => Number(a.correct) - Number(b.correct));
    for (const r of order.slice(0, count)) {
      r.interrupted = true;
      r.correct = false;
      r.rawAnswer = "";
    }
    return dsp.length;
  };
  // >30% of digitSpan's responses interrupted -> questionable with a reason.
  {
    const responses = simulateEngaged(0, 18_000, 7);
    const served = censorWouldFail(responses, Math.ceil(0.4 * 14));
    assert.ok(served >= 7, `digitSpan must administer enough responses to screen (${served})`);
    const report = screenSession(BATTERY, responses);
    assert.equal(report.verdict, "questionable", `${report.verdict}: ${report.reasons.join("; ")}`);
    assert.ok(
      report.reasons.some((r) => r.includes("digitSpan") && r.includes("interrupted")),
      report.reasons.join("; "),
    );
    assert.ok((report.maxInterruptedSubtestShare ?? 0) > INTERRUPTION_QUESTIONABLE_FRACTION);
  }
  // An engaged run with no simulated interruptions stays clean and valid.
  {
    const responses = simulateEngaged(0, 18_000, 7);
    const report = screenSession(BATTERY, responses);
    assert.equal(report.verdict, "valid", `${report.verdict}: ${report.reasons.join("; ")}`);
    assert.ok((report.maxInterruptedSubtestShare ?? 1) <= INTERRUPTION_QUESTIONABLE_FRACTION);
  }
});

test("a random position-spammer screens invalid — chance performance reports near the scale floor", () => {
  const responses = simulateSpammer();
  const composite = scoreComposite(BATTERY, responses);
  // The 2026-08-21 floor fix: random responding lands near IQ 50, not the
  // mid-70s the old unit-prior estimator produced.
  assert.ok(composite.g.score >= 40 && composite.g.score < 62, `spammer must land near the scale floor (${composite.g.score})`);
  const report = screenSession(BATTERY, responses);
  assert.equal(report.verdict, "invalid", `expected invalid, got ${report.verdict}: ${report.reasons.join("; ")}`);
  assert.ok((report.rapidFraction ?? 0) > 0.5);
});

test("a varied-position random responder screens invalid through the difficulty-gradient rule", () => {
  // Deterministic seeded PRNG; positions wander (no straight-line signal),
  // latencies are engaged (no rapid signal) — only the flat difficulty
  // gradient plus person misfit expose this examinee.
  let a = 123456789;
  const rng = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const responses: Response[] = [];
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      for (const item of subtest.items) {
        responses.push({
          itemId: item.id, correct: rng() < 0.1, latencyMs: 16_000, timedOut: false,
          subtestId: subtest.id, rawAnswer: 1 + Math.floor(rng() * Math.max(1, subtest.items.length)), answerIndex: null,
        });
      }
      continue;
    }
    let state = initRouting(subtest.routing);
    for (;;) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      const nOpts = item.options?.length ?? 4;
      const chosen = typeof item.answer === "number" && item.multi === undefined
        ? Math.floor(rng() * nOpts)
        : "qq";
      const correct = typeof item.answer === "number" && item.multi === undefined
        ? chosen === item.answer
        : false;
      const response: Response = {
        itemId: item.id, correct, latencyMs: 16_000, timedOut: false,
        subtestId: subtest.id, rawAnswer: chosen,
        answerIndex: typeof item.answer === "number" ? item.answer : null,
      };
      state = applyResponse(state, item, response);
      responses.push(response);
    }
  }
  const composite = scoreComposite(BATTERY, responses);
  assert.ok(composite.g.score >= 40 && composite.g.score < 62, `random responder must land near the scale floor (${composite.g.score})`);
  const report = screenSession(BATTERY, responses);
  assert.equal(report.verdict, "invalid", `expected invalid via gradient rule, got ${report.verdict}: ${report.reasons.join("; ")}`);
  assert.ok(
    report.difficultyCorrelation !== null && report.difficultyCorrelation > -0.12,
    `gradient r ${report.difficultyCorrelation} should be flat for random responding`,
  );
});

test("rapid answering alone flags questionable, not invalid", () => {
  // Engaged correctness pattern but implausibly fast power-item latencies.
  const responses = simulateEngaged(0, 1_200);
  assert.ok(responses.length > 0);
  const report = screenSession(BATTERY, responses);
  assert.equal(report.verdict, "questionable", `${report.verdict}: ${report.reasons.join("; ")}`);
  assert.ok((report.rapidFraction ?? 0) >= 0.4);
});

test("few responses are insufficient, never scored as clean", () => {
  const responses = simulateEngaged(0, 15_000).slice(0, MIN_SCREENABLE_RESPONSES - 1);
  const report = screenSession(BATTERY, responses);
  assert.equal(report.verdict, "insufficient");
  assert.ok(report.reasons.length > 0);
});

test("no responses yields insufficient without throwing", () => {
  const report = screenSession(BATTERY, []);
  assert.equal(report.verdict, "insufficient");
  assert.equal(report.nScored, 0);
});

test("straight-lining triggers even when the fit looks fine", () => {
  // Synthetic bank whose keys all sit at position 0: a position-0 spammer is
  // consistently CORRECT (good fit) but produces a maximal same-option run.
  const items: Item[] = Array.from({ length: 22 }, (_, k) => ({
    id: `sl-${k}`, subtest: "sl", broad: "Gf", narrow: "I",
    a: 1.4, b: -2.5, c: 0.25, prompt: `sl-${k}`, options: ["A", "B", "C", "D"], answer: 0,
  }));
  const subtest: Subtest = {
    id: "sl", name: "Straight-line fixture", broad: "Gf", narrow: ["I"],
    instructions: "", budgetMin: 10,
    routing: { maxItems: 22, minItems: 3, ceilingMisses: 4, targetSe: 0.3, entryTheta: 0 },
    items,
  };
  const responses: Response[] = items.map((i) => ({
    itemId: i.id, correct: true, latencyMs: RAPID_POWER_MS + 5000, timedOut: false,
    subtestId: "sl", rawAnswer: 0, answerIndex: 0,
  }));
  const report = screenSession([subtest], responses);
  assert.equal(report.longestSameOptionRun, 22);
  assert.equal(report.modalOptionShare, 1);
  assert.equal(report.verdict, "invalid", report.reasons.join("; "));
});

test("screening is deterministic across repeated calls", () => {
  const responses = simulateSpammer();
  const a = screenSession(BATTERY, responses);
  const b = screenSession(BATTERY, responses);
  assert.deepEqual(a, b);
});
