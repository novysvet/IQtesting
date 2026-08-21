import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSubmission,
  checkRate,
  MAX_RESPONSES,
  MAX_STRING,
  MAX_ARRAY,
  MAX_RAW_ANSWER,
  MAX_DEPTH,
} from "../worker/validator.js";
// worker/index.js is plain JS outside the tsconfig roots (only validator.js
// has a hand-written .d.ts), so tsc has no declaration for it — the fetch
// contract is asserted by the integration tests below instead.
// @ts-expect-error no declaration file for the worker entry point
import worker from "../worker/index.js";

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

// ---------------------------------------------------------------------------
// Size caps (2026-08-21 hardening). The worker stores accepted bodies
// verbatim, so every string/array field must be bounded.
// ---------------------------------------------------------------------------

test("strings and arrays at the cap are accepted, one past it are rejected", () => {
  const capOk = [
    ["rawAnswer at cap", goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: 1, rawAnswer: "a".repeat(MAX_RAW_ANSWER) }] })],
    ["subtestId at cap", goodBody({ responses: [{ itemId: "mx-001", subtestId: "s".repeat(64), correct: true, latencyMs: 1, rawAnswer: null }] })],
    ["participantId at cap", goodBody({ participantId: "p".repeat(MAX_STRING) })],
    ["consent.version at cap", goodBody({ consent: { acceptedAt: Date.now(), version: "v".repeat(MAX_STRING) } })],
    ["demographics free text at cap", goodBody({ demographics: { ageBand: "25-34", education: "e".repeat(MAX_STRING) } })],
    ["administration.userAgent at cap", goodBody({ administration: { userAgent: "u".repeat(MAX_STRING), deviceClass: "desktop" } })],
    ["subtests array at cap", goodBody({ subtests: new Array(MAX_ARRAY).fill({ id: "mx", decisions: [] }) })],
    ["decisions array at cap", goodBody({ subtests: [{ id: "mx", decisions: new Array(MAX_ARRAY).fill({ step: 1 }) }] })],
  ] as const;
  for (const [label, body] of capOk) {
    assert.deepEqual(validateSubmission(body), { ok: true }, label);
  }

  const overCap = [
    ["rawAnswer over cap", goodBody({ responses: [{ itemId: "mx-001", correct: true, latencyMs: 1, rawAnswer: "a".repeat(MAX_RAW_ANSWER + 1) }] })],
    ["subtestId over cap", goodBody({ responses: [{ itemId: "mx-001", subtestId: "s".repeat(65), correct: true, latencyMs: 1, rawAnswer: null }] })],
    ["participantId over cap", goodBody({ participantId: "p".repeat(MAX_STRING + 1) })],
    ["participantId wrong type", goodBody({ participantId: 42 })],
    ["consent.version over cap", goodBody({ consent: { acceptedAt: Date.now(), version: "v".repeat(MAX_STRING + 1) } })],
    ["demographics free text over cap", goodBody({ demographics: { ageBand: "25-34", education: "e".repeat(MAX_STRING + 1) } })],
    ["administration.userAgent over cap", goodBody({ administration: { userAgent: "u".repeat(MAX_STRING + 1) } })],
    ["subtests over cap", goodBody({ subtests: new Array(MAX_ARRAY + 1).fill({ id: "mx" }) })],
    ["decisions over cap", goodBody({ subtests: [{ id: "mx", decisions: new Array(MAX_ARRAY + 1).fill({ step: 1 }) }] })],
    ["unknown top-level key over cap", goodBody({ junk: "j".repeat(MAX_STRING + 1) })],
    ["unknown top-level array over cap", goodBody({ junk: new Array(MAX_ARRAY + 1).fill("x") })],
    ["validity.reasons entry over cap", goodBody({ validity: { verdict: "invalid", reasons: ["r".repeat(MAX_STRING + 1)] } })],
  ] as const;
  for (const [label, body] of overCap) {
    const verdict = validateSubmission(body);
    assert.equal(verdict.ok, false, label);
    assert.ok(verdict.reason && verdict.reason.length > 0, `${label} must carry a reason`);
  }
});

test("pathologically deep nesting is rejected, not stack-overflowed", () => {
  // JSON.parse handles ~200k-deep documents without throwing; the validator's
  // bounds walker must reject them by depth instead of recursing to death.
  let deep: Record<string, unknown> = {};
  for (let i = 0; i < MAX_DEPTH + 8; i++) {
    deep = { next: deep };
  }
  const verdict = validateSubmission(goodBody({ administration: deep }));
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "field exceeds size cap");
});

// ---------------------------------------------------------------------------
// Worker endpoint integration: the limiter that actually ships (wired to the
// same checkRate as above) and the KV envelope the norming reader loads.
// ---------------------------------------------------------------------------

interface FakeKV {
  store: Map<string, string>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

function fakeKV(): FakeKV {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function makeEnv(rateKV: Pick<FakeKV, "get" | "put"> = fakeKV()) {
  return { RATE: rateKV, SESSIONS: fakeKV(), ALLOWED_ORIGIN: "https://novysvet.github.io" };
}

async function postSubmit(env: unknown, body: unknown, ip = "203.0.113.7") {
  const request = new Request("https://collect.example/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await worker.fetch(request, env as never);
  return { status: res.status, json: (await res.json()) as { ok: boolean; reason?: string; rateLimitedRemaining?: number | null } };
}

test("an accepted submission is stored as a document the norming reader can load", async () => {
  const env = makeEnv();
  const { status, json } = await postSubmit(env, goodBody());
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.rateLimitedRemaining, 4);

  const sessions = (env.SESSIONS as ReturnType<typeof fakeKV>).store;
  assert.equal(sessions.size, 1, "exactly one record per sessionId");
  const stored = JSON.parse(sessions.get("session:" + goodBody().sessionId)!);
  // The exact gate tools/norming.ts loadExports applies to every JSON file:
  // top-level format/version and a non-empty responses array. The old
  // {payload: body} envelope failed this and was skipped as "wrong-format".
  assert.equal(stored.format, "iqtesting-responses");
  assert.equal(stored.version, 1);
  assert.ok(Array.isArray(stored.responses) && stored.responses.length > 0);
  assert.equal(stored.sessionId, goodBody().sessionId);
  assert.equal(typeof stored.receivedAt, "number", "worker receipt stamp, set at write time");
});

test("a duplicate sessionId is rejected 409", async () => {
  const env = makeEnv();
  assert.equal((await postSubmit(env, goodBody())).status, 200);
  const second = await postSubmit(env, goodBody());
  assert.equal(second.status, 409);
  assert.equal(second.json.reason, "duplicate session");
});

test("the shipped limiter allows RATE_LIMIT per IP then 429s, and blocked attempts still count", async () => {
  const env = makeEnv();
  for (let i = 0; i < 5; i++) {
    const { status, json } = await postSubmit(env, goodBody({ sessionId: `ratelimit-sess-${i}-abcd1234` }));
    assert.equal(status, 200, `request ${i + 1} inside the limit`);
    assert.equal(json.rateLimitedRemaining, 4 - i, "remaining decrements per allowed request");
  }
  const blocked = await postSubmit(env, goodBody({ sessionId: "ratelimit-sess-5-abcd1234" }));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.reason, "rate limited");

  // Write-first: the refused request still incremented the KV counter.
  const counter = JSON.parse((env.RATE as ReturnType<typeof fakeKV>).store.get("rate:203.0.113.7")!);
  assert.equal(counter.count, 6);

  // The limit is per IP.
  const other = await postSubmit(env, goodBody({ sessionId: "ratelimit-other-ip-abcd1234" }), "198.51.100.9");
  assert.equal(other.status, 200);
});

test("the limiter fails open when KV is unavailable", async () => {
  const env = makeEnv({
    async get() {
      throw new Error("KV down");
    },
    async put() {
      throw new Error("KV down");
    },
  });
  const { status, json } = await postSubmit(env, goodBody());
  assert.equal(status, 200, "collection availability wins when the best-effort limiter is down");
  assert.equal(json.rateLimitedRemaining, null);
});

test("an oversized raw body is rejected before parsing", async () => {
  const env = makeEnv();
  const huge = JSON.stringify(goodBody({ junk: "x".repeat(2 * 1024 * 1024) }));
  const { status, json } = await postSubmit(env, huge);
  assert.equal(status, 413);
  assert.equal(json.reason, "body too large");
});

test("a non-JSON body and an invalid document fail 400/422 through the endpoint", async () => {
  const env = makeEnv();
  assert.equal((await postSubmit(env, "not json at all")).status, 400);
  const rejected = await postSubmit(env, goodBody({ format: "other" }));
  assert.equal(rejected.status, 422);
  assert.equal(rejected.json.reason, "unknown format");
});
