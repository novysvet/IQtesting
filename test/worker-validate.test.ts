import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmission, checkRate, MAX_RESPONSES } from "../worker/validator.js";

/**
 * COLLECTION ENDPOINT VALIDATOR (2026-08-21, pre-norming hardening).
 * The worker trusts nothing; these tests pin what it accepts.
 */

function goodBody(overrides = {}) {
  return {
    format: "iqtesting-responses",
    version: 1,
    sessionId: "abcd1234-abcd-abcd-abcd-abcd1234abcd",
    bankVersion: "eaf6c4f2",
    form: "adaptive",
    exportedAt: Date.now(),
    batteryStartedAt: Date.now() - 1000,
    participantId: null,
    consent: { acceptedAt: Date.now() - 2000, version: "2026-08-21" },
    demographics: { ageBand: "25-34" },
    comprehensionAttempts: 0,
    administration: null,
    subtests: [],
    responses: [
      { itemId: "mx-001", correct: true, latencyMs: 5000, timedOut: false, rawAnswer: 2, answerIndex: 2 },
      { itemId: "mx-002", correct: false, latencyMs: 8000, timedOut: true, rawAnswer: null, answerIndex: 1 },
    ],
    composite: null,
    validity: null,
    ...overrides,
  };
}

test("a well-formed export is accepted", () => {
  const verdict = validateSubmission(goodBody());
  assert.equal(verdict.ok, true);
});

test("the 13-17 age band is accepted for anonymous minor participation", () => {
  const verdict = validateSubmission(goodBody({ demographics: { ageBand: "13-17" } }));
  assert.equal(verdict.ok, true);
});

test("structural garbage is rejected with a reason", () => {
  const cases = [
    null,
    "string",
    [],
    {},
    goodBody({ format: "other" }),
    goodBody({ version: 2 }),
    goodBody({ sessionId: "short" }),
    goodBody({ sessionId: "x".repeat(65) }),
    goodBody({ bankVersion: "NOTHEX!" }),
    goodBody({ form: "weird" }),
    goodBody({ responses: [] }),
    goodBody({ responses: new Array(MAX_RESPONSES + 1).fill(goodBody().responses[0]) }),
    goodBody({ responses: [{ itemId: "", correct: true, latencyMs: 1 }] }),
    goodBody({ responses: [{ itemId: "mx-001", correct: "yes", latencyMs: 1 }] }),
    goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: -5 }] }),
    goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: Number.NaN }] }),
    goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: 3_600_001 }] }),
    goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: 100, rawAnswer: {} }] }),
    goodBody({ demographics: { ageBand: "under-18" } }),
    goodBody({ demographics: "young" }),
    goodBody({ consent: { acceptedAt: "recently" } }),
    goodBody({ consent: { acceptedAt: 42 } }),
  ];
  for (const body of cases) {
    const verdict = validateSubmission(body);
    assert.equal(verdict.ok, false, `expected rejection for ${JSON.stringify(body)?.slice(0, 60)}`);
    assert.ok(verdict.reason && verdict.reason.length > 0, "rejections must carry a reason");
  }
});

test("missing optional blocks are fine", () => {
  const minimal = goodBody({ demographics: null, consent: null, administration: null });
  assert.equal(validateSubmission(minimal).ok, true);
});

test("checkRate enforces a fixed window", () => {
  const counts = new Map();
  const t0 = 1_000_000;
  assert.equal(checkRate(counts, "ip", t0, 3, 1000).allowed, true);
  assert.equal(checkRate(counts, "ip", t0 + 1, 3, 1000).allowed, true);
  assert.equal(checkRate(counts, "ip", t0 + 2, 3, 1000).allowed, true);
  assert.equal(checkRate(counts, "ip", t0 + 3, 3, 1000).allowed, false, "fourth inside the window");
  assert.equal(checkRate(counts, "ip", t0 + 1001, 3, 1000).allowed, true, "window rollover resets");
});
