/** Standardized visual working-memory presentation intervals. */
export const SPAN_READY_MS = 1500;
export const SPAN_SYMBOL_MS = 1100;
export const SPAN_GAP_MS = 300;

export type SpanFrame =
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
