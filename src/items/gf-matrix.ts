import type { Subtest } from "../core/types.ts";

/**
 * Gf / Induction - matrix reasoning.
 *
 * Cells are encoded as "shape:count:fill:rot" spec strings rendered by
 * FigureCell. Encoding rather than hand-drawing keeps every answer key
 * derivable from the stated rule, which is auditable in a way that
 * hand-drawn SVG is not.
 *
 * b spans -2.6 to +3.7. Parameters are AUTHORED ESTIMATES, not calibrated.
 */
export const matrixReasoning: Subtest = {
  id: "matrixReasoning",
  name: "Matrix Reasoning",
  broad: "Gf",
  narrow: ["I"],
  instructions:
    "Each matrix follows one or more rules. Work out the rules, then choose the figure that completes the bottom-right cell.",
  budgetMin: 21,
  routing: { maxItems: 16, minItems: 7, ceilingMisses: 4, targetSe: 0.28, entryTheta: 0 },
  items: [
  {
    id: "mx-001", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1, b: -2.6, c: 0.2,
    // rule: count increases 1,2,3 across rows
    prompt: "Which figure completes the matrix?",
    options: ["tri:2:none:0", "tri:1:none:0", "sq:3:none:0", "tri:4:none:0", "tri:3:none:0"],
    answer: 4,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["cir:1:none:0", "cir:2:none:0", "cir:3:none:0", "sq:1:none:0", "sq:2:none:0", "sq:3:none:0", "tri:1:none:0", "tri:2:none:0", null] },
  },
  {
    id: "mx-002", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.1, b: -2.1, c: 0.2,
    // rule: fill progresses none,half,solid across
    prompt: "Which figure completes the matrix?",
    options: ["sq:1:solid:0", "cir:1:solid:0", "tri:1:solid:0", "tri:1:none:0", "tri:1:half:0"],
    answer: 2,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["sq:1:none:0", "sq:1:half:0", "sq:1:solid:0", "cir:1:none:0", "cir:1:half:0", "cir:1:solid:0", "tri:1:none:0", "tri:1:half:0", null] },
  },
  {
    id: "mx-003", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.2, b: -1.7, c: 0.2,
    // rule: shape constant per row, rotation +45 across
    prompt: "Which figure completes the matrix?",
    options: ["star:1:none:90", "star:1:none:135", "star:1:none:0", "star:1:none:45", "tri:1:none:90"],
    answer: 0,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["arw:1:none:0", "arw:1:none:45", "arw:1:none:90", "tri:1:none:0", "tri:1:none:45", "tri:1:none:90", "star:1:none:0", "star:1:none:45", null] },
  },
  {
    id: "mx-004", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.3, b: -1.1, c: 0.2,
    // rule: count +1 across AND fill none/half/solid down
    prompt: "Which figure completes the matrix?",
    options: ["cir:2:solid:0", "cir:4:solid:0", "cir:3:none:0", "cir:3:solid:0", "cir:3:half:0"],
    answer: 3,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["cir:1:none:0", "cir:2:none:0", "cir:3:none:0", "cir:1:half:0", "cir:2:half:0", "cir:3:half:0", "cir:1:solid:0", "cir:2:solid:0", null] },
  },
  {
    id: "mx-005", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.4, b: -0.7, c: 0.2,
    // rule: shape cycles tri/sq/cir down; count cycles 3/2/1 across
    prompt: "Which figure completes the matrix?",
    options: ["cir:1:solid:0", "cir:1:none:0", "cir:2:none:0", "cir:3:none:0", "sq:1:none:0"],
    answer: 1,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["tri:3:none:0", "tri:2:none:0", "tri:1:none:0", "sq:3:none:0", "sq:2:none:0", "sq:1:none:0", "cir:3:none:0", "cir:2:none:0", null] },
  },
  {
    id: "mx-006", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.4, b: -0.3, c: 0.2,
    // rule: rotation +90 across, shape constant down, fill alternates by row
    prompt: "Which figure completes the matrix?",
    options: ["arw:1:none:180", "arw:1:solid:270", "arw:1:solid:0", "arw:1:half:180", "arw:1:solid:180"],
    answer: 4,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["arw:1:solid:0", "arw:1:solid:90", "arw:1:solid:180", "arw:1:none:0", "arw:1:none:90", "arw:1:none:180", "arw:1:solid:0", "arw:1:solid:90", null] },
  },
  {
    id: "mx-007", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.5, b: 0.1, c: 0.2,
    // rule: each row and column contains exactly one of tri/sq/cir
    prompt: "Which figure completes the matrix?",
    options: ["hex:1:none:0", "tri:1:solid:0", "tri:1:none:0", "sq:1:none:0", "cir:1:none:0"],
    answer: 2,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["tri:1:none:0", "sq:1:none:0", "cir:1:none:0", "cir:1:none:0", "tri:1:none:0", "sq:1:none:0", "sq:1:none:0", "cir:1:none:0", null] },
  },
  {
    id: "mx-008", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.5, b: 0.4, c: 0.2,
    // rule: Latin square on fill (none/half/solid) with shape constant
    prompt: "Which figure completes the matrix?",
    options: ["hex:1:none:0", "hex:1:half:0", "hex:1:solid:0", "hex:1:hatch:0", "cir:1:none:0"],
    answer: 0,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["hex:1:none:0", "hex:1:half:0", "hex:1:solid:0", "hex:1:solid:0", "hex:1:none:0", "hex:1:half:0", "hex:1:half:0", "hex:1:solid:0", null] },
  },
  {
    id: "mx-009", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.6, b: 0.7, c: 0.2,
    // rule: counts form a Latin square over 2, 3, and 4
    prompt: "Which figure completes the matrix?",
    options: ["sq:2:none:0", "sq:1:none:0", "cir:3:none:0", "sq:3:none:0", "sq:4:none:0"],
    answer: 3,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["sq:2:none:0", "sq:3:none:0", "sq:4:none:0", "sq:3:none:0", "sq:4:none:0", "sq:2:none:0", "sq:4:none:0", "sq:2:none:0", null] },
  },
  {
    id: "mx-010", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.6, b: 1, c: 0.2,
    // rule: shape and fill each form a Latin square
    prompt: "Which figure completes the matrix?",
    options: ["tri:1:half:0", "tri:1:none:0", "tri:1:solid:0", "sq:1:half:0", "cir:1:half:0"],
    answer: 0,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["tri:1:none:0", "sq:1:half:0", "cir:1:solid:0", "cir:1:half:0", "tri:1:solid:0", "sq:1:none:0", "sq:1:solid:0", "cir:1:none:0", null] },
  },
  {
    id: "mx-011", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.7, b: 1.3, c: 0.2,
    // rule: col3 count = col1 + col2 counts
    prompt: "Which figure completes the matrix?",
    options: ["cir:3:none:0", "cir:2:none:0", "cir:1:none:0", "sq:4:none:0", "cir:4:none:0"],
    answer: 4,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["cir:1:none:0", "cir:2:none:0", "cir:3:none:0", "cir:2:none:0", "cir:1:none:0", "cir:3:none:0", "cir:2:none:0", "cir:2:none:0", null] },
  },
  {
    id: "mx-012", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.7, b: 1.6, c: 0.2,
    // rule: fill levels add across: none=0, half=1, solid=2
    prompt: "Which figure completes the matrix?",
    options: ["sq:1:hatch:0", "cir:1:solid:0", "sq:1:solid:0", "sq:1:half:0", "sq:1:none:0"],
    answer: 2,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["sq:1:none:0", "sq:1:half:0", "sq:1:half:0", "sq:1:half:0", "sq:1:half:0", "sq:1:solid:0", "sq:1:solid:0", "sq:1:none:0", null] },
  },
  {
    id: "mx-013", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.8, b: 1.9, c: 0.2,
    // rule: rotation accumulates: col3 rot = col1 rot + col2 rot
    prompt: "Which figure completes the matrix?",
    options: ["arw:1:none:180", "arw:1:none:90", "arw:1:none:135", "arw:1:none:270", "arw:1:none:0"],
    answer: 0,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["arw:1:none:0", "arw:1:none:45", "arw:1:none:45", "arw:1:none:90", "arw:1:none:45", "arw:1:none:135", "arw:1:none:90", "arw:1:none:90", null] },
  },
  {
    id: "mx-014", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.8, b: 2.2, c: 0.2,
    // rule: THREE independent attributes. count 1,2,3 across; fill none/half/solid down;
    //       rotation +45 across (0,45,90 in every row). Missing cell = 3 copies, solid, 90deg.
    prompt: "Which figure completes the matrix?",
    options: ["arw:3:solid:45", "arw:2:solid:90", "arw:3:half:90", "arw:3:solid:90", "arw:4:solid:90"],
    answer: 3,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["arw:1:none:0", "arw:2:none:45", "arw:3:none:90", "arw:1:half:0", "arw:2:half:45", "arw:3:half:90", "arw:1:solid:0", "arw:2:solid:45", null] },
  },
  {
    id: "mx-015", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.9, b: 2.5, c: 0.2,
    // rule: shape and fill each form a Latin square; count advances 1, 2, 3 across
    prompt: "Which figure completes the matrix?",
    options: ["cir:3:half:0", "tri:3:half:0", "tri:3:none:0", "tri:2:half:0", "sq:3:half:0"],
    answer: 1,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["tri:1:none:0", "sq:2:half:0", "cir:3:solid:0", "cir:1:half:0", "tri:2:solid:0", "sq:3:none:0", "sq:1:solid:0", "cir:2:none:0", null] },
  },
  {
    id: "mx-016", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.9, b: 2.9, c: 0.2,
    // rule: TWO rules. (1) shape is a Latin square: each row and column has one
    //       tri, one sq, one cir. (2) count in col3 = |count col1 - count col2|.
    //       row1 |4-1|=3, row2 |4-2|=2, row3 |3-1|=2. Missing = tri (Latin), count 2.
    prompt: "Which figure completes the matrix?",
    options: ["tri:4:none:0", "sq:2:none:0", "cir:2:none:0", "tri:3:none:0", "tri:2:none:0"],
    answer: 4,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["tri:4:none:0", "sq:1:none:0", "cir:3:none:0", "cir:4:none:0", "tri:2:none:0", "sq:2:none:0", "sq:3:none:0", "cir:1:none:0", null] },
  },
  {
    id: "mx-017", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 2, b: 3.3, c: 0.2,
    // rule: rotation = col1+col2 mod 360, fill = XOR(none=0,solid=1), shape constant
    prompt: "Which figure completes the matrix?",
    options: ["arw:1:solid:0", "arw:1:half:270", "arw:1:solid:270", "arw:1:none:270", "arw:1:solid:225"],
    answer: 2,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["arw:1:none:90", "arw:1:solid:135", "arw:1:solid:225", "arw:1:solid:45", "arw:1:solid:45", "arw:1:none:90", "arw:1:none:180", "arw:1:solid:90", null] },
  },
  {
    id: "mx-018", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 2, b: 3.7, c: 0.2,
    // rule: col3 count is col1 multiplied by col2: 1x2=2, 2x2=4, 1x3=3
    prompt: "Which figure completes the matrix?",
    options: ["hex:3:none:0", "hex:4:none:0", "hex:1:none:0", "hex:2:none:0", "cross:3:none:0"],
    answer: 0,
    render: { kind: "matrix", rows: 3, cols: 3, cells: ["hex:1:none:0", "hex:2:none:0", "hex:2:none:0", "hex:2:none:0", "hex:2:none:0", "hex:4:none:0", "hex:1:none:0", "hex:3:none:0", null] },
  },
  ],
};