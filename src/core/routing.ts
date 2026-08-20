import type { Item, Response, RoutingConfig } from "./types.ts";
import { estimateAbility, selectNextItem } from "./irt.ts";

export interface RoutingState {
  administered: Item[];
  responses: Response[];
  theta: number;
  se: number;
  consecutiveMisses: number;
  done: boolean;
  stopReason: StopReason | null;
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
  };
}

/**
 * Decide the next item, or null when the subtest should stop.
 *
 * Stop rules, checked in order:
 *  1. max-items   -- hard budget reached
 *  2. ceiling     -- N consecutive misses (SB5-style discontinue)
 *  3. precision   -- SE(theta) below target, once minItems satisfied
 *  4. exhausted   -- pool empty
 *
 * The ceiling rule is checked before the precision rule on purpose: a run of
 * misses means we have bracketed the ceiling, and continuing past it costs
 * testing time while adding demoralizing, low-information items.
 */
export function nextItem(
  pool: Item[],
  state: RoutingState,
  config: RoutingConfig,
): { item: Item | null; stopReason: StopReason | null } {
  const n = state.responses.length;

  if (n >= config.maxItems) return { item: null, stopReason: "max-items" };

  if (n >= config.minItems) {
    if (state.consecutiveMisses >= config.ceilingMisses) {
      return { item: null, stopReason: "ceiling" };
    }
    if (state.se <= config.targetSe) {
      return { item: null, stopReason: "precision" };
    }
  }

  const used = new Set(state.administered.map((i) => i.id));
  const item = selectNextItem(pool, state.theta, used);
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
    consecutiveMisses: response.correct ? 0 : state.consecutiveMisses + 1,
    done: false,
    stopReason: null,
  };
}

export function finishRouting(state: RoutingState, reason: StopReason): RoutingState {
  return { ...state, done: true, stopReason: reason };
}
