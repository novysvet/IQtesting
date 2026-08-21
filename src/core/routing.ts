import type { Item, Response, RoutingConfig, RoutingDecision } from "./types.ts";
import { estimateAbility, selectNextItem } from "./irt.ts";

export interface RoutingState {
  administered: Item[];
  responses: Response[];
  theta: number;
  se: number;
  consecutiveMisses: number;
  done: boolean;
  stopReason: StopReason | null;
  /** Every offer/stop decision this route made (exposure + DIF telemetry). */
  decisions: RoutingDecision[];
}

export type StopReason = "ceiling" | "precision" | "exhausted" | "max-items" | "time-limit";

export function initRouting(config: RoutingConfig): RoutingState {
  return {
    administered: [],
    responses: [],
    theta: config.entryTheta,
    se: 1,
    consecutiveMisses: 0,
    done: false,
    stopReason: null,
    decisions: [],
  };
}

/**
 * Decide the next item, or null when the subtest should stop.
 *
 * ADAPTIVE mode stop rules, checked in order:
 *  1. max-items   -- hard budget reached
 *  2. ceiling     -- N consecutive misses AND the descent has reached the
 *                    bank floor (SB5-style discontinue, floor-gated)
 *  3. precision   -- SE(theta) below target, once minItems satisfied
 *  4. exhausted   -- pool empty
 *
 * The ceiling rule is floor-gated on purpose. A bare miss-streak stop censors
 * the low end: a random or very-low-ability examinee accumulates misses long
 * before routing has walked down to items near the bank's easiest b, so the
 * estimate rests on failures of mid-band items and the prior inflates it
 * (the "random responder scores IQ 75" defect). Misses only bracket the
 * ceiling once they happen AT the floor — failing the easiest items in the
 * bank is the discriminating evidence that places an examinee at/below it.
 * Until state.theta is within FLOOR_BAND of the pool's minimum b, a miss
 * streak just means "keep descending". maxItems still bounds every run.
 *
 * FIXED-FORM mode (config.fixedOrder): serve the precomputed order and apply
 * NO adaptive stop rules — every examinee sees the same items in the same
 * order, which is what calibration and DIF analysis require. The form's
 * length is the design; only exhaustion can end it early.
 */
const FLOOR_BAND = 0.75;

function poolFloor(pool: Item[]): number {
  let floor = Infinity;
  for (const item of pool) if (item.b < floor) floor = item.b;
  return floor;
}

export function nextItem(
  pool: Item[],
  state: RoutingState,
  config: RoutingConfig,
): { item: Item | null; stopReason: StopReason | null } {
  const n = state.responses.length;

  if (n >= config.maxItems) return { item: null, stopReason: "max-items" };

  if (!config.fixedOrder && n >= config.minItems) {
    if (
      state.consecutiveMisses >= config.ceilingMisses &&
      state.theta <= poolFloor(pool) + FLOOR_BAND
    ) {
      return { item: null, stopReason: "ceiling" };
    }
    if (state.se <= config.targetSe) {
      return { item: null, stopReason: "precision" };
    }
  }

  const used = new Set(state.administered.map((i) => i.id));
  let item: Item | null;
  if (config.fixedOrder) {
    const byId = new Map(pool.map((i) => [i.id, i]));
    item = null;
    for (const id of config.fixedOrder) {
      if (used.has(id)) continue;
      const candidate = byId.get(id);
      if (candidate) {
        item = candidate;
        break;
      }
    }
  } else {
    item = selectNextItem(pool, state.theta, used);
  }
  if (!item) return { item: null, stopReason: "exhausted" };
  return { item, stopReason: null };
}

/** Fold a response into routing state, re-estimating ability. */
export function applyResponse(
  state: RoutingState,
  item: Item,
  response: Response,
): RoutingState {
  const administered = [...state.administered, item];
  const responses = [...state.responses, response];
  const est = estimateAbility(administered, responses);
  return {
    administered,
    responses,
    theta: est.theta,
    se: est.se,
    // An interruption (tab hidden during memory exposure) is ability-
    // uncorrelated censoring: it must not feed the discontinue rule, or a
    // distracted examinee is discontinued for reasons unrelated to ability.
    consecutiveMisses: response.correct
      ? 0
      : response.interrupted
        ? state.consecutiveMisses
        : state.consecutiveMisses + 1,
    done: false,
    stopReason: null,
    decisions: state.decisions,
  };
}

export function finishRouting(state: RoutingState, reason: StopReason): RoutingState {
  return { ...state, done: true, stopReason: reason };
}
