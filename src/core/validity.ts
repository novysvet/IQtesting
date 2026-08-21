import type { Item, Response, Subtest } from "./types.ts";
import { pCorrect, estimateAbility, REPORT_PRIOR_SD } from "./irt.ts";

/**
 * Response-validity screening — the pre-norming gate against contaminated
 * calibration data.
 *
 * WHY THIS EXISTS: an all-random examinee currently earns a clean provisional
 * composite near IQ 75. The EAP prior shrinks a chance-level run up from the
 * floor, and nothing downstream distinguishes "random clicking" from "genuinely
 * low ability". A norming sample that absorbs random responders has a deflated
 * mean and inflated tails; every percentile derived from it is wrong. So every
 * session is screened on three independent signatures of disengagement:
 *
 * 1. PERSON FIT (lz-style). Under the fitted model, expected correct for this
 *    session's own theta estimate is sum(pCorrect(item, theta)); the observed
 *    count minus that expectation, normalized by the binomial-style SD, is
 *    approximately standard normal for an engaged examinee whose responses fit
 *    the model. Random responding cannot fit: routing serves items near the
 *    (shrunk) theta where P(correct) ~ 0.5-0.6, but a guesser only ever scores
 *    at the guessing floor c. The z therefore goes strongly NEGATIVE — far more
 *    negative than any honest low-ability examinee, because low ability still
 *    beats the floor on items routed to it. Circularity (theta estimated from
 *    the same responses) is the point: EAP lands where the pattern IS
 *    consistent, so large misfit means the pattern is not an ability pattern.
 *
 * 2. RAPID RESPONDING. Power items (no per-item cap) answered faster than
 *    reading speed indicate answers submitted without engagement. Speeded
 *    subtests are excluded from the denominator: their short latencies are the
 *    format working as designed.
 *
 * 3. STRAIGHT-LINING. Key positions are de-cycled bank-wide, so a genuine
 *    examinee's chosen indices wander while a position-spammer produces long
 *    runs of one index and a dominant modal share.
 *
 * 4. DIFFICULTY GRADIENT (2026-08-21). Correctness must track item difficulty:
 *    every engaged examinee, at ANY ability level, passes easy items and fails
 *    hard ones, so the point-biserial correlation between item b and correctness
 *    is strongly negative. Random responding is difficulty-blind by definition —
 *    a guesser's success on an item is independent of its b — so their correlation
 *    sits near zero. This signal is THETA-FREE, which matters precisely because
 *    the other signals are not: once scoring reports chance-level performance
 *    honestly (near IQ 50), a guesser's response pattern LOOKS consistent with
 *    their own low estimate and the lz-style fit z weakens toward ambiguity.
 *    The gradient check closes that hole without touching ability estimation.
 *
 * All thresholds are fixed constants, deterministic, and unit-tested. The
 * verdict travels with the exported record so the norming pipeline can exclude
 * invalid sessions mechanically instead of by judgment call.
 */

/** Power-item latency below which a response cannot reflect real engagement. */
export const RAPID_POWER_MS = 2000;
/** Any-item latency below which even a guess requires inhuman speed. */
export const MOTOR_FLOOR_MS = 400;
/** Sessions with fewer scored responses are not screenable (or normable). */
export const MIN_SCREENABLE_RESPONSES = 20;
/** Minimum scored responses before the difficulty gradient is computed. */
export const GRADIENT_MIN_RESPONSES = 60;
/** Difficulty gradient needs both successes and failures to correlate. */
export const GRADIENT_MIN_CORRECT = 5;
export const GRADIENT_MIN_WRONG = 15;

/** Person-fit z at or below which the session is called invalid. */
export const INVALID_FIT_Z = -3.0;
/**
 * Person-fit z at or below which the session is flagged questionable.
 * Set at -2.5 rather than the conventional -2.0: at the scale floor the
 * AUTHORED b-prices amplify misfit for genuinely low examinees (an
 * all-basal-failure pattern reads as "worse than the floor items predict"
 * even when fully engaged), and |z| between 2 and 2.5 there is model noise,
 * not a disengagement signature. The difficulty-gradient rule carries the
 * guesser detection these thresholds protect.
 */
export const QUESTIONABLE_FIT_Z = -2.5;
/** Rapid fraction at/above which — combined with poor fit — is invalid. */
export const RAPID_INVALID_FRACTION = 0.5;
export const RAPID_QUESTIONABLE_FRACTION = 0.4;
/** Longest same-option run / modal share thresholds. */
export const STRAIGHT_RUN_INVALID = 10;
export const STRAIGHT_RUN_QUESTIONABLE = 7;
export const MODAL_SHARE_QUESTIONABLE = 0.5;
/**
 * Point-biserial r(item.b, correct) above which the session shows no usable
 * difficulty gradient. Engaged examinees land below -0.25 at every ability
 * level (the adaptive mix always spans enough difficulty); chance-level data
 * centers on 0 with SD ~ 1/sqrt(n) ≈ 0.07 at n = 200.
 */
export const FLAT_GRADIENT_QUESTIONABLE = -0.12;
/** Flat gradient + this much person-fit misfit together are invalid. */
export const FLAT_GRADIENT_INVALID_Z = -1.5;

export type ValidityVerdict = "valid" | "questionable" | "invalid" | "insufficient";

export interface ValidityReport {
  verdict: ValidityVerdict;
  /** Human-readable findings; empty when valid. */
  reasons: string[];
  nScored: number;
  /** lz-style person-fit z; null when no scorable item evidence. */
  personFitZ: number | null;
  observedCorrect: number | null;
  expectedCorrect: number | null;
  /** Share of eligible power-item responses under RAPID_POWER_MS. */
  rapidFraction: number | null;
  /** Longest consecutive run of one chosen option index (MC single-select). */
  longestSameOptionRun: number | null;
  /** Most-chosen option index share across MC single-select responses. */
  modalOptionShare: number | null;
  /**
   * Point-biserial correlation between item difficulty (b) and correctness
   * across scored responses; null when too few responses or no variance in
   * either term. Engaged sessions are strongly negative; chance-level data
   * sits near zero.
   */
  difficultyCorrelation: number | null;
  /** Share of all scored responses auto-submitted by timeout. */
  timeoutFraction: number;
}

/**
 * Screen a completed session's responses. Pure: no I/O, no randomness.
 *
 * Person fit is computed against each subtest's own reporting-grade ability
 * estimate (wide prior), so the session-level composite theta is not needed
 * here — and must not be used: pooling items across subtests against one
 * number biases lz at both tails.
 */
export function screenSession(
  subtests: Subtest[],
  responses: Response[],
): ValidityReport {
  const byId = new Map<string, Item>();
  for (const s of subtests) for (const i of s.items) byId.set(i.id, i);
  // Omitted (never answered) and interrupted (tab hidden during memory
  // exposure) responses are censoring, not behaviour: they carry neither
  // engagement nor ability signal, so screening judges only real answers.
  const scored = responses.filter(
    (r) => byId.has(r.itemId) && !r.omitted && !r.interrupted,
  );

  const report: ValidityReport = {
    verdict: "valid",
    reasons: [],
    nScored: scored.length,
    personFitZ: null,
    observedCorrect: null,
    expectedCorrect: null,
    rapidFraction: null,
    longestSameOptionRun: null,
    modalOptionShare: null,
    difficultyCorrelation: null,
    timeoutFraction: 0,
  };
  if (scored.length === 0) return { ...report, verdict: "insufficient", reasons: ["No scored responses."] };

  // --- Person fit (lz-style, computed PER SUBTEST) --------------------------
  // Each subtest's responses are evaluated against that subtest's own ability
  // estimate, then the misfit statistics pool. Evaluating every item against
  // the single composite theta biases z at BOTH tails: a high examinee's
  // per-subtest estimates straddle the pooled value, so the pooled expectation
  // overshoots what their pattern actually delivered and honest sessions read
  // as misfit. Per-subtest evaluation is the standard multi-scale form.
  let obs = 0;
  let exp = 0;
  let varSum = 0;
  {
    const groups = new Map<string, { pairs: { item: Item; resp: Response }[] }>();
    for (const r of scored) {
      const item = byId.get(r.itemId)!;
      const g = groups.get(item.subtest) ?? { pairs: [] };
      g.pairs.push({ item, resp: r });
      groups.set(item.subtest, g);
    }
    for (const g of groups.values()) {
      const items = g.pairs.map((p) => p.item);
      const resps = g.pairs.map((p) => p.resp);
      const est = estimateAbility(items, resps, { priorSd: REPORT_PRIOR_SD });
      for (const p of g.pairs) {
        const pr = Math.min(Math.max(pCorrect(p.item, est.theta), 1e-9), 1 - 1e-9);
        if (p.resp.correct) obs += 1;
        exp += pr;
        varSum += pr * (1 - pr);
      }
    }
  }
  report.observedCorrect = obs;
  report.expectedCorrect = Number(exp.toFixed(2));
  if (varSum > 1e-9) {
    report.personFitZ = Number(((obs - exp) / Math.sqrt(varSum)).toFixed(3));
  }

  // --- Rapid responding -----------------------------------------------------
  // Latency is adjusted for time the item was not actually visible (tab
  // away): away time would otherwise mask exactly the rapid-responding this
  // signal exists to catch.
  let rapidEligible = 0;
  let rapidCount = 0;
  let timeouts = 0;
  for (const r of scored) {
    if (r.timedOut) timeouts++;
    const item = byId.get(r.itemId)!;
    if (r.timedOut || item.timeLimitSec) continue;
    rapidEligible++;
    const activeLatency = Math.max(0, r.latencyMs - (r.awayMs ?? 0));
    if (activeLatency < RAPID_POWER_MS || r.latencyMs < MOTOR_FLOOR_MS) rapidCount++;
  }
  report.timeoutFraction = Number((timeouts / scored.length).toFixed(3));
  if (rapidEligible >= 5) {
    report.rapidFraction = Number((rapidCount / rapidEligible).toFixed(3));
  }

  // --- Straight-lining (MC single-select chosen indices) --------------------
  // Restricted to items with >= 3 options: on binary (Yes/No) formats,
  // position "concentration" is uninformative — even honest responding
  // produces long same-answer runs, and adaptive administration order
  // reorders keys so engaged examinees routinely streak 5+ identical
  // choices there. Disengagement on binary items is caught by the latency
  // and gradient signals instead.
  let bestRun = 0;
  let curRun = 0;
  let prev: number | null = null;
  let mcTotal = 0;
  const counts = new Map<number, number>();
  for (const r of scored) {
    const item = byId.get(r.itemId)!;
    const chosen = typeof r.rawAnswer === "number" ? r.rawAnswer : null;
    if (chosen === null || chosen < 0) continue; // recall strings, blanks, timeout sentinels
    if ((item.options?.length ?? 0) < 3 || item.multi !== undefined) continue;
    mcTotal++;
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    curRun = chosen === prev ? curRun + 1 : 1;
    prev = chosen;
    if (curRun > bestRun) bestRun = curRun;
  }
  if (mcTotal >= 5) {
    report.longestSameOptionRun = bestRun;
    report.modalOptionShare = Number((Math.max(...counts.values()) / mcTotal).toFixed(3));
  }

  // --- Difficulty gradient (point-biserial r between item b and correct) ----
  let nCorr = 0;
  let sumC = 0;
  let sumB = 0;
  let sumCB = 0;
  let sumB2 = 0;
  for (const r of scored) {
    const item = byId.get(r.itemId)!;
    const c = r.correct ? 1 : 0;
    nCorr++;
    sumC += c;
    sumB += item.b;
    sumCB += c * item.b;
    sumB2 += item.b * item.b;
  }
  const meanC = sumC / nCorr;
  const meanB = sumB / nCorr;
  const cov = sumCB / nCorr - meanC * meanB;
  const varB = sumB2 / nCorr - meanB * meanB;
  const varC = meanC * (1 - meanC);
  if (
    nCorr >= GRADIENT_MIN_RESPONSES &&
    sumC >= GRADIENT_MIN_CORRECT &&
    nCorr - sumC >= GRADIENT_MIN_WRONG &&
    varB > 1e-9 &&
    varC > 1e-9
  ) {
    report.difficultyCorrelation = Number((cov / Math.sqrt(varB * varC)).toFixed(3));
  }

  // --- Verdict --------------------------------------------------------------
  if (scored.length < MIN_SCREENABLE_RESPONSES) {
    report.verdict = "insufficient";
    report.reasons.push(`Only ${scored.length} scored responses (minimum ${MIN_SCREENABLE_RESPONSES}).`);
    return report;
  }
  const z = report.personFitZ;
  const rapid = report.rapidFraction;
  const run = report.longestSameOptionRun;
  const modal = report.modalOptionShare;
  const grad = report.difficultyCorrelation;

  if (z !== null && z <= INVALID_FIT_Z) {
    report.verdict = "invalid";
    report.reasons.push(`Person-fit z ${z} <= ${INVALID_FIT_Z}: performance far below what the routed items and the session's own ability estimate require — the signature of random responding.`);
  } else if (z !== null && rapid !== null && rapid >= RAPID_INVALID_FRACTION && z <= -1.5) {
    report.verdict = "invalid";
    report.reasons.push(`${Math.round(rapid * 100)}% of power items answered under ${RAPID_POWER_MS}ms combined with person-fit z ${z}.`);
  } else if (run !== null && run >= STRAIGHT_RUN_INVALID) {
    report.verdict = "invalid";
    report.reasons.push(`${run} consecutive selections of the same option position.`);
  } else if (grad !== null && grad > FLAT_GRADIENT_QUESTIONABLE && z !== null && z <= FLAT_GRADIENT_INVALID_Z) {
    report.verdict = "invalid";
    report.reasons.push(`No difficulty gradient in the responses (r(b, correct) = ${grad}) combined with person-fit z ${z}: correctness did not track item difficulty, the signature of guessing.`);
  } else if (z !== null && z <= QUESTIONABLE_FIT_Z) {
    report.verdict = "questionable";
    report.reasons.push(`Person-fit z ${z} <= ${QUESTIONABLE_FIT_Z}.`);
  } else if (grad !== null && grad > FLAT_GRADIENT_QUESTIONABLE) {
    report.verdict = "questionable";
    report.reasons.push(`No difficulty gradient in the responses (r(b, correct) = ${grad}).`);
  } else if (rapid !== null && rapid >= RAPID_QUESTIONABLE_FRACTION) {
    report.verdict = "questionable";
    report.reasons.push(`${Math.round(rapid * 100)}% of power items answered under ${RAPID_POWER_MS}ms.`);
  } else if ((run !== null && run >= STRAIGHT_RUN_QUESTIONABLE) || (modal !== null && modal >= MODAL_SHARE_QUESTIONABLE)) {
    report.verdict = "questionable";
    report.reasons.push(`Concentrated option-position use (run ${run}, modal share ${modal}).`);
  }
  return report;
}

/** One-line summary used by results UI and the norming pipeline log. */
export function validitySummary(report: ValidityReport): string {
  const bits: string[] = [`verdict ${report.verdict}`, `${report.nScored} responses`];
  if (report.personFitZ !== null) bits.push(`fit z ${report.personFitZ}`);
  if (report.rapidFraction !== null) bits.push(`rapid ${(report.rapidFraction * 100).toFixed(0)}%`);
  if (report.longestSameOptionRun !== null) bits.push(`run ${report.longestSameOptionRun}`);
  if (report.difficultyCorrelation !== null) bits.push(`gradient r ${report.difficultyCorrelation}`);
  return bits.join(" · ");
}
