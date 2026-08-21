/**
 * Norming pipeline — turns collected session exports into an empirical norm
 * table plus a calibration report.
 *
 * Usage:
 *   node --experimental-strip-types tools/norming.ts [exportsDir] [--out norms.json]
 *                                       [--include-questionable] [--form adaptive|calibration]
 *
 * `--form calibration` selects the fixed calibration administrations (the
 * designated norming-collection mode): the expected bankVersion is the
 * form-aware hash, and the emitted NormTable is stamped with it so a
 * calibration table can only back calibration sessions. Default: adaptive.
 *
 * Inputs: one or more ExportDocument JSON files (format "iqtesting-responses",
 * version 1) as produced by the results screen / telemetry.exportSession.
 *
 * Steps:
 *   1. Load every export; keep only those stamped with the current
 *      bank+form bankVersion (anything else cannot be scored against this
 *      item bank under this administration form).
 *   2. Re-run validity screening independently of the embedded verdict — the
 *      pipeline trusts recomputation, not self-report.
 *   3. Exclude invalid + insufficient sessions (questionable only with the
 *      flag); every exclusion is counted and reported.
 *   4. Compute per-item statistics over surviving sessions: p-value,
 *      corrected point-biserial (item-rest r), latency, timeout rate, flags.
 *      Censored responses (omitted/interrupted) carry administrative, not
 *      ability, evidence, so they are excluded here per the censoring policy
 *      (person-level scores already exclude them in irt/validity).
 *   5. Distill the composite-theta distribution into a NormTable JSON that
 *      src/core/norms.ts can consume, and write a human-readable report.
 *
 * Nothing here mutates the bank. Calibration (re-estimating a/b/c from these
 * data) is a separate, later step; this tool establishes the SAMPLE reference
 * so percentiles stop resting on the N(0,1) assumption alone.
 *
 * The pipeline is factored as pure-ish functions (`loadExports`, `screenSample`,
 * `computeItemStats`, `buildNormTable`, `writeOutputs`) so tests can drive a
 * full round trip in-process; `main()` only wires CLI args and logging.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BATTERY } from "../src/battery.ts";
import { bankVersion } from "../src/core/telemetry.ts";
import type { ExportDocument } from "../src/core/telemetry.ts";
import { formVariant } from "../src/core/session.ts";
import { scoreComposite } from "../src/core/scoring.ts";
import { screenSession } from "../src/core/validity.ts";
import type { ValidityReport } from "../src/core/validity.ts";
import type { BatteryForm, Item, Response } from "../src/core/types.ts";
import type { NormTable } from "../src/core/norms.ts";

export interface Args {
  dir: string;
  out: string;
  includeQuestionable: boolean;
  /** Administration form whose bank+form hash exports must carry. */
  form: BatteryForm;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { dir: "./data/exports", out: "./data/norms.json", includeQuestionable: false, form: "adaptive" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--out") args.out = argv[++i] ?? args.out;
    else if (a === "--include-questionable") args.includeQuestionable = true;
    else if (a === "--form") {
      const f = argv[++i];
      // Reject typos loudly: a silent fallback to adaptive would drop every
      // calibration export into wrongBank — the exact failure this flag fixes.
      if (f !== "adaptive" && f !== "calibration") {
        throw new Error(`--form expects "adaptive" or "calibration", got ${JSON.stringify(f ?? "nothing")}`);
      }
      args.form = f;
    }
    else if (!a.startsWith("--")) args.dir = a;
  }
  return args;
}

export interface Loaded {
  doc: ExportDocument;
  responses: Response[];
}

export function loadExports(dir: string): { loaded: Loaded[]; skipped: Record<string, number> } {
  const loaded: Loaded[] = [];
  const skipped: Record<string, number> = {};
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".json"));
  } catch {
    return { loaded, skipped: { "unreadable-directory": 1 } };
  }
  for (const name of names) {
    let raw: string;
    try {
      raw = readFileSync(join(dir, name), "utf8");
    } catch {
      skipped["unreadable"] = (skipped["unreadable"] ?? 0) + 1;
      continue;
    }
    let doc: unknown;
    try {
      doc = JSON.parse(raw);
    } catch {
      skipped["malformed-json"] = (skipped["malformed-json"] ?? 0) + 1;
      continue;
    }
    const d = doc as ExportDocument | null;
    if (!d || typeof d !== "object") { skipped["not-an-object"] = (skipped["not-an-object"] ?? 0) + 1; continue; }
    if (d.format !== "iqtesting-responses" || d.version !== 1) {
      skipped["wrong-format"] = (skipped["wrong-format"] ?? 0) + 1;
      continue;
    }
    if (!Array.isArray(d.responses) || d.responses.length === 0) {
      skipped["no-responses"] = (skipped["no-responses"] ?? 0) + 1;
      continue;
    }
    loaded.push({ doc: d, responses: d.responses as Response[] });
  }
  return { loaded, skipped };
}

export interface ScreenResult {
  included: Loaded[];
  excluded: { sessionId: string; report: ValidityReport }[];
  questionableKept: number;
}

/** Independent validity re-screening; the embedded verdict is never trusted. */
export function screenSample(onBank: Loaded[], includeQuestionable: boolean): ScreenResult {
  const included: Loaded[] = [];
  const excluded: ScreenResult["excluded"] = [];
  let questionableKept = 0;
  for (const l of onBank) {
    const report = screenSession(BATTERY, l.responses);
    if (report.verdict === "invalid" || report.verdict === "insufficient") {
      excluded.push({ sessionId: l.doc.sessionId, report });
      continue;
    }
    if (report.verdict === "questionable" && !includeQuestionable) {
      excluded.push({ sessionId: l.doc.sessionId, report });
      continue;
    }
    if (report.verdict === "questionable") questionableKept++;
    included.push(l);
  }
  return { included, excluded, questionableKept };
}

export interface ItemStat {
  id: string;
  subtestId: string;
  n: number;
  p: number | null;
  restR: number | null;
  meanLatencyMs: number | null;
  timeoutRate: number;
  flags: string[];
}

/** Corrected item-total (item-rest) point-biserial over sessions answering the item. */
export function itemRestR(correct: boolean[], rest: number[]): number | null {
  const n = correct.length;
  if (n < 10) return null;
  const x: number[] = correct.map((c) => (c ? 1 : 0));
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = rest.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = rest[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx < 1e-9 || syy < 1e-9) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Per-item calibration diagnostics over the included sessions. Censoring
 * policy: omitted (section expired on the item) and interrupted (tab hidden
 * during memory exposure) responses carry no ability evidence, so they are
 * excluded from every diagnostic — p, rest score, latency, timeout rate —
 * mirroring validity.ts screening. Person-level scoring is untouched.
 */
export function computeItemStats(sessions: Loaded[]): ItemStat[] {
  const byId = new Map<string, Item & { subtestId: string }>();
  for (const s of BATTERY) for (const i of s.items) byId.set(i.id, { ...i, subtestId: s.id });

  interface Acc { correct: boolean[]; rest: number[]; latencies: number[]; timeouts: number }
  const acc = new Map<string, Acc>();
  for (const { responses } of sessions) {
    let totalRaw = 0;
    for (const r of responses) if (!r.omitted && !r.interrupted && r.correct) totalRaw++;
    for (const r of responses) {
      if (!byId.has(r.itemId) || r.omitted || r.interrupted) continue;
      const a = acc.get(r.itemId) ?? { correct: [], rest: [], latencies: [], timeouts: 0 };
      a.correct.push(r.correct);
      a.rest.push(totalRaw - (r.correct ? 1 : 0));
      a.latencies.push(r.latencyMs);
      if (r.timedOut) a.timeouts++;
      acc.set(r.itemId, a);
    }
  }

  const stats: ItemStat[] = [];
  for (const [id, a] of acc) {
    const item = byId.get(id)!;
    const n = a.correct.length;
    const p = n > 0 ? a.correct.filter(Boolean).length / n : null;
    const restR = itemRestR(a.correct, a.rest);
    const timeoutRate = n > 0 ? a.timeouts / n : 0;
    const meanLatencyMs = n > 0 ? a.latencies.reduce((x, y) => x + y, 0) / n : null;
    const flags: string[] = [];
    if (p !== null && p >= 0.95) flags.push("too-easy(p>=.95)");
    if (p !== null && p <= item.c + 0.05) flags.push("at-or-below-guessing");
    if (restR !== null && restR < 0.10 && n >= 30) flags.push("weak-discrimination(r<.10)");
    if (timeoutRate > 0.3) flags.push("high-timeout(>.3)");
    stats.push({
      id, subtestId: item.subtestId, n,
      p: p === null ? null : Number(p.toFixed(3)),
      restR: restR === null ? null : Number(restR.toFixed(3)),
      meanLatencyMs: meanLatencyMs === null ? null : Math.round(meanLatencyMs),
      timeoutRate: Number(timeoutRate.toFixed(3)),
      flags,
    });
  }
  stats.sort((a, b) => a.id.localeCompare(b.id));
  return stats;
}

export function buildNormTable(
  included: Loaded[],
  excludedCount: number,
  form: BatteryForm = "adaptive",
): NormTable {
  // Stamped with the bank+FORM hash: a calibration-form table can only back
  // calibration sessions (validateNorms compares the full hash), never the
  // adaptive administration and vice versa.
  const currentBank = bankVersion(BATTERY, formVariant(form));
  const thetas = included
    .map((l) => l.doc.composite?.theta ?? scoreComposite(BATTERY, l.responses).theta)
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const stamps = included.map((l) => l.doc.batteryStartedAt ?? l.doc.exportedAt).filter((t): t is number => typeof t === "number");
  return {
    format: "iqtesting-norms",
    version: 1,
    bankVersion: currentBank,
    sampleN: thetas.length,
    excludedInvalid: excludedCount,
    collectedFrom: stamps.length ? Math.min(...stamps) : null,
    collectedTo: stamps.length ? Math.max(...stamps) : null,
    thetaSample: thetas.map((t) => Number(t.toFixed(4))),
  };
}

export interface PipelineResult {
  bankVersion: string;
  filesLoaded: number;
  skipped: Record<string, number>;
  wrongBank: number;
  included: number;
  questionableKept: number;
  excluded: { sessionId: string; report: ValidityReport }[];
  table: NormTable;
  flaggedItems: ItemStat[];
  totalItemsAdministered: number;
}

export function runPipeline(args: Args): PipelineResult {
  const currentBank = bankVersion(BATTERY, formVariant(args.form));
  const { loaded, skipped } = loadExports(args.dir);
  const onBank = loaded.filter((l) => l.doc.bankVersion === currentBank);
  const wrongBank = loaded.length - onBank.length;

  const screen = screenSample(onBank, args.includeQuestionable);
  const table = buildNormTable(screen.included, screen.excluded.length, args.form);
  const stats = computeItemStats(screen.included);

  return {
    bankVersion: currentBank,
    filesLoaded: loaded.length,
    skipped,
    wrongBank,
    included: screen.included.length,
    questionableKept: screen.questionableKept,
    excluded: screen.excluded,
    table,
    flaggedItems: stats.filter((s) => s.flags.length > 0),
    totalItemsAdministered: stats.reduce((n, s) => n + s.n, 0),
  };
}

export function writeOutputs(args: Args, result: PipelineResult): { normsPath: string; reportPath: string } {
  mkdirSync(resolve(args.out, ".."), { recursive: true });
  const normsPath = resolve(args.out);
  writeFileSync(normsPath, JSON.stringify(result.table, null, 2));

  const reportPath = normsPath.replace(/\.json$/, "") + "-report.md";
  const lines: string[] = [];
  lines.push(`# Norming report — bank \`${result.bankVersion}\``);
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()} from ${result.included} validity-screened sessions (${result.excluded.length} excluded).`);
  lines.push(`Collection window: ${result.table.collectedFrom ? new Date(result.table.collectedFrom).toISOString() : "?"} → ${result.table.collectedTo ? new Date(result.table.collectedTo).toISOString() : "?"}.`);
  lines.push(`${result.totalItemsAdministered} item responses contributed to item statistics.`);
  lines.push("");
  lines.push("## Sample distribution (composite theta)");
  lines.push("");
  lines.push("| percentile | theta | IQ-equiv (100+15θ) |");
  lines.push("|---|---|---|");
  const thetas = result.table.thetaSample;
  for (const pct of [1, 5, 10, 25, 50, 75, 90, 95, 99]) {
    const idx = Math.min(thetas.length - 1, Math.max(0, Math.ceil((pct / 100) * thetas.length) - 1));
    const t = thetas[idx] ?? 0;
    lines.push(`| P${pct} | ${t.toFixed(2)} | ${Math.round(100 + 15 * t)} |`);
  }
  lines.push("");
  lines.push("## Item statistics (flagged only)");
  lines.push("");
  lines.push(`${result.flaggedItems.length} administered items flagged.`);
  lines.push("");
  lines.push("| item | subtest | n | p | rest-r | mean ms | timeouts | flags |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const s of result.flaggedItems) {
    lines.push(`| ${s.id} | ${s.subtestId} | ${s.n} | ${s.p ?? "?"} | ${s.restR ?? "?"} | ${s.meanLatencyMs ?? "?"} | ${(s.timeoutRate * 100).toFixed(0)}% | ${s.flags.join(", ")} |`);
  }
  lines.push("");
  lines.push("## Excluded sessions");
  lines.push("");
  if (result.excluded.length === 0) lines.push("None.");
  for (const e of result.excluded) {
    lines.push(`- \`${e.sessionId.slice(0, 8)}\` — **${e.report.verdict}**${e.report.reasons.length ? ": " + e.report.reasons.join(" ") : ""}`);
  }
  writeFileSync(reportPath, lines.join("\n"));
  return { normsPath, reportPath };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Norming pipeline · bank ${bankVersion(BATTERY, formVariant(args.form))}${args.form === "calibration" ? " (calibration form)" : ""}`);

  const result = runPipeline(args);
  console.log(`Loaded ${result.filesLoaded} export file(s) from ${resolve(args.dir)}`);
  for (const [k, v] of Object.entries(result.skipped)) console.log(`  skipped ${k}: ${v}`);
  if (result.wrongBank > 0) console.log(`  skipped other-bank-version sessions: ${result.wrongBank}`);
  if (result.filesLoaded === 0 || (result.filesLoaded > 0 && result.included === 0 && result.excluded.length === 0 && result.wrongBank === 0)) {
    console.log("\nNo usable sessions found — collect exports first (results screen → Download response data).");
    process.exitCode = 1;
    return;
  }

  console.log(`Validity screening: ${result.included} included` +
    (args.includeQuestionable ? ` (${result.questionableKept} questionable kept by flag)` : "") +
    `, ${result.excluded.length} excluded.`);
  for (const e of result.excluded.slice(0, 20)) {
    console.log(`  excluded ${e.sessionId.slice(0, 8)}: ${e.report.verdict}${e.report.reasons.length ? " — " + e.report.reasons[0] : ""}`);
  }
  if (result.excluded.length > 20) console.log(`  … and ${result.excluded.length - 20} more`);

  if (result.table.sampleN < 100) {
    console.log(`\nWARNING: sample N=${result.table.sampleN} is below the minimum viable norm sample (100).`);
    console.log("The table is written, but src/core/norms.validateNorms rejects it until N >= 100.");
  }

  const { normsPath, reportPath } = writeOutputs(args, result);
  console.log(`\nWrote ${normsPath} (N=${result.table.sampleN})`);
  console.log(`Wrote ${reportPath}`);
  console.log(`\nNext: percentiles can now come from these ${result.table.sampleN} sessions via src/core/norms.ts instead of normalCdf(theta).`);
}

// CLI entry only when executed directly; importing this module (tests) must stay side-effect free.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
