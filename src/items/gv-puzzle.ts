import type { Subtest } from "../core/types.ts";

/**
 * Gv / Visualization - visual puzzles (translation-only assembly).
 *
 * Adaptation of the WAIS-IV Visual Puzzles task: each item shows a target
 * silhouette on a small grid plus six candidate pieces, exactly three of
 * which tile the silhouette exactly (pairwise disjoint, union = target).
 *
 * HONEST ADMINISTRATION NOTE: unlike the WAIS original, pieces here are
 * always presented in TARGET orientation and may only be TRANSLATED (slid)
 * into place - no rotation or reflection is ever required or permitted.
 * This is stated in the subtest instructions and in every item's rendering
 * (pieces are drawn in target orientation, never rotated/mirrored), and it
 * makes the task measurably easier than the WAIS IV original at the same
 * surface complexity; difficulty is re-anchored with that in mind.
 *
 * Difficulty levers, in rough order of weight: grid size (4x4 easy band vs
 * 5x6 / 6x5 hard band), piece fragmentation (2-3-cell pieces are easy to
 * place; 5-6-cell pieces must be mentally shuttled), silhouette cell count,
 * and distractor similarity (mirrored / one-cell-moved keyed shapes and
 * large tempting fragments on the hard items).
 *
 * Distractor design (machine-checked in test/vpuzzle.test.ts): every
 * distractor is 4-connected, never equals a keyed piece as a set, and never
 * completes any pair of keyed pieces. Because a distractor D only completes
 * the pair {Pi, Pj} when D = the third keyed piece exactly, distractors are
 * built as near-misses instead: mirrors of keyed shapes within their
 * bounding box, keyed shapes with one cell moved, or overlapping fragments.
 * Pure translations of keyed pieces are deliberately NOT used: the renderer
 * normalises each piece to its own bounding box, so a translated key would
 * render pixel-identical to the keyed option - an ambiguity, not a
 * distractor. Uniqueness is GEOMETRIC, not size-based: the test proves by
 * exhaustive translation enumeration that the keyed triple is the UNIQUE
 * tiling triple among all C(6,3) = 20 triples even when the three chosen
 * pieces may each be slid to ANY in-grid position. Cell-count sums prune
 * little (most items admit several size-compatible triples) and are NOT a
 * design crutch: every item, practice included, deliberately has at least
 * TWO triples whose sizes sum to N, so counting cells alone can never
 * decide an item - only spatial reasoning can. The tests also prove that
 * all six options of an item render pairwise distinctly.
 *
 * CALIBRATION STATUS: all item parameters (a, b) are AUTHORED ESTIMATES by
 * inspection, not fitted to response data from a real sample; c = 0.05 is
 * the rational guessing floor 1/C(6,3) for selecting exactly 3 of 6.
 */

const PROMPT = "Select the three pieces that assemble into the target silhouette.";
const PIECES = ["Piece A", "Piece B", "Piece C", "Piece D", "Piece E", "Piece F"];

export const visualPuzzles: Subtest = {
  id: "visualPuzzles",
  name: "Visual Puzzles",
  broad: "Gv",
  narrow: ["Vz"],
  instructions:
    "Each puzzle shows a target silhouette and six pieces. Choose exactly three pieces that fit together to rebuild the silhouette. The pieces are already shown in the orientation in which they are used: slide them into place without turning or flipping any piece.",
  budgetMin: 9,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 },
  // Unscored samples carrying the same machine-checked guarantees as the
  // scored bank (unique tiling under all in-grid translations, >= 2
  // size-feasible triples, six pairwise-distinct renderings) so practice
  // never teaches a wrong rule or a shortcut.
  practice: [
  {
    id: "prac-vpz-01", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.0, b: -2, c: 0.05, multi: 3,
    prompt: PROMPT, options: PIECES, answer: "0,2,4",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [4, 5, 6, 7, 8, 9, 10, 11],
      pieces: [[4, 5, 8], [0, 1, 5, 6], [6, 7, 11], [1, 5], [9, 10], [9, 12, 13, 14]] },
  },
  {
    // Second sample: solid 3x3 block keyed A/B/C sitting in place (top row
    // + 2x2 square + upright domino). Distractors (L-tromino, S-tetromino,
    // flat domino) each carry cells outside the block; the flat domino F
    // is the orientation trap for keyed C. Same guarantees as the scored
    // bank: >= 2 size-feasible triples (counting cells never decides it)
    // and A/B/C is the unique tiling under all in-grid translations.
    id: "prac-vpz-02", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.0, b: -2, c: 0.05, multi: 3,
    prompt: PROMPT, options: PIECES, answer: "0,1,2",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [1, 2, 3, 5, 6, 7, 9, 10, 11],
      pieces: [[1, 2, 3], [5, 6, 9, 10], [7, 11], [10, 11, 14], [8, 9, 13, 14], [12, 13]] },
  },
  ],
  items: [
  {
    id: "vpz-001", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.0, b: -1.5, c: 0.05, multi: 3,
    // 4x4 band, 8 cells. Keyed A/C/E: corner + corner + domino, all lying
    // in place (floor item). Distractors are a Z-tetromino, a T-tetromino
    // and an upright domino (the orientation trap for keyed E). Sizes do
    // NOT decide the item: {A,C,D}, {B,D,E} and {D,E,F} also sum to 8
    // cells; only sliding them mentally rules them out, and the exhaustive
    // translation check in test/vpuzzle.test.ts proves A/C/E is the
    // unique tiling.
    prompt: PROMPT, options: PIECES, answer: "0,2,4",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [4, 5, 6, 7, 8, 9, 10, 11],
      pieces: [[4, 5, 8], [0, 1, 5, 6], [6, 7, 11], [1, 5], [9, 10], [9, 12, 13, 14]] },
  },
  {
    id: "vpz-002", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.05, b: -1.2, c: 0.05, multi: 3,
    // 4x4, 9-cell solid 3x3 block. Keyed B/D/F: row + L-tetromino + domino.
    // Distractors are near-misses (a T-tetromino hanging off the block's
    // bottom edge, the keyed row grown past the block, a 3x2 block under
    // it); each carries cells outside the block. Sizes do NOT decide the
    // item: {A,B,F} also sums to 9 cells and is ruled out only by sliding
    // - the exhaustive translation check in test/vpuzzle.test.ts proves
    // B/D/F is the unique tiling.
    prompt: PROMPT, options: PIECES, answer: "1,3,5",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 2, 4, 5, 6, 8, 9, 10],
      pieces: [[10, 13, 14, 15], [0, 1, 2], [0, 1, 2, 3, 7], [4, 8, 9, 10], [8, 9, 10, 12, 13, 14], [5, 6]] },
  },
  {
    id: "vpz-003", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.1, b: -0.9, c: 0.05, multi: 3,
    // 4x4, 10-cell pi-shape. Keyed A/B/D: two mirror corners + centre square.
    prompt: PROMPT, options: PIECES, answer: "0,1,3",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 2, 3, 5, 6, 9, 10, 13, 14],
      pieces: [[0, 1, 5], [2, 3, 6], [8, 9, 13, 14], [9, 10, 13, 14], [7, 11, 15], [5, 9, 10, 13]] },
  },
  {
    id: "vpz-004", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.15, b: -0.6, c: 0.05, multi: 3,
    // 4x4, 9-cell descending staircase. Keyed C/E/F: line3 + v-domino + S.
    prompt: PROMPT, options: PIECES, answer: "2,4,5",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 2, 3, 5, 6, 7, 10, 11],
      pieces: [[1, 2, 4, 5], [8, 12, 13, 14], [0, 1, 2], [5, 6, 7, 10], [3, 7], [5, 6, 10, 11]] },
  },
  {
    id: "vpz-005", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.2, b: -0.3, c: 0.05, multi: 3,
    // 4x4, 10-cell C-shape. Keyed A/D/F: corners + base line4. Distractors
    // overlap the target heavily (S, T, v-line3 all sit inside the C).
    prompt: PROMPT, options: PIECES, answer: "0,3,5",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 2, 3, 4, 7, 8, 9, 10, 11],
      pieces: [[0, 1, 4], [4, 5, 9, 10], [2, 5, 6, 7], [2, 3, 7], [5, 9, 13], [8, 9, 10, 11]] },
  },
  {
    id: "vpz-006", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.25, b: 0, c: 0.05, multi: 3,
    // 4x4, 10-cell 2-wide diagonal band. Keyed B/C/E; distractor A is a
    // corner shifted off the band, D a J-tetromino below it.
    prompt: PROMPT, options: PIECES, answer: "1,2,4",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 4, 5, 6, 9, 10, 11, 14, 15],
      pieces: [[4, 8, 9], [0, 1, 4], [5, 6, 9, 10], [8, 12, 13, 14], [11, 14, 15], [3, 7, 11]] },
  },
  {
    id: "vpz-007", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 0.3, c: 0.05, multi: 3,
    // 4x4, 10 cells, keyed A/E/F. First 5-cell keyed piece (B/F shapes) on
    // the 4x4 band; distractor B is its mirror, D a T through its cells.
    prompt: PROMPT, options: PIECES, answer: "0,4,5",
    render: { kind: "vpuzzle", cols: 4, rows: 4, target: [0, 1, 2, 3, 4, 5, 8, 9, 12, 13],
      pieces: [[0, 1, 4], [4, 8, 9, 12, 13], [6, 10, 14], [5, 8, 9, 13], [2, 3], [5, 8, 9, 12, 13]] },
  },
  {
    id: "vpz-008", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.35, b: 0.6, c: 0.05, multi: 3,
    // First big grid: 5x6, 14-cell cross. Keyed B/D/E: two mirrored
    // bracket-pentominoes + centre square; distractor C = square + nub.
    prompt: PROMPT, options: PIECES, answer: "1,3,4",
    render: { kind: "vpuzzle", cols: 5, rows: 6, target: [2, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 27],
      pieces: [[2, 6, 7, 11, 12], [2, 7, 10, 11, 12], [9, 13, 14, 18, 23], [15, 16, 17, 22, 27], [13, 14, 18, 19], [0, 1, 2, 3, 4]] },
  },
  {
    id: "vpz-009", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.4, b: 0.9, c: 0.05, multi: 3,
    // 6x5, 14-cell U. Keyed C/D/F: two 6-cell L-shapes + base domino;
    // distractor A is the left leg with its foot one cell high (near-miss).
    prompt: PROMPT, options: PIECES, answer: "2,3,5",
    render: { kind: "vpuzzle", cols: 6, rows: 5, target: [0, 5, 6, 11, 12, 17, 18, 23, 24, 25, 26, 27, 28, 29],
      pieces: [[0, 6, 12, 18, 24, 19], [18, 24, 25, 26], [0, 6, 12, 18, 24, 25], [5, 11, 17, 23, 28, 29], [14, 15, 21, 22], [26, 27]] },
  },
  {
    id: "vpz-010", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.4, b: 1.2, c: 0.05, multi: 3,
    // 5x6, 15 cells: solid 3x5 rectangle partitioned into three
    // pentominoes (P / L / P-variant). All pieces 5 cells - fragmentation
    // is now the main load; distractors are one-cell edits of the keys.
    prompt: PROMPT, options: PIECES, answer: "0,1,5",
    render: { kind: "vpuzzle", cols: 5, rows: 6, target: [5, 6, 7, 10, 11, 12, 15, 16, 17, 20, 21, 22, 25, 26, 27],
      pieces: [[5, 6, 10, 11, 15], [7, 12, 16, 17, 22], [5, 6, 10, 11, 16], [7, 11, 12, 17, 22], [5, 10, 11, 16, 17], [20, 21, 25, 26, 27]] },
  },
  {
    id: "vpz-011", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.35, b: 1.5, c: 0.05, multi: 3,
    // 5x6, 16 cells: solid 4x4 square partitioned 6+5+5. Distractor A is
    // the keyed 2x3 block rotated 90 degrees (a shape that only fits if
    // you allow turning - the trap the instructions forbid).
    prompt: PROMPT, options: PIECES, answer: "2,3,4",
    render: { kind: "vpuzzle", cols: 5, rows: 6, target: [5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 22, 23],
      pieces: [[5, 6, 7, 10, 11, 12], [8, 12, 13, 18, 23], [5, 6, 10, 11, 15, 16], [7, 8, 13, 18, 23], [12, 17, 20, 21, 22], [10, 11, 16, 17, 22, 23]] },
  },
  {
    id: "vpz-012", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 1.75, c: 0.05, multi: 3,
    // 6x5, 16-cell tree/anchor silhouette. Keyed A/C/D: forked hexomino +
    // two pentominoes; distractors are its one-cell edit, a mirror, and a
    // W sharing two cells with the fork.
    prompt: PROMPT, options: PIECES, answer: "0,2,3",
    render: { kind: "vpuzzle", cols: 6, rows: 5, target: [2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 23, 24, 25],
      pieces: [[6, 12, 13, 18, 24, 25], [1, 2, 7, 8, 9], [2, 3, 7, 8, 9], [10, 11, 16, 17, 23], [6, 12, 13, 18, 24, 19], [12, 13, 19, 20, 26]] },
  },
  {
    id: "vpz-013", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.25, b: 1.95, c: 0.05, multi: 3,
    // 6x5, 14-cell diagonal band. Keyed B/E/F: P + c-shape + T-tetromino;
    // every distractor (S / moved c / 2x2+nub) overlaps keyed cells by >=2.
    prompt: PROMPT, options: PIECES, answer: "1,4,5",
    render: { kind: "vpuzzle", cols: 6, rows: 5, target: [0, 1, 6, 7, 8, 13, 14, 15, 20, 21, 22, 27, 28, 29],
      pieces: [[6, 12, 13, 19], [0, 1, 6, 7, 13], [8, 14, 15, 20, 26], [14, 15, 20, 21, 22], [8, 14, 15, 20, 21], [22, 27, 28, 29]] },
  },
  {
    id: "vpz-014", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.2, b: 2.1, c: 0.05, multi: 3,
    // 5x6, 16-cell S-snake: step-pentomino + zigzag-pentomino + 6-cell
    // fork, all 5-6 cells. Distractors: mirror of the zigzag, one-cell
    // edit of the fork, and the step + one overlapping cell.
    prompt: PROMPT, options: PIECES, answer: "0,1,2",
    render: { kind: "vpuzzle", cols: 5, rows: 6, target: [0, 1, 2, 7, 8, 9, 12, 13, 14, 16, 17, 20, 21, 22, 25, 26],
      pieces: [[0, 1, 2, 7, 8], [9, 12, 13, 14, 17], [16, 20, 21, 22, 25, 26], [5, 10, 11, 12, 17], [16, 20, 21, 25, 26, 27], [0, 1, 2, 3, 7, 12]] },
  },
  {
    id: "vpz-015", subtest: "visualPuzzles", broad: "Gv", narrow: "Vz",
    a: 1.15, b: 2.2, c: 0.05, multi: 3,
    // Ceiling. 6x5, 16-cell rugged silhouette; three irregular 6/5/5-cell
    // pieces with no straight edge to anchor on, and distractors that are
    // one-cell edits / mirrors of all three keys.
    prompt: PROMPT, options: PIECES, answer: "3,4,5",
    render: { kind: "vpuzzle", cols: 6, rows: 5, target: [0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 20, 21],
      pieces: [[0, 1, 6, 7, 8, 12], [10, 11, 15, 16, 17], [14, 15, 16, 21, 22], [0, 1, 2, 6, 7, 12], [3, 4, 9, 10, 11], [14, 15, 16, 20, 21]] },
  },
  ],
};
