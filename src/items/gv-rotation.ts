import type { Subtest } from "../core/types.ts";

/**
 * Gv / Spatial relations - mental rotation.
 *
 * DESIGN (revised 2026-08-20 after the difficulty audit, docs/DIFFICULTY_AUDIT.md
 * §2.7). The original format — one pure rotation among four mirrors — was
 * solvable by chirality alone: the key was the only non-mirrored option, so
 * the angular-disparity manipulation never touched accuracy. Each item now
 * carries TWO non-mirrored candidates: the key (the target figure rotated)
 * and a DIFFERENT figure rotated, drawn from a confusable family (F/E differ
 * by one arm; P is F with a closed loop). The remaining options are mirrors
 * of the target, one of them at the key's own angle for a direct
 * same-orientation contrast. Identifying the key therefore requires both
 * figure identity AND chirality, and cannot be done by spotting the single
 * odd candidate.
 *
 * Spec format: figureId:rotationDegrees:mirrored(0|1)
 * b spans -3.2 to +1.4 (2D line-figure rotation caps out near the IQ 120
 * line; genuinely higher measurement needs 3D or compound figures). The
 * 2026-08-21 floor revision added basal items down to -3.2 so the adaptive
 * descent can collect evidence AT the bottom of the scale — without them a
 * chance-level examinee is censored at -1.8 and the composite inflates
 * (docs/DIFFICULTY_AUDIT.md §9).
 * Parameters are AUTHORED ESTIMATES, not calibrated.
 */
export const mentalRotation: Subtest = {
  id: "mentalRotation",
  name: "Mental Rotation",
  broad: "Gv",
  narrow: ["SR"],
  instructions:
    "One candidate is the target turned to a new angle. The others are mirror images of the target or different shapes. Choose the candidate that shows the target itself, rotated.",
  budgetMin: 14,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  // Unscored sample following the full distractor contract: two non-mirrored
  // candidates (key + different figure), two mirrors of the target, one of
  // them at the key's own angle.
  practice: [
  {
    id: "prac-mr-01", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 0.9, b: -3, c: 0.25,
    // target L at 0deg; key L at 90; mirror at the key's angle; second mirror at 270; different figure T
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:90:1", "L:90:0", "T:90:0", "L:270:1"],
    answer: 1,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:90:1", "L:90:0", "T:90:0", "L:270:1"] },
  },
  {
    id: "prac-mr-02", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 0.9, b: -3, c: 0.25,
    // target P at 0deg; key P at 180; different figure F at the key's angle; mirrors at 180 and 270
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:180:0", "F:180:0", "P:180:1", "P:270:1"],
    answer: 0,
    render: { kind: "rotation", target: "P:0:0", candidates: ["P:180:0", "F:180:0", "P:180:1", "P:270:1"] },
  },
  ],
  items: [
  {
    id: "mr-015", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 0.9, b: -3.2, c: 0.25,
    // basal: target L at 0deg; key L at 90; mirrors at 90/270; different figure T
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:90:1", "L:90:0", "T:0:0", "L:270:1"],
    answer: 1,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:90:1", "L:90:0", "T:0:0", "L:270:1"] },
  },
  {
    id: "mr-016", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 0.9, b: -2.8, c: 0.25,
    // basal: target T at 0deg; key T at 90; mirrors at 180/90; different figure L
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["T:180:1", "L:90:0", "T:90:1", "T:90:0"],
    answer: 3,
    render: { kind: "rotation", target: "T:0:0", candidates: ["T:180:1", "L:90:0", "T:90:1", "T:90:0"] },
  },
  {
    id: "mr-017", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1, b: -2.4, c: 0.25,
    // basal: target Z at 0deg; key Z at 90 (C2-equivalent to 270); mirrors at 45/90; different figure P
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["Z:90:0", "Z:45:1", "P:180:0", "Z:90:1"],
    answer: 0,
    render: { kind: "rotation", target: "Z:0:0", candidates: ["Z:90:0", "Z:45:1", "P:180:0", "Z:90:1"] },
  },
  {
    id: "mr-001", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1, b: -1.8, c: 0.25,
    // target L at 0deg; key L at 90; distractors: mirrored L at 90/180, different figure T
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:90:1", "T:90:0", "L:90:0", "L:180:1"],
    answer: 2,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:90:1", "T:90:0", "L:90:0", "L:180:1"] },
  },
  {
    id: "mr-002", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1, b: -1.5, c: 0.25,
    // target L at 0deg; key L at 180 (Cooper-Shepard worst angle); same-angle mirror contrast; different figure E
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["L:180:0", "L:270:1", "E:90:0", "L:180:1"],
    answer: 0,
    render: { kind: "rotation", target: "L:0:0", candidates: ["L:180:0", "L:270:1", "E:90:0", "L:180:1"] },
  },
  {
    id: "mr-003", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.1, b: -1.2, c: 0.25,
    // target Z at 0deg; key Z at 270; mirrors at 90/45 (C2-inequivalent); different figure F
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["Z:90:1", "Z:45:1", "F:0:0", "Z:270:0"],
    answer: 3,
    render: { kind: "rotation", target: "Z:0:0", candidates: ["Z:90:1", "Z:45:1", "F:0:0", "Z:270:0"] },
  },
  {
    id: "mr-004", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.1, b: -0.9, c: 0.25,
    // target T at 90deg; key T at 180 (90deg disparity); different figure L
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["T:270:1", "T:180:0", "T:0:1", "L:180:0"],
    answer: 1,
    render: { kind: "rotation", target: "T:90:0", candidates: ["T:270:1", "T:180:0", "T:0:1", "L:180:0"] },
  },
  {
    id: "mr-005", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.1, b: -0.6, c: 0.25,
    // target F at 0deg; key F at 45; same-angle mirror; confusable E at 180
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:45:1", "F:315:1", "E:180:0", "F:45:0"],
    answer: 3,
    render: { kind: "rotation", target: "F:0:0", candidates: ["F:45:1", "F:315:1", "E:180:0", "F:45:0"] },
  },
  {
    id: "mr-006", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.2, b: -0.3, c: 0.25,
    // target F at 315deg; key F at 90 (135deg); same-angle mirror; confusable E at 90
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:90:1", "E:90:0", "F:90:0", "F:180:1"],
    answer: 2,
    render: { kind: "rotation", target: "F:315:0", candidates: ["F:90:1", "E:90:0", "F:90:0", "F:180:1"] },
  },
  {
    id: "mr-007", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.2, b: 0, c: 0.25,
    // target P at 0deg; key P at 135; same-angle mirror; confusable F at 135
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:135:0", "P:135:1", "P:315:1", "F:135:0"],
    answer: 0,
    render: { kind: "rotation", target: "P:0:0", candidates: ["P:135:0", "P:135:1", "P:315:1", "F:135:0"] },
  },
  {
    id: "mr-008", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.2, b: 0.3, c: 0.25,
    // target F at 90deg; key F at 225 (135deg); same-angle mirror; confusable E at 315
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:225:1", "E:315:0", "F:45:1", "F:225:0"],
    answer: 3,
    render: { kind: "rotation", target: "F:90:0", candidates: ["F:225:1", "E:315:0", "F:45:1", "F:225:0"] },
  },
  {
    id: "mr-009", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.3, b: 0.45, c: 0.25,
    // target E at 90deg; key E at 270 (180deg disparity); same-angle mirror; confusable F at 270
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["E:270:1", "E:270:0", "F:270:0", "E:0:1"],
    answer: 1,
    render: { kind: "rotation", target: "E:90:0", candidates: ["E:270:1", "E:270:0", "F:270:0", "E:0:1"] },
  },
  {
    id: "mr-010", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.3, b: 0.6, c: 0.25,
    // target P at 135deg; key P at 315 (180deg disparity); same-angle mirror; confusable E
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:315:1", "E:135:0", "P:315:0", "P:45:1"],
    answer: 2,
    render: { kind: "rotation", target: "P:135:0", candidates: ["P:315:1", "E:135:0", "P:315:0", "P:45:1"] },
  },
  {
    id: "mr-011", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.3, b: 0.8, c: 0.25,
    // target E at 0deg; key E at 225; same-angle mirror; confusable F at the key's angle
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["E:225:0", "E:225:1", "E:135:1", "F:225:0"],
    answer: 0,
    render: { kind: "rotation", target: "E:0:0", candidates: ["E:225:0", "E:225:1", "E:135:1", "F:225:0"] },
  },
  {
    id: "mr-012", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.3, b: 1, c: 0.25,
    // target F at 225deg; key F at 45 (180deg); same-angle mirror AND mirror at the target's own angle; confusable E at 45
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["F:45:1", "F:225:1", "E:45:0", "F:45:0"],
    answer: 3,
    render: { kind: "rotation", target: "F:225:0", candidates: ["F:45:1", "F:225:1", "E:45:0", "F:45:0"] },
  },
  {
    id: "mr-013", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.4, b: 1.2, c: 0.25,
    // target P at 315deg; key P at 135 (180deg); same-angle mirror; confusable E at 45
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["P:225:1", "P:135:0", "P:135:1", "E:45:0"],
    answer: 1,
    render: { kind: "rotation", target: "P:315:0", candidates: ["P:225:1", "P:135:0", "P:135:1", "E:45:0"] },
  },
  {
    id: "mr-014", subtest: "mentalRotation", broad: "Gv", narrow: "SR",
    a: 1.4, b: 1.4, c: 0.25,
    // target E at 315deg; key E at 135 (180deg); same-angle mirror; confusable F at the key's angle — elite discrimination
    prompt: "Which figure is the same shape as the target, only rotated?",
    options: ["E:45:1", "E:135:1", "E:135:0", "F:135:0"],
    answer: 2,
    render: { kind: "rotation", target: "E:315:0", candidates: ["E:45:1", "E:135:1", "E:135:0", "F:135:0"] },
  },
  ],
};
