import type { Subtest } from "../core/types.ts";

/**
 * Gf / Induction - figure series.
 * Spec encoding matches matrixReasoning: shape:count:fill:rot.
 *
 * Distractor rule: every option stays inside the series' own shape family so
 * the key cannot be found by family elimination (audit finding for the
 * original fs-006), and long-cycle items demonstrate the wrap in-stimulus
 * where the cycle length allows it (fs-009 shows five terms).
 *
 * b spans -2.3 to +2.3 (re-anchored 2026-08-20 from the pre-norming
 * difficulty audit, docs/DIFFICULTY_AUDIT.md §2.3; the upper half of the
 * original ladder was over-priced by ~0.8 logits on average — rule count and
 * interactivity, not item position, drive series difficulty). Parameters are
 * AUTHORED ESTIMATES, not calibrated.
 */
export const figureSeries: Subtest = {
  id: "figureSeries",
  name: "Figure Series",
  broad: "Gf",
  narrow: ["I"],
  instructions:
    "Each series changes by one or more rules. Work out the rules, then choose the figure that comes next.",
  budgetMin: 16,
  routing: { maxItems: 13, minItems: 6, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  items: [
  {
    id: "fs-001", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1, b: -2.3, c: 0.2,
    // rule: count +1
    prompt: "Which figure comes next in the series?",
    options: ["cir:2:none:0", "cir:1:none:0", "sq:4:none:0", "cir:4:none:0", "cir:3:none:0"],
    answer: 3,
    render: { kind: "series", figures: ["cir:1:none:0", "cir:2:none:0", "cir:3:none:0"] },
  },
  {
    id: "fs-002", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1, b: -1.8, c: 0.2,
    // rule: rotate +45
    prompt: "Which figure comes next in the series?",
    options: ["arw:1:none:135", "arw:1:none:90", "arw:1:none:180", "arw:1:none:0", "arw:1:none:225"],
    answer: 0,
    render: { kind: "series", figures: ["arw:1:none:0", "arw:1:none:45", "arw:1:none:90"] },
  },
  {
    id: "fs-003", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.1, b: -1.4, c: 0.2,
    // rule: fill cycles none, half, solid, hatch, then repeats
    prompt: "Which figure comes next in the series?",
    options: ["sq:1:hatch:0", "cir:1:none:0", "sq:1:none:0", "sq:1:half:0", "sq:1:solid:0"],
    answer: 2,
    render: { kind: "series", figures: ["sq:1:none:0", "sq:1:half:0", "sq:1:solid:0", "sq:1:hatch:0"] },
  },
  {
    id: "fs-004", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.1, b: -1.5, c: 0.2,
    // rule: rotate +90
    prompt: "Which figure comes next in the series?",
    options: ["tri:1:solid:0", "tri:1:solid:90", "tri:1:none:270", "tri:1:solid:135", "tri:1:solid:270"],
    answer: 4,
    render: { kind: "series", figures: ["tri:1:solid:0", "tri:1:solid:90", "tri:1:solid:180"] },
  },
  {
    id: "fs-005", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.2, b: -0.5, c: 0.2,
    // rule: count doubles 1, 2, 4, 8
    prompt: "Which figure comes next in the series?",
    options: ["hex:8:none:0", "dia:1:none:0", "dia:4:none:0", "dia:8:none:0", "dia:6:none:0"],
    answer: 3,
    render: { kind: "series", figures: ["dia:1:none:0", "dia:2:none:0", "dia:4:none:0"] },
  },
  {
    id: "fs-006", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.1, b: -1.1, c: 0.2,
    // rule: shape cycles triangle, square, circle, then repeats (wrap already shown at term 4)
    prompt: "Which figure comes next in the series?",
    options: ["cir:1:none:0", "sq:1:solid:0", "cir:1:solid:0", "tri:1:none:0", "sq:1:none:0"],
    answer: 4,
    render: { kind: "series", figures: ["tri:1:none:0", "sq:1:none:0", "cir:1:none:0", "tri:1:none:0"] },
  },
  {
    id: "fs-007", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.2, b: -0.2, c: 0.2,
    // rule: rotate +45 AND fill alternates none/solid
    prompt: "Which figure comes next in the series?",
    options: ["arw:1:solid:135", "arw:1:none:135", "arw:1:solid:90", "arw:1:solid:180", "arw:1:none:180"],
    answer: 0,
    render: { kind: "series", figures: ["arw:1:none:0", "arw:1:solid:45", "arw:1:none:90"] },
  },
  {
    id: "fs-008", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.2, b: 0.2, c: 0.2,
    // rule: count +1 AND rotate +90
    prompt: "Which figure comes next in the series?",
    options: ["arw:4:none:0", "arw:2:none:270", "arw:4:none:270", "arw:4:none:180", "arw:3:none:270"],
    answer: 2,
    render: { kind: "series", figures: ["arw:1:none:0", "arw:2:none:90", "arw:3:none:180"] },
  },
  {
    id: "fs-009", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.2, b: 0.3, c: 0.2,
    // rule: four-shape cycle (wrap shown at term 5) AND fill alternates none/half
    prompt: "Which figure comes next in the series?",
    options: ["sq:1:none:0", "cir:1:half:0", "sq:1:half:0", "tri:1:half:0", "hex:1:none:0"],
    answer: 2,
    render: { kind: "series", figures: ["tri:1:none:0", "sq:1:half:0", "cir:1:none:0", "hex:1:half:0", "tri:1:none:0"] },
  },
  {
    id: "fs-010", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.3, b: 0.9, c: 0.2,
    // rule: rotate +135: 0,135,270 -> 405 mod 360 = 45
    prompt: "Which figure comes next in the series?",
    options: ["arw:1:solid:315", "arw:1:solid:45", "arw:1:solid:0", "arw:1:solid:135", "arw:1:solid:225"],
    answer: 1,
    render: { kind: "series", figures: ["arw:1:solid:0", "arw:1:solid:135", "arw:1:solid:270"] },
  },
  {
    id: "fs-011", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.2, b: 0.4, c: 0.2,
    // rule: count 4,3,2 decreasing AND rotate +45
    prompt: "Which figure comes next in the series?",
    options: ["arw:2:none:135", "arw:1:none:180", "arw:3:none:135", "arw:1:none:135", "arw:1:none:90"],
    answer: 3,
    render: { kind: "series", figures: ["arw:4:none:0", "arw:3:none:45", "arw:2:none:90"] },
  },
  {
    id: "fs-012", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.5, b: 1.2, c: 0.2,
    // rule: count increases; rotation advances 90 degrees; fill cycles none, half, solid, hatch
    prompt: "Which figure comes next in the series?",
    options: ["arw:5:none:0", "arw:5:hatch:0", "arw:4:none:0", "arw:5:none:90", "arw:6:none:0"],
    answer: 0,
    render: { kind: "series", figures: ["arw:1:none:0", "arw:2:half:90", "arw:3:solid:180", "arw:4:hatch:270"] },
  },
  {
    id: "fs-013", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.3, b: 0.9, c: 0.2,
    // rule: fill cycles none, half, solid, hatch; rotation advances 45 degrees
    prompt: "Which figure comes next in the series?",
    options: ["star:2:none:180", "star:3:none:180", "star:2:hatch:180", "star:2:half:180", "star:2:none:135"],
    answer: 0,
    render: { kind: "series", figures: ["star:2:none:0", "star:2:half:45", "star:2:solid:90", "star:2:hatch:135"] },
  },
  {
    id: "fs-014", subtest: "figureSeries", broad: "Gf", narrow: "I",
    a: 1.4, b: 2.3, c: 0.2,
    // rule: rotation increments grow +45 each step: +45, +90, +135 -> next +180; 270+180 = 450 mod 360 = 90.
    // Four terms pin the growth as arithmetic (a geometric increment would put term 4 at 315, refuted in-stimulus).
    prompt: "Which figure comes next in the series?",
    options: ["arw:1:none:315", "arw:1:none:270", "arw:1:none:90", "arw:1:none:180", "arw:1:none:0"],
    answer: 2,
    render: { kind: "series", figures: ["arw:1:none:0", "arw:1:none:45", "arw:1:none:135", "arw:1:none:270"] },
  },
  ],
};
