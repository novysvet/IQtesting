import type { CellSpecV2, MatrixFill, MatrixMark, MatrixPosition, MatrixShape, Subtest } from "../core/types.ts";

/**
 * Gf / Induction - matrix reasoning.
 *
 * Items mx-001..mx-006 use legacy "shape:count:fill:rot" spec strings.
 * Items mx-007..mx-018 are structured cells (CellSpecV2): several marks
 * independently placed on a 3x3 interior position grid, so rules can operate
 * on POSITION SETS (union, XOR, difference, rotation of placements, Latin
 * squares over positions) rather than on single-figure attributes.
 *
 * Every rule is restated as executable code in test/matrix-rules.test.ts,
 * which re-derives each answer key from the rule and rejects items whose
 * given rows fail to reproduce. Parameters remain AUTHORED ESTIMATES.
 */

function mark(shape: MatrixShape, fill: MatrixFill, pos: MatrixPosition): MatrixMark {
  return { shape, fill, rot: 0, pos };
}

/** Uniform cell: one shape/fill copied onto several positions. */
function row(shape: MatrixShape, fill: MatrixFill, positions: MatrixPosition[]): CellSpecV2 {
  return { v: 2, marks: positions.map((pos) => mark(shape, fill, pos)) };
}

/** Mixed cell: explicit marks. */
function cell(...marks: MatrixMark[]): CellSpecV2 {
  return { v: 2, marks };
}

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
    // rule: cell 3's positions are the UNION of cell 1's and cell 2's positions (per row)
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 2,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("cir", "none", ["NW", "N", "E"]), row("cir", "none", ["N", "SW", "SE"]), row("cir", "none", ["NW", "N", "E", "SW", "SE"]),
        row("sq", "none", ["N", "C", "SW"]), row("sq", "none", ["NW", "S", "SE"]), row("sq", "none", ["NW", "N", "C", "S", "SW", "SE"]),
        row("tri", "none", ["NE", "W", "S"]), row("tri", "none", ["W", "C", "SE"]), null,
      ],
      optionCells: [
        row("tri", "none", ["NE", "W", "S"]),
        row("tri", "none", ["NE", "W", "S", "C"]),
        row("tri", "none", ["NE", "W", "S", "C", "SE"]),
        row("sq", "none", ["NE", "W", "S", "C", "SE"]),
        row("tri", "none", ["NW", "NE", "W", "S", "C", "SE"]),
      ],
    },
  },
  {
    id: "mx-008", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.5, b: 0.4, c: 0.2,
    // rule: cell 3's positions are the SYMMETRIC DIFFERENCE (XOR) of cells 1 and 2
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 4,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("dia", "none", ["N", "C", "E", "SW"]), row("dia", "none", ["C", "E", "S", "SE"]), row("dia", "none", ["N", "SW", "S", "SE"]),
        row("hex", "none", ["NW", "NE", "W", "E"]), row("hex", "none", ["W", "E", "SE", "SW"]), row("hex", "none", ["NW", "NE", "SE", "SW"]),
        row("star", "none", ["N", "C", "S", "SW"]), row("star", "none", ["C", "S", "SE", "NW"]), null,
      ],
      optionCells: [
        row("star", "none", ["N", "C", "S", "SW", "SE", "NW"]),
        row("star", "none", ["N", "SW"]),
        row("star", "none", ["N", "SW", "SE", "NE"]),
        row("star", "none", ["C", "S"]),
        row("star", "none", ["N", "SW", "SE", "NW"]),
      ],
    },
  },
  {
    id: "mx-009", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.6, b: 0.7, c: 0.2,
    // rule: cell 3's positions are cell 2's MINUS cell 1's (order matters)
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 1,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("hex", "none", ["N", "E", "SW"]), row("hex", "none", ["E", "S", "SW", "SE"]), row("hex", "none", ["S", "SE"]),
        row("star", "none", ["NW", "C", "SE"]), row("star", "none", ["NE", "NW", "W", "C"]), row("star", "none", ["NE", "W"]),
        row("cross", "none", ["N", "E", "S"]), row("cross", "none", ["E", "S", "W", "SE"]), null,
      ],
      optionCells: [
        row("cross", "none", ["N"]),
        row("cross", "none", ["W", "SE"]),
        row("cross", "none", ["N", "E", "S", "W", "SE"]),
        row("cross", "none", ["E", "S", "W", "SE"]),
        row("cross", "none", ["W"]),
      ],
    },
  },
  {
    id: "mx-010", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.6, b: 1, c: 0.2,
    // rule: cell 3 keeps positions present in BOTH cells 1 and 2; each mark takes
    //       its SHAPE from cell 1 and its FILL from cell 2 (attribute transfer)
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 3,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("cir", "none", ["N", "W", "E"]), row("tri", "solid", ["W", "E", "S"]), cell(mark("cir", "solid", "W"), mark("cir", "solid", "E")),
        row("sq", "half", ["NW", "C", "SE"]), row("dia", "hatch", ["C", "E", "SW"]), cell(mark("sq", "hatch", "C")),
        row("arw", "none", ["N", "C", "SW"]), row("star", "half", ["C", "S", "SW"]), null,
      ],
      optionCells: [
        row("arw", "none", ["C", "SW"]),
        row("star", "half", ["C", "SW"]),
        row("arw", "half", ["C"]),
        row("arw", "half", ["C", "SW"]),
        row("arw", "half", ["N", "C", "SW"]),
      ],
    },
  },
  {
    id: "mx-011", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.7, b: 1.2, c: 0.2,
    // rule: PARITY BRANCH on the total mark count of cells 1+2. Odd total:
    //       union of positions, shape from cell 1, solid fill. Even total:
    //       cell 2's positions and shape, no fill.
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 0,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("tri", "none", ["N", "C", "E"]), row("sq", "none", ["W", "E"]), row("tri", "solid", ["N", "C", "E", "W"]),
        row("cir", "half", ["NW", "SE"]), row("dia", "half", ["N", "S"]), row("dia", "none", ["N", "S"]),
        row("hex", "none", ["N", "W", "SE"]), row("cross", "none", ["C", "E"]), null,
      ],
      optionCells: [
        row("hex", "solid", ["N", "W", "SE", "C", "E"]),
        row("hex", "none", ["N", "W", "SE", "C", "E"]),
        row("cross", "solid", ["C", "E"]),
        row("hex", "solid", ["N", "W", "SE"]),
        row("cross", "none", ["C", "E"]),
      ],
    },
  },
  {
    id: "mx-012", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.7, b: 1.6, c: 0.2,
    // rule: cell 2's POSITIONS are rotated: quarter-turn clockwise when cell 1
    //       holds an even number of marks, half-turn when odd. Shape/fill stay
    //       cell 2's; cell 1's marks only signal the transform.
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 2,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("sq", "none", ["W", "E"]), row("star", "none", ["N", "W"]), row("star", "none", ["N", "E"]),
        row("cir", "half", ["NW", "C", "SE"]), row("dia", "half", ["S"]), row("dia", "half", ["N"]),
        row("tri", "none", ["NW", "NE"]), row("arw", "none", ["SW", "E"]), null,
      ],
      optionCells: [
        row("arw", "none", ["SW", "E"]),
        row("arw", "none", ["NE", "W"]),
        row("arw", "none", ["NW", "S"]),
        row("arw", "none", ["NW", "E"]),
        row("star", "none", ["NW", "S"]),
      ],
    },
  },
  {
    id: "mx-013", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.8, b: 1.9, c: 0.2,
    // rule: cell 3 keeps the FIRST |cell 1| marks of cell 2 in reading order
    //       (NW,N,NE,W,C,E,SW,S,SE), preserving cell 2's shape and fill
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 1,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("tri", "none", ["N", "E", "SW"]), row("sq", "none", ["NW", "SE", "C", "W", "S"]), row("sq", "none", ["NW", "W", "C"]),
        row("cir", "half", ["NE", "SW"]), row("dia", "half", ["E", "S", "W", "NW", "SE"]), row("dia", "half", ["NW", "W"]),
        row("cross", "none", ["N", "C", "NE", "SW"]), row("star", "none", ["NW", "N", "E", "C", "S", "SE"]), null,
      ],
      optionCells: [
        row("star", "none", ["NW", "N", "C"]),
        row("star", "none", ["NW", "N", "C", "E"]),
        row("star", "none", ["NW", "N", "C", "E", "S"]),
        row("star", "none", ["C", "E", "S", "SE"]),
        row("cross", "none", ["NW", "N", "C", "E"]),
      ],
    },
  },
  {
    id: "mx-014", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.9, b: 2.5, c: 0.2,
    // rule: INTERLEAVING. Cell 3 = cell 1's marks advanced one position
    //       clockwise around the perimeter ring, plus cell 2's marks moved one
    //       position counter-clockwise; each mark keeps its own shape/fill
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 3,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("tri", "none", ["NW", "SE"]), row("sq", "half", ["E", "W"]),
        cell(mark("tri", "none", "N"), mark("tri", "none", "S"), mark("sq", "half", "NE"), mark("sq", "half", "SW")),
        row("cir", "half", ["N", "S"]), row("dia", "none", ["NW", "SE"]),
        cell(mark("cir", "half", "NE"), mark("cir", "half", "SW"), mark("dia", "none", "W"), mark("dia", "none", "E")),
        row("star", "solid", ["W", "E"]), row("hex", "none", ["NE", "SW"]), null,
      ],
      optionCells: [
        cell(mark("star", "solid", "NW"), mark("star", "solid", "SE"), mark("hex", "none", "E"), mark("hex", "none", "W")),
        cell(mark("star", "solid", "SW"), mark("star", "solid", "SE"), mark("hex", "none", "N"), mark("hex", "none", "S")),
        cell(mark("star", "solid", "W"), mark("star", "solid", "E"), mark("hex", "none", "NE"), mark("hex", "none", "SW")),
        cell(mark("star", "solid", "NW"), mark("star", "solid", "SE"), mark("hex", "none", "N"), mark("hex", "none", "S")),
        cell(mark("hex", "none", "NW"), mark("hex", "none", "SE"), mark("star", "solid", "N"), mark("star", "solid", "S")),
      ],
    },
  },
  {
    id: "mx-015", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.8, b: 2.2, c: 0.2,
    // rule: TRIPLE LATIN SQUARE. Shape over {tri,sq,cir}, fill over
    //       {none,half,solid}, and position over {NW,C,SE} each appear exactly
    //       once per row AND once per column
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 4,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        cell(mark("tri", "none", "NW")), cell(mark("sq", "half", "C")), cell(mark("cir", "solid", "SE")),
        cell(mark("sq", "solid", "C")), cell(mark("cir", "none", "SE")), cell(mark("tri", "half", "NW")),
        cell(mark("cir", "half", "SE")), cell(mark("tri", "solid", "NW")), null,
      ],
      optionCells: [
        cell(mark("sq", "none", "SE")),
        cell(mark("cir", "none", "C")),
        cell(mark("sq", "half", "C")),
        cell(mark("sq", "solid", "C")),
        cell(mark("sq", "none", "C")),
      ],
    },
  },
  {
    id: "mx-016", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 1.9, b: 2.9, c: 0.2,
    // rule: FILL ARITHMETIC. Over the union of positions, fill value adds
    //       mod 4 (none=0, half=1, solid=2, hatch=3; a missing mark counts 0)
    //       and the shape comes from cell 1. Row 1 calibrates half+half=solid;
    //       row 2 demonstrates the wrap solid+hatch=half and hatch alone,
    //       so every combination the key needs (solid+hatch, hatch+0) has
    //       been shown in the examples.
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 0,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("tri", "half", ["N", "C"]), row("tri", "half", ["C", "E"]),
        cell(mark("tri", "half", "N"), mark("tri", "solid", "C"), mark("tri", "half", "E")),
        row("sq", "solid", ["W", "SE"]), row("sq", "hatch", ["SE", "S"]),
        cell(mark("sq", "solid", "W"), mark("sq", "half", "SE"), mark("sq", "hatch", "S")),
        row("cir", "solid", ["NW", "E"]), row("cir", "hatch", ["E", "SW"]), null,
      ],
      optionCells: [
        cell(mark("cir", "solid", "NW"), mark("cir", "half", "E"), mark("cir", "hatch", "SW")),
        cell(mark("cir", "solid", "NW"), mark("cir", "hatch", "E"), mark("cir", "hatch", "SW")),
        cell(mark("cir", "hatch", "NW"), mark("cir", "hatch", "E"), mark("cir", "hatch", "SW")),
        cell(mark("cir", "solid", "NW"), mark("cir", "none", "E"), mark("cir", "hatch", "SW")),
        cell(mark("cir", "solid", "NW"), mark("cir", "half", "E"), mark("cir", "solid", "SW")),
      ],
    },
  },
  {
    id: "mx-017", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 2, b: 3.7, c: 0.2,
    // rule: XOR then CONDITIONAL ROTATION. Take positions in cell 1 XOR cell 2;
    //       rotate them a quarter-turn clockwise if cell 1 has MORE marks than
    //       cell 2, else a half-turn
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 2,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        row("hex", "none", ["NW", "N", "SW", "W"]), row("hex", "none", ["NW"]), row("hex", "none", ["N", "NW", "E"]),
        row("star", "none", ["C", "SE"]), row("star", "none", ["SE", "S", "SW"]), row("star", "none", ["C", "N", "NE"]),
        row("cross", "none", ["NE", "E", "SE", "S"]), row("cross", "none", ["SE", "S"]), null,
      ],
      optionCells: [
        row("cross", "none", ["NE", "E"]),
        row("cross", "none", ["SW", "W"]),
        row("cross", "none", ["S", "SE"]),
        row("cross", "none", ["S", "SE", "SW", "W"]),
        row("cross", "none", ["NE", "E", "SE", "S"]),
      ],
    },
  },
  {
    id: "mx-018", subtest: "matrixReasoning", broad: "Gf", narrow: "I",
    a: 2, b: 3.3, c: 0.2,
    // rule: TWO CONSTRAINTS. Shape is a Latin square (one tri, one sq, one cir
    //       per row and column). Fill values add mod 3 per row (none=0,
    //       half=1, solid=2): cell3 = cell1 + cell2
    prompt: "Which figure completes the matrix?",
    options: ["A", "B", "C", "D", "E"],
    answer: 4,
    render: {
      kind: "matrix", rows: 3, cols: 3,
      cells: [
        cell(mark("tri", "none", "C")), cell(mark("sq", "half", "C")), cell(mark("cir", "half", "C")),
        cell(mark("sq", "half", "C")), cell(mark("cir", "solid", "C")), cell(mark("tri", "none", "C")),
        cell(mark("cir", "solid", "C")), cell(mark("tri", "none", "C")), null,
      ],
      optionCells: [
        cell(mark("sq", "none", "C")),
        cell(mark("sq", "half", "C")),
        cell(mark("cir", "solid", "C")),
        cell(mark("tri", "solid", "C")),
        cell(mark("sq", "solid", "C")),
      ],
    },
  },
  ],
};