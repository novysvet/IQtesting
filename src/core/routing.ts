import type { Item, Response, RoutingConfig, RoutingDecision } from "./types.ts";
import { estimateAbility, itemInformation, pCorrect, selectNextItem } from "./irt.ts";
import { hashSeed, seededRandom } from "./presentation.ts";

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

export type StopReason = "ceiling" | "precision" | "no-gain" | "exhausted" | "max-items" | "time-limit";

/**
 * PSER no-gain threshold (Choi, Grady & Dodd 2010). The rule stops a run
 * once the BEST remaining item is expected to shrink the posterior VARIANCE
 * by less than this amount — predicted-standard-error-reduction stopping.
 * PSER's simulated optimum sat between hypo = 0.015 (stop) and hyper = 0.025
 * (continue) on PROMIS banks whose items carry peak information near 1.0;
 * this battery's authored 3PL items peak near 0.3, and the threshold scales
 * with item strength — one perfectly-targeted item buys only ~0.02 variance
 * at SE 0.50 here, so the unrescaled threshold would preempt the precision
 * target itself. 0.005 fires only once the best remaining item exceeds
 * p(correct) ~ 0.95 at the estimate: a genuinely outgrown ceiling or floor,
 * where a plain SE target the pool cannot deliver would otherwise grind to
 * maxItems buying thousandths of a logit.
 */
const NO_GAIN_VARIANCE = 0.005;

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
 *  4. no-gain     -- PSER: even the best unused item cannot reduce the
 *                    posterior variance by NO_GAIN_VARIANCE (fires when the
 *                    bank ceiling/floor has been outgrown — an SE target the
 *                    pool cannot deliver ends the run instead of grinding
 *                    to maxItems for negligible information)
 *  5. exhausted   -- pool empty
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
 * EXPOSURE CONTROL: with a non-degenerate sessionId, selection is
 * randomesque — one of the k=6 most informative unused items, chosen by a
 * PRNG seeded from (sessionId, subtest, step) so every session is
 * reproducible but two examinees of equal ability see different items
 * (Kingsbury & Zara 1989; k=6 per Leroux & Dodd 2019). Without a sessionId
 * (tests, simulations, calibration forms) selection stays deterministic
 * maximum-information.
 *
 * CONTENT BLOCKS: when the last administered item carries Item.block and
 * unused items of that block remain, selection is restricted to the block —
 * grammar-style banks contaminate measurement when languages interleave
 * mid-run (learnability transfers across blocks; IRT assumes stationarity).
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

/**
 * Expected reduction in posterior variance from administering the single
 * most informative unused item (the PSER ExpRed statistic). Both response
 * branches are re-estimated with the routing prior and mixed by P(correct)
 * at the current theta.
 */
function expectedVarianceGain(pool: Item[], state: RoutingState, block: string | undefined): number {
  const used = new Set(state.administered.map((i) => i.id));
  let best: Item | null = null;
  let bestInfo = -Infinity;
  for (const item of pool) {
    if (used.has(item.id)) continue;
    if (block !== undefined && item.block !== block) continue;
    const info = itemInformation(item, state.theta);
    if (info > bestInfo) {
      best = item;
      bestInfo = info;
    }
  }
  if (!best) return 0;
  const p = pCorrect(best, state.theta);
  const admin = [...state.administered, best];
  const base = { latencyMs: 0, timedOut: false };
  const estC = estimateAbility(admin, [...state.responses, { ...base, itemId: best.id, correct: true }]);
  const estW = estimateAbility(admin, [...state.responses, { ...base, itemId: best.id, correct: false }]);
  const varNow = state.se * state.se;
  const varNext = p * estC.se * estC.se + (1 - p) * estW.se * estW.se;
  return varNow - varNext;
}

export function nextItem(
  pool: Item[],
  state: RoutingState,
  config: RoutingConfig,
  sessionId?: string,
): { item: Item | null; stopReason: StopReason | null } {
  const n = state.responses.length;

  if (n >= config.maxItems) return { item: null, stopReason: "max-items" };

  const used = new Set(state.administered.map((i) => i.id));
  // Content block: stay inside the open block while it has items left.
  const last = state.administered[state.administered.length - 1];
  const openBlock =
    last?.block !== undefined && pool.some((i) => i.block === last.block && !used.has(i.id))
      ? last.block
      : undefined;

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
    // An empty pool is exhaustion, not a no-gain stop — the distinction is
    // calibration telemetry (bank too small vs bank ceiling outgrown).
    const remaining = pool.length - used.size;
    if (remaining > 0 && expectedVarianceGain(pool, state, openBlock) < NO_GAIN_VARIANCE) {
      return { item: null, stopReason: "no-gain" };
    }
  }

  let item: Item | null = null;
  if (config.fixedOrder) {
    const byId = new Map(pool.map((i) => [i.id, i]));
    for (const id of config.fixedOrder) {
      if (used.has(id)) continue;
      const candidate = byId.get(id);
      if (candidate) {
        item = candidate;
        break;
      }
    }
  } else {
    // Reproducible per-step randomness: the seed folds in the session, the
    // subtest's first item id (a stable bank identifier), and the step.
    const rand =
      sessionId && pool[0]
        ? seededRandom(hashSeed(sessionId + "\u0000" + pool[0].subtest + "\u0000" + String(n)))
        : undefined;
    item = selectNextItem(pool, state.theta, used, { rand, block: openBlock });
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
