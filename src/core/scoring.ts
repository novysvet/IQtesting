import type { BroadAbility, Response, Subtest } from "./types.ts";
import { estimateAbility, REPORT_PRIOR_SD } from "./irt.ts";

/**
 * SCALE CAVEAT (read before interpreting any number this module returns):
 *
 * theta -> standard-score conversion assumes theta is N(0,1) in the general
 * population. That assumption holds only if item parameters were calibrated
 * on a representative sample. They were NOT -- they are authored estimates.
 * So these standard scores are internally consistent and correctly ordered,
 * but their absolute level is unvalidated. Report them as provisional.
 *
 * FLOOR SEMANTICS: subtest scores are estimated with the wide reporting
 * prior (REPORT_PRIOR_SD) so that chance-level performance follows the
 * likelihood down instead of shrinking toward the population mean. A pure
 * random responder therefore reports near IQ 50 -- the scale floor -- not
 * the mid-70s the old unit-prior estimator produced. Routing still uses the
 * unit prior internally (irt.ts); only reported numbers use the wide one.
 */

const SCALE_MEAN = 100;
const SCALE_SD = 15;

export function thetaToStandard(theta: number): number {
  return SCALE_MEAN + SCALE_SD * theta;
}

/** SE on the theta scale -> SE on the standard-score scale. */
function seToStandard(se: number): number {
  return SCALE_SD * se;
}

interface ScoreBand {
  score: number;
  se: number;
  /** 95% confidence interval, rounded to whole score points. */
  ci95: [number, number];
  /** Percentile rank under the normal model, 0.1-99.9 clamped. */
  percentile: number;
}

export function band(theta: number, se: number): ScoreBand {
  const score = thetaToStandard(theta);
  const seStd = seToStandard(se);
  const lo = score - 1.96 * seStd;
  const hi = score + 1.96 * seStd;
  return {
    score: Math.round(score),
    se: Number(seStd.toFixed(2)),
    ci95: [Math.round(lo), Math.round(hi)],
    percentile: Number(clampPct(normalCdf(theta) * 100).toFixed(1)),
  };
}

function clampPct(p: number): number {
  return Math.min(Math.max(p, 0.1), 99.9);
}

/** Abramowitz & Stegun 7.1.26 error function approximation. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

interface SubtestScore {
  subtestId: string;
  name: string;
  broad: BroadAbility;
  itemsAdministered: number;
  raw: number;
  theta: number;
  se: number;
  band: ScoreBand;
}

function scoreSubtest(subtest: Subtest, responses: Response[]): SubtestScore {
  const ids = new Set(subtest.items.map((i) => i.id));
  const mine = responses.filter((r) => ids.has(r.itemId));
  // Wide reporting prior: see the floor-semantics note in the SCALE CAVEAT.
  const est = estimateAbility(subtest.items, mine, { priorSd: REPORT_PRIOR_SD });
  return {
    subtestId: subtest.id,
    name: subtest.name,
    broad: subtest.broad,
    itemsAdministered: mine.length,
    raw: mine.filter((r) => r.correct).length,
    theta: est.theta,
    se: est.se,
    band: band(est.theta, est.se),
  };
}

interface BroadScore {
  broad: BroadAbility;
  subtests: string[];
  theta: number;
  se: number;
  band: ScoreBand;
}

/**
 * Combine subtest thetas within a broad factor by inverse-variance weighting.
 * A subtest measured with SE 0.30 carries ~4x the weight of one at SE 0.60,
 * which is what you want when adaptive stopping leaves subtests at unequal
 * precision. Simple averaging would let the noisiest subtest drag the factor.
 *
 * The pooled SE is floored at the best single-component SE: subtest errors
 * are positively correlated through the common factor, so pooling can never
 * legitimately beat the most precise component. The un-floored formula would
 * shrink toward a falsely narrow confidence interval as components are added.
 */
export function combineInverseVariance(
  parts: { theta: number; se: number }[],
): { theta: number; se: number } {
  const usable = parts.filter((p) => Number.isFinite(p.se) && p.se > 1e-6);
  if (usable.length === 0) return { theta: 0, se: 1 };
  let sumW = 0;
  let sumWTheta = 0;
  for (const p of usable) {
    const w = 1 / (p.se * p.se);
    sumW += w;
    sumWTheta += w * p.theta;
  }
  const independenceSe = Math.sqrt(1 / sumW);
  const floorSe = Math.min(...usable.map((p) => p.se));
  return { theta: sumWTheta / sumW, se: Math.max(independenceSe, floorSe) };
}

function scoreBroad(subtestScores: SubtestScore[]): BroadScore[] {
  const groups = new Map<BroadAbility, SubtestScore[]>();
  for (const s of subtestScores) {
    const list = groups.get(s.broad) ?? [];
    list.push(s);
    groups.set(s.broad, list);
  }
  const out: BroadScore[] = [];
  for (const [broad, list] of groups) {
    const combined = combineInverseVariance(list);
    out.push({
      broad,
      subtests: list.map((l) => l.subtestId),
      theta: combined.theta,
      se: combined.se,
      band: band(combined.theta, combined.se),
    });
  }
  return out;
}

interface CompositeScore {
  g: ScoreBand;
  theta: number;
  se: number;
  broad: BroadScore[];
  subtests: SubtestScore[];
}

/**
 * g-loading weights per broad factor.
 *
 * These follow the general pattern in the CHC factor-analytic literature --
 * Gf and Gc loading highest on g, Gv and Gwm moderate, Glr lowest. They are
 * approximate literature-informed weights, not values estimated from this
 * battery's own data. Exported so test/scoring.test.ts can pin the actual
 * map against independent literals (the composite silently re-scales every
 * reported g score if these drift).
 */
export const G_WEIGHTS: Record<BroadAbility, number> = {
  Gf: 1.0,
  Gc: 0.95,
  Gq: 0.9,
  Gwm: 0.75,
  Gv: 0.7,
  Gs: 0.7,
  Glr: 0.6,
};

export function scoreComposite(
  subtests: Subtest[],
  responses: Response[],
): CompositeScore {
  const subtestScores = subtests
    .map((s) => scoreSubtest(s, responses))
    .filter((s) => s.itemsAdministered > 0);
  const broad = scoreBroad(subtestScores);

  let sumW = 0;
  let sumWTheta = 0;
  let sumW2Var = 0;
  for (const b of broad) {
    const w = G_WEIGHTS[b.broad];
    sumW += w;
    sumWTheta += w * b.theta;
    sumW2Var += w * w * b.se * b.se;
  }
  const theta = sumW > 0 ? sumWTheta / sumW : 0;
  // Same correlated-error floor as the broad level: the composite cannot be
  // more precise than its best-measured factor.
  const independenceSe = sumW > 0 ? Math.sqrt(sumW2Var) / sumW : 1;
  const floorSe = broad.length > 0 ? Math.min(...broad.map((b) => b.se)) : 1;
  const se = Math.max(independenceSe, floorSe);

  return { g: band(theta, se), theta, se, broad, subtests: subtestScores };
}
