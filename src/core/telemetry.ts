import type { Response, Subtest } from "./types.ts";
import type { SessionState } from "./session.ts";
import { scoreComposite } from "./scoring.ts";

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
 * Content hash of everything that influences scoring or routing: subtest
 * configs plus every item's id, parameters, options, and key. Any parameter
 * change (e.g. a recalibration) produces a new version, so stored responses
 * always map back to the exact bank that produced them.
 */
export function bankVersion(subtests: Subtest[]): string {
  const canonical = subtests
    .map((s) => {
      const items = s.items
        .map((i) => [i.id, i.a, i.b, i.c, (i.options ?? []).join("\u0001"), i.answer, i.multi ?? ""].join("\u0002"))
        .join("\u0003");
      const routing = [s.routing.maxItems, s.routing.minItems, s.routing.ceilingMisses, s.routing.targetSe, s.routing.entryTheta].join(",");
      return [s.id, routing, items, (s.matching?.bank ?? []).join("\u0001")].join("\u0004");
    })
    .join("\u0005");
  return fnv1a(canonical);
}

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

export interface ExportDocument {
  format: "iqtesting-responses";
  version: 1;
  sessionId: string;
  bankVersion: string;
  exportedAt: number;
  batteryStartedAt: number | null;
  subtests: {
    id: string;
    name: string;
    broad: string;
    stopReason: string | null;
    itemsAdministered: number;
    theta: number | null;
    se: number | null;
  }[];
  responses: ExportedResponse[];
  composite: { theta: number; se: number; standardScore: number } | null;
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

  return {
    format: "iqtesting-responses",
    version: 1,
    sessionId: state.sessionId,
    bankVersion: state.bankVersion,
    exportedAt: Date.now(),
    batteryStartedAt: state.startedAt,
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
      };
    }),
    responses,
    composite: scored ? { theta: Number(scored.theta.toFixed(4)), se: Number(scored.se.toFixed(4)), standardScore: scored.g.score } : null,
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
