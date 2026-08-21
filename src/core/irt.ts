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

/**
 * Quadrature span. The wide range matters for the REPORTING estimator: a
 * chance-level response pattern carries genuine likelihood mass down to
 * theta ~ -5 once the guessing asymptote is modelled, and truncating the
 * grid at -4.5 would silently re-inflate exactly the scores this battery
 * refuses to inflate. Routing never explores these depths (its prior keeps
 * estimates conservative), but reporting must be able to follow the
 * likelihood there.
 */
const QUAD_MIN = -7;
const QUAD_MAX = 7;
const QUAD_N = 225;

/** Fixed uniform grid over the theta range (prior applied at estimation time). */
function quadrature(): number[] {
  const pts: number[] = [];
  const step = (QUAD_MAX - QUAD_MIN) / (QUAD_N - 1);
  for (let i = 0; i < QUAD_N; i++) {
    pts.push(QUAD_MIN + i * step);
  }
  return pts;
}

const GRID = quadrature();

interface AbilityEstimate {
  /** Expected a posteriori theta. */
  theta: number;
  /** Posterior standard deviation = standard error of measurement. */
  se: number;
  /** Number of scored responses contributing. */
  n: number;
}

/**
 * Prior SD for the REPORTING estimator (see estimateAbility). Routing keeps
 * the population-scale N(0,1) prior because shrinkage there is stabilising.
 * For reporting, an N(0,1) prior is actively wrong at the bottom of the
 * scale: a chance-level examinee's likelihood supports theta ~ -3.5 and
 * below, but with the short adaptive runs a discontinue produces, the unit
 * prior outweighs that evidence and drags the estimate up to ~ -1.8 — which
 * reported IQ 72-75 for random responding. A wide prior lets the likelihood
 * speak where it has actually collected evidence, while leaving mid-range
 * estimates (where evidence is densest) essentially unchanged: the prior
 * stays centered at 0, so the population anchoring of the scale is intact.
 */
export const REPORT_PRIOR_SD = 2;

interface EstimateOptions {
  /** Prior standard deviation. Default 1 (population scale, routing-grade). */
  priorSd?: number;
}

/**
 * EAP (expected a posteriori) ability estimation.
 *
 * EAP rather than maximum likelihood because ML is undefined for all-correct
 * or all-incorrect response patterns -- which happen constantly in an adaptive
 * battery with short subtests. EAP stays finite and shrinks toward the prior
 * mean, which is the honest answer when evidence is thin.
 *
 * `priorSd` trades shrinkage against stability: 1 for routing (estimates must
 * stay sane from 3 responses), REPORT_PRIOR_SD for scoring (reported numbers
 * must follow the evidence to the floor of the scale instead of shrinking a
 * random responder up to IQ 75).
 */
export function estimateAbility(
  items: Item[],
  responses: Response[],
  options: EstimateOptions = {},
): AbilityEstimate {
  const byId = new Map(items.map((i) => [i.id, i]));
  // Omitted (never answered) and interrupted (tab-hidden during memory
  // presentation) responses are censoring, not ability evidence — they carry
  // no information about theta and would bias the estimate. They stay in the
  // response record for the calibration export.
  const scored = responses.filter(
    (r) => byId.has(r.itemId) && !r.omitted && !r.interrupted,
  );

  if (scored.length === 0) {
    return { theta: 0, se: options.priorSd ?? 1, n: 0 };
  }

  const priorSd = options.priorSd ?? 1;
  const logPriorNorm = -0.5 * Math.log(2 * Math.PI) - Math.log(priorSd);

  let sumW = 0;
  let sumWTheta = 0;
  let sumWTheta2 = 0;

  for (const theta of GRID) {
    // Work in log space: products of many probabilities underflow fast.
    let logLik = 0;
    for (const r of scored) {
      const item = byId.get(r.itemId)!;
      const p = pCorrect(item, theta);
      const clamped = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
      logLik += r.correct ? Math.log(clamped) : Math.log(1 - clamped);
    }
    // Normal(prior) in log space; the constant keeps weights comparable
    // across prior widths so downstream variance maths needs no rescaling.
    const w = Math.exp(logLik + logPriorNorm - 0.5 * (theta * theta) / (priorSd * priorSd));
    sumW += w;
    sumWTheta += w * theta;
    sumWTheta2 += w * theta * theta;
  }

  if (sumW <= 0 || !Number.isFinite(sumW)) {
    return { theta: 0, se: 1, n: scored.length };
  }

  const mean = sumWTheta / sumW;
  const variance = Math.max(sumWTheta2 / sumW - mean * mean, 1e-9);
  return { theta: mean, se: Math.sqrt(variance), n: scored.length };
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
