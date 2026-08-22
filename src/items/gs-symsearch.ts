import type { Item, Subtest } from "../core/types.ts";

/**
 * Gs - Symbol Scan (ssr-001..048), narrow ability P (perceptual speed).
 *
 * 2026-08-22 REDESIGN (replaces the retired Yes/No Symbol Search bank):
 * the binary format was retired because a two-option decision is structurally
 * wrong for PSI:
 *   - a coin-flip response earns the c = 0.5 guessing asymptote by design;
 *     "answer everything" was approximately free, so the measure partly
 *     reflected gambling tolerance rather than scanning speed;
 *   - "is either target present?" never requires LOCATING anything - an
 *     examinee can answer from a fuzzy sense of the row without ever
 *     finding a glyph.
 *
 * The replacement is a locate-and-click speed block in the spirit of the
 * WAIS-IV paper task but with a motor-confirmed response: each trial shows
 * TWO target glyphs above ONE row of 5-8 nonsense glyphs; the examinee must
 * PRESS THE ROW CELL THAT MATCHES either target - or press the dedicated NO
 * SYMBOL control when neither target appears. The response names WHERE the
 * match is, so it cannot be produced without actually finding the glyph,
 * and with ~6 response options per trial blind clicking succeeds about one
 * time in seven while every error subtracts (guessPenalty contract below).
 *
 * ADMINISTRATION: budgetMin = 2. The section clock IS the block timer - two
 * minutes of continuous trials, exactly like a paper cancellation task.
 * Each trial additionally carries a per-trial cap (row length + 3 s) so a
 * stalled examinee converts the stall into scored timeouts instead of
 * eating the whole block on one trial; the cap is set generously above a
 * competent scan-and-click (~2-4 s) and binds only on disengagement. With
 * minItems = maxItems = 40 no adaptive stop rule can fire before the clock:
 * for a speed test the binding constraint must be TIME, not measurement
 * precision (a precision stop would censor exactly the fastest examinees).
 *
 * GUESS PENALTY (Subtest.guessPenalty = true): every trial carries c = 0 -
 * errors count fully against the estimate instead of being discounted to a
 * chance floor; wrong clicks flash and burn ~0.5 s before the next trial;
 * instructions state plainly that errors are subtracted and guessing is
 * always worse than answering NO SYMBOL only when sure. Expected value of
 * random clicking is negative by construction.
 *
 * Construction contract (machine-enforced in test/symsearch.test.ts):
 *  - rows hold 5-8 DISTINCT glyphs (a duplicate would create two valid
 *    click targets); target pairs are distinct;
 *  - hit trials embed EXACTLY ONE target EXACTLY once; the key is its row
 *    index; >=1 near-miss of the ABSENT target blocks shape-family-only
 *    scanning;
 *  - no-match trials contain neither target; the key is row.length (the NO
 *    sentinel); >=2 near-misses keep "nothing here" from being free;
 *  - near-miss = same shape family, different fill or rotation;
 *  - embedded targets split evenly across the two target slots, so
 *    scanning only the first listed target fails half the hit trials;
 *  - embedded index spreads across the row so position habits pay nothing;
 *  - every glyph parses against the Figure grammar "shape:1:fill:rot";
 *  - fairness: circles are rotation-invariant, so no circle confuser
 *    differs from its target ONLY by rotation (that would be the target);
 *  - keys are never hand-copied: the trial builder derives them from the
 *    payload and test/symsearch.test.ts re-derives them independently.
 *
 * Difficulty anchoring (content-tiered, NOT a monotone ladder):
 *   tier E  ssr-001..008  5-glyph rows, filler families disjoint from the
 *                         targets, near-misses maximally salient
 *                         (none-vs-solid)                 b -2.0 .. -1.1
 *   tier M  ssr-009..024  6-glyph rows, then 7-glyph rows; salience drops
 *                         (half/hatch fills, rot twins on visible shapes)
 *                                                              b -0.95 .. +0.4
 *   tier H  ssr-025..048  8-glyph rows, dense confusable families, rot/
 *                         fill twins ADJACENT to the embedded target
 *                                                              b +0.45 .. +1.2
 * a spans 1.1-1.5 and is hand-decoupled from b (high-a at easy b, low-a at
 * hard b) so discrimination cannot re-lockstep onto difficulty; the test
 * suite guards |corr(a, b)| < 0.90.
 */

const PROMPT = "Press the symbol that matches a target - or press NO SYMBOL if there is no match.";

/** Derives the key from the payload: row index of the embedded target, or
 *  row.length when neither target occurs (the NO-symbol sentinel). */
function trial(
  id: string,
  a: number,
  b: number,
  targets: [string, string],
  row: string[],
  untimed = false,
): Item {
  const idx = row.findIndex((g) => g === targets[0] || g === targets[1]);
  return {
    id,
    subtest: "symbolSearch",
    broad: "Gs",
    narrow: "P",
    a,
    b,
    c: 0, // guess-penalty contract: errors are evidence, not noise
    prompt: PROMPT,
    answer: idx === -1 ? row.length : idx,
    // Per-trial cap scales with scan load; generous over a competent pace.
    timeLimitSec: untimed ? undefined : row.length + 3,
    render: { kind: "symscan", targets, row },
  };
}

export const symbolSearch: Subtest = {
  id: "symbolSearch",
  name: "Symbol Scan",
  broad: "Gs",
  narrow: ["P"],
  guessPenalty: true,
  instructions:
    "Two target symbols sit above every row. Scan the row beneath them and PRESS the symbol that matches one of the targets - or press NO SYMBOL when neither target appears. The block runs on a strict two-minute clock and each trial expires within seconds. Wrong presses are penalised: every error is subtracted from your tally and burns time you cannot recover, so never guess - press NO SYMBOL only when you are sure that neither target is there.",
  budgetMin: 2,
  routing: { maxItems: 40, minItems: 40, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0 },
  // Unscored samples demonstrate both responses untimed: locating and
  // pressing the matching cell, then using the NO-symbol control. The
  // decision and its key are understood before the clock starts.
  practice: [
    trial("prac-ssr-01", 1.1, -3, ["cir:1:none:0", "sq:1:solid:0"], [
      "hex:1:none:0", "sq:1:solid:0", "cir:1:hatch:0", "star:1:none:0",
    ], true),
    trial("prac-ssr-02", 1.1, -3, ["tri:1:solid:0", "cir:1:hatch:0"], [
      "sq:1:none:0", "tri:1:none:0", "cir:1:none:0", "hex:1:half:0",
    ], true),
  ],
  items: [
    // ---- Tier E: 5-glyph rows, salient fill near-misses --------------------
    trial("ssr-001", 1.10, -2.0, ["cir:1:none:0", "tri:1:solid:0"], [
      "sq:1:half:0", "tri:1:solid:0", "hex:1:none:0", "cir:1:solid:0", "star:1:none:0",
    ]),
    trial("ssr-002", 1.45, -1.9, ["tri:1:none:0", "sq:1:solid:0"], [
      "cir:1:none:0", "hex:1:half:0", "star:1:solid:0", "tri:1:solid:0", "sq:1:none:0",
    ]),
    trial("ssr-003", 1.15, -1.75, ["sq:1:solid:0", "star:1:none:0"], [
      "dia:1:half:0", "cross:1:solid:0", "sq:1:solid:0", "hex:1:hatch:0", "star:1:hatch:0",
    ]),
    trial("ssr-004", 1.10, -1.6, ["cir:1:hatch:0", "star:1:solid:0"], [
      "tri:1:none:0", "cir:1:none:0", "hex:1:solid:0", "star:1:half:0", "dia:1:solid:45",
    ]),
    trial("ssr-005", 1.20, -1.45, ["hex:1:solid:0", "arw:1:none:45"], [
      "hex:1:solid:0", "cir:1:none:0", "tri:1:hatch:0", "sq:1:none:0", "arw:1:solid:45",
    ]),
    trial("ssr-006", 1.35, -1.3, ["arw:1:solid:0", "hex:1:none:0"], [
      "sq:1:solid:0", "cross:1:none:0", "arw:1:none:0", "hex:1:solid:0", "cir:1:half:0",
    ]),
    trial("ssr-007", 1.20, -1.2, ["dia:1:hatch:0", "cross:1:none:0"], [
      "tri:1:solid:0", "cross:1:none:0", "hex:1:solid:0", "sq:1:half:0", "dia:1:none:0",
    ]),
    trial("ssr-008", 1.50, -1.1, ["cross:1:solid:0", "dia:1:none:0"], [
      "tri:1:hatch:0", "star:1:none:0", "cross:1:none:0", "dia:1:solid:0", "hex:1:half:0",
    ]),
    // ---- Tier M: 6-glyph rows ----------------------------------------------
    trial("ssr-009", 1.20, -0.95, ["sq:1:none:0", "tri:1:half:0"], [
      "hex:1:solid:0", "sq:1:none:0", "cir:1:hatch:0", "arw:1:solid:45", "tri:1:solid:0", "star:1:none:0",
    ]),
    trial("ssr-010", 1.25, -0.85, ["hex:1:solid:0", "dia:1:none:0"], [
      "tri:1:half:0", "hex:1:hatch:0", "star:1:solid:0", "cir:1:none:0", "dia:1:half:0", "sq:1:solid:0",
    ]),
    trial("ssr-011", 1.20, -0.7, ["cir:1:solid:0", "star:1:hatch:0"], [
      "dia:1:none:0", "cross:1:solid:0", "star:1:hatch:0", "sq:1:none:45", "hex:1:half:0", "cir:1:hatch:0",
    ]),
    trial("ssr-012", 1.30, -0.55, ["arw:1:solid:45", "sq:1:half:0"], [
      "cross:1:none:0", "arw:1:solid:0", "hex:1:none:0", "tri:1:solid:45", "sq:1:hatch:0", "cir:1:solid:0",
    ]),
    trial("ssr-013", 1.25, -0.45, ["arw:1:half:0", "cross:1:hatch:0"], [
      "sq:1:solid:0", "tri:1:none:0", "arw:1:half:0", "hex:1:solid:45", "cir:1:none:0", "cross:1:hatch:45",
    ]),
    trial("ssr-014", 1.30, -0.3, ["cir:1:none:0", "star:1:hatch:0"], [
      "sq:1:solid:0", "cir:1:half:0", "tri:1:none:45", "hex:1:solid:0", "star:1:hatch:45", "cross:1:none:0", "dia:1:solid:0",
    ]),
    // ---- Tier M: 7-glyph rows ----------------------------------------------
    trial("ssr-015", 1.25, -0.2, ["sq:1:hatch:45", "hex:1:half:0"], [
      "tri:1:solid:0", "cir:1:none:0", "star:1:solid:0", "hex:1:half:0", "dia:1:hatch:0", "sq:1:solid:45", "cross:1:none:0",
    ]),
    trial("ssr-016", 1.35, -0.1, ["tri:1:half:45", "cross:1:solid:0"], [
      "hex:1:none:0", "sq:1:solid:45", "cir:1:hatch:0", "star:1:none:0", "tri:1:half:0", "cross:1:solid:45", "arw:1:none:0",
    ]),
    trial("ssr-017", 1.30, 0.0, ["dia:1:solid:0", "arw:1:none:0"], [
      "arw:1:none:45", "sq:1:half:0", "cross:1:solid:0", "hex:1:none:0", "dia:1:solid:0", "tri:1:hatch:0", "star:1:none:0",
    ]),
    trial("ssr-018", 1.40, 0.05, ["sq:1:none:45", "dia:1:hatch:45"], [
      "tri:1:solid:0", "sq:1:none:0", "hex:1:half:0", "cir:1:solid:0", "dia:1:hatch:0", "star:1:solid:45", "cross:1:none:0",
    ]),
    trial("ssr-019", 1.35, 0.1, ["tri:1:none:0", "star:1:solid:45"], [
      "cir:1:half:0", "hex:1:none:0", "cross:1:hatch:0", "star:1:solid:45", "tri:1:solid:0", "dia:1:none:45", "sq:1:solid:0",
    ]),
    trial("ssr-020", 1.35, 0.2, ["cross:1:none:45", "cir:1:hatch:0"], [
      "tri:1:solid:0", "sq:1:none:0", "cir:1:solid:0", "hex:1:solid:0", "star:1:none:0", "cross:1:none:0", "arw:1:half:45",
    ]),
    trial("ssr-021", 1.40, 0.25, ["hex:1:none:45", "sq:1:half:0"], [
      "star:1:solid:0", "hex:1:none:0", "cir:1:hatch:0", "tri:1:half:0", "sq:1:half:0", "dia:1:none:45", "cross:1:solid:0",
    ]),
    trial("ssr-022", 1.36, 0.3, ["star:1:none:0", "sq:1:hatch:45"], [
      "hex:1:half:0", "cir:1:solid:45", "star:1:none:45", "tri:1:half:0", "sq:1:hatch:0", "dia:1:solid:45", "cross:1:none:0",
    ]),
    trial("ssr-023", 1.28, 0.35, ["dia:1:none:0", "cross:1:half:45"], [
      "star:1:solid:0", "cross:1:half:0", "cir:1:hatch:0", "dia:1:none:45", "hex:1:solid:0", "cross:1:half:45", "tri:1:none:45",
    ]),
    trial("ssr-024", 1.34, 0.4, ["hex:1:solid:45", "cir:1:none:0"], [
      "sq:1:none:0", "tri:1:half:45", "hex:1:solid:0", "star:1:hatch:0", "cir:1:solid:0", "dia:1:none:45", "arw:1:half:0",
    ]),
    // ---- Tier H: dense 8-glyph families, twins adjacent ---------------------
    trial("ssr-025", 1.10, 0.45, ["arw:1:solid:0", "tri:1:none:0"], [
      "hex:1:half:0", "arw:1:none:45", "sq:1:solid:0", "cir:1:hatch:0", "arw:1:solid:0", "star:1:none:45", "cross:1:half:0", "tri:1:solid:0",
    ]),
    trial("ssr-026", 1.35, 0.55, ["tri:1:solid:45", "hex:1:none:0"], [
      "sq:1:half:0", "tri:1:solid:0", "cir:1:hatch:0", "star:1:none:45", "hex:1:none:45", "cross:1:solid:0", "tri:1:hatch:45", "arw:1:half:0",
    ]),
    trial("ssr-027", 1.45, 0.65, ["sq:1:none:45", "star:1:hatch:0"], [
      "tri:1:solid:45", "cir:1:half:0", "star:1:hatch:45", "hex:1:none:0", "star:1:hatch:0", "sq:1:none:0", "star:1:solid:0", "dia:1:hatch:0",
    ]),
    trial("ssr-028", 1.18, 0.75, ["cir:1:half:0", "star:1:solid:0"], [
      "star:1:hatch:0", "cir:1:solid:0", "hex:1:solid:45", "sq:1:none:0", "star:1:solid:45", "dia:1:hatch:0", "cross:1:none:45", "arw:1:solid:0",
    ]),
    trial("ssr-029", 1.45, 0.85, ["cross:1:hatch:0", "dia:1:solid:45"], [
      "sq:1:half:0", "cross:1:hatch:45", "hex:1:solid:0", "cir:1:none:0", "dia:1:solid:0", "dia:1:solid:45", "arw:1:solid:45", "star:1:half:0",
    ]),
    trial("ssr-030", 1.40, 0.9, ["arw:1:half:45", "sq:1:solid:0"], [
      "tri:1:hatch:0", "sq:1:solid:45", "cir:1:none:0", "arw:1:half:0", "hex:1:half:0", "sq:1:hatch:0", "cross:1:solid:45", "dia:1:none:45",
    ]),
    trial("ssr-031", 1.12, 0.95, ["hex:1:half:45", "arw:1:none:0"], [
      "tri:1:solid:0", "sq:1:none:0", "star:1:solid:45", "hex:1:half:0", "hex:1:half:45", "cir:1:hatch:0", "cross:1:none:45", "arw:1:none:45",
    ]),
    trial("ssr-032", 1.45, 1.0, ["dia:1:none:45", "cross:1:half:0"], [
      "tri:1:solid:0", "dia:1:none:0", "hex:1:solid:45", "sq:1:half:45", "cir:1:solid:0", "star:1:hatch:45", "dia:1:solid:45", "cross:1:half:45",
    ]),
    trial("ssr-033", 1.50, 1.05, ["sq:1:half:45", "cross:1:none:0"], [
      "tri:1:solid:45", "cir:1:none:0", "cross:1:none:45", "cross:1:none:0", "sq:1:half:0", "star:1:hatch:0", "sq:1:solid:45", "arw:1:none:45",
    ]),
    trial("ssr-034", 1.40, 1.1, ["hex:1:hatch:45", "tri:1:half:0"], [
      "hex:1:hatch:0", "sq:1:solid:45", "tri:1:half:45", "cir:1:none:0", "hex:1:solid:45", "star:1:solid:0", "cross:1:none:45", "dia:1:half:0",
    ]),
    trial("ssr-035", 1.48, 1.15, ["star:1:solid:0", "dia:1:none:0"], [
      "star:1:hatch:45", "hex:1:half:0", "star:1:solid:45", "star:1:solid:0", "cir:1:hatch:0", "dia:1:none:45", "cross:1:half:0", "dia:1:solid:45",
    ]),
    trial("ssr-036", 1.38, 1.2, ["cross:1:solid:45", "arw:1:half:0"], [
      "cross:1:solid:0", "sq:1:half:45", "arw:1:half:45", "cir:1:hatch:0", "cross:1:hatch:45", "hex:1:none:0", "star:1:solid:45", "arw:1:solid:45",
    ]),
    // ---- Upper-mid fill: routing coverage between tiers M and H -------------
    trial("ssr-037", 1.30, 0.4, ["cir:1:solid:0", "hex:1:half:45"], [
      "star:1:none:0", "cir:1:solid:0", "tri:1:hatch:45", "hex:1:half:0", "sq:1:solid:45", "dia:1:none:45", "cross:1:half:0",
    ]),
    trial("ssr-038", 1.32, 0.5, ["star:1:half:0", "sq:1:none:45"], [
      "tri:1:solid:0", "star:1:half:45", "cir:1:solid:0", "sq:1:none:0", "hex:1:hatch:0", "star:1:none:45", "dia:1:solid:0",
    ]),
    trial("ssr-039", 1.44, 0.55, ["arw:1:none:45", "dia:1:half:0"], [
      "hex:1:solid:0", "arw:1:none:0", "cir:1:half:0", "dia:1:half:45", "star:1:hatch:0", "arw:1:none:45", "tri:1:solid:45", "cross:1:none:0",
    ]),
    trial("ssr-040", 1.22, 0.6, ["cross:1:solid:0", "star:1:none:45"], [
      "sq:1:hatch:0", "hex:1:none:45", "cross:1:solid:45", "cir:1:solid:0", "star:1:none:0", "cross:1:solid:0", "dia:1:half:45", "tri:1:none:0",
    ]),
    trial("ssr-041", 1.36, 0.65, ["dia:1:solid:0", "hex:1:none:45"], [
      "sq:1:half:0", "dia:1:solid:45", "cir:1:none:0", "hex:1:none:0", "star:1:hatch:45", "tri:1:half:0", "cross:1:solid:45",
    ]),
    trial("ssr-042", 1.46, 0.7, ["tri:1:hatch:45", "sq:1:solid:0"], [
      "dia:1:none:0", "tri:1:hatch:0", "hex:1:half:0", "sq:1:solid:0", "cir:1:hatch:45", "star:1:solid:45", "arw:1:none:0",
    ]),
    trial("ssr-043", 1.16, 0.75, ["cir:1:hatch:0", "hex:1:solid:0"], [
      "tri:1:solid:45", "cir:1:solid:0", "star:1:none:0", "cir:1:hatch:0", "dia:1:half:0", "hex:1:solid:45", "sq:1:none:45", "cross:1:half:0",
    ]),
    trial("ssr-044", 1.34, 0.8, ["sq:1:half:45", "star:1:hatch:0"], [
      "tri:1:none:45", "sq:1:half:0", "hex:1:solid:0", "cir:1:hatch:0", "star:1:hatch:45", "dia:1:solid:0", "sq:1:hatch:45", "cross:1:none:0",
    ]),
    trial("ssr-045", 1.42, 0.85, ["hex:1:none:0", "dia:1:half:45"], [
      "cir:1:solid:0", "hex:1:none:45", "star:1:half:0", "hex:1:none:0", "tri:1:hatch:0", "dia:1:half:0", "cross:1:solid:45",
    ]),
    trial("ssr-046", 1.26, 0.9, ["cross:1:half:0", "star:1:solid:45"], [
      "hex:1:hatch:0", "star:1:solid:0", "sq:1:none:0", "cir:1:half:45", "star:1:solid:45", "tri:1:none:45", "cross:1:half:45", "dia:1:solid:0",
    ]),
    trial("ssr-047", 1.44, 0.95, ["dia:1:hatch:45", "tri:1:solid:0"], [
      "sq:1:half:0", "dia:1:hatch:0", "cir:1:none:45", "hex:1:half:45", "dia:1:hatch:45", "star:1:none:0", "tri:1:solid:45", "cross:1:solid:45",
    ]),
    trial("ssr-048", 1.30, 1.2, ["arw:1:solid:45", "hex:1:half:0"], [
      "arw:1:solid:0", "tri:1:hatch:45", "cir:1:solid:0", "hex:1:half:45", "star:1:none:0", "arw:1:none:45", "dia:1:half:45", "cross:1:half:45",
    ]),
  ],
};
