import { normalCdf } from "./scoring.ts";

/**
 * Empirical norm tables — the mechanism that upgrades scores from
 * "internally consistent under an assumed N(0,1) theta prior" to
 * "referenced against an actual collected sample".
 *
 * Until a norming study runs, every percentile this battery reports comes from
 * normalCdf(theta), which is only correct if item parameters were calibrated on
 * a representative sample. They were authored. Once real response data exists,
 * tools/norming.ts distills validity-screened sessions into a NormTable: the
 * sorted composite thetas of the reference sample. Percentiles then come from
 * the sample's own empirical CDF, and IQ-equivalents from the inverse normal of
 * that percentile — so "IQ 130" means "scored like the top 2.3% OF THE SAMPLE",
 * not "theta 2.0 under an untested assumption".
 *
 * Provenance contract: a NormTable is bound to one bankVersion. A table built
 * on a different bank does not describe the running battery and must be
 * rejected (validateNorms), exactly like stale localStorage saves.
 */

export interface NormTable {
  format: "iqtesting-norms";
  version: 1;
  /** Bank content hash the sample was collected under (see telemetry.bankVersion). */
  bankVersion: string;
  /** Validity-screened sessions contributing to the table. */
  sampleN: number;
  /** Sessions excluded by validity screening (reported, not silently dropped). */
  excludedInvalid: number;
  collectedFrom: number | null;
  collectedTo: number | null;
  /** Sorted ascending composite thetas of the screened reference sample. */
  thetaSample: number[];
}

/** Smallest sample worth referencing; below this the empirical CDF is noise. */
export const MIN_NORM_SAMPLE = 100;

/**
 * Percentile rank of x within a sorted sample: (below + half-tied) / N.
 * This midrank convention assigns the sample median exactly P50.
 */
export function empiricalPercentile(sorted: number[], x: number): number | null {
  const n = sorted.length;
  if (n === 0) return null;
  let below = 0;
  let tied = 0;
  for (const v of sorted) {
    if (v < x) below++;
    else if (v === x) tied++;
    else break;
  }
  return ((below + 0.5 * tied) / n) * 100;
}

/** Inverse standard normal CDF by bisection on normalCdf (monotone, exact enough). */
export function probit(p: number): number {
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface NormedBand {
  /** Linear-map standard score (unchanged by norms — see caveat string). */
  score: number;
  ci95: [number, number];
  /** Percentile against the reference SAMPLE (not the normal model). */
  percentile: number;
  /**
   * Sample-referenced IQ equivalent: 100 + 15·probit(percentile). This is the
   * number that becomes meaningful once norms exist; before that it reduces to
   * the linear map within rounding.
   */
  normedScore: number;
}

/**
 * Score band with sample-referenced percentile and IQ equivalent.
 * Returns null when the table cannot back the claim (wrong bank, tiny sample).
 * Pass `currentBankVersion` to enforce provenance; scale defaults are IQ 100/15.
 */
export function normedBand(
  theta: number,
  se: number,
  norms: NormTable,
  currentBankVersion?: string,
  scaleMean = 100,
  scaleSd = 15,
): NormedBand | null {
  if (!validateNorms(norms, currentBankVersion)) return null;
  const pct = empiricalPercentile(norms.thetaSample, theta);
  if (pct === null) return null;
  // CI endpoints referenced through the same empirical map, keeping the band
  // honest about sample skew rather than assuming symmetric normal tails.
  const loPct = empiricalPercentile(norms.thetaSample, theta - 1.96 * se) ?? pct;
  const hiPct = empiricalPercentile(norms.thetaSample, theta + 1.96 * se) ?? pct;
  const toScore = (p: number) => Math.round(scaleMean + scaleSd * probit(p / 100));
  return {
    score: Math.round(scaleMean + scaleSd * theta),
    ci95: [toScore(loPct), toScore(hiPct)],
    percentile: Number(pct.toFixed(1)),
    normedScore: toScore(pct),
  };
}

/**
 * Structural + provenance validation. A table that fails this must never back
 * a reported score: wrong bank version, unsorted sample, or N below floor.
 */
export function validateNorms(
  norms: unknown,
  currentBankVersion?: string,
): norms is NormTable {
  const t = norms as NormTable | null;
  if (!t || typeof t !== "object") return false;
  if (t.format !== "iqtesting-norms" || t.version !== 1) return false;
  if (typeof t.bankVersion !== "string" || t.bankVersion.length === 0) return false;
  if (currentBankVersion !== undefined && t.bankVersion !== currentBankVersion) return false;
  if (!Array.isArray(t.thetaSample) || t.thetaSample.length !== t.sampleN) return false;
  if (t.sampleN < MIN_NORM_SAMPLE) return false;
  for (let i = 1; i < t.thetaSample.length; i++) {
    if (!(t.thetaSample[i]! >= t.thetaSample[i - 1]!)) return false;
  }
  return true;
}
