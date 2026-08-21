import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BATTERY } from "../src/battery.ts";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import { pCorrect } from "../src/core/irt.ts";
import { initSession, buildFixedOrder } from "../src/core/session.ts";
import type { SessionState } from "../src/core/session.ts";
import { exportSession } from "../src/core/telemetry.ts";
import type { ExportDocument } from "../src/core/telemetry.ts";
import type { BatteryForm, Response } from "../src/core/types.ts";
import { validateNorms } from "../src/core/norms.ts";
import { loadExports, screenSample, runPipeline, writeOutputs, computeItemStats, parseArgs } from "../tools/norming.ts";
import { validateSubmission } from "../worker/validator.js";

/** Deterministic consistent examinee over the real adaptive router. */
function engagedResponses(theta: number): import("../src/core/types.ts").Response[] {
  const out: import("../src/core/types.ts").Response[] = [];
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      for (const item of subtest.items) {
        const correct = pCorrect(item, theta) >= 0.5;
        out.push({ itemId: item.id, correct, latencyMs: 20_000, timedOut: false, subtestId: subtest.id, rawAnswer: correct ? 1 : 2, answerIndex: null });
      }
      continue;
    }
    let state = initRouting(subtest.routing);
    for (;;) {
      const { item } = nextItem(subtest.items, state, subtest.routing);
      if (!item) break;
      const correct = pCorrect(item, theta) >= 0.5;
      const chosen = typeof item.answer === "number"
        ? (correct ? item.answer : (item.answer + 1) % (item.options?.length ?? 4))
        : "zz";
      const response = { itemId: item.id, correct, latencyMs: 18_000, timedOut: false, subtestId: subtest.id, rawAnswer: chosen, answerIndex: typeof item.answer === "number" ? item.answer : null };
      state = applyResponse(state, item, response);
      out.push(response);
    }
  }
  return out;
}

/** Position-0 spammer: chance-level correctness, rapid clicks, straight-line runs. */
function spammerResponses(): import("../src/core/types.ts").Response[] {
  const out: import("../src/core/types.ts").Response[] = [];
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
      const response = { itemId: item.id, correct: item.answer === 0, latencyMs: 900, timedOut: false, subtestId: subtest.id, rawAnswer: typeof item.answer === "number" ? 0 : "qq", answerIndex: null };
      state = applyResponse(state, item, response);
      out.push(response);
    }
  }
  return out;
}

/** Deterministic consistent examinee over the FIXED calibration forms (the
 *  easiest-first buildFixedOrder sequence a `?form=calibration` run serves). */
function calibrationResponses(theta: number): Response[] {
  const out: Response[] = [];
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      for (const item of subtest.items) {
        const correct = pCorrect(item, theta) >= 0.5;
        out.push({ itemId: item.id, correct, latencyMs: 20_000, timedOut: false, subtestId: subtest.id, rawAnswer: correct ? 1 : 2, answerIndex: null });
      }
      continue;
    }
    for (const id of buildFixedOrder(subtest)) {
      const item = subtest.items.find((i) => i.id === id)!;
      const correct = pCorrect(item, theta) >= 0.5;
      const chosen = typeof item.answer === "number"
        ? (correct ? item.answer : (item.answer + 1) % (item.options?.length ?? 4))
        : "zz";
      out.push({ itemId: item.id, correct, latencyMs: 18_000, timedOut: false, subtestId: subtest.id, rawAnswer: chosen, answerIndex: typeof item.answer === "number" ? item.answer : null });
    }
  }
  return out;
}

function fakeExport(responses: Response[], sessionId: string, form: BatteryForm = "adaptive"): ExportDocument {
  const state: SessionState = { ...initSession(BATTERY, { form, sessionId }), startedAt: Date.now(), responses: [...responses], sessionId };
  return exportSession(state);
}

test("pipeline round trip: spammers excluded, valid sessions normed", () => {
  const dir = mkdtempSync(join(tmpdir(), "iqtesting-norming-"));
  try {
    // Four clean sessions, two contaminated ones.
    const docs: ExportDocument[] = [];
    for (let i = 0; i < 4; i++) docs.push(fakeExport(engagedResponses(0), `clean-${i}-aaaa`));
    docs.push(fakeExport(spammerResponses(), "bot-0-bbbb"));
    docs.push(fakeExport(spammerResponses(), "bot-1-cccc"));
    // Tamper one bot's embedded verdict: the pipeline must re-screen anyway.
    docs[5]!.validity = docs[0]!.validity;

    for (const d of docs) {
      writeFileSync(join(dir, `iqtesting-${d.sessionId.slice(0, 8)}.json`), JSON.stringify(d));
    }

    const result = runPipeline({ dir, out: join(dir, "norms.json"), includeQuestionable: false, form: "adaptive" });
    assert.equal(result.filesLoaded, 6);
    assert.equal(result.included, 4, `expected 4 clean sessions included, got ${result.included}`);
    assert.equal(result.excluded.length, 2, "both bots must be excluded");
    assert.ok(result.excluded.every((e) => e.report.verdict === "invalid"));

    const table = result.table;
    assert.equal(table.sampleN, 4);
    assert.equal(table.excludedInvalid, 2);
    assert.equal(table.bankVersion, result.bankVersion);
    for (let i = 1; i < table.thetaSample.length; i++) {
      assert.ok(table.thetaSample[i]! >= table.thetaSample[i - 1]!, "thetaSample must be sorted");
    }
    // Pre-data reality check: a tiny synthetic sample cannot back norms yet.
    assert.equal(validateNorms(table), false);

    // Item statistics exist over administered items only.
    assert.ok(result.totalItemsAdministered > 0);

    const { normsPath, reportPath } = writeOutputs(
      { dir, out: join(dir, "norms.json"), includeQuestionable: false, form: "adaptive" },
      result,
    );
    assert.ok(existsSync(normsPath));
    assert.ok(existsSync(reportPath));
    const parsed = JSON.parse(readFileSync(normsPath, "utf8"));
    assert.equal(parsed.format, "iqtesting-norms");
    assert.equal(parsed.sampleN, 4);
    const report = readFileSync(reportPath, "utf8");
    assert.match(report, /Excluded sessions/);
    assert.match(report, /bot-0|bot-1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadExports skips malformed files gracefully", () => {
  const dir = mkdtempSync(join(tmpdir(), "iqtesting-norming-bad-"));
  try {
    writeFileSync(join(dir, "broken.json"), "{not json");
    writeFileSync(join(dir, "wrong.json"), JSON.stringify({ format: "other" }));
    writeFileSync(join(dir, "empty.json"), JSON.stringify({ format: "iqtesting-responses", version: 1, responses: [] }));
    const { loaded, skipped } = loadExports(dir);
    assert.equal(loaded.length, 0);
    assert.ok((skipped["malformed-json"] ?? 0) >= 1);
    assert.ok((skipped["wrong-format"] ?? 0) >= 1);
    assert.ok((skipped["no-responses"] ?? 0) >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("screenSample keeps questionable only behind the flag", () => {
  const dir = mkdtempSync(join(tmpdir(), "iqtesting-norming-q-"));
  try {
    // Rapid-but-consistent session screens questionable (see validity tests).
    const doc = fakeExport(
      engagedResponses(0).map((r) => ({ ...r, latencyMs: 1_200 })),
      "rapid-0-dddd",
    );
    writeFileSync(join(dir, "rapid.json"), JSON.stringify(doc));
    const { loaded } = loadExports(dir);
    const strict = screenSample(loaded, false);
    const lenient = screenSample(loaded, true);
    assert.equal(strict.included.length, 0);
    assert.equal(lenient.included.length, 1);
    assert.equal(lenient.questionableKept, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseArgs: --form defaults to adaptive and rejects unknown values", () => {
  assert.equal(parseArgs(["data/exports"]).form, "adaptive");
  assert.equal(parseArgs(["data/exports", "--form", "calibration"]).form, "calibration");
  assert.equal(parseArgs(["--form", "calibration", "--out", "n.json"]).out, "n.json");
  // A typo must fail loudly, not silently fall back to adaptive (which would
  // drop every calibration export into wrongBank — the P0 this flag fixes).
  assert.throws(() => parseArgs(["--form", "calibraton"]), /--form expects/);
});

test("calibration-form exports flow through --form calibration", () => {
  const dir = mkdtempSync(join(tmpdir(), "iqtesting-norming-cal-"));
  try {
    const adaptiveDoc = fakeExport(engagedResponses(0), "cal-mix-0-aaaa");
    const calibDoc = fakeExport(calibrationResponses(0), "cal-mix-1-bbbb", "calibration");
    assert.equal(calibDoc.form, "calibration");
    assert.notEqual(calibDoc.bankVersion, adaptiveDoc.bankVersion, "the two forms stamp distinct bank+form hashes");
    writeFileSync(join(dir, "adaptive.json"), JSON.stringify(adaptiveDoc));
    writeFileSync(join(dir, "calibration.json"), JSON.stringify(calibDoc));

    // Default form remains adaptive: the calibration doc is off-bank there.
    const adaptiveRun = runPipeline({ dir, out: join(dir, "norms.json"), includeQuestionable: false, form: "adaptive" });
    assert.equal(adaptiveRun.wrongBank, 1);
    assert.equal(adaptiveRun.included, 1);
    assert.equal(adaptiveRun.bankVersion, adaptiveDoc.bankVersion);

    // Under --form calibration (only calibration exports present) the
    // designated norming-collection form is the on-bank one.
    rmSync(join(dir, "adaptive.json"));
    const result = runPipeline({ dir, out: join(dir, "norms.json"), includeQuestionable: false, form: "calibration" });
    assert.equal(result.wrongBank, 0);
    assert.equal(
      result.included, 1,
      `calibration session must be included, verdicts: ${JSON.stringify(result.excluded.map((e) => e.report.verdict))}`,
    );
    assert.equal(result.bankVersion, calibDoc.bankVersion);
    // The emitted table is stamped with the same form-aware hash.
    assert.equal(result.table.bankVersion, calibDoc.bankVersion);
    assert.equal(result.table.sampleN, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("computeItemStats: censored responses stay out of item diagnostics", () => {
  const subtest = BATTERY.find((s) => s.items.some((i) => typeof i.answer === "number"))!;
  const item = subtest.items.find((i) => typeof i.answer === "number")!;
  const correct = (latencyMs: number): Response => ({
    itemId: item.id,
    correct: true,
    latencyMs,
    timedOut: false,
    subtestId: subtest.id,
    rawAnswer: item.answer as number,
    answerIndex: item.answer as number,
  });
  // Censoring records as the session core writes them: stored correct:false
  // and timedOut, with dead-air latency up to the section clock.
  const omittedResp: Response = { ...correct(600_000), correct: false, timedOut: true, omitted: true, rawAnswer: null };
  const interruptedResp: Response = { ...correct(600_000), correct: false, timedOut: true, interrupted: true, rawAnswer: null };

  const loaded = (responses: Response[], sessionId: string) => {
    const doc = fakeExport(responses, sessionId);
    return { doc, responses: doc.responses as Response[] };
  };
  const statFor = (sessions: { doc: ExportDocument; responses: Response[] }[]) =>
    computeItemStats(sessions).find((s) => s.id === item.id)!;

  const clean = Array.from({ length: 11 }, (_, i) => loaded([correct(18_000)], `censor-${i}-eeee`));
  const baseline = statFor(clean);
  assert.equal(baseline.p, 1);
  assert.equal(baseline.n, 11);
  assert.equal(baseline.timeoutRate, 0);

  // One censored response among the corrects: identical item diagnostics.
  const withOmitted = statFor([...clean, loaded([omittedResp], "censor-o-ffff")]);
  assert.equal(withOmitted.p, baseline.p, "an omitted response among corrects must not move p");
  assert.equal(withOmitted.n, baseline.n);
  assert.equal(withOmitted.timeoutRate, baseline.timeoutRate, "an omitted response must not count as an item timeout");
  assert.equal(withOmitted.meanLatencyMs, baseline.meanLatencyMs, "an omitted response's dead-air latency must not enter the mean");

  const withInterrupted = statFor([...clean, loaded([interruptedResp], "censor-i-gggg")]);
  assert.equal(withInterrupted.p, baseline.p);
  assert.equal(withInterrupted.n, baseline.n);
});

test("real exportSession documents pass the worker validator", () => {
  // The worker's submit gate must accept what exportSession actually emits,
  // exactly as it travels (JSON) — for both administration forms.
  const adaptiveDoc = JSON.parse(JSON.stringify(fakeExport(engagedResponses(0), "realshape-0-hhhh")));
  assert.deepEqual(validateSubmission(adaptiveDoc), { ok: true });
  const calibDoc = JSON.parse(JSON.stringify(fakeExport(calibrationResponses(0), "realshape-1-iiii", "calibration")));
  assert.deepEqual(validateSubmission(calibDoc), { ok: true });
});
