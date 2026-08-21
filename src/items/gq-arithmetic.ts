import type { Subtest } from "../core/types.ts";

/**
 * Gq - Mental Arithmetic (arithmetic / arm-001..016).
 *
 * WAIS-style mental-arithmetic word problems, constructed response: the key
 * is a STRING holding a non-negative integer (the engine's answer
 * normalisation strips minus signs and decimal points, so every item is
 * authored to have a whole-number answer). No calculator, no paper; every
 * item is solvable mentally by a fluent adult at the targeted ability well
 * inside 90 seconds.
 *
 * CALIBRATION STATUS: all item parameters (a, b) below are AUTHORED
 * ESTIMATES by content inspection, not values fitted to a response sample.
 * They order the bank consistently (floor items are one-step operations on
 * tiny numbers; ceiling items hold multi-step carried state with unfriendly
 * intermediates) but absolute placement is provisional until real response
 * data exists and parameters are re-estimated.
 *
 * Difficulty anchors (content-anchored, NOT a uniform ladder — per the
 * 2026-08 difficulty audit that retired the old uniform b-ladders):
 *   b -2.5 .. -1.9  one-step join / separate / equal-groups on single-digit
 *                   numbers; the only demand is decoding the operation.
 *   b -1.5 .. -0.9  two steps or one embedded concept (order of operations,
 *                   middle-of-consecutive insight, percent means /100).
 *   b -0.5 .. +1.0  a structure the solver must set up (ratio partition,
 *                   missing-value average, unit-rate conversion, ratio with
 *                   a difference, simple-interest formula retrieval).
 *   b +1.4 .. +2.6  multi-step items with held carry state (digit reversal
 *                   under two constraints, harmonic combined rates,
 *                   modular doubling, successive percentages of a shifting
 *                   base, staged pipes with a head start).
 * a is 0.9-1.3, higher for multi-step items, flat (not a lockstep ramp):
 * knowledge-retrieval items (interest, single percent) sit at 1.0 or below
 * because within-item reasoning spreads less there.
 *
 * Topic coverage per the subtest spec: rates/work (arm-013, arm-016), age
 * problems (arm-010), percentages and discounts (arm-006, arm-015), ratio
 * sharing (arm-007), consecutive numbers (arm-005), digit problems
 * (arm-012), speed/distance/time (arm-009), simple interest (arm-011),
 * averages with a missing value (arm-008), remainders/modular structure
 * (arm-014), multi-step shopping change (arm-004). No two items share a
 * surface story + structure.
 *
 * Keys are re-derived arithmetically from an independent per-item
 * derivation table in test/arithmetic-keys.test.ts (never copied from the
 * prompts), which also enforces: integer answers >= 0, >= 10 distinct
 * answer values, exact id set, prompt shape, c = 0, b floor <= -2.5 and
 * ceiling >= +2.6, no duplicate prompts, and that every number used by a
 * derivation appears verbatim as a digit token in its prompt.
 */

export const arithmetic: Subtest = {
  id: "arithmetic",
  name: "Mental Arithmetic",
  broad: "Gq",
  narrow: ["RQ"],
  instructions:
    "Solve each problem in your head — no calculator and no paper. Type your answer as a plain whole number (of dollars, minutes, points, and so on), without any units.",
  budgetMin: 14,
  routing: { maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.50, entryTheta: 0 },
  // Unscored sample: one-step join on single digits (2 + 2 = 4).
  practice: [
    {
      id: "prac-arm-01", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -3, c: 0,
      prompt: "Tom has 2 apples and buys 2 more. How many apples does he have now?",
      answer: "4",
      render: { kind: "text" },
    },
    {
      id: "prac-arm-02", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -3, c: 0,
      prompt: "Sara has 9 marbles and gives 4 to a friend. How many marbles does she have now?",
      answer: "5",
      render: { kind: "text" },
    },
  ],
  items: [
    {
      id: "arm-001", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -2.5, c: 0,
      // 4 + 3 = 7. Floor item: one join on single digits, the only demand
      // is mapping "buys more" onto addition.
      prompt: "Lena has 4 stamps and buys 3 more. How many stamps does she have now?",
      answer: "7",
      render: { kind: "text" },
    },
    {
      id: "arm-002", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -2.3, c: 0,
      // 9 - 4 = 5. One-step separate on single digits; marginally above the
      // join because "still work" must be mapped onto subtraction.
      prompt: "A van has 9 seats and 4 of them are broken. How many seats still work?",
      answer: "5",
      render: { kind: "text" },
    },
    {
      id: "arm-003", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 0.9, b: -1.9, c: 0,
      // 6 x 4 = 24. One-step equal-groups; the jump over +/- is recalled
      // multiplication facts with a two-digit product.
      prompt: "A pack holds 6 batteries. How many batteries are in 4 packs?",
      answer: "24",
      render: { kind: "text" },
    },
    {
      id: "arm-004", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.0, b: -1.5, c: 0,
      // 20 - 3 x 5 = 5. Two steps with an order-of-operations hold (multiply
      // then subtract), the entry representation of shopping change.
      prompt:
        "Bottles of water cost 3 dollars each. You buy 5 bottles and pay with a 20-dollar note. How many dollars of change do you get?",
      answer: "5",
      render: { kind: "text" },
    },
    {
      id: "arm-005", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.1, b: -1.2, c: 0,
      // 36 / 3 = 12. Consecutive numbers: the solver must see that the
      // middle of 3 consecutive numbers is their average (11, 12, 13). The
      // insight, not the arithmetic, carries the item.
      prompt:
        "The numbers on 3 houses along a street are consecutive whole numbers and add up to 36. What is the number on the middle house?",
      answer: "12",
      render: { kind: "text" },
    },
    {
      id: "arm-006", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.0, b: -0.9, c: 0,
      // 100 - 100 x 20/100 = 80. Single percent discount off a 100-dollar
      // base: the demand is knowing percent = per hundred; the arithmetic
      // is trivial, so discrimination stays moderate.
      prompt:
        "A phone that costs 100 dollars is discounted by 20 percent in a sale. How many dollars does it cost during the sale?",
      answer: "80",
      render: { kind: "text" },
    },
    {
      id: "arm-007", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.1, b: -0.5, c: 0,
      // 40 x 3 / (3 + 5) = 15. Ratio partition: total parts first, then the
      // smaller share. Two held quantities, friendly numbers.
      prompt: "Ana and Ben share 40 marbles in the ratio 3 to 5. How many marbles does Ana get?",
      answer: "15",
      render: { kind: "text" },
    },
    {
      id: "arm-008", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.1, b: -0.1, c: 0,
      // 5 x 140 - (120 + 140 + 130 + 150) = 700 - 540 = 160. Missing-value
      // average: hold four scores, form the target total, subtract. The
      // numbers are round, the structure is not.
      prompt:
        "A bowler scores 120, 140, 130 and 150 points in her first 4 games. What score does she need in her 5th game to average 140 points over all 5 games?",
      answer: "160",
      render: { kind: "text" },
    },
    {
      id: "arm-009", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.1, b: 0.3, c: 0,
      // 7 x 60 / 20 = 21. Unit-rate scaling: minutes to minutes via a
      // triple, with the 60-minute hour stated in the prompt.
      prompt:
        "A cyclist rides 7 kilometers in 20 minutes at a steady speed. How many kilometers does she ride in 60 minutes at that speed?",
      answer: "21",
      render: { kind: "text" },
    },
    {
      id: "arm-010", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.1, b: 0.7, c: 0,
      // 30 x 1 / (4 - 1) = 10. Age problem as ratio with a DIFFERENCE (not a
      // sum): 3 parts = 30 years, so the son's 1 part = 10. Setting the
      // parts equation is the step low-b examinees miss.
      prompt:
        "A father is 30 years older than his son, and the ratio of their ages is 4 to 1. How old is the son now?",
      answer: "10",
      render: { kind: "text" },
    },
    {
      id: "arm-011", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.0, b: 1.0, c: 0,
      // 100 x 5/100 x 6 = 5 x 6 = 30. Simple interest: per-year interest on
      // a 100-dollar principal, scaled by years. Formula retrieval, not
      // multi-step reasoning, so a stays at 1.0.
      prompt:
        "Ravi invests 100 dollars in an account that pays 5 percent simple interest per year. How many dollars of interest does he earn in total over 6 years?",
      answer: "30",
      render: { kind: "text" },
    },
    {
      id: "arm-012", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.2, b: 1.4, c: 0,
      // digit sum 10, reversal +36 -> 37 (73 - 37 = 36; 3 + 7 = 10). Two
      // simultaneous constraints on place value; the solver must hold the
      // tens/units structure while checking both conditions.
      prompt:
        "The digits of a 2-digit number add up to 10. Reversing the digits gives a number that is 36 larger than the original. What is the original number?",
      answer: "37",
      render: { kind: "text" },
    },
    {
      id: "arm-013", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.2, b: 1.7, c: 0,
      // lcm(20, 30) = 60; 60 / (60/20 + 60/30) = 60/5 = 12. Combined work
      // rates: additive rates, not additive times — the classic harmonic
      // misread (25) is what the item detects.
      prompt:
        "One printer prints a banner in 20 minutes working alone, and a second printer takes 30 minutes working alone. How many minutes do the two printers take to print the banner together?",
      answer: "12",
      render: { kind: "text" },
    },
    {
      id: "arm-014", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.3, b: 1.9, c: 0,
      // (3 x 2) mod 7 = 6. Remainder structure: doubling commutes with
      // reduction mod 7, and 6 < 7 so no wrap-around. Unfamiliar structure
      // rather than heavy arithmetic, so a is high.
      prompt:
        "When a whole number is divided by 7, the remainder is 3. What is the remainder when 2 times this whole number is divided by 7?",
      answer: "6",
      render: { kind: "text" },
    },
    {
      id: "arm-015", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.3, b: 2.2, c: 0,
      // 100 -> 70 (minus 30 percent), then 70 - 70 x 20/100 = 56. Successive
      // discounts on a SHIFTING base: the 50 trap (adding the percents)
      // must be resisted while carrying the intermediate forward.
      prompt:
        "A jacket priced at 100 dollars is discounted by 30 percent. At the checkout a further 20 percent is taken off the discounted price. How many dollars does the jacket cost in the end?",
      answer: "56",
      render: { kind: "text" },
    },
    {
      id: "arm-016", subtest: "arithmetic", broad: "Gq", narrow: "RQ",
      a: 1.3, b: 2.6, c: 0,
      // lcm(10, 15) = 30; rates 3/30 and 2/30 per minute; head start
      // 5 x 3/30 = 15/30; remaining 15/30 at 5/30 per minute -> 3. Ceiling
      // item: staged combined rates, four steps, fractional carry held in
      // lcm units from start to finish.
      prompt:
        "Pipe A fills an empty tank in 10 minutes running alone, and pipe B alone takes 15 minutes. Pipe A runs alone for 5 minutes before pipe B is opened. How many minutes after pipe B opens does it take to fill the tank completely?",
      answer: "3",
      render: { kind: "text" },
    },
  ],
};
