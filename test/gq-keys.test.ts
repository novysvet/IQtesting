import test from "node:test";
import assert from "node:assert/strict";
import { numberSeries, quantComparison } from "../src/items/gq.ts";

// ============================================================================
// Number Series: every key is re-derived by executing the item's stated rule
// as code. Generators implement the actual math from each item's rule
// comment - the key is never copied from the bank.
// ============================================================================

type Gen = (count: number) => number[];

/** a(k) = start + (k-1) * step */
const constantDifference = (start: number, step: number): Gen => (n) =>
  Array.from({ length: n }, (_, k) => start + k * step);

/** a(k) = start * factor^(k-1) */
const constantRatio = (start: number, factor: number): Gen => (n) =>
  Array.from({ length: n }, (_, k) => start * factor ** k);

/** a(k) = f(k), k 1-indexed (squares, pronic, triangular, n^2+1, cubes, 2^k-1) */
const polynomial = (f: (k: number) => number): Gen => (n) =>
  Array.from({ length: n }, (_, k) => f(k + 1));

/** a(k+1) = m * a(k) + c */
const affineMultiplicative = (start: number, m: number, c: number): Gen => (n) => {
  const out = [start];
  for (let k = 1; k < n; k++) out.push(out[k - 1]! * m + c);
  return out;
};

/** Odd positions follow g1, even positions follow g2. */
const interleaved = (g1: Gen, g2: Gen): Gen => (n) => {
  const odd = g1(Math.ceil(n / 2));
  const even = g2(Math.floor(n / 2));
  return Array.from({ length: n }, (_, k) =>
    k % 2 === 0 ? odd[k / 2]! : even[(k - 1) / 2]!,
  );
};

/** Differences double each step: d, 2d, 4d, ... */
const doublingDifferences = (start: number, firstDifference: number): Gen => (n) => {
  const out = [start];
  let d = firstDifference;
  for (let k = 1; k < n; k++) {
    out.push(out[k - 1]! + d);
    d *= 2;
  }
  return out;
};

/** Second differences 1, 2, 3, ... (each one larger than the previous). */
const growingSecondDifferences = (a1: number, d1: number): Gen => (n) => {
  const out = [a1];
  let d = d1;
  let second = 1;
  for (let k = 1; k < n; k++) {
    out.push(out[k - 1]! + d);
    d += second;
    second += 1;
  }
  return out;
};

/** Alternate two operations starting with +add: +add, x mul, +add, x mul, ... */
const alternatingOps = (start: number, add: number, mul: number): Gen => (n) => {
  const out = [start];
  for (let k = 1; k < n; k++) {
    const prev = out[k - 1]!;
    out.push(k % 2 === 1 ? prev + add : prev * mul);
  }
  return out;
};

/** a(1) = a1; a(k) = 2*a(k-1) + (k-1) */
const recurrenceDoublePlusIndex = (a1: number): Gen => (n) => {
  const out = [a1];
  for (let k = 2; k <= n; k++) out.push(2 * out[k - 2]! + (k - 1));
  return out;
};

/** a(k) = a(k-1) + 2*a(k-2) with two seeds. */
const recurrenceWeightedSum = (a1: number, a2: number): Gen => (n) => {
  const out = [a1, a2];
  for (let k = 3; k <= n; k++) out.push(out[k - 2]! + 2 * out[k - 3]!);
  return out;
};

const NSR_RULES: Record<string, Gen> = {
  "nsr-001": constantDifference(2, 3), // +3
  "nsr-002": constantDifference(5, 7), // +7
  "nsr-003": constantRatio(3, 2), // x2
  "nsr-004": polynomial((k) => k * k), // squares
  "nsr-005": polynomial((k) => k * (k + 1)), // pronic
  "nsr-006": affineMultiplicative(2, 3, 2), // x3+2
  "nsr-007": polynomial((k) => (k * (k + 1)) / 2), // triangular
  "nsr-008": polynomial((k) => (k - 1) ** 2 + 1), // n^2+1 for n = 0, 1, 2, ...
  "nsr-009": polynomial((k) => k ** 3), // cubes
  "nsr-010": polynomial((k) => 2 ** k - 1), // 2^n-1
  "nsr-011": interleaved(constantDifference(3, 4), constantRatio(2, 2)), // odd +4, even x2
  "nsr-012": doublingDifferences(3, 1), // differences 1,2,4,8,16,32
  "nsr-013": alternatingOps(2, 1, 2), // alternating +1, x2
  "nsr-014": growingSecondDifferences(1, 2), // second differences 1,2,3,4
  "nsr-015": recurrenceDoublePlusIndex(1), // a(n)=2a(n-1)+(n-1)
  "nsr-016": recurrenceWeightedSum(2, 3), // a(n)=a(n-1)+2a(n-2)
};

/** Parse the shown terms out of a prompt like "2, 5, 8, 11, 14, ?". */
function shownTerms(prompt: string): number[] {
  return prompt
    .slice(0, prompt.indexOf("?"))
    .split(",")
    .filter((s) => s.trim() !== "")
    .map((s) => Number(s.trim()));
}

test("every number-series key re-derives from its encoded rule (nsr-001..016)", () => {
  assert.equal(numberSeries.items.length, 16);
  for (const item of numberSeries.items) {
    const gen = NSR_RULES[item.id];
    assert.ok(gen, item.id + " has no encoded rule in the test");
    const shown = shownTerms(item.prompt);
    const full = gen(shown.length + 1);
    assert.deepEqual(
      shown,
      full.slice(0, shown.length),
      item.id + " shown terms do not match its stated rule",
    );
    const next = full[shown.length]!;
    assert.equal(
      item.options![item.answer as number],
      String(next),
      item.id + " keyed option is not the rule-derived next term",
    );
  }
});

test("number-series format: 5 distinct options, c = 1/5, no flanker within 3 of the key", () => {
  for (const item of numberSeries.items) {
    assert.equal(item.options!.length, 5, item.id + " must have 5 options (c = 1/5)");
    assert.equal(new Set(item.options).size, 5, item.id + " has duplicate options");
    assert.equal(item.c, 0.2, item.id + " c must be 1/5");
    const key = Number(item.options![item.answer as number]);
    for (const opt of item.options!) {
      if (Number(opt) === key) continue;
      assert.ok(
        Math.abs(Number(opt) - key) > 3,
        item.id + ": distractor " + opt + " is within 3 of key " + key +
          " - a guess between near neighbors inflates c above 1/5",
      );
    }
  }
});

test("no two number-series items share the same first-difference chain (nsr-012 = nsr-005 regression)", () => {
  const chains = new Map<string, string>();
  for (const item of numberSeries.items) {
    const s = shownTerms(item.prompt);
    const chain = s.slice(1).map((v, i) => v - s[i]!).join(",");
    const owner = chains.get(chain);
    assert.equal(owner, undefined, item.id + " has the same difference chain as " + owner);
    chains.set(chain, item.id);
  }
});

test("number-series key positions do not repeat with a short cycle (learnable-position regression)", () => {
  const pos = numberSeries.items.map((i) => i.answer as number);
  for (let p = 1; p <= 5; p++) {
    let periodic = true;
    for (let i = 0; i + p < pos.length; i++) {
      if (pos[i] !== pos[i + p]!) {
        periodic = false;
        break;
      }
    }
    assert.ok(!periodic, "answer positions repeat with period " + p);
  }
});

// ============================================================================
// Quantitative Comparison: quantities are re-encoded as small functions
// written from the item text; the comparison is recomputed and checked
// against the keyed direction. The answer index is only ever the assertion
// target - quantities are never derived from it.
// ============================================================================

type Dir = -1 | 0 | 1; // sign of A - B

const EPS = 1e-9;

function direction(a: number, b: number): Dir {
  if (Math.abs(a - b) <= EPS) return 0;
  return a > b ? 1 : -1;
}

/** Keyed direction implied by the answer index (0 = A, 1 = B, 2 = equal). */
function expectedDir(answer: number): Dir {
  if (answer === 0) return 1;
  if (answer === 1) return -1;
  return 0;
}

function factorial(n: number): number {
  let out = 1;
  for (let k = 2; k <= n; k++) out *= k;
  return out;
}

function primesBetween(lo: number, hi: number): number {
  let count = 0;
  for (let p = lo + 1; p < hi; p++) {
    let prime = p > 1;
    for (let d = 2; d * d <= p && prime; d++) if (p % d === 0) prime = false;
    if (prime) count++;
  }
  return count;
}

// Items whose quantities are fixed numeric constants: [quantityA, quantityB].
const QCP_CONST: Record<string, [() => number, () => number]> = {
  "qcp-001": [() => 12 + 15, () => 30 - 4],
  "qcp-002": [() => 4 * 9, () => 6 * 6],
  "qcp-003": [() => 1 / 2, () => 3 / 5],
  "qcp-004": [() => 2 ** 5, () => 5 ** 2],
  // percentages computed with exact integer arithmetic (25*80/100 both sides)
  "qcp-005": [() => (25 * 80) / 100, () => (80 * 25) / 100],
  "qcp-006": [() => Math.sqrt(50), () => 7],
  "qcp-007": [() => (4 + 8 + 18) / 3, () => 10],
  // x is fixed at -3 by the statement, so this is the constant case
  "qcp-008": [() => (-3) ** 2, () => 9],
  "qcp-010": [() => 4 * Math.sqrt(36), () => 2 * (4 + 9)],
  "qcp-011": [() => 2 ** 30, () => 3 ** 20],
  "qcp-012": [() => (25 - 7) / 3, () => 6],
  "qcp-014": [() => primesBetween(20, 40), () => 4],
  "qcp-015": [() => 0.3 ** 3, () => 0.3 ** 2 * 0.4],
  "qcp-016": [() => 1 / 2 + 1 / 3 + 1 / 7, () => 1],
  "qcp-017": [() => 7 ** 7, () => factorial(7)],
  "qcp-018": [() => 5 * 4 * 3, () => 60],
};

// Items with a free (qcp-009) or constrained (qcp-013) variable: each
// admissible value of the variable maps to the pair [A, B].
const X_SAMPLES = [2, 0.5, 1, 0, -1, 3];
const QCP_VARIABLE: Record<string, number[][]> = {
  // x squared vs x cubed, x free over the reals
  "qcp-009": X_SAMPLES.map((x) => [x ** 2, x ** 3]),
  // y where y^2 = 16: both roots are admissible; B is fixed at 4
  "qcp-013": [4, -4].map((y) => [y, 4]),
};

test("every quant-comparison key holds when both quantities are recomputed (qcp-001..018)", () => {
  assert.equal(quantComparison.items.length, 18);
  for (const item of quantComparison.items) {
    assert.equal(item.options!.length, 4, item.id + " must have 4 options (c = 1/4)");
    assert.equal(item.c, 0.25, item.id + " c must be 1/4");
    const konst = QCP_CONST[item.id];
    const variable = QCP_VARIABLE[item.id];
    assert.ok(konst || variable, item.id + " has no encoded quantities in the test");
    if (konst) {
      const [qa, qb] = konst;
      assert.equal(
        direction(qa(), qb()),
        expectedDir(item.answer as number),
        item.id + " recomputed comparison contradicts the key",
      );
    } else if (variable) {
      const dirs = new Set(variable.map(([qa, qb]) => direction(qa!, qb!)));
      if (item.answer === 3) {
        // "Cannot be determined": sampled values must genuinely disagree.
        assert.ok(
          dirs.size >= 2,
          item.id + " is keyed cannot-be-determined but every sampled value agrees",
        );
      } else {
        // Fixed direction key: every admissible value must agree with it.
        const want = expectedDir(item.answer as number);
        assert.ok(
          dirs.size === 1 && dirs.has(want),
          item.id + " direction varies across sampled values but the key is fixed",
        );
      }
    }
  }
});

/** Surface-structure tag per item, read from the item text. */
const QCP_STRUCTURE: Record<string, string> = {
  "qcp-001": "sum-vs-difference",
  "qcp-002": "product-vs-product",
  "qcp-003": "fraction-vs-fraction",
  "qcp-004": "a^b-vs-b^a",
  "qcp-005": "percent-of",
  "qcp-006": "root-vs-integer",
  "qcp-007": "average",
  "qcp-008": "square-of-fixed-negative",
  "qcp-009": "x^2-vs-x^3",
  "qcp-010": "geometric-perimeter",
  "qcp-011": "large-powers",
  "qcp-012": "linear-equation",
  "qcp-013": "quadratic-root",
  "qcp-014": "prime-count",
  "qcp-015": "decimal-powers",
  "qcp-016": "fraction-sum-vs-one",
  "qcp-017": "power-vs-factorial",
  "qcp-018": "permutation-count",
};

test("no two adjacent quant-comparison items share surface structure and key (twin regression)", () => {
  const items = quantComparison.items;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]!;
    const cur = items[i]!;
    const s1 = QCP_STRUCTURE[prev.id];
    const s2 = QCP_STRUCTURE[cur.id];
    assert.ok(s1 && s2, "missing structure tag for " + prev.id + "/" + cur.id);
    assert.ok(
      !(s1 === s2 && prev.answer === cur.answer),
      cur.id + " twins " + prev.id + " (same structure and same key)",
    );
  }
  // Specific audit regression (§2.5): qcp-004/qcp-006 must no longer both
  // be a^b-vs-b^a with the same key.
  assert.notEqual(QCP_STRUCTURE["qcp-004"], QCP_STRUCTURE["qcp-006"]);
});

test("quant-comparison instructions disclose that unbound variables range over all reals", () => {
  assert.ok(
    quantComparison.instructions.includes("a variable may take any real value"),
    "instructions must state the all-real-values convention (fairness of D-keyed items)",
  );
});
