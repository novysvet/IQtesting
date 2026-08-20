import test from "node:test";
import assert from "node:assert/strict";
import { arithmetic } from "../src/items/gq-arithmetic.ts";

// ============================================================================
// Mental Arithmetic: every key is re-derived ARITHMETICALLY from the
// per-item derivation table below. Each entry carries the givens (`nums`,
// exactly the digit tokens that appear in the prompt) and a `calc` function
// that recombines them — the key is never copied from the bank, and the
// formula is expressed independently of the prompt wording. The unit-system
// constant in the percent items (/100) is itself a declared given: every
// percent item is based on a 100-dollar principal that appears verbatim in
// the prompt, so no derivation uses an undeclared magic number.
// ============================================================================

/** Greatest common divisor, used to build exact integer lcm arithmetic. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Least common multiple — exact work-rate computations run in lcm units. */
function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

interface Derivation {
  /** Surface-structure tag; all 16 must differ (near-duplicate guard). */
  topic: string;
  /** The givens, as digit tokens that must appear verbatim in the prompt. */
  nums: number[];
  /** Recombination of the givens into the key; result must be the answer. */
  calc: (n: number[]) => number;
}

const DERIVATIONS: Record<string, Derivation> = {
  "arm-001": {
    topic: "join-tiny", nums: [4, 3],
    calc: (n) => n[0]! + n[1]!, // stamps: 4 + 3
  },
  "arm-002": {
    topic: "separate-tiny", nums: [9, 4],
    calc: (n) => n[0]! - n[1]!, // working seats: 9 - 4
  },
  "arm-003": {
    topic: "equal-groups", nums: [6, 4],
    calc: (n) => n[0]! * n[1]!, // batteries: 6 x 4
  },
  "arm-004": {
    topic: "shopping-change", nums: [3, 5, 20],
    calc: (n) => n[2]! - n[0]! * n[1]!, // change: 20 - (3 x 5)
  },
  "arm-005": {
    topic: "consecutive-middle", nums: [3, 36],
    // middle of k consecutive numbers = sum / k: 36 / 3
    calc: (n) => n[1]! / n[0]!,
  },
  "arm-006": {
    topic: "percent-discount", nums: [100, 20],
    calc: (n) => n[0]! - (n[0]! * n[1]!) / 100, // 100 - 100x20/100
  },
  "arm-007": {
    topic: "ratio-share-sum", nums: [3, 5, 40],
    calc: (n) => (n[2]! * n[0]!) / (n[0]! + n[1]!), // 40 x 3 / (3 + 5)
  },
  "arm-008": {
    topic: "average-missing-value", nums: [120, 140, 130, 150, 5, 140],
    // target total minus banked total: 5x140 - (120+140+130+150)
    calc: (n) => n[4]! * n[5]! - (n[0]! + n[1]! + n[2]! + n[3]!),
  },
  "arm-009": {
    topic: "speed-unit-rate", nums: [7, 20, 60],
    calc: (n) => (n[0]! * n[2]!) / n[1]!, // 7 x 60 / 20
  },
  "arm-010": {
    topic: "age-ratio-difference", nums: [30, 4, 1],
    // difference x small part / (parts apart): 30 x 1 / (4 - 1)
    calc: (n) => (n[0]! * n[2]!) / (n[1]! - n[2]!),
  },
  "arm-011": {
    topic: "simple-interest", nums: [100, 5, 6],
    calc: (n) => ((n[0]! * n[1]!) / 100) * n[2]!, // 100x5/100 per year, x 6
  },
  "arm-012": {
    topic: "digit-reversal", nums: [10, 36],
    // search tens digit t (units u = sum - t): 10u+t exceeds 10t+u by 36
    calc: (n) => {
      const sum = n[0]!;
      const diff = n[1]!;
      for (let t = 0; t <= sum; t++) {
        const u = sum - t;
        if (10 * u + t - (10 * t + u) === diff) return 10 * t + u;
      }
      return -1;
    },
  },
  "arm-013": {
    topic: "combined-work-rates", nums: [20, 30],
    // harmonic combination in exact lcm units: l / (l/a + l/b)
    calc: (n) => {
      const l = lcm(n[0]!, n[1]!);
      return l / (l / n[0]! + l / n[1]!);
    },
  },
  "arm-014": {
    topic: "remainder-modular", nums: [7, 3, 2],
    calc: (n) => (n[1]! * n[2]!) % n[0]!, // (3 x 2) mod 7
  },
  "arm-015": {
    topic: "successive-discounts", nums: [100, 30, 20],
    // base shifts between the discounts: 100 -> 70 -> 70 - 70x20/100
    calc: (n) => {
      const first = n[0]! - (n[0]! * n[1]!) / 100;
      return first - (first * n[2]!) / 100;
    },
  },
  "arm-016": {
    topic: "staged-combined-rates", nums: [10, 15, 5],
    // exact lcm units: rates l/a and l/b, head start of 5 at rate l/a,
    // remainder filled at the combined rate
    calc: (n) => {
      const l = lcm(n[0]!, n[1]!);
      const rateA = l / n[0]!;
      const rateB = l / n[1]!;
      const remaining = l - n[2]! * rateA;
      return remaining / (rateA + rateB);
    },
  },
};

const EXPECTED_IDS = Array.from(
  { length: 16 },
  (_, k) => "arm-" + String(k + 1).padStart(3, "0"),
);

test("every arithmetic key re-derives from the independent derivation table (arm-001..016)", () => {
  assert.equal(arithmetic.items.length, 16);
  for (const item of arithmetic.items) {
    const der = DERIVATIONS[item.id];
    assert.ok(der, item.id + " has no derivation entry in the test");
    const result = der.calc(der.nums);
    assert.ok(
      Number.isInteger(result) && result >= 0,
      item.id + " derivation produced a non-whole or negative value: " + result,
    );
    assert.equal(String(result), item.answer, item.id + " key does not match its re-derivation");
  }
});

test("answers are non-negative integer strings with at least 10 distinct values", () => {
  const values = new Set<string>();
  for (const item of arithmetic.items) {
    assert.equal(typeof item.answer, "string", item.id + " must be a recall item (string key)");
    const key = item.answer as string;
    assert.match(
      key,
      /^[0-9]+$/,
      item.id + ' answer "' + key + '" is not a non-negative integer string',
    );
    values.add(key);
  }
  assert.ok(
    values.size >= 10,
    "only " + values.size + " distinct answer values - guessing small numbers is too cheap",
  );
});

test("ids are exactly arm-001..arm-016, prompts are non-empty and end with a question mark", () => {
  assert.deepEqual(arithmetic.items.map((i) => i.id), EXPECTED_IDS);
  assert.equal(new Set(arithmetic.items.map((i) => i.id)).size, 16, "duplicate ids");
  for (const item of arithmetic.items) {
    assert.ok(item.prompt.length > 0, item.id + " has an empty prompt");
    assert.ok(item.prompt.endsWith("?"), item.id + ' prompt must end with "?": ' + item.prompt);
  }
});

test("c = 0 everywhere, b floor <= -2.5, b ceiling >= +2.6, no duplicate prompts", () => {
  for (const item of arithmetic.items) {
    assert.equal(item.c, 0, item.id + " recall items cannot have a guessing asymptote");
  }
  const bs = arithmetic.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.5, "bank floor must reach -2.5, got " + Math.min(...bs));
  assert.ok(Math.max(...bs) >= 2.6, "bank ceiling must reach +2.6, got " + Math.max(...bs));
  const prompts = arithmetic.items.map((i) => i.prompt);
  assert.equal(new Set(prompts).size, prompts.length, "two items share a prompt");
});

test("prompt/derivation drift guard: every derivation number appears as a digit token in the prompt", () => {
  for (const item of arithmetic.items) {
    const der = DERIVATIONS[item.id]!;
    const tokens: string[] = item.prompt.match(/\d+/g) ?? [];
    for (const num of der.nums) {
      assert.ok(
        tokens.includes(String(num)),
        item.id + ": derivation number " + num + " is not a digit token in the prompt (" +
          der.nums.join(", ") + " vs prompt tokens " + tokens.join(", ") + ")",
      );
    }
  }
});

test("near-duplicate guard: all 16 surface-structure topics are distinct", () => {
  const topics = arithmetic.items.map((i) => DERIVATIONS[i.id]!.topic);
  assert.equal(new Set(topics).size, 16, "two items share a surface story + structure tag");
});

test("frozen subtest shape: id, name, abilities, budget, routing, text rendering", () => {
  assert.equal(arithmetic.id, "arithmetic");
  assert.equal(arithmetic.name, "Mental Arithmetic");
  assert.equal(arithmetic.broad, "Gq");
  assert.deepEqual(arithmetic.narrow, ["RQ"]);
  assert.equal(arithmetic.budgetMin, 14);
  assert.deepEqual(arithmetic.routing, {
    maxItems: 12,
    minItems: 6,
    ceilingMisses: 4,
    targetSe: 0.5,
    entryTheta: 0,
  });
  for (const item of arithmetic.items) {
    assert.equal(item.subtest, "arithmetic", item.id + " subtest tag");
    assert.equal(item.broad, "Gq", item.id + " broad tag");
    assert.equal(item.narrow, "RQ", item.id + " narrow tag");
    assert.deepEqual(item.render, { kind: "text" }, item.id + " must render as text");
    assert.ok(
      item.a >= 0.9 && item.a <= 1.3,
      item.id + " discrimination " + item.a + " outside the authored 0.9-1.3 band",
    );
  }
});
