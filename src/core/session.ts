import type {
  BatteryForm,
  ConsentRecord,
  Demographics,
  Item,
  Response,
  RoutingDecision,
  Subtest,
} from "./types.ts";
import { initRouting, nextItem, applyResponse, finishRouting } from "./routing.ts";
import type { RoutingState, StopReason } from "./routing.ts";
import { estimateAbility } from "./irt.ts";
import { optionPermutation, keyedDisplayPosition } from "./presentation.ts";
import { bankVersion, newSessionId, CALIBRATION_FORM_TAG } from "./telemetry.ts";

/**
 * Session state machine.
 *
 * The battery is a sequence of subtests; each subtest is an adaptive run over
 * its own pool (or a fixed linear form in calibration mode). This module owns
 * the ordering, the per-subtest routing state, and the wall-clock budget. It
 * holds no React state itself so it can be driven directly from tests.
 *
 * NORMING TELEMETRY: every session carries a sessionId and the bankVersion
 * hash of the exact item bank that routed it, and every recorded response
 * keeps the raw answer and the keyed option position (see exportSession in
 * telemetry.ts) so response data survives for calibration.
 *
 * CENSORING POLICY: responses that carry no ability evidence are flagged, not
 * discarded — omitted (section expired with the item on screen) and
 * interrupted (tab hidden during memory exposure) stay in the record for the
 * calibration export but are excluded from estimation, person fit, and the
 * discontinue miss streak.
 */

export type Phase =
  | { kind: "intro" }
  | { kind: "instructions"; subtestIndex: number }
  | { kind: "practice"; subtestIndex: number; practiceIndex: number; startedAt: number }
  | { kind: "matchingDemo"; subtestIndex: number }
  | { kind: "item"; subtestIndex: number; item: Item; startedAt: number }
  | { kind: "matching"; subtestIndex: number; startedAt: number }
  | { kind: "checkpoint"; subtestIndex: number }
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
  /**
   * MULTI-SITTING CLOCK: the battery budget accrues ONLY while a scored
   * segment is open (item or matching administration). `activeMs` is the
   * total accrued through the last closed segment; `segmentStart` is when
   * the currently open segment began. Between sections — at instructions,
   * practice, demonstrations, checkpoints, and across sittings — the clock
   * is frozen, so an administration can be taken test by test over any
   * number of sittings without the wall clock punishing pauses.
   */
  activeMs: number;
  segmentStart: number | null;
  /** Total battery budget in milliseconds (ACTIVE time, not wall-clock). */
  budgetMs: number;
  /** Random identity for this administration (retest/bot linkage in norming data). */
  sessionId: string;
  /** Content hash of the item bank + form variant that routed this session. */
  bankVersion: string;
  /** Administration mode: adaptive CAT or fixed calibration forms. */
  form: BatteryForm;
  /** Optional self-chosen retest linkage code (never required, never scored). */
  participantId: string | null;
  consent: ConsentRecord | null;
  demographics: Demographics | null;
  /** Times the instruction-comprehension check was failed before passing. */
  comprehensionAttempts: number;
}

/**
 * Wall-clock budget for the whole battery, in ACTIVE scored-administration
 * time. Authored per-subtest budgets sum to exactly this (asserted in
 * test/budget-simulation.test.ts); adaptive stopping means typical
 * administrations finish well inside it, and the checkpoint clock-freeze
 * means multi-sitting administrations never burn budget between sections.
 */
export const BATTERY_BUDGET_MIN = 260;

export interface SessionIdentity {
  sessionId?: string;
  bankVersion?: string;
  participantId?: string | null;
  form?: BatteryForm;
  consent?: ConsentRecord | null;
  demographics?: Demographics | null;
}

/** Hash variant stamped into bankVersion when a fixed calibration form runs. */
export function formVariant(form: BatteryForm): string | undefined {
  return form === "calibration" ? CALIBRATION_FORM_TAG : undefined;
}

/**
 * Deterministic fixed-form item order for one subtest: min(maxItems, pool)
 * items sampled EVENLY across the b-sorted pool (stratified by difficulty),
 * administered easiest-first like a classic booklet. Same bank -> same form,
 * so every calibration examinee sees identical forms.
 */
export function buildFixedOrder(subtest: Subtest): string[] {
  const m = Math.min(subtest.routing.maxItems, subtest.items.length);
  const sorted = [...subtest.items].sort((a, b) => a.b - b.b || a.id.localeCompare(b.id));
  const picked = new Set<number>();
  for (let k = 0; k < m; k++) {
    picked.add(Math.round((k * (sorted.length - 1)) / Math.max(1, m - 1)));
  }
  return [...picked].map((i) => sorted[i]!.id);
}

function effectiveRouting(subtest: Subtest, form: BatteryForm) {
  return form === "calibration"
    ? { ...subtest.routing, fixedOrder: buildFixedOrder(subtest) }
    : subtest.routing;
}

export function initSession(
  subtests: Subtest[],
  identity: SessionIdentity = {},
): SessionState {
  const form: BatteryForm = identity.form ?? "adaptive";
  return {
    phase: { kind: "intro" },
    // Calibration mode pins each route to its deterministic fixed order.
    subtests:
      form === "calibration"
        ? subtests.map((s) => ({ ...s, routing: effectiveRouting(s, form) }))
        : subtests,
    routing: subtests.map((s) => initRouting(effectiveRouting(s, form))),
    responses: [],
    stopReasons: subtests.map(() => null),
    startedAt: null,
    sectionStartedAt: null,
    activeMs: 0,
    segmentStart: null,
    budgetMs: BATTERY_BUDGET_MIN * 60_000,
    sessionId: identity.sessionId ?? newSessionId(),
    bankVersion: identity.bankVersion ?? bankVersion(subtests, formVariant(form)),
    form,
    participantId: identity.participantId ?? null,
    consent: identity.consent ?? null,
    demographics: identity.demographics ?? null,
    comprehensionAttempts: 0,
  };
}

/**
 * ACTIVE time consumed so far: everything accrued through closed segments,
 * plus the open segment's running total. Idle phases (instructions, practice,
 * demonstrations, checkpoints, closed tabs between sittings) add nothing.
 */
export function elapsedActiveMs(state: SessionState, now: number): number {
  if (state.startedAt === null) return 0;
  const open = state.segmentStart !== null ? Math.max(0, now - state.segmentStart) : 0;
  return state.activeMs + open;
}

/** Open a scored segment if none is running. */
function openSegment(state: SessionState, now: number): SessionState {
  return state.segmentStart === null ? { ...state, segmentStart: now } : state;
}

/** Close the open scored segment, banking its time into activeMs. */
function closeSegment(state: SessionState, now: number): SessionState {
  if (state.segmentStart === null) return state;
  return {
    ...state,
    activeMs: state.activeMs + Math.max(0, now - state.segmentStart),
    segmentStart: null,
  };
}

export function beginBattery(state: SessionState, now: number): SessionState {
  return {
    ...state,
    startedAt: now,
    phase: { kind: "instructions", subtestIndex: 0 },
  };
}

/** Append one offer/stop decision to a route's telemetry log. */
function withDecision(
  routing: RoutingState,
  step: number,
  result: { item: Item | null; stopReason: StopReason | null },
): RoutingState {
  const decision: RoutingDecision = {
    step,
    theta: Number(routing.theta.toFixed(4)),
    se: Number(routing.se.toFixed(4)),
    itemId: result.item?.id ?? null,
    stopReason: result.stopReason,
  };
  return { ...routing, decisions: [...routing.decisions, decision] };
}

/** Serve the first (or next) item of a subtest, or advance past it if empty. */
export function startSubtest(state: SessionState, index: number, now: number): SessionState {
  const subtest = state.subtests[index];
  if (!subtest) return { ...state, phase: { kind: "results" } };
  // Whole-page matching subtests never enter the adaptive item loop. A demo
  // page (Subtest.matchingPractice) comes first, unscored and untimed; the
  // scored page opens the segment and the section clock together.
  if (subtest.matching) {
    if (subtest.matchingPractice && subtest.matchingPractice.defs.length > 0) {
      return { ...state, sectionStartedAt: null, phase: { kind: "matchingDemo", subtestIndex: index } };
    }
    return openSegment({
      ...state,
      sectionStartedAt: now,
      phase: { kind: "matching", subtestIndex: index, startedAt: now },
    }, now);
  }
  // Unscored sample items come first: instruction miscomprehension must not
  // masquerade as low ability on the first scored items. The battery clock
  // stays frozen through them.
  if (subtest.practice && subtest.practice.length > 0) {
    return {
      ...state,
      sectionStartedAt: null,
      phase: { kind: "practice", subtestIndex: index, practiceIndex: 0, startedAt: now },
    };
  }
  const routing = state.routing[index]!;
  const { item, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  const logged = withDecision(routing, state.responses.length + 1, { item, stopReason });
  const nextRouting = [...state.routing];
  nextRouting[index] = logged;
  const advanced = openSegment({ ...state, routing: nextRouting }, now);
  if (!item) return closeSubtest(advanced, index, stopReason ?? "exhausted", now);
  return {
    ...advanced,
    sectionStartedAt: advanced.sectionStartedAt ?? now,
    phase: { kind: "item", subtestIndex: index, item, startedAt: now },
  };
}

/**
 * Advance through a subtest's unscored practice items, then open the scored
 * run. Practice answers are never recorded; the section clock starts with
 * the first scored item.
 */
export function answerPractice(state: SessionState, now: number): SessionState {
  if (state.phase.kind !== "practice") return state;
  const { subtestIndex, practiceIndex } = state.phase;
  const subtest = state.subtests[subtestIndex]!;
  const practices = subtest.practice ?? [];
  if (practiceIndex + 1 < practices.length) {
    return {
      ...state,
      phase: { kind: "practice", subtestIndex, practiceIndex: practiceIndex + 1, startedAt: now },
    };
  }
  const routing = state.routing[subtestIndex]!;
  const { item, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  const logged = withDecision(routing, state.responses.length + 1, { item, stopReason });
  const nextRouting = [...state.routing];
  nextRouting[subtestIndex] = logged;
  const advanced = openSegment({ ...state, routing: nextRouting }, now);
  if (!item) return closeSubtest(advanced, subtestIndex, stopReason ?? "exhausted", now);
  return {
    ...advanced,
    sectionStartedAt: now,
    phase: { kind: "item", subtestIndex, item, startedAt: now },
  };
}

/**
 * Where the keyed option sat in this session's display order (1-based), for
 * MC single-select formats whose options are permuted per session. Recall,
 * multi-select, and binary formats record null.
 */
function computeKeyedPosition(item: Item, sessionId: string): number | null {
  if (typeof item.answer !== "number" || item.multi !== undefined) return null;
  const count = item.options?.length ?? 0;
  const perm = optionPermutation(sessionId, item.id, count);
  return keyedDisplayPosition(perm, item.answer);
}

/** Metadata attached to a submitted answer by the UI layer. */
export interface AnswerMeta {
  /** Tab was hidden during a memory presentation — censoring, not ability. */
  interrupted?: boolean;
  /** Milliseconds the item was not visible while it was open. */
  awayMs?: number;
}

/**
 * Close the unscored matching demonstration page and open the scored page.
 * The demo is never recorded; the section clock starts here.
 */
export function answerMatchingDemo(state: SessionState, now: number): SessionState {
  if (state.phase.kind !== "matchingDemo") return state;
  const { subtestIndex } = state.phase;
  return openSegment({
    ...state,
    sectionStartedAt: now,
    phase: { kind: "matching", subtestIndex, startedAt: now },
  }, now);
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
  if (elapsedActiveMs(state, now) >= state.budgetMs) {
    return closeSegment({ ...state, phase: { kind: "results" } }, now);
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
    decisions: [],
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
  meta: AnswerMeta = {},
): SessionState {
  if (state.phase.kind !== "item") return state;
  const { subtestIndex, item, startedAt } = state.phase;
  const subtest = state.subtests[subtestIndex]!;
  if (elapsedActiveMs(state, now) >= state.budgetMs) {
    return closeWithOmission(state, subtestIndex, now);
  }
  if (state.sectionStartedAt !== null && now - state.sectionStartedAt >= subtest.budgetMin * 60_000) {
    return closeWithOmission(state, subtestIndex, now);
  }
  const correct = isCorrect(item, raw);
  const response: Response = {
    itemId: item.id,
    correct,
    latencyMs: Math.max(0, now - startedAt),
    timedOut,
    interrupted: meta.interrupted ?? undefined,
    awayMs: meta.awayMs,
    subtestId: subtest.id,
    positionInSubtest: state.routing[subtestIndex]!.administered.length + 1,
    positionInBattery: state.responses.length + 1,
    rawAnswer: raw,
    answerIndex: typeof item.answer === "number" ? item.answer : null,
    keyedPosition: computeKeyedPosition(item, state.sessionId),
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
  if (elapsedActiveMs(state, now) >= state.budgetMs) {
    return closeSegment({ ...advanced, phase: { kind: "results" } }, now);
  }

  const { item: following, stopReason } = nextItem(subtest.items, routing, subtest.routing);
  const nextRouting2 = [...advanced.routing];
  nextRouting2[subtestIndex] = withDecision(routing, advanced.responses.length + 1, { item: following, stopReason });
  const fullyAdvanced: SessionState = { ...advanced, routing: nextRouting2 };
  if (!following) return closeSubtest(fullyAdvanced, subtestIndex, stopReason ?? "exhausted", now);
  return {
    ...fullyAdvanced,
    phase: { kind: "item", subtestIndex, item: following, startedAt: now },
  };
}

/**
 * Close a section whose clock ran out WITH an item still on screen. The
 * in-flight item is recorded as omitted — censored, excluded from scoring —
 * so the calibration data shows the informative censoring instead of the
 * item silently vanishing.
 */
function closeWithOmission(state: SessionState, subtestIndex: number, now: number): SessionState {
  const phase = state.phase;
  if (phase.kind !== "item") return closeSubtest(state, subtestIndex, "time-limit", now);
  const { item, startedAt } = phase;
  const subtest = state.subtests[subtestIndex]!;
  const omittedResponse: Response = {
    itemId: item.id,
    correct: false,
    latencyMs: Math.max(0, now - startedAt),
    timedOut: true,
    omitted: true,
    subtestId: subtest.id,
    positionInSubtest: state.routing[subtestIndex]!.administered.length + 1,
    positionInBattery: state.responses.length + 1,
    rawAnswer: null,
    answerIndex: typeof item.answer === "number" ? item.answer : null,
    keyedPosition: null,
  };
  const routing = applyResponse(state.routing[subtestIndex]!, item, omittedResponse);
  const nextRouting = [...state.routing];
  nextRouting[subtestIndex] = routing;
  return closeSubtest(
    { ...state, routing: nextRouting, responses: [...state.responses, omittedResponse] },
    subtestIndex,
    "time-limit",
    now,
  );
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

  // The segment closes with the section: from here until the next scored
  // page opens, the battery clock is frozen (checkpoints, sittings).
  const closed = closeSegment(state, now);
  const last = index >= state.subtests.length - 1;
  const outOfTime = elapsedActiveMs(closed, now) >= closed.budgetMs;
  const phase: Phase = last || outOfTime
    ? { kind: "results" }
    : { kind: "checkpoint", subtestIndex: index };

  return { ...closed, routing, stopReasons, sectionStartedAt: null, phase };
}

/**
 * Close the active section when its authored wall-clock limit expires.
 * For an item phase the in-flight item is recorded as omitted first; for a
 * matching page the component auto-submits its inputs, so this is only the
 * all-blank fallback.
 */
export function expireSubtest(state: SessionState, now: number): SessionState {
  if (state.phase.kind === "matching") {
    return answerMatching(state, [], now, true);
  }
  if (state.phase.kind === "practice") {
    // Expiry during unscored samples: skip straight into scored administration.
    return answerPractice({ ...state, phase: { ...state.phase, practiceIndex: Number.MAX_SAFE_INTEGER } }, now);
  }
  if (state.phase.kind !== "item") return state;
  return closeWithOmission(state, state.phase.subtestIndex, now);
}

export function sectionRemainingMs(state: SessionState, now: number): number | null {
  if ((state.phase.kind !== "item" && state.phase.kind !== "matching") || state.sectionStartedAt === null) return null;
  const budget = state.subtests[state.phase.subtestIndex]?.budgetMin ?? 0;
  return Math.max(0, budget * 60_000 - (now - state.sectionStartedAt));
}

export function elapsedMs(state: SessionState, now: number): number {
  return elapsedActiveMs(state, now);
}

export function remainingMs(state: SessionState, now: number): number {
  return Math.max(0, state.budgetMs - elapsedActiveMs(state, now));
}

/**
 * Re-base a restored save onto "now" for multi-sitting resumption.
 *
 * The battery clock is frozen between sections, but a save taken MID-SECTION
 * leaves a segment open whose wall-clock delta would otherwise bill the
 * entire absence. Rule: only work time up to the last autosave is banked
 * (savedAt - segmentStart); the segment re-opens at the restore instant.
 * The SECTION clock is deliberately NOT re-based — an examinee who stopped
 * outside a checkpoint finds their open section expired (its item recorded
 * as omitted by the normal expiry path) and lands on a checkpoint, exactly
 * as if they had watched that one section's clock run out. Stopping cleanly
 * is a checkpoint action; abandoning costs one section, never the battery.
 */
export function resumeSavedSession(state: SessionState, savedAt: number, now: number): SessionState {
  if (state.segmentStart === null) return state;
  const worked = Math.max(0, Math.min(savedAt, now) - state.segmentStart);
  return { ...state, activeMs: state.activeMs + worked, segmentStart: now };
}

/** Sum of authored per-subtest budgets, for design-time budget checks. */
export function totalBudgetMin(subtests: Subtest[]): number {
  return subtests.reduce((n, s) => n + s.budgetMin, 0);
}
