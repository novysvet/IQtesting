import type { Item, Response, Subtest } from "./types.ts";
import { initRouting, nextItem, applyResponse, finishRouting } from "./routing.ts";
import type { RoutingState, StopReason } from "./routing.ts";
import { estimateAbility } from "./irt.ts";
import { bankVersion, newSessionId } from "./telemetry.ts";

/**
 * Session state machine.
 *
 * The battery is a sequence of subtests; each subtest is an adaptive run over
 * its own pool. This module owns the ordering, the per-subtest routing state,
 * and the wall-clock budget. It holds no React state itself so it can be
 * driven directly from tests.
 *
 * NORMING TELEMETRY: every session carries a sessionId and the bankVersion
 * hash of the exact item bank that routed it, and every recorded response
 * keeps the raw answer and the keyed option position (see exportSession in
 * telemetry.ts) so response data survives for calibration.
 */

export type Phase =
  | { kind: "intro" }
  | { kind: "instructions"; subtestIndex: number }
  | { kind: "item"; subtestIndex: number; item: Item; startedAt: number }
  | { kind: "matching"; subtestIndex: number; startedAt: number }
  | { kind: "break"; subtestIndex: number }
  | { kind: "results" };

export interface SessionState {
  phase: Phase;
  subtests: Subtest[];
  routing: RoutingState[];
  responses: Response[];
  stopReasons: (StopReason | null)[];
  startedAt: number | null;
  /** Start of the active scored section, null outside item administration. */
  sectionStartedAt: number | null;
  /** Total battery budget in milliseconds. */
  budgetMs: number;
  /** Random identity for this administration (retest/bot linkage in norming data). */
  sessionId: string;
  /** Content hash of the item bank that routed this session (see telemetry.ts). */
  bankVersion: string;
}

/**
 * Wall-clock budget for the whole battery. Authored per-subtest budgets sum
 * to exactly this (asserted in test/budget-simulation.test.ts); adaptive
 * stopping means typical administrations finish well inside it.
 */
export const BATTERY_BUDGET_MIN = 226;

export function initSession(
  subtests: Subtest[],
  identity?: { sessionId?: string; bankVersion?: string },
): SessionState {
  return {
    phase: { kind: "intro" },
    subtests,
    routing: subtests.map((s) => initRouting(s.routing)),
    responses: [],
    stopReasons: subtests.map(() => null),
    startedAt: null,
    sectionStartedAt: null,
    budgetMs: BATTERY_BUDGET_MIN * 60_000,
    sessionId: identity?.sessionId ?? newSessionId(),
    bankVersion: identity?.bankVersion ?? bankVersion(subtests),
  };
}

/** Breaks are offered after these subtest indices (0-based), not after the last. */
export function isBreakPoint(index: number, total: number): boolean {
  if (index >= total - 1) return false;
  // A pause every third subtest keeps fatigue from confounding later scores.
  return (index + 1) % 3 === 0;
}

export function beginBattery(state: SessionState, now: number): SessionState {
  return {
    ...state,
    startedAt: now,
    phase: { kind: "instructions", subtestIndex: 0 },
  };
}

/** Serve the first (or next) item of a subtest, or advance past it if empty. */
export function startSubtest(state: SessionState, index: number, now: number): SessionState {
  const subtest = state.subtests[index];
  if (!subtest) return { ...state, phase: { kind: "results" } };
  // Whole-page matching subtests never enter the adaptive item loop.
  if (subtest.matching) {
    return {
      ...state,
      sectionStartedAt: now,
      phase: { kind: "matching", subtestIndex: index, startedAt: now },
    };
  }
  const routing = state.routing[index]!;
  const { item, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  if (!item) return closeSubtest(state, index, stopReason ?? "exhausted", now);
  return { ...state, sectionStartedAt: state.sectionStartedAt ?? now, phase: { kind: "item", subtestIndex: index, item, startedAt: now } };
}

/**
 * Submit a whole-page matching subtest (1926-SAT definitions format).
 *
 * `assignments` is parallel to subtest.matching.bank: for each displayed
 * word, the definition number typed next to it (0 = left blank). Item i is
 * correct when the number typed next to ITS key word equals i + 1. Every
 * item is recorded — blanks included, flagged timedOut when the page
 * expired — because the format is speeded: unattempted items are scored
 * incorrect but stay distinguishable in the export via rawAnswer null.
 */
export function answerMatching(
  state: SessionState,
  assignments: readonly number[],
  now: number,
  timedOut = false,
): SessionState {
  if (state.phase.kind !== "matching") return state;
  const { subtestIndex, startedAt } = state.phase;
  const subtest = state.subtests[subtestIndex]!;
  const bank = subtest.matching?.bank ?? [];
  if (state.startedAt !== null && now - state.startedAt >= state.budgetMs) {
    return { ...state, phase: { kind: "results" } };
  }
  const latencyMs = Math.max(0, now - startedAt);
  const responses: Response[] = subtest.items.map((item, i) => {
    const wordIndex = bank.indexOf(item.answer as string);
    const typed = wordIndex >= 0 ? (assignments[wordIndex] ?? 0) : 0;
    return {
      itemId: item.id,
      correct: typed === i + 1,
      latencyMs,
      timedOut: typed === 0 ? true : timedOut,
      subtestId: subtest.id,
      positionInSubtest: i + 1,
      positionInBattery: state.responses.length + i + 1,
      rawAnswer: typed === 0 ? null : typed,
      answerIndex: null,
    };
  });
  const est = estimateAbility(subtest.items, responses);
  let misses = 0;
  for (const r of responses) misses = r.correct ? 0 : misses + 1;
  const routing = [...state.routing];
  routing[subtestIndex] = {
    administered: [...subtest.items],
    responses,
    theta: est.theta,
    se: est.se,
    consecutiveMisses: misses,
    done: true,
    stopReason: null,
  };
  const advanced: SessionState = {
    ...state,
    routing,
    responses: [...state.responses, ...responses],
  };
  return closeSubtest(advanced, subtestIndex, timedOut ? "time-limit" : "max-items", now);
}

/**
 * Record an answer and advance. Correctness is decided here, in one place, for
 * every item type: multiple choice compares option index, constructed response
 * compares normalised strings.
 */
export function answerItem(
  state: SessionState,
  raw: number | string,
  now: number,
  timedOut = false,
): SessionState {
  if (state.phase.kind !== "item") return state;
  const { subtestIndex, item, startedAt } = state.phase;
  const subtest = state.subtests[subtestIndex]!;
  if (state.startedAt !== null && now - state.startedAt >= state.budgetMs) {
    return { ...state, phase: { kind: "results" } };
  }
  if (state.sectionStartedAt !== null && now - state.sectionStartedAt >= subtest.budgetMin * 60_000) {
    return closeSubtest(state, subtestIndex, "time-limit", now);
  }
  const correct = isCorrect(item, raw);
  const response: Response = {
    itemId: item.id,
    correct,
    latencyMs: Math.max(0, now - startedAt),
    timedOut,
    subtestId: subtest.id,
    positionInSubtest: state.routing[subtestIndex]!.administered.length + 1,
    positionInBattery: state.responses.length + 1,
    rawAnswer: raw,
    answerIndex: typeof item.answer === "number" ? item.answer : null,
  };

  const routing = applyResponse(state.routing[subtestIndex]!, item, response);
  const nextRouting = [...state.routing];
  nextRouting[subtestIndex] = routing;

  const advanced: SessionState = {
    ...state,
    routing: nextRouting,
    responses: [...state.responses, response],
  };

  // Out of time? Stop the whole battery rather than truncating one subtest.
  if (state.startedAt !== null && now - state.startedAt >= state.budgetMs) {
    return { ...advanced, phase: { kind: "results" } };
  }

  const { item: following, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  if (!following) return closeSubtest(advanced, subtestIndex, stopReason ?? "exhausted", now);
  return {
    ...advanced,
    phase: { kind: "item", subtestIndex, item: following, startedAt: now },
  };
}

/** Normalised answer comparison. */
export function isCorrect(item: Item, raw: number | string): boolean {
  if (typeof item.answer === "number") return raw === item.answer;
  if (typeof raw !== "string") return false;
  // Sign integrity: normalise strips "-" (span answers like "4 9 1-7" must
  // normalise to "4917"), so a negated typed answer is rejected here rather
  // than silently matching an unsigned key.
  if (raw.includes("-") && !item.answer.includes("-")) return false;
  return normalise(raw) === normalise(item.answer);
}

export function normalise(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function closeSubtest(
  state: SessionState,
  index: number,
  reason: StopReason,
  now: number,
): SessionState {
  const routing = [...state.routing];
  routing[index] = finishRouting(state.routing[index]!, reason);
  const stopReasons = [...state.stopReasons];
  stopReasons[index] = reason;

  const last = index >= state.subtests.length - 1;
  const outOfTime = state.startedAt !== null && now - state.startedAt >= state.budgetMs;
  const phase: Phase = last || outOfTime
    ? { kind: "results" }
    : isBreakPoint(index, state.subtests.length)
      ? { kind: "break", subtestIndex: index }
      : { kind: "instructions", subtestIndex: index + 1 };

  return { ...state, routing, stopReasons, sectionStartedAt: null, phase };
}

/** Close the active section when its authored wall-clock limit expires. */
export function expireSubtest(state: SessionState, now: number): SessionState {
  if (state.phase.kind === "matching") {
    // The page component auto-submits its current inputs on expiry; this is
    // the fallback when no inputs were captured (scores all-blank honestly).
    return answerMatching(state, [], now, true);
  }
  if (state.phase.kind !== "item") return state;
  return closeSubtest(state, state.phase.subtestIndex, "time-limit", now);
}

export function sectionRemainingMs(state: SessionState, now: number): number | null {
  if ((state.phase.kind !== "item" && state.phase.kind !== "matching") || state.sectionStartedAt === null) return null;
  const budget = state.subtests[state.phase.subtestIndex]?.budgetMin ?? 0;
  return Math.max(0, budget * 60_000 - (now - state.sectionStartedAt));
}

export function elapsedMs(state: SessionState, now: number): number {
  return state.startedAt === null ? 0 : now - state.startedAt;
}

export function remainingMs(state: SessionState, now: number): number {
  return Math.max(0, state.budgetMs - elapsedMs(state, now));
}

/** Sum of authored per-subtest budgets, for design-time budget checks. */
export function totalBudgetMin(subtests: Subtest[]): number {
  return subtests.reduce((n, s) => n + s.budgetMin, 0);
}
