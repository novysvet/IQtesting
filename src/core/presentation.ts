/**
 * Per-session display permutation of multiple-choice options.
 *
 * WHY: option positions were previously fixed per item (a deterministic hash
 * baked into the banks), so the key sat at the same displayed position for
 * every examinee — position biases and answer-key cycles were shared across
 * the whole sample, and a participant comparing notes could exploit them.
 * A seeded per-session permutation breaks that correlation while keeping the
 * engine's scoring semantics untouched: selection is mapped back to the
 * ORIGINAL option index before grading, and `keyedPosition` records where the
 * key was DISPLAYED for post-hoc position-bias audit.
 *
 * Binary formats (Symbol Search's Yes/No) are never permuted: with two
 * options a permutation is content-free noise, and validity screening relies
 * on binary runs being uninformative.
 */

/** FNV-1a string hash -> 32-bit seed. */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic mulberry32 PRNG (same generator as the simulation tests). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle driven by `rng`; returns a fresh permutation array. */
export function seededPermutation(seedStr: string, n: number): number[] {
  const rng = seededRandom(hashSeed(seedStr));
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

/**
 * Display order for an item's options in this session.
 *
 * Returns null when the format must NOT be permuted: fewer than 3 options,
 * or a degenerate session id. The returned array maps DISPLAY slot ->
 * ORIGINAL index: `display[i]` is the original index shown at slot i.
 */
export function optionPermutation(
  sessionId: string,
  itemId: string,
  optionCount: number,
): number[] | null {
  if (!sessionId || !itemId || optionCount < 3) return null;
  return seededPermutation(sessionId + "\u0000" + itemId, optionCount);
}

/**
 * Where the keyed option was displayed (1-based), given the permutation.
 * Null when the format is unpermuted or the item is recall.
 */
export function keyedDisplayPosition(
  perm: number[] | null,
  answerIndex: number,
): number | null {
  if (!perm) return null;
  const slot = perm.indexOf(answerIndex);
  return slot === -1 ? null : slot + 1;
}
