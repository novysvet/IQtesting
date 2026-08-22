import type { Item, Subtest, WeightShapeId } from "../core/types.ts";

/**
 * Gq / RQ (with a strong Gf cross-loading) — Figure Weights.
 *
 * The WAIS-IV/WISC-V/WAIS-5 core Fluid Reasoning format (one of the highest
 * g-loading subtests in the Wechsler batteries, Weiss et al. 2013) and the
 * one format that is simultaneously figural and quantitative: balanced
 * demonstration scales state equivalence relations among colored shape
 * weights ("three stars balance one triangle"), and the examinee must
 * select the group that fills the final scale's missing pan. Algebra
 * without numerals.
 *
 * Every key is machine-verified TWICE (test/weights.test.ts):
 *   1. Under the authored ground-truth weights, every demo scale balances,
 *      the keyed option's weight equals the query gap, and no distractor
 *      ties it.
 *   2. The demo system determines every shape weight up to ONE global
 *      scale factor (rank = nShapes - 1, checked by exact rational
 *      Gaussian elimination), and under every consistent assignment the
 *      keyed option balances while every distractor provably does not —
 *      the item is unambiguous from the displayed evidence alone.
 *
 * Difficulty is authored from CONTENT: number of related shape kinds,
 * number of chained scales, substitution depth, unit size, and whether the
 * query pan carries a partial load (remainder reasoning). Span -2.6..+2.4;
 * the format's ceiling (three-scale chains, 4-shape vocabularies, LCM-style
 * reduction) is honestly below matrix reasoning's. Untimed power test — the
 * WISC-V times Figure Weights and the gifted-assessment literature
 * (Silverman & Gilman 2020) faults exactly that.
 *
 * Shape colors are FIXED per shape kind (ReasoningFigures.tsx) and always
 * redundant with geometry — color vision is never required (the Pearson
 * WAIS-IV color-blindness caveat, designed out). Distractors are plausible
 * mis-derivations: same-shape-family groups whose weights sit within a
 * half/double/substitution error of the gap, all pairwise distinct, and the
 * key's value rank among the options is spread across the bank (no
 * "pick the middle" exploit; pinned by test).
 *
 * CALIBRATION STATUS: authored estimates, not fitted to response data.
 * Parameters produce an internally ordered scale; absolute placement is
 * provisional until norming data exists.
 */

type Group = WeightShapeId[];

interface WeightItemSpec {
  id: string;
  a: number;
  b: number;
  /** Hidden ground-truth unit weights (integers >= 1), unordered. */
  weights: [WeightShapeId, number][];
  /** Balanced demonstration scales: [left pan, right pan]. */
  demo: [Group, Group][];
  /** The queried scale; `right` already carries its partial load. */
  query: { left: Group; right: Group };
  /** Authored option order; entry i is the keyed group when i === keyIndex. */
  options: Group[];
  keyIndex: number;
  note: string;
}

const PROMPT = "Every scale is perfectly balanced. Which group of shapes should replace the question mark so that the last scale also balances?";

/**
 * Authored bank. Weight arithmetic per item (units are the item's smallest
 * shape) is spelled in each note and re-derived by the test suite.
 */
const FW_SPECS: WeightItemSpec[] = [
  {
    id: "fw-001", a: 0.9, b: -2.6,
    weights: [["cir", 1], ["tri", 2]],
    demo: [[["tri", "tri"], ["cir", "cir", "cir", "cir"]]],
    query: { left: ["cir", "cir", "cir", "cir"], right: [] },
    options: [["cir"], ["cir", "cir"], ["cir", "cir", "cir"], ["tri", "tri"], ["tri", "tri", "cir"]],
    keyIndex: 3,
    note: "basal mirror: tri=2cir; 4 cir = 4 units -> tri,tri | options 1,2,3,4K,5",
  },
  {
    id: "fw-002", a: 0.9, b: -2.4,
    weights: [["sq", 1], ["tri", 2]],
    demo: [[["sq", "sq"], ["tri"]]],
    query: { left: ["tri", "tri", "tri"], right: ["sq"] },
    options: [["sq"], ["tri", "tri", "sq"], ["tri"], ["tri", "tri"], ["sq", "sq", "sq"]],
    keyIndex: 1,
    note: "sq=1 tri=2; 6-1=5 -> tri,tri,sq | options 1,5K,2,4,3 (rank 4)",
  },
  {
    id: "fw-003", a: 0.95, b: -2.2,
    weights: [["star", 1], ["tri", 3], ["sq", 2]],
    demo: [[["star", "star", "star"], ["tri"]], [["sq"], ["star", "star"]]],
    query: { left: ["star", "star", "star", "star", "star"], right: [] },
    options: [["tri", "tri"], ["star", "star", "star"], ["sq", "sq"], ["tri", "tri", "star"], ["tri", "sq"]],
    keyIndex: 4,
    note: "star1 tri3 sq2 (the canonical example); 5 stars = 5 -> tri,sq | options 6,3,4,7,5K",
  },
  {
    id: "fw-004", a: 1.0, b: -1.9,
    weights: [["cir", 1], ["tri", 2], ["dia", 4]],
    demo: [[["cir", "cir"], ["tri"]], [["tri", "tri"], ["dia"]]],
    query: { left: ["dia", "dia"], right: ["tri", "tri"] },
    options: [["dia"], ["cir"], ["tri"], ["tri", "cir"], ["dia", "cir"]],
    keyIndex: 0,
    note: "cir1 tri2 dia4; 8-4=4 -> dia | options 4K,1,2,3,5 (rank 3)",
  },
  {
    id: "fw-005", a: 1.0, b: -1.75,
    weights: [["cir", 1], ["sq", 2], ["tri", 3]],
    demo: [[["sq", "sq", "sq"], ["tri", "tri"]], [["sq"], ["cir", "cir"]]],
    query: { left: ["tri", "tri", "sq", "sq"], right: ["tri"] },
    options: [["tri"], ["tri", "cir"], ["tri", "sq"], ["tri", "tri"], ["tri", "sq", "sq"]],
    keyIndex: 4,
    note: "cir1 sq2 tri3; 10-3=7 -> tri,sq,sq | options 3,4,5,6,7K (rank 4)",
  },
  {
    id: "fw-006", a: 1.0, b: -1.6,
    weights: [["sq", 2], ["hex", 3], ["star", 5]],
    demo: [[["sq", "sq", "sq"], ["hex", "hex"]], [["star"], ["sq", "hex"]]],
    query: { left: ["star", "star", "hex"], right: ["sq", "sq", "sq", "sq"] },
    options: [["hex"], ["sq", "sq"], ["star"], ["hex", "hex"], ["sq", "sq", "hex"]],
    keyIndex: 2,
    note: "sq2 hex3 star5; 13-8=5 -> star | options 3,4,5K,6,7",
  },
  {
    id: "fw-007", a: 1.05, b: -1.3,
    weights: [["cir", 1], ["tri", 2], ["sq", 3]],
    demo: [[["sq"], ["cir", "cir", "cir"]], [["tri"], ["cir", "cir"]]],
    query: { left: ["sq", "sq", "tri"], right: ["cir", "cir", "cir", "cir"] },
    options: [["sq", "tri"], ["tri", "tri"], ["tri", "cir"], ["sq", "sq", "cir"], ["sq", "sq"]],
    keyIndex: 1,
    note: "cir1 tri2 sq3; 8-4=4 -> tri,tri | options 5,4K,3,7,6 (rank 1)",
  },
  {
    id: "fw-008", a: 1.05, b: -1.0,
    weights: [["cir", 1], ["tri", 2], ["sq", 4], ["dia", 5]],
    demo: [[["tri"], ["cir", "cir"]], [["tri", "tri"], ["sq"]], [["sq", "cir"], ["dia"]]],
    query: { left: ["dia", "dia", "tri"], right: ["sq", "sq"] },
    options: [["sq"], ["sq", "tri"], ["tri", "cir"], ["sq", "tri", "cir"], ["sq", "cir"]],
    keyIndex: 0,
    note: "4-shape vocab, 3 chained demos; 12-8=4 -> sq | options 4K,6,3,7,5 (rank 1)",
  },
  {
    id: "fw-009", a: 1.1, b: -0.7,
    weights: [["cir", 1], ["sq", 3], ["tri", 2], ["hex", 5]],
    demo: [[["sq"], ["cir", "cir", "cir"]], [["tri"], ["cir", "cir"]], [["hex"], ["sq", "tri"]]],
    query: { left: ["hex", "sq"], right: ["tri", "tri"] },
    options: [["cir"], ["tri"], ["sq"], ["sq", "cir"], ["hex"]],
    keyIndex: 3,
    note: "three demos; 8-4=4 -> sq,cir | options 1,2,3,4K,5 (rank 3)",
  },
  {
    id: "fw-010", a: 1.1, b: -0.45,
    weights: [["cir", 1], ["sq", 3], ["hex", 4]],
    demo: [[["sq"], ["cir", "cir", "cir"]], [["hex"], ["sq", "cir"]]],
    query: { left: ["hex", "sq"], right: ["cir", "cir"] },
    options: [["sq", "sq"], ["hex", "sq"], ["hex", "cir"], ["hex", "hex"], ["hex", "sq", "sq"]],
    keyIndex: 2,
    note: "hex4 via sq+cir; 7-2=5 -> hex,cir (sq,sq,cir also 5 — not offered) | options 6,7,5K,8,10 (rank 0)",
  },
  {
    id: "fw-011", a: 1.1, b: -0.15,
    weights: [["cir", 2], ["tri", 3], ["sq", 5]],
    demo: [[["tri", "tri"], ["cir", "cir", "cir"]], [["sq"], ["tri", "cir"]]],
    query: { left: ["sq", "tri", "cir"], right: ["tri", "tri"] },
    options: [["tri", "cir"], ["tri"], ["sq", "cir"], ["tri", "tri"], ["cir", "cir"]],
    keyIndex: 4,
    note: "doubled base unit (cir=2); 10-6=4 -> cir,cir | options 5,3,7,6,4K (rank 1)",
  },
  {
    id: "fw-012", a: 1.15, b: 0.15,
    weights: [["star", 2], ["tri", 6], ["sq", 4]],
    demo: [[["tri"], ["star", "star", "star"]], [["sq", "sq"], ["tri", "star"]]],
    query: { left: ["tri", "tri"], right: ["sq", "sq"] },
    options: [["tri"], ["sq"], ["star"], ["tri", "star"]],
    keyIndex: 1,
    note: "4-option item; 12-8=4 -> sq (star,star also weighs 4 — NOT offered) | options 6,4K,2,8",
  },
  {
    id: "fw-013", a: 1.05, b: 0.45,
    weights: [["cir", 1], ["tri", 2], ["sq", 3], ["dia", 6]],
    demo: [[["tri"], ["cir", "cir"]], [["sq"], ["tri", "cir"]], [["dia"], ["sq", "sq"]]],
    query: { left: ["dia", "dia"], right: ["sq", "sq", "tri"] },
    options: [["sq", "sq"], ["sq"], ["tri", "tri"], ["sq", "sq", "cir"], ["sq", "tri"]],
    keyIndex: 2,
    note: "diamond chain; 12-8=4 -> tri,tri (sq,cir and dia also weigh 4/6 — only one 4 offered) | options 6,3,4K,7,5 (rank 1)",
  },
  {
    id: "fw-014", a: 1.15, b: 0.75,
    weights: [["cir", 1], ["tri", 3], ["sq", 2], ["hex", 4]],
    demo: [[["tri"], ["cir", "cir", "cir"]], [["sq"], ["cir", "cir"]], [["hex"], ["sq", "sq"]]],
    query: { left: ["hex", "tri"], right: ["sq", "sq"] },
    options: [["tri"], ["cir"], ["sq"], ["sq", "sq"], ["sq", "tri"]],
    keyIndex: 0,
    note: "remainder: 7-4=3 -> tri (sq,cir also weighs 3 — not offered) | options 3K,1,2,4,5 (rank 2)",
  },
  {
    id: "fw-015", a: 1.1, b: 1.05,
    weights: [["star", 1], ["tri", 4], ["sq", 3]],
    demo: [[["tri"], ["star", "star", "star", "star"]], [["sq", "sq", "sq"], ["tri", "tri", "star"]]],
    query: { left: ["tri", "tri", "sq"], right: ["sq", "sq"] },
    options: [["sq"], ["sq", "star"], ["tri", "star"], ["star"], ["tri", "tri", "star"]],
    keyIndex: 2,
    note: "9-unit demos; 11-6=5 -> tri,star (sq,sq,star also 5 — not offered) | options 3,4,5K,1,9 (rank 3)",
  },
  {
    id: "fw-016", a: 1.2, b: 1.35,
    weights: [["cir", 2], ["tri", 3], ["sq", 5], ["dia", 7]],
    demo: [[["tri", "tri"], ["cir", "cir", "cir"]], [["sq"], ["tri", "cir"]], [["dia"], ["sq", "cir"]]],
    query: { left: ["dia", "sq", "sq"], right: ["tri", "tri", "sq"] },
    options: [["sq"], ["sq", "cir"], ["tri", "sq"], ["dia", "cir"], ["tri", "tri"]],
    keyIndex: 4,
    note: "4 shapes, 3 chained demos; 17-11=6 -> tri,tri (cir,cir,cir also 6 — not offered) | options 5,7,8,9,6K (rank 1)",
  },
  {
    id: "fw-017", a: 1.2, b: 1.65,
    weights: [["star", 2], ["dia", 3], ["sq", 5], ["tri", 6]],
    demo: [[["tri"], ["star", "star", "star"]], [["dia", "dia"], ["tri"]], [["dia", "star"], ["sq"]]],
    query: { left: ["tri", "tri", "sq"], right: ["dia", "dia", "dia"] },
    options: [["star"], ["tri", "star"], ["dia"], ["sq"], ["sq", "star"]],
    keyIndex: 1,
    note: "17-9=8 -> tri,star (dia,dia,star also 8 — not offered) | options 2,8K,3,5,7 (rank 4)",
  },
  {
    id: "fw-018", a: 1.25, b: 1.95,
    weights: [["cir", 1], ["star", 3], ["tri", 4], ["dia", 7]],
    demo: [[["star"], ["cir", "cir", "cir"]], [["tri"], ["star", "cir"]], [["dia"], ["tri", "star"]]],
    query: { left: ["dia", "dia", "cir"], right: ["tri", "tri", "tri"] },
    options: [["cir", "cir"], ["cir"], ["tri"], ["star"], ["tri", "cir"]],
    keyIndex: 3,
    note: "3-4-7 chain; 15-12=3 -> star (cir,cir,cir also 3 — not offered) | options 2,1,4,3K,5 (rank 2)",
  },
  {
    id: "fw-019", a: 1.25, b: 2.15,
    weights: [["cir", 1], ["star", 2], ["tri", 5], ["hex", 8]],
    demo: [[["star", "star"], ["cir", "cir", "cir", "cir"]], [["tri"], ["star", "star", "cir"]], [["hex"], ["tri", "star", "cir"]]],
    query: { left: ["hex", "cir"], right: ["star", "star"] },
    options: [["star", "star"], ["star"], ["tri"], ["tri", "cir"], ["tri", "star"]],
    keyIndex: 2,
    note: "2-5-8 chain; 9-4=5 -> tri (star,sq... sq unused; star,star,cir weighs 5 — not offered) | options 4,2,5K,6,7 (rank 2)",
  },
  {
    id: "fw-020", a: 1.3, b: 2.4,
    weights: [["tri", 3], ["star", 2], ["sq", 4], ["dia", 5]],
    demo: [[["tri", "tri"], ["star", "star", "star"]], [["sq", "sq"], ["tri", "tri", "star"]], [["dia"], ["tri", "star"]]],
    query: { left: ["dia", "dia", "sq", "sq"], right: ["sq", "sq", "sq"] },
    options: [["tri", "tri"], ["star"], ["sq"], ["dia", "star"], ["sq", "sq"]],
    keyIndex: 0,
    note: "ceiling: 4-shape LCM juggle; 18-12=6 -> tri,tri (sq,star also weighs 6 — not offered) | options 6K,2,4,7,8 (rank 2)",
  },
];

function buildWeightItem(spec: WeightItemSpec): Item {
  return {
    id: spec.id,
    subtest: "figureWeights",
    broad: "Gq",
    narrow: "RQ",
    a: spec.a,
    b: spec.b,
    c: 1 / spec.options.length,
    prompt: PROMPT,
    options: spec.options.map((g) => g.join(",")),
    answer: spec.keyIndex,
    render: {
      kind: "fweights",
      weights: spec.weights,
      demo: spec.demo,
      query: spec.query,
    },
  };
}

export const figureWeights: Subtest = {
  id: "figureWeights",
  name: "Figure Weights",
  broad: "Gq",
  // Weiss et al.'s (2013) WAIS-IV five-factor validation loads Figure
  // Weights on a Quantitative Reasoning factor under Fluid Reasoning; this
  // battery files RQ under Gq (see also numberSeries/quantComparison/
  // arithmetic) with the Gf cross-loading acknowledged here.
  narrow: ["RQ"],
  instructions:
    "Each problem shows balance scales loaded with colored shapes. Every scale shown is perfectly balanced: the shapes on one side together weigh exactly as much as the shapes on the other side. The last scale has a question mark where shapes are missing. Work out what the shapes weigh from the balanced scales — shapes of the same kind always weigh the same — and choose the group that should replace the question mark so the last scale also balances. This section is untimed; there is no advantage to rushing.",
  budgetMin: 15,
  routing: { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 },
  practice: [
    {
      id: "prac-fw-01", subtest: "figureWeights", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -3, c: 0.25,
      // cir=1 tri=2; 4-1=3 -> cir,cir,cir | options 1,2,3K,5 (tri,cir also 3 — not offered)
      prompt: PROMPT,
      options: [["cir"], ["cir", "cir"], ["cir", "cir", "cir"], ["tri", "tri", "cir"]].map((g) => g.join(",")),
      answer: 2,
      render: {
        kind: "fweights",
        weights: [["cir", 1], ["tri", 2]],
        demo: [[["cir", "cir"], ["tri"]]],
        query: { left: ["tri", "tri"], right: ["cir"] },
      },
    },
    {
      id: "prac-fw-02", subtest: "figureWeights", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -3, c: 0.2,
      // star1 tri3 sq2; 5 stars = 5 -> tri,sq | options 3,4,5K,6,7
      prompt: PROMPT,
      options: [["star", "star", "star"], ["sq", "sq"], ["tri", "sq"], ["tri", "tri"], ["tri", "tri", "star"]].map((g) => g.join(",")),
      answer: 2,
      render: {
        kind: "fweights",
        weights: [["star", 1], ["tri", 3], ["sq", 2]],
        demo: [[["star", "star", "star"], ["tri"]], [["sq"], ["star", "star"]]],
        query: { left: ["star", "star", "star", "star", "star"], right: [] },
      },
    },
  ],
  items: FW_SPECS.map(buildWeightItem),
};
