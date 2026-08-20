import type { Item, Response } from "./types.ts";

/**
 * 3PL item response function.
 * P(correct | theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 *
 * The lower asymptote c matters here: with 4-5 option multiple choice, a
 * 2PL model attributes chance-level performance to genuine low ability and
 * systematically over-estimates theta at the bottom of the range.
 */
export function pCorrect(item: Pick<Item, "a" | "b" | "c">, theta: number): number {
  const z = item.a * (theta - item.b);
  // Numerically stable logistic.
  const logistic = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  return item.c + (1 - item.c) * logistic;
}

/** Fisher information for a single item at theta (3PL). */
export function itemInformation(item: Pick<Item, "a" | "b" | "c">, theta: number): number {
  const p = pCorrect(item, theta);
  if (p <= item.c + 1e-12 || p >= 1 - 1e-12) return 0;
  // I(theta) = a^2 * ((p - c)^2 / (1 - c)^2) * ((1 - p) / p)
  const num = (p - item.c) ** 2 * (1 - p);
  const den = (1 - item.c) ** 2 * p;
  return item.a ** 2 * (num / den);
}

const QUAD_MIN = -4.5;
const QUAD_MAX = 4.5;
const QUAD_N = 181;

export interface QuadPoint {
  theta: number;
  prior: number;
}

/** Gauss-Hermite-style fixed grid with a standard normal prior. */
function quadrature(): QuadPoint[] {
  const pts: QuadPoint[] = [];
  const step = (QUAD_MAX - QUAD_MIN) / (QUAD_N - 1);
  for (let i = 0; i < QUAD_N; i++) {
    const theta = QUAD_MIN + i * step;
    const prior = Math.exp(-0.5 * theta * theta);
    pts.push({ theta, prior });
  }
  return pts;
}

const GRID = quadrature();

export interface AbilityEstimate {
  /** Expected a posteriori theta. */
  theta: number;
  /** Posterior standard deviation = standard error of measurement. */
  se: number;
  /** Number of scored responses contributing. */
  n: number;
}

/**
 * EAP (expected a posteriori) ability estimation.
 *
 * EAP rather than maximum likelihood because ML is undefined for all-correct
 * or all-incorrect response patterns -- which happen constantly in an adaptive
 * battery with short subtests. EAP stays finite and shrinks toward the prior
 * mean, which is the honest answer when evidence is thin.
 */
export function estimateAbility(items: Item[], responses: Response[]): AbilityEstimate {
  const byId = new Map(items.map((i) => [i.id, i]));
  const scored = responses.filter((r) => byId.has(r.itemId));

  if (scored.length === 0) {
    return { theta: 0, se: 1, n: 0 };
  }

  let sumW = 0;
  let sumWTheta = 0;
  let sumWTheta2 = 0;

  for (const q of GRID) {
    // Work in log space: products of many probabilities underflow fast.
    let logLik = 0;
    for (const r of scored) {
      const item = byId.get(r.itemId)!;
      const p = pCorrect(item, q.theta);
      const clamped = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
      logLik += r.correct ? Math.log(clamped) : Math.log(1 - clamped);
    }
    const w = q.prior * Math.exp(logLik);
    sumW += w;
    sumWTheta += w * q.theta;
    sumWTheta2 += w * q.theta * q.theta;
  }

  if (sumW <= 0 || !Number.isFinite(sumW)) {
    return { theta: 0, se: 1, n: scored.length };
  }

  const mean = sumWTheta / sumW;
  const variance = Math.max(sumWTheta2 / sumW - mean * mean, 1e-9);
  return { theta: mean, se: Math.sqrt(variance), n: scored.length };
}

/** Test information at theta, summed over administered items. */
export function testInformation(items: Item[], theta: number): number {
  return items.reduce((sum, i) => sum + itemInformation(i, theta), 0);
}

/**
 * Select the next item by maximum Fisher information at the current theta.
 * Ties break toward the item whose b is closest to theta, then by id for
 * determinism (important for reproducible sessions and tests).
 */
export function selectNextItem(pool: Item[], theta: number, usedIds: Set<string>): Item | null {
  let best: Item | null = null;
  let bestInfo = -Infinity;
  for (const item of pool) {
    if (usedIds.has(item.id)) continue;
    const info = itemInformation(item, theta);
    if (info > bestInfo + 1e-12) {
      best = item;
      bestInfo = info;
      continue;
    }
    if (best && Math.abs(info - bestInfo) <= 1e-12) {
      const dNew = Math.abs(item.b - theta);
      const dOld = Math.abs(best.b - theta);
      if (dNew < dOld || (dNew === dOld && item.id < best.id)) {
        best = item;
        bestInfo = info;
      }
    }
  }
  return best;
}
