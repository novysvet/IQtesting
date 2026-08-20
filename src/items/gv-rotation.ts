import type { Subtest } from "../core/types.ts";

/**
 * Gv / Spatial relations - mental rotation.
 *
 * Each item shows an asymmetric figure and four candidates. Exactly one is a
 * pure rotation; the others are MIRRORED. That is the whole discriminating
 * mechanism: a 2D mirror image cannot be rotated into congruence, so the task
 * forces actual mental transformation rather than feature matching.
 *
 * Spec format: figureId:rotationDegrees:mirrored(0|1)
 * b spans -2.2 to +3.3. Parameters are AUTHORED ESTIMATES, not calibrated.
 */
export const mentalRotation: Subtest = {
  id: "mentalRotation",
  name: "Mental Rotation",
  broad: "Gv",
  narrow: ["SR"],
  instructions:
    "One candidate figure is the target turned to a new angle. The others are mirror images, which cannot be produced by turning. Choose the rotated one.",
  budgetMin: 14,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.30, entryTheta: 0 },
  items: [
  {
    id: "mr-001", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1, b: -2.2, c: 0.25,
    // target L at 0deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:90:1", "L:180:1", "L:270:1", "L:90:0"],
    answer: 3,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:90:1", "L:180:1", "L:270:1", "L:90:0"] },
  },
  {
    id: "mr-002", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.1, b: -1.8, c: 0.25,
    // target L at 0deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:180:1", "L:180:0", "L:90:1", "L:270:1"],
    answer: 1,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:180:1", "L:180:0", "L:90:1", "L:270:1"] },
  },
  {
    id: "mr-003", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.2, b: -1.3, c: 0.25,
    // target Z at 0deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["Z:0:1", "Z:90:1", "Z:270:0", "Z:180:1"],
    answer: 2,
    render: { kind: "rotation", target: "Z:0:0", candidates: ["Z:0:1", "Z:90:1", "Z:270:0", "Z:180:1"] },
  },
  {
    id: "mr-004", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.3, b: -0.8, c: 0.25,
    // target T at 90deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["T:270:1", "T:90:1", "T:0:1", "T:180:0"],
    answer: 3,
    render: { kind: "rotation", target: "T:90:0", candidates: ["T:270:1", "T:90:1", "T:0:1", "T:180:0"] },
  },
  {
    id: "mr-005", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.4, b: -0.3, c: 0.25,
    // target F at 0deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:45:0", "F:225:1", "F:315:1", "F:135:1"],
    answer: 0,
    render: { kind: "rotation", target: "F:0:0", candidates: ["F:45:0", "F:225:1", "F:315:1", "F:135:1"] },
  },
  {
    id: "mr-006", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.4, b: 0.1, c: 0.25,
    // target Z at 45deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["Z:135:1", "Z:225:0", "Z:315:1", "Z:45:1"],
    answer: 1,
    render: { kind: "rotation", target: "Z:45:0", candidates: ["Z:135:1", "Z:225:0", "Z:315:1", "Z:45:1"] },
  },
  {
    id: "mr-007", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.5, b: 0.5, c: 0.25,
    // target F at 90deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:315:1", "F:45:1", "F:225:0", "F:135:1"],
    answer: 2,
    render: { kind: "rotation", target: "F:90:0", candidates: ["F:315:1", "F:45:1", "F:225:0", "F:135:1"] },
  },
  {
    id: "mr-008", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.5, b: 0.9, c: 0.25,
    // target P at 0deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:225:1", "P:315:1", "P:45:1", "P:135:0"],
    answer: 3,
    render: { kind: "rotation", target: "P:0:0", candidates: ["P:225:1", "P:315:1", "P:45:1", "P:135:0"] },
  },
  {
    id: "mr-009", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.6, b: 1.3, c: 0.25,
    // target P at 135deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:315:0", "P:225:1", "P:90:1", "P:45:1"],
    answer: 0,
    render: { kind: "rotation", target: "P:135:0", candidates: ["P:315:0", "P:225:1", "P:90:1", "P:45:1"] },
  },
  {
    id: "mr-010", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.7, b: 1.7, c: 0.25,
    // target F at 225deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:45:1", "F:45:0", "F:135:1", "F:315:1"],
    answer: 1,
    render: { kind: "rotation", target: "F:225:0", candidates: ["F:45:1", "F:45:0", "F:135:1", "F:315:1"] },
  },
  {
    id: "mr-011", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.8, b: 2.2, c: 0.25,
    // target P at 45deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:315:1", "P:135:1", "P:180:0", "P:225:1"],
    answer: 2,
    render: { kind: "rotation", target: "P:45:0", candidates: ["P:315:1", "P:135:1", "P:180:0", "P:225:1"] },
  },
  {
    id: "mr-012", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.9, b: 2.7, c: 0.25,
    // target Z at 135deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["Z:225:1", "Z:180:1", "Z:45:1", "Z:315:0"],
    answer: 3,
    render: { kind: "rotation", target: "Z:135:0", candidates: ["Z:225:1", "Z:180:1", "Z:45:1", "Z:315:0"] },
  },
  {
    id: "mr-013", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 2, b: 3.3, c: 0.25,
    // target P at 225deg; exactly one candidate is a pure rotation, the rest are mirrored
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:135:0", "P:315:1", "P:270:1", "P:45:1"],
    answer: 0,
    render: { kind: "rotation", target: "P:225:0", candidates: ["P:135:0", "P:315:1", "P:270:1", "P:45:1"] },
  },
  ],
};
