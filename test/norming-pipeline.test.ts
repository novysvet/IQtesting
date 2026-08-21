import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BATTERY } from "../src/battery.ts";
import { initRouting, nextItem, applyResponse } from "../src/core/routing.ts";
import { pCorrect } from "../src/core/irt.ts";
import { initSession } from "../src/core/session.ts";
import type { SessionState } from "../src/core/session.ts";
import { exportSession } from "../src/core/telemetry.ts";
import type { ExportDocument } from "../src/core/telemetry.ts";
import { validateNorms } from "../src/core/norms.ts";
import { loadExports, screenSample, runPipeline, writeOutputs } from "../tools/norming.ts";

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

function fakeExport(responses: ReturnType<typeof engagedResponses>, sessionId: string): ExportDocument {
  const state: SessionState = { ...initSession(BATTERY), startedAt: Date.now(), responses: [...responses], sessionId };
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

    const result = runPipeline({ dir, out: join(dir, "norms.json"), includeQuestionable: false });
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
      { dir, out: join(dir, "norms.json"), includeQuestionable: false },
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
