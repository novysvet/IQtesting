import type { Item, Subtest } from "../core/types.ts";

/**
 * Gv / Spatial relations - block counting.
 *
 * Classic hidden-block counting format: BlocksFigure draws a grounded
 * isometric pile from the row-major height map, and the examinee must count
 * every unit cube INCLUDING ones fully occluded inside the pile. A cube at
 * (x, y, z) in a column of height h is hidden exactly when z < h-1 (no top
 * face) AND the +x neighbour column is taller than z (no right face) AND the
 * +y neighbour column is taller than z (no left face); edge columns in +x or
 * +y always show that face, so hidden cubes only occur under raised interior
 * columns.
 *
 * Every key is DERIVED as sum(heights); distractors follow the fixed family
 * total-1 / total+1 / visible-count / total+2, with total-2 substituted on
 * collision, so all five options are distinct integers within +/-3 of the
 * key (which caps the hidden count at 3 by construction). test/blocks.test.ts
 * re-derives total/visible/hidden from every height map with the same
 * visibility model and is the executable statement of these conventions.
 *
 * Content difficulty is anchored b -2.8 .. +1.9 on three dimensions: total
 * cubes (6 -> 24), HIDDEN fraction (0 -> 3 inferred cubes, with stacked
 * height-3 interiors on the hardest items), and footprint irregularity
 * (flat 3x3 slabs at the floor; notched 4x4 / 5x4 terraces at the ceiling).
 * The hardest five items each bury 3 cubes; 14 of 17 items bury at least 1.
 * Footprints used: 3x3, 4x3, 3x4, 4x4, 5x4 (five distinct, all sides 3..5).
 * The 2026-08-21 floor revision (docs/DIFFICULTY_AUDIT.md §9) added flat-slab
 * basals blc-016/017 below the old -1.8 floor so chance-level performance can
 * be located near the scale floor.
 *
 * CALIBRATION STATUS: authored estimates, not fitted to response data —
 * classic hidden-block counting format (visualization load). Parameters
 * produce an internally ordered scale; absolute placement is provisional
 * until norming data exists.
 */
/** Authored bank: 17 piles in difficulty order with authored option orders. */
const BLOCK_BANK: Item[] = [
  {
    id: "blc-016", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 0.9, b: -2.8, c: 0.2,
    // flat 3x2 slab of height-1 cubes | total 6 | hidden 0 (basal)
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["5", "7", "6", "4", "8"],
    answer: 2,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [1, 1, 1, 1, 1, 1, 0, 0, 0] },
  },
  {
    id: "blc-017", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 0.9, b: -2.5, c: 0.2,
    // flat H-shape of height-1 cubes | total 7 | hidden 0 (basal)
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["6", "8", "7", "5", "9"],
    answer: 2,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [1, 1, 1, 0, 1, 0, 1, 1, 1] },
  },
  {
    id: "blc-001", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.0, b: -1.8, c: 0.2,
    // 3x3 slab + front-right tower of 2 | total 10 | hidden 0
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["9", "11", "8", "10", "12"],
    answer: 3,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [1, 1, 1, 1, 1, 1, 1, 1, 2] },
  },
  {
    id: "blc-002", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.0, b: -1.5, c: 0.2,
    // 3x3 slab, centre tower, one corner cut | total 9 | hidden 1 (tower base)
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["8", "9", "10", "7", "11"],
    answer: 1,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [1, 1, 1, 1, 2, 1, 1, 1, 0] },
  },
  {
    id: "blc-003", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.0, b: -1.2, c: 0.2,
    // irregular L footprint, back-left tower | total 8 | hidden 1
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["7", "9", "10", "6", "8"],
    answer: 4,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [2, 1, 1, 1, 1, 0, 1, 1, 0] },
  },
  {
    id: "blc-004", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.05, b: -0.9, c: 0.2,
    // 3x3 slab, ridge of two towers | total 11 | hidden 2
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["11", "12", "9", "13", "10"],
    answer: 0,
    render: { kind: "blocks", cols: 3, rows: 3, heights: [1, 2, 1, 1, 2, 1, 1, 1, 1] },
  },
  {
    id: "blc-005", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.05, b: -0.6, c: 0.2,
    // first 4-wide footprint: full 4x3 slab, raised 2x1 interior | total 14 | hidden 2
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["13", "16", "14", "12", "15"],
    answer: 2,
    render: { kind: "blocks", cols: 4, rows: 3, heights: [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1] },
  },
  {
    id: "blc-006", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.1, b: -0.3, c: 0.2,
    // deep 3x4 pile, right-edge wall + interior ridge, corner cut | total 15 | hidden 2
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["14", "16", "13", "15", "17"],
    answer: 3,
    render: { kind: "blocks", cols: 3, rows: 4, heights: [1, 1, 2, 1, 2, 2, 1, 2, 1, 0, 1, 1] },
  },
  {
    id: "blc-007", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.1, b: 0.0, c: 0.2,
    // 4x3 slab, interior tower + right-edge tower | total 15 | hidden 2
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["16", "15", "13", "17", "14"],
    answer: 1,
    render: { kind: "blocks", cols: 4, rows: 3, heights: [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1] },
  },
  {
    id: "blc-008", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.1, b: 0.3, c: 0.2,
    // first 4x4 footprint: notched corners, interior L of towers | total 16 | hidden 2
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["15", "17", "18", "14", "16"],
    answer: 4,
    render: { kind: "blocks", cols: 4, rows: 4, heights: [0, 1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1, 0, 0] },
  },
  {
    id: "blc-009", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.15, b: 0.6, c: 0.2,
    // 4x4, twin height-3 towers + interior step | total 19 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["20", "16", "19", "18", "21"],
    answer: 2,
    render: { kind: "blocks", cols: 4, rows: 4, heights: [1, 1, 1, 0, 1, 3, 1, 0, 1, 3, 2, 1, 1, 1, 1, 1] },
  },
  {
    id: "blc-010", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.15, b: 0.9, c: 0.2,
    // first 5-wide footprint: notched 5x4 terrace | total 20 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["20", "21", "17", "19", "22"],
    answer: 0,
    render: { kind: "blocks", cols: 5, rows: 4, heights: [1, 1, 1, 1, 0, 1, 2, 2, 1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0] },
  },
  {
    id: "blc-011", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.2, b: 1.2, c: 0.2,
    // full 4x4 terrace, back-right tower of 3 | total 21 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["22", "18", "20", "21", "23"],
    answer: 3,
    render: { kind: "blocks", cols: 4, rows: 4, heights: [1, 1, 1, 3, 1, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1] },
  },
  {
    id: "blc-012", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.2, b: 1.45, c: 0.2,
    // 5x4, stacked height-3 interior beside the right wall | total 23 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["22", "23", "20", "25", "24"],
    answer: 1,
    render: { kind: "blocks", cols: 5, rows: 4, heights: [1, 1, 1, 1, 2, 1, 1, 3, 2, 0, 1, 1, 2, 1, 1, 1, 1, 1, 0, 1] },
  },
  {
    id: "blc-013", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.25, b: 1.65, c: 0.2,
    // 5x4, front-left tower + buried interior, two notches | total 22 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["21", "23", "19", "24", "22"],
    answer: 4,
    render: { kind: "blocks", cols: 5, rows: 4, heights: [1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 2, 0, 1, 1, 1, 1] },
  },
  {
    id: "blc-014", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.25, b: 1.8, c: 0.2,
    // 4x4, stacked height-3 interior against the right wall, corner towers | total 23 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["24", "20", "23", "22", "25"],
    answer: 2,
    render: { kind: "blocks", cols: 4, rows: 4, heights: [1, 1, 1, 3, 1, 1, 3, 2, 1, 1, 2, 1, 0, 1, 1, 3] },
  },
  {
    id: "blc-015", subtest: "blockCounting", broad: "Gv", narrow: "SR",
    a: 1.3, b: 1.9, c: 0.2,
    // ceiling: notched 5x4, stacked height-3 interior + edge towers | total 24 | hidden 3
    prompt: "How many blocks are in the pile, including blocks you cannot see?",
    options: ["24", "25", "21", "26", "23"],
    answer: 0,
    render: { kind: "blocks", cols: 5, rows: 4, heights: [1, 2, 1, 1, 0, 1, 1, 1, 3, 2, 1, 1, 1, 2, 2, 0, 0, 2, 0, 2] },
  },
];

// 2026-08-20 adversarial-verification fix: the authored option orders stepped
// the key through positions 3,1,4,0,2 in bank order (a guessable cycle). This
// fixed per-item right-rotation (1, 2, 3 slots repeating) breaks the cycle
// while preserving every option set, every key word, and all parameters.
function rotateOptions(bank: Item[]): Item[] {
  return bank.map((it, i) => {
    const r = (i % 3) + 1;
    const n = it.options!.length;
    const options = [...it.options!.slice(n - r), ...it.options!.slice(0, n - r)];
    return { ...it, options, answer: (((it.answer as number) + r) % n) };
  });
}

export const blockCounting: Subtest = {
  id: "blockCounting",
  name: "Block Counting",
  broad: "Gv",
  narrow: ["SR"],
  instructions:
    "Each picture shows a pile of blocks viewed from slightly above. Some blocks are completely hidden by others. Count every block in the pile, including the ones you cannot see, and choose the total number.",
  budgetMin: 8,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  // Unscored sample: a flat 2x2 slab, nothing hidden — the format's floor case.
  practice: [
    {
      id: "prac-blc-01", subtest: "blockCounting", broad: "Gv", narrow: "SR",
      a: 0.9, b: -3, c: 0.2,
      // flat 2x2 slab of height-1 cubes | total 4 | hidden 0
      prompt: "How many blocks are in the pile, including blocks you cannot see?",
      options: ["3", "5", "4", "2", "6"],
      answer: 2,
      render: { kind: "blocks", cols: 2, rows: 2, heights: [1, 1, 1, 1] },
    },
    {
      id: "prac-blc-02", subtest: "blockCounting", broad: "Gv", narrow: "SR",
      a: 0.9, b: -3, c: 0.2,
      // one column of two | total 5 | the ground cube under the tall column is hidden
      prompt: "How many blocks are in the pile, including blocks you cannot see?",
      options: ["4", "6", "5", "3", "7"],
      answer: 2,
      render: { kind: "blocks", cols: 2, rows: 2, heights: [2, 1, 1, 1] },
    },
  ],
  items: rotateOptions(BLOCK_BANK),
};
