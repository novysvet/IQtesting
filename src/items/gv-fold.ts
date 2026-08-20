import type { Subtest } from "../core/types.ts";

/**
 * Gv / Visualization - paper folding.
 *
 * Every key here is DERIVED by simulating fold -> punch -> unfold, not
 * authored by eye. The simulator was verified against hand-computed cases.
 * Distractors are systematic error patterns (wrong mirror axis, one fewer
 * unfold, translation, dropped hole) rather than random noise, so a
 * test-taker cannot eliminate them by implausibility alone.
 *
 * Options encode hole positions as JSON arrays of 4x4 grid indices (row-major).
 * b spans -2.3 to +3.6. Parameters are AUTHORED ESTIMATES, not calibrated.
 */
export const paperFolding: Subtest = {
  id: "paperFolding",
  name: "Paper Folding",
  broad: "Gv",
  narrow: ["Vz"],
  instructions:
    "Follow each blue arrow: vertical folds move the left half to the right, and horizontal folds move the top half downward. Holes are then punched through every layer. Choose the pattern seen after unfolding.",
  budgetMin: 20,
  routing: { maxItems: 13, minItems: 6, ceilingMisses: 4, targetSe: 0.30, entryTheta: 0 },
  items: [
  {
    id: "pf-001", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1, b: -2.3, c: 0.2,
    // folds V | punches [[1,0]] | derived [4,7]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[8,11]', '[4,5]', '[7]', '[1,13]', '[4,7]'],
    answer: 4,
    render: { kind: "fold", steps: ["V"], result: '[[1,0]]' },
  },
  {
    id: "pf-002", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.1, b: -1.9, c: 0.2,
    // folds H | punches [[0,2]] | derived [2,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[2,6]', '[14]', '[2,14]', '[1,13]', '[3,15]'],
    answer: 2,
    render: { kind: "fold", steps: ["H"], result: '[[0,2]]' },
  },
  {
    id: "pf-003", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.2, b: -1.4, c: 0.2,
    // folds V | punches [[0,1],[3,0]] | derived [1,2,12,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,12,15]', '[0,3,13,14]', '[2,3,12,13]', '[0,3,5,6]', '[2,12,15]'],
    answer: 0,
    render: { kind: "fold", steps: ["V"], result: '[[0,1],[3,0]]' },
  },
  {
    id: "pf-004", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.3, b: -0.9, c: 0.2,
    // folds H | punches [[1,1],[0,3]] | derived [3,5,9,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[3,7,9,13]', '[5,9,15]', '[5,6,12,15]', '[3,5,9,15]', '[0,6,10,12]'],
    answer: 3,
    render: { kind: "fold", steps: ["H"], result: '[[1,1],[0,3]]' },
  },
  {
    id: "pf-005", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.4, b: -0.4, c: 0.2,
    // folds V,H | punches [[0,0]] | derived [0,3,12,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[3,12,15]', '[0,3,12,15]', '[0,3]', '[0,1,12,13]', '[0,3,4,7]'],
    answer: 1,
    render: { kind: "fold", steps: ["V", "H"], result: '[[0,0]]' },
  },
  {
    id: "pf-006", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.4, b: 0, c: 0.2,
    // folds V,H | punches [[1,1]] | derived [5,6,9,10]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[5,6]', '[6,7,10,11]', '[9,10,13,14]', '[6,9,10]', '[5,6,9,10]'],
    answer: 4,
    render: { kind: "fold", steps: ["V", "H"], result: '[[1,1]]' },
  },
  {
    id: "pf-007", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.5, b: 0.4, c: 0.2,
    // folds H,V | punches [[0,1]] | derived [1,2,13,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,5,6]', '[2,13,14]', '[1,2,13,14]', '[1,13]', '[2,3,14,15]'],
    answer: 2,
    render: { kind: "fold", steps: ["H", "V"], result: '[[0,1]]' },
  },
  {
    id: "pf-008", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.5, b: 0.8, c: 0.2,
    // folds V,H | punches [[0,1],[1,0]] | derived [1,2,4,7,8,11,13,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,4,7,8,11,13,14]', '[1,2,4,7]', '[2,3,4,5,8,9,14,15]', '[1,2,5,6,8,11,12,15]', '[2,4,7,8,11,13,14]'],
    answer: 0,
    render: { kind: "fold", steps: ["V", "H"], result: '[[0,1],[1,0]]' },
  },
  {
    id: "pf-009", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.6, b: 1.2, c: 0.2,
    // folds H,V | punches [[1,0],[0,0]] | derived [0,3,4,7,8,11,12,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,1,4,5,8,9,12,13]', '[3,4,7,8,11,12,15]', '[0,1,2,3,12,13,14,15]', '[0,3,4,7,8,11,12,15]', '[0,4,8,12]'],
    answer: 3,
    render: { kind: "fold", steps: ["H", "V"], result: '[[1,0],[0,0]]' },
  },
  {
    id: "pf-010", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.7, b: 1.6, c: 0.2,
    // folds V,H,V | punches [[0,0]] | derived [0,1,2,3,12,13,14,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,3,4,7,8,11,12,15]', '[0,1,2,3,12,13,14,15]', '[0,3,12,15]', '[0,1,2,3,4,5,6,7]', '[1,2,3,12,13,14,15]'],
    answer: 1,
    render: { kind: "fold", steps: ["V", "H", "V"], result: '[[0,0]]' },
  },
  {
    id: "pf-011", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.7, b: 2, c: 0.2,
    // folds V,H,V | punches [[1,0]] | derived [4,5,6,7,8,9,10,11]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[4,7,8,11]', '[8,9,10,11,12,13,14,15]', '[5,6,7,8,9,10,11]', '[1,2,5,6,9,10,13,14]', '[4,5,6,7,8,9,10,11]'],
    answer: 4,
    render: { kind: "fold", steps: ["V", "H", "V"], result: '[[1,0]]' },
  },
  {
    id: "pf-012", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.8, b: 2.5, c: 0.2,
    // folds H,V,H | punches [[0,1]] | derived [1,2,5,6,9,10,13,14]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[2,5,6,9,10,13,14]', '[4,5,6,7,8,9,10,11]', '[1,2,5,6,9,10,13,14]', '[1,2,13,14]', '[2,3,6,7,10,11,14,15]'],
    answer: 2,
    render: { kind: "fold", steps: ["H", "V", "H"], result: '[[0,1]]' },
  },
  {
    id: "pf-013", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 1.9, b: 3, c: 0.2,
    // folds V,H,V | punches [[0,0],[1,0]] | derived [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,3,4,7,8,11,12,15]', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,1,3,4,5,6,7,8,9,10,11,12,13,14,15]'],
    answer: 0,
    render: { kind: "fold", steps: ["V", "H", "V"], result: '[[0,0],[1,0]]' },
  },
  {
    id: "pf-014", subtest: "paperFolding", broad: "Gv", narrow: "Vz",
    a: 2, b: 3.6, c: 0.2,
    // folds H,V,H,V | punches [[0,0]] | derived [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
    prompt: "The sheet is folded as shown, then punched through all layers. Which pattern appears when it is unfolded?",
    options: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,1,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]', '[0,3,4,7,8,11,12,15]'],
    answer: 3,
    render: { kind: "fold", steps: ["H", "V", "H", "V"], result: '[[0,0]]' },
  },
  ],
};
