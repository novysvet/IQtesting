/** Standardized visual working-memory presentation intervals. */
const SPAN_READY_MS = 1500;
const SPAN_SYMBOL_MS = 1100;
const SPAN_GAP_MS = 300;

/**
 * Paired-associates study exposure, pinned here (2026-08-22 literature pass;
 * previously a private constant in App.tsx). 1400 ms per pair with a 6-second
 * floor — enough to read and bind a concrete-noun pair once (CANTAB PAL and
 * KABC-II Atlantis expose each pair for roughly 2 s in their study phases; a
 * web format without examiner pacing errs slightly faster to hold attention).
 * Probe timing lives with the recall prompt; only the STUDY interval is
 * standardized because it is the exposure all binding claims rest on.
 */
export const PAIR_STUDY_MS = 1400;
export const PAIR_STUDY_FLOOR_MS = 6000;

export function pairsDurationMs(pairs: number): number {
  return Math.max(PAIR_STUDY_FLOOR_MS, pairs * PAIR_STUDY_MS);
}

type SpanFrame =
  | { kind: "ready" }
  | { kind: "symbol"; index: number }
  | { kind: "gap" }
  | { kind: "recall" };

export function spanFrame(elapsedMs: number, sequenceLength: number): SpanFrame {
  if (elapsedMs < SPAN_READY_MS) return { kind: "ready" };
  const cycle = SPAN_SYMBOL_MS + SPAN_GAP_MS;
  const within = elapsedMs - SPAN_READY_MS;
  const index = Math.floor(within / cycle);
  if (index >= sequenceLength) return { kind: "recall" };
  return within % cycle < SPAN_SYMBOL_MS ? { kind: "symbol", index } : { kind: "gap" };
}

export function spanDurationMs(sequenceLength: number): number {
  return SPAN_READY_MS + sequenceLength * (SPAN_SYMBOL_MS + SPAN_GAP_MS);
}
