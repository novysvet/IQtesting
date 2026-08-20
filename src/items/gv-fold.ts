import type { Subtest } from "../core/types.ts";

/**
 * Gv / Visualization - paper folding.
 *
 * CONVENTION (must match the FoldDiagram renderer and the instructions):
 * a "V" fold moves the RIGHT half over onto the stationary LEFT half; an "H"
 * fold moves the BOTTOM half up onto the stationary TOP half. The folded
 * stack therefore always occupies the top-left corner of the sheet — exactly
 * where FoldDiagram draws it — and punch coordinates are given in that final
 * folded footprint (row, col), top-left anchored.
 *
 * Every key here is DERIVED by simulating fold -> punch -> unfold, not
 * authored by eye; test/fold-simulation.test.ts re-derives all keys from the
 * stated steps and punches and is the executable statement of the convention.
 * A punch at footprint cell (r,c) penetrates every layer stacked there, so
 * holes = 2^folds × punches. On a 4x4 grid every unfold pattern is 4-fold
 * symmetric, so distractors must match the key's hole COUNT and symmetry
 * class (same count, different quadrant placement) or backward solving by
 * elimination replaces folding. Distractor families: wrong quadrant pair /
 * wrong band (fold-mapping errors), and one count-off pattern (dropped fold
 * or dropped punch) kept for diagnosis.
 *
 * b spans -1.6 to +1.5 (authored estimates re-anchored 2026-08-20 from the
 * pre-norming difficulty audit, docs/DIFFICULTY_AUDIT.md §2.6; 3-fold items
 * are stripe patterns and structurally capped, so the subtest ceiling is
 * honest at roughly IQ 120-125). Parameters remain AUTHORED ESTIMATES, not
 * calibrated.
 */
export const paperFolding: Subtest = {
  id: "paperFolding",
  name: "Paper Folding",
  broad: "Gv",
  narrow: ["Vz"],
  instructions:
    "Follow each blue arrow: vertical folds move the right half over to the left, and horizontal folds move the bottom half upward. Holes are then punched through every layer of the folded stack. Choose the pattern seen after unfolding.",
  budgetMin: 20,
  routing: { maxItems: 13, minItems: 6, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  items: [
  {
    id: "pf-001", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1, b: -1.6, c: 0.2,
    // folds V | punches [[1,0]] | derived [4,7]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[8,11]', '[4,5]', '[7]', '[1,13]', '[4,7]'],
    answer: 4,
    render: { kind: "fold", steps: ["V"], result: '[[1,0]]' },
  },
  {
    id: "pf-002", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1, b: -1.5, c: 0.2,
    // folds H | punches [[0,2]] | derived [2,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[2,6]', '[14]', '[2,14]', '[1,13]', '[3,15]'],
    answer: 2,
    render: { kind: "fold", steps: ["H"], result: '[[0,2]]' },
  },
  {
    id: "pf-003", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.1, b: -0.9, c: 0.2,
    // folds V | punches [[0,1],[3,0]] | derived [1,2,12,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,12,15]', '[0,3,13,14]', '[2,3,12,13]', '[0,3,5,6]', '[2,12,15]'],
    answer: 0,
    render: { kind: "fold", steps: ["V"], result: '[[0,1],[3,0]]' },
  },
  {
    id: "pf-004", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.1, b: -0.7, c: 0.2,
    // folds H | punches [[1,1],[0,3]] | derived [3,5,9,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[3,7,9,13]', '[5,9,15]', '[5,6,12,15]', '[3,5,9,15]', '[0,6,10,12]'],
    answer: 3,
    render: { kind: "fold", steps: ["H"], result: '[[1,1],[0,3]]' },
  },
  {
    id: "pf-005", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.1, b: -0.7, c: 0.2,
    // folds V,H | punches [[0,0]] | derived [0,3,12,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[3,12,15]', '[0,3,12,15]', '[0,3]', '[0,1,12,13]', '[0,3,4,7]'],
    answer: 1,
    render: { kind: "fold", steps: ["V", "H"], result: '[[0,0]]' },
  },
  {
    id: "pf-006", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.2, b: -0.5, c: 0.2,
    // folds V,H | punches [[1,1]] | derived [5,6,9,10] (centre quadrant)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,13,14]', '[6,9,10]', '[4,7,8,11]', '[0,3,12,15]', '[5,6,9,10]'],
    answer: 4,
    render: { kind: "fold", steps: ["V", "H"], result: '[[1,1]]' },
  },
  {
    id: "pf-007", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.2, b: -0.4, c: 0.2,
    // folds H,V | punches [[0,1]] | derived [1,2,13,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[5,6,9,10]', '[2,13,14]', '[1,2,13,14]', '[0,3,12,15]', '[4,7,8,11]'],
    answer: 2,
    render: { kind: "fold", steps: ["H", "V"], result: '[[0,1]]' },
  },
  {
    id: "pf-008", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.2, b: 0, c: 0.2,
    // folds V,H | punches [[0,1],[1,0]] | derived [1,2,4,7,8,11,13,14] (inner ring)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,4,7,8,11,13,14]', '[0,3,4,7,8,11,12,15]', '[4,5,6,7,8,9,10,11]', '[0,3,5,6,9,10,12,15]', '[0,1,2,3,12,13,14,15]'],
    answer: 0,
    render: { kind: "fold", steps: ["V", "H"], result: '[[0,1],[1,0]]' },
  },
  {
    id: "pf-009", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 0.3, c: 0.2,
    // folds H,V | punches [[1,0],[0,0]] | derived [0,3,4,7,8,11,12,15] (outer columns)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,1,4,5,8,9,12,13]', '[0,1,2,3,12,13,14,15]', '[1,2,4,7,8,11,13,14]', '[0,3,4,7,8,11,12,15]', '[0,3,12,15]'],
    answer: 3,
    render: { kind: "fold", steps: ["H", "V"], result: '[[1,0],[0,0]]' },
  },
  {
    id: "pf-010", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 0.5, c: 0.2,
    // folds V,H,V | punches [[0,0]] | derived [0,1,2,3,12,13,14,15] (top+bottom rows)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,3,4,7,8,11,12,15]', '[0,1,2,3,12,13,14,15]', '[0,3,12,15]', '[1,2,4,7,8,11,13,14]', '[4,5,6,7,8,9,10,11]'],
    answer: 1,
    render: { kind: "fold", steps: ["V", "H", "V"], result: '[[0,0]]' },
  },
  {
    id: "pf-011", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 0.6, c: 0.2,
    // folds V,H,V | punches [[1,0]] | derived [4,5,6,7,8,9,10,11] (middle band)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[4,5,6,7]', '[0,1,2,3,12,13,14,15]', '[5,6,7,8,9,10,11]', '[1,2,4,7,8,11,13,14]', '[4,5,6,7,8,9,10,11]'],
    answer: 4,
    render: { kind: "fold", steps: ["V", "H", "V"], result: '[[1,0]]' },
  },
  {
    id: "pf-012", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 0.7, c: 0.2,
    // folds H,V,H | punches [[0,1]] | derived [1,2,5,6,9,10,13,14] (middle columns)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[2,5,6,9,10,13,14]', '[0,3,4,7,8,11,12,15]', '[1,2,5,6,9,10,13,14]', '[1,2,13,14]', '[0,1,2,3,12,13,14,15]'],
    answer: 2,
    render: { kind: "fold", steps: ["H", "V", "H"], result: '[[0,1]]' },
  },
  {
    id: "pf-013", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.2, b: 1.2, c: 0.2,
    // folds V,H | punches [[0,0],[0,1]] | derived [0,1,2,3,12,13,14,15] (top+bottom rows)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,1,2,3,12,13,14,15]', '[4,5,6,7,8,9,10,11]', '[0,3,4,7,8,11,12,15]', '[1,2,4,7,8,11,13,14]', '[0,3,12,15]'],
    answer: 0,
    render: { kind: "fold", steps: ["V", "H"], result: '[[0,0],[0,1]]' },
  },
  {
    id: "pf-014", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: 1.5, c: 0.2,
    // folds H,V | punches [[0,0],[1,0]] | derived [0,3,4,7,8,11,12,15] (outer columns)
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,1,2,3,12,13,14,15]', '[0,3,4,7]', '[1,2,4,7,8,11,13,14]', '[0,3,5,6,9,10,12,15]', '[0,3,4,7,8,11,12,15]'],
    answer: 4,
    render: { kind: "fold", steps: ["H", "V"], result: '[[0,0],[1,0]]' },
  },
  ],
};
