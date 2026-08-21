import type {
  BatteryForm,
  ConsentRecord,
  Demographics,
  Response,
  RoutingDecision,
  Subtest,
} from "./types.ts";
import type { SessionState } from "./session.ts";
import { scoreComposite } from "./scoring.ts";
import { screenSession } from "./validity.ts";
import type { ValidityReport } from "./validity.ts";

/**
 * Norming telemetry: session identity, item-bank versioning, and the
 * response-data export. None of this feeds scoring — it exists so that a
 * future calibration study can recover, for every administered item, WHAT was
 * shown, WHAT was answered, and WHICH parameters routed it.
 */

/** Stable 32-bit FNV-1a over a string. */
function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Content hash of everything that influences the examinee's experience,
 * scoring, or routing: subtest configs (routing rules, budgeted minutes,
 * matching word bank) plus every item's id, parameters, options, key,
 * prompt, render payload, and per-item time cap. Any content change — from a
 * recalibration down to a prompt typo fix — produces a new version, so
 * stored responses always map back to the exact bank that produced them.
 * Unscored material (practice items, matchingPractice demos) is excluded by
 * design: it cannot affect a score, so it must not invalidate saves.
 *
 * `variant` stamps the administration FORM (fixed calibration forms vs
 * adaptive): same items, different routing contract, therefore a different
 * version string. Norm tables and persistence checks compare the full hash,
 * so a table built under one form can never silently back the other.
 */
export function bankVersion(subtests: Subtest[], variant?: string): string {
  const canonical = subtests
    .map((s) => {
      const items = s.items
        .map((i) =>
          [
            i.id,
            i.a,
            i.b,
            i.c,
            (i.options ?? []).join("\u0001"),
            i.answer,
            i.multi ?? "",
            i.prompt,
            JSON.stringify(i.render ?? ""),
            i.timeLimitSec ?? "",
          ].join("\u0002"),
        )
        .join("\u0003");
      const routing = [s.routing.maxItems, s.routing.minItems, s.routing.ceilingMisses, s.routing.targetSe, s.routing.entryTheta].join(",");
      return [s.id, s.budgetMin, routing, items, (s.matching?.bank ?? []).join("\u0001")].join("\u0004");
    })
    .join("\u0005");
  return fnv1a(variant ? canonical + "\u0006" + variant : canonical);
}

/** Form tag hashed into bankVersion for fixed calibration administrations. */
export const CALIBRATION_FORM_TAG = "calibration-v1";

/** Cryptographically random session id with a deterministic-enough fallback. */
export function newSessionId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export interface ExportedResponse extends Response {
  subtestId: string;
  positionInSubtest: number;
  positionInBattery: number;
  rawAnswer: number | string | null;
  answerIndex: number | null;
}

/**
 * Device/administration context captured at export time. Visual subtests are
 * screen-dependent and speeded formats are input-dependent; without this
 * block, device-driven DIF in calibration data is uninterpretable.
 */
export interface AdministrationContext {
  userAgent: string;
  viewportW: number | null;
  viewportH: number | null;
  screenW: number | null;
  screenH: number | null;
  devicePixelRatio: number | null;
  language: string | null;
  timezone: string | null;
  /** Coarse class derived from pointer/viewport heuristics. */
  deviceClass: "desktop" | "tablet" | "phone" | "unknown";
}

/** Collect the administration context (browser only; null fields elsewhere). */
export function collectAdministration(): AdministrationContext {
  const nav = globalThis.navigator as Navigator | undefined;
  const w = globalThis.window as Window | undefined;
  const viewportW = w?.innerWidth ?? null;
  const viewportH = w?.innerHeight ?? null;
  let deviceClass: AdministrationContext["deviceClass"] = "unknown";
  if (nav && viewportW !== null && viewportH !== null) {
    const coarse = (nav as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
    if (/Mobi|Android|iPhone/i.test(nav.userAgent)) deviceClass = "phone";
    else if (coarse > 1 && Math.min(viewportW, viewportH) < 900) deviceClass = "tablet";
    else deviceClass = "desktop";
  }
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    timezone = null;
  }
  return {
    userAgent: nav?.userAgent ?? "",
    viewportW,
    viewportH,
    screenW: w?.screen?.width ?? null,
    screenH: w?.screen?.height ?? null,
    devicePixelRatio: w?.devicePixelRatio ?? null,
    language: nav?.language ?? null,
    timezone,
    deviceClass,
  };
}

export interface ExportDocument {
  format: "iqtesting-responses";
  version: 1;
  sessionId: string;
  bankVersion: string;
  /** Administration mode the session ran under. */
  form: BatteryForm;
  exportedAt: number;
  batteryStartedAt: number | null;
  /** Active scored-administration time (multi-sitting clock), ms. */
  batteryActiveMs: number;
  /** Optional self-chosen retest linkage code. */
  participantId: string | null;
  consent: ConsentRecord | null;
  demographics: Demographics | null;
  /** Times the instruction-comprehension check was failed before passing. */
  comprehensionAttempts: number;
  /** Device/browser context (null outside a browser). */
  administration: AdministrationContext | null;
  subtests: {
    id: string;
    name: string;
    broad: string;
    stopReason: string | null;
    itemsAdministered: number;
    theta: number | null;
    se: number | null;
    /** Offer/stop decision log for exposure and DIF analysis. */
    decisions: RoutingDecision[];
  }[];
  responses: ExportedResponse[];
  composite: { theta: number; se: number; standardScore: number } | null;
  /** Response-validity screening — the norming pipeline excludes invalid sessions. */
  validity: ValidityReport | null;
}

/** Build the complete norming record for a session (pure — no I/O). */
export function exportSession(state: SessionState): ExportDocument {
  const subtestById = new Map(state.subtests.map((s) => [s.id, s]));
  const positions = new Map<string, number>();
  const responses: ExportedResponse[] = state.responses.map((r, index) => {
    const subtest = subtestById.get(r.subtestId ?? "") ?? null;
    let answerIndex: number | null = null;
    if (subtest) {
      const item = subtest.items.find((i) => i.id === r.itemId);
      if (item && typeof item.answer === "number") answerIndex = item.answer;
    }
    const key = r.subtestId ?? subtest?.id ?? "unknown";
    const positionInSubtest = (positions.get(key) ?? 0) + 1;
    positions.set(key, positionInSubtest);
    return {
      ...r,
      subtestId: key,
      positionInSubtest,
      positionInBattery: index + 1,
      rawAnswer: r.rawAnswer ?? null,
      answerIndex,
    };
  });

  const scored = state.responses.length > 0 ? scoreComposite(state.subtests, state.responses) : null;
  const validity = scored ? screenSession(state.subtests, state.responses) : null;

  return {
    format: "iqtesting-responses",
    version: 1,
    sessionId: state.sessionId,
    bankVersion: state.bankVersion,
    form: state.form,
    exportedAt: Date.now(),
    batteryStartedAt: state.startedAt,
    // ACTIVE scored-administration time (multi-sitting clock), not wall-clock.
    batteryActiveMs: Math.round(
      state.activeMs + (state.segmentStart !== null ? Math.max(0, Date.now() - state.segmentStart) : 0),
    ),
    participantId: state.participantId,
    consent: state.consent,
    demographics: state.demographics,
    comprehensionAttempts: state.comprehensionAttempts,
    administration: collectAdministration(),
    subtests: state.subtests.map((s, i) => {
      const sub = scored?.subtests.find((x) => x.subtestId === s.id);
      return {
        id: s.id,
        name: s.name,
        broad: s.broad,
        stopReason: state.stopReasons[i] ?? null,
        itemsAdministered: sub?.itemsAdministered ?? 0,
        theta: sub ? Number(sub.theta.toFixed(4)) : null,
        se: sub ? Number(sub.se.toFixed(4)) : null,
        decisions: state.routing[i]?.decisions ?? [],
      };
    }),
    responses,
    composite: scored ? { theta: Number(scored.theta.toFixed(4)), se: Number(scored.se.toFixed(4)), standardScore: scored.g.score } : null,
    validity,
  };
}

/** Trigger a JSON file download (browser only; no-op elsewhere). */
export function downloadJson(filename: string, doc: unknown): void {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/**
 * Submit an export to the collection endpoint (Cloudflare Worker).
 * Returns the HTTP status on a definitive answer, null when no endpoint is
 * configured or the browser cannot reach it — callers fall back to the
 * manual JSON download either way.
 */
export async function submitExport(
  doc: ExportDocument,
  endpoint: string,
): Promise<{ ok: boolean; status: number } | null> {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return null;
  }
}
