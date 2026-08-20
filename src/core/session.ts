import type { Item, Response, Subtest } from "./types.ts";
import { initRouting, nextItem, applyResponse, finishRouting } from "./routing.ts";
import type { RoutingState, StopReason } from "./routing.ts";

/**
 * Session state machine.
 *
 * The battery is a sequence of subtests; each subtest is an adaptive run over
 * its own pool. This module owns the ordering, the per-subtest routing state,
 * and the wall-clock budget. It holds no React state itself so it can be
 * driven directly from tests.
 */

export type Phase =
  | { kind: "intro" }
  | { kind: "instructions"; subtestIndex: number }
  | { kind: "item"; subtestIndex: number; item: Item; startedAt: number }
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
}

export const BATTERY_BUDGET_MIN = 180;

export function initSession(subtests: Subtest[]): SessionState {
  return {
    phase: { kind: "intro" },
    subtests,
    routing: subtests.map((s) => initRouting(s.routing)),
    responses: [],
    stopReasons: subtests.map(() => null),
    startedAt: null,
    sectionStartedAt: null,
    budgetMs: BATTERY_BUDGET_MIN * 60_000,
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
  const routing = state.routing[index]!;
  const { item, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  if (!item) return closeSubtest(state, index, stopReason ?? "exhausted", now);
  return { ...state, sectionStartedAt: state.sectionStartedAt ?? now, phase: { kind: "item", subtestIndex: index, item, startedAt: now } };
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
  if (state.phase.kind !== "item") return state;
  return closeSubtest(state, state.phase.subtestIndex, "time-limit", now);
}

export function sectionRemainingMs(state: SessionState, now: number): number | null {
  if (state.phase.kind !== "item" || state.sectionStartedAt === null) return null;
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
