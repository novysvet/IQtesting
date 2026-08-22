import type { Subtest } from "../core/types.ts";
import { areTwins } from "../components/glyphCatalog.ts";

/**
 * Gs - Symbol Selection (syq-001..020), narrow abilities P + R9
 * (perceptual-motor speed: visible symbol-key lookup = P-flavored scanning;
 * keyed choice reaction under a per-item cap = R9 reaction speed).
 *
 * REDESIGN NOTE (replaces the retired WAIS-style Character Pairing bank,
 * cpm-001..020): transcription coding was retired because typing a digit
 * string forces the examinee to HOLD unmapped digits in working memory
 * while transcribing - a Gwm load confounding the Gs construct. This format
 * is a pure choice-reaction task: a visible queue of nonsense glyphs, one
 * persistent glyph->home-row legend (A S D F H J K L), press the key of the
 * CURRENT glyph, advance instantly. Nothing is ever held in memory; the
 * only limits are visual lookup and motor execution.
 *
 * Format: ONE glyph->key legend shared by ALL items (like the printed key
 * on a coding sheet), shown above every item. Each item is ONE queue of
 * 4-8 glyphs. The answer is the exact sequence of pressed keys; wrong
 * presses are recorded in the raw answer and break the match, so c = 0.
 *
 * Legend: all eight catalog glyphs, twins assigned to opposite hands so
 * visual confusion never compounds with finger confusion:
 *
 *   A=g01  S=g02  D=g03  F=g04   (left hand)
 *   H=g05  J=g06  K=g07  L=g08   (right hand)
 *
 * Confusable twins: g01/g05, g02/g06, g03/g07 (see glyphCatalog.ts).
 *
 * Difficulty anchoring (content-anchored, NOT a uniform ladder):
 *
 *   b = clamp(-2.0 + 0.35*(len - 4) + 0.45*twinAdj + 0.20*twinPos,
 *             -2.0, +1.0)
 *
 * where len = queue length (4..8), twinAdj = adjacent positions forming a
 * confusable pair (twin discrimination under time pressure), twinPos =
 * positions whose twin appears anywhere else in the queue (set-membership
 * interference). Bank floor -2.0 (syq-001/002: clean queues, no twins),
 * ceiling +1.0 (syq-018..020: raw values 1.5..2.8 clamp at the ceiling -
 * the format saturates when every position is twinned and half the
 * transitions are twin transitions). a 1.1..1.4 - speeded items are
 * comparatively homogeneous. c = 0 (any wrong press breaks the exact key).
 *
 * Keys: answer = queue.map(g => keyFor(g)).join(""). The bank never
 * hand-copies an answer; test/symqueue.test.ts re-derives every key from
 * the render payload. Per-item caps price speed: timeLimitSec =
 * ceil(1.5*len) + 2.
 */

/** The single persistent legend, shown atop every item (home-row order). */
const LEGEND: [string, string][] = [
  ["g01", "A"],
  ["g02", "S"],
  ["g03", "D"],
  ["g04", "F"],
  ["g05", "H"],
  ["g06", "J"],
  ["g07", "K"],
  ["g08", "L"],
];

const KEY_FOR = new Map<string, string>(LEGEND);

function queueItem(
  id: string,
  a: number,
  b: number,
  queue: string[],
  untimed = false,
): {
  id: string; subtest: "symbolSelection"; broad: "Gs"; narrow: "R9";
  a: number; b: number; c: 0;
  prompt: string; answer: string; timeLimitSec: number | undefined;
  render: { kind: "symqueue"; legend: [string, string][]; queue: string[] };
} {
  return {
    id, subtest: "symbolSelection", broad: "Gs", narrow: "R9",
    a, b, c: 0,
    prompt: "Press the key matching the highlighted symbol.",
    answer: queue.map((g) => KEY_FOR.get(g)!).join(""),
    timeLimitSec: untimed ? undefined : Math.ceil(1.5 * queue.length) + 2,
    render: { kind: "symqueue", legend: LEGEND, queue },
  };
}

export const symbolSelection: Subtest = {
  id: "symbolSelection",
  name: "Symbol Selection",
  broad: "Gs",
  narrow: ["P", "R9"],
  instructions:
    "Eight symbols map to the eight home-row keys, shown in the legend above every item. Symbols appear in a queue; the current symbol is enlarged. Press its key to advance - a wrong press records an error and the queue waits for the right key. Complete each queue as fast as you can without errors.",
  budgetMin: 3,
  routing: { maxItems: 18, minItems: 8, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0 },
  // Unscored samples double as the tutorial: the first queue walks the
  // legend in home-row order (teaching the mapping by doing it), the second
  // is a short random queue. Both untimed.
  practice: [
    queueItem("prac-syq-01", 1.0, -3,
      ["g01", "g02", "g03", "g04", "g05", "g06", "g07", "g08"], true),
    queueItem("prac-syq-02", 1.0, -3,
      ["g04", "g08", "g02"], true),
  ],
  items: [
    queueItem("syq-001", 1.1, -2.0,
      ["g04", "g01", "g03", "g08"]),
    queueItem("syq-002", 1.1, -2.0,
      ["g08", "g03", "g04", "g02"]),
    queueItem("syq-003", 1.1, -1.6,
      ["g01", "g03", "g05", "g04"]),
    queueItem("syq-004", 1.15, -1.6,
      ["g02", "g08", "g06", "g04"]),
    queueItem("syq-005", 1.15, -1.15,
      ["g01", "g05", "g08", "g03"]),
    queueItem("syq-006", 1.1, -1.65,
      ["g04", "g03", "g08", "g01", "g02"]),
    queueItem("syq-007", 1.2, -1.25,
      ["g07", "g04", "g03", "g08", "g01"]),
    queueItem("syq-008", 1.2, -0.8,
      ["g06", "g02", "g04", "g08", "g05"]),
    queueItem("syq-009", 1.2, -1.3,
      ["g08", "g04", "g01", "g03", "g02", "g04"]),
    queueItem("syq-010", 1.25, -0.5,
      ["g01", "g08", "g05", "g02", "g03", "g06"]),
    queueItem("syq-011", 1.25, -0.45,
      ["g03", "g07", "g04", "g01", "g08", "g02"]),
    queueItem("syq-012", 1.3, -0.05,
      ["g05", "g04", "g01", "g06", "g02", "g08"]),
    queueItem("syq-013", 1.25, -0.95,
      ["g04", "g08", "g01", "g02", "g03", "g08", "g04"]),
    queueItem("syq-014", 1.3, -0.15,
      ["g02", "g03", "g06", "g04", "g01", "g07", "g08"]),
    queueItem("syq-015", 1.35, 0.75,
      ["g01", "g05", "g03", "g07", "g04", "g06", "g08"]),
    queueItem("syq-016", 1.3, -0.6,
      ["g04", "g08", "g01", "g03", "g02", "g08", "g04", "g03"]),
    queueItem("syq-017", 1.4, 0.6,
      ["g01", "g02", "g05", "g06", "g03", "g04", "g07", "g08"]),
    queueItem("syq-018", 1.4, 1.0,
      ["g01", "g05", "g04", "g03", "g08", "g07", "g02", "g06"]),
    queueItem("syq-019", 1.4, 1.0,
      ["g07", "g03", "g05", "g01", "g02", "g06", "g04", "g08"]),
    queueItem("syq-020", 1.4, 1.0,
      ["g01", "g05", "g07", "g03", "g06", "g02", "g05", "g01"]),
  ],
};

// Bank-construction guard: the difficulty formula above must describe the
// authored queues. Runs in dev/test imports; throws loudly on drift.
const _formulaB = (queue: string[]): number => {
  let adj = 0;
  let pos = 0;
  for (let i = 0; i < queue.length; i++) {
    if (i + 1 < queue.length && areTwins(queue[i]!, queue[i + 1]!)) adj++;
    if (queue.some((g, j) => j !== i && areTwins(queue[i]!, g))) pos++;
  }
  return Math.max(-2.0, Math.min(1.0, -2.0 + 0.35 * (queue.length - 4) + 0.45 * adj + 0.20 * pos));
};
for (const item of [...symbolSelection.items]) {
  const r = item.render;
  if (r?.kind !== "symqueue") throw new Error(item.id + " missing symqueue render");
  const expected = _formulaB(r.queue);
  if (Math.abs(expected - item.b) > 1e-9) {
    throw new Error(item.id + " b " + item.b + " drifts from the anchored formula (" + expected + ")");
  }
}
