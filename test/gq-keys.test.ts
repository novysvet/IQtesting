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
  "nsr-017": constantDifference(1, 2), // +2 (basal)
  "nsr-018": constantDifference(3, 1), // +1, counting (basal)
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

test("every number-series key re-derives from its encoded rule (nsr-001..018)", () => {
  assert.equal(numberSeries.items.length, 18);
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

test("number-series key value-ranks span the options without a learnable mode (rank-exploit regression)", () => {
  // 2026-08-21 re-author regression: the former bank never keyed the
  // smallest or largest value and keyed the second-smallest in 8/18 items,
  // so "always pick the 2nd-smallest value" scored 44% (chance 20%) and
  // "eliminate the extremes" was risk-free. Value ranks survive the
  // per-session display permutation, so only the authored distractor sets
  // can break the pattern.
  const keyRank = (item: { options?: string[]; answer: number | string }) => {
    const vals = (item.options ?? []).map(Number);
    const key = vals[item.answer as number]!;
    return [...vals].sort((a, b) => a - b).indexOf(key);
  };
  const ranks = numberSeries.items.map((i) => keyRank(i));
  assert.equal(ranks.length, 18);
  // Extremes must occur: "eliminate min and max" must be unsafe.
  assert.ok(
    ranks.filter((r) => r === 0).length >= 3,
    "the key is the smallest option in fewer than 3 items - the minimum is eliminable",
  );
  assert.ok(
    ranks.filter((r) => r === 4).length >= 3,
    "the key is the largest option in fewer than 3 items - the maximum is eliminable",
  );
  // Every rank must be represented, none may exceed 6/18 items.
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  for (let r = 0; r <= 4; r++) {
    assert.ok(counts.has(r), "rank " + r + " never occurs - an entire value-rank is eliminable");
  }
  for (const [r, n] of counts) {
    assert.ok(n <= 6, "rank " + r + " occurs in " + n + "/18 items (more than 6)");
  }
  // "Always answer at the modal rank" must not beat chance beyond integer
  // granularity: 18 items over 5 ranks force a mode of at least 4, and
  // 4/18 = 22.2% sits within 2.3 points of the 1/5 = 20% chance level.
  const modal = Math.max(...counts.values());
  assert.ok(
    modal <= Math.ceil(ranks.length / 5),
    "the modal value-rank occurs in " + modal + "/18 items - a rank-guessing exploit",
  );
  // The practice items must not prime the heuristic either (both formerly
  // keyed the second-smallest value).
  const practice = numberSeries.practice ?? [];
  const pracRanks = practice.map((i) => keyRank(i));
  assert.equal(practice.length, 2, "number series practice set must have two items");
  assert.ok(
    pracRanks[0] !== pracRanks[1],
    "both practice keys share a value-rank - the practice section primes a rank heuristic",
  );
});

// ============================================================================
// Quantitative Comparison: quantities are re-encoded as small functions
// written from the item text; the comparison is recomputed and checked
// against the keyed direction. The answer index is only ever the assertion
// target - quantities are never derived from it. Each encoding also lists
// the prompt substrings it was read from, and the test asserts those
// tokens appear verbatim in the bank prompt, so a one-digit prompt edit
// (or a QC_OPTIONS reorder) turns this suite red instead of silently
// "verifying" a now-wrong key.
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

/** The shared option set, pinned in its canonical A/B/C/D order. */
const QC_CANONICAL = [
  "Quantity A is greater",
  "Quantity B is greater",
  "The two quantities are equal",
  "Cannot be determined from the information given",
];

/**
 * Word-boundary membership: the token must appear in the prompt without
 * being glued to another letter, digit, dot, or slash, so "4" does not
 * match "40", "0.4", or "1/4".
 */
function promptHasToken(prompt: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![\\w./])" + escaped + "(?![\\w./])").test(prompt);
}

type QcpEncoding = {
  /** Prompt substrings the encoded quantities were read from. */
  tokens: string[];
  /** Determinate items: both quantities are fixed numeric constants. */
  konst?: [() => number, () => number];
  /** Free-variable items: each admissible value maps to the pair [A, B]. */
  variable?: number[][];
};

const X_SAMPLES = [2, 0.5, 1, 0, -1, 3];

const QCP: Record<string, QcpEncoding> = {
  "qcp-001": { tokens: ["12 + 15", "30 - 4"], konst: [() => 12 + 15, () => 30 - 4] },
  // two numbers with sum 10: 5x5 = 25 > 24, 4x6 = 24 = 24, 1x9 = 9 < 24
  "qcp-002": {
    tokens: ["The product of two numbers whose sum is 10", "24"],
    variable: [[5 * 5, 24], [4 * 6, 24], [1 * 9, 24]],
  },
  "qcp-003": { tokens: ["1/2", "3/5"], konst: [() => 1 / 2, () => 3 / 5] },
  "qcp-004": { tokens: ["2^5", "5^2"], konst: [() => 2 ** 5, () => 5 ** 2] },
  // percentages computed with exact integer arithmetic (25*80/100 both sides)
  "qcp-005": {
    tokens: ["25% of 80", "80% of 25"],
    konst: [() => (25 * 80) / 100, () => (80 * 25) / 100],
  },
  "qcp-006": { tokens: ["The square root of 50", "7"], konst: [() => Math.sqrt(50), () => 7] },
  "qcp-007": { tokens: ["4, 8, and 18", "10"], konst: [() => (4 + 8 + 18) / 3, () => 10] },
  // x is fixed at -3 by the statement, so this is the constant case
  "qcp-008": { tokens: ["x squared, where x = -3", "9"], konst: [() => (-3) ** 2, () => 9] },
  // x squared vs x cubed, x free over the reals
  "qcp-009": {
    tokens: ["x squared", "x cubed"],
    variable: X_SAMPLES.map((x) => [x ** 2, x ** 3]),
  },
  // rectangles with area 36: 4x9 -> 26 < 30, 3x12 -> 30 = 30, 2x18 -> 40 > 30
  "qcp-010": {
    tokens: ["The perimeter of a rectangle with area 36", "30"],
    variable: [[2 * (4 + 9), 30], [2 * (3 + 12), 30], [2 * (2 + 18), 30]],
  },
  "qcp-011": { tokens: ["2^30", "3^20"], konst: [() => 2 ** 30, () => 3 ** 20] },
  "qcp-012": { tokens: ["n, where 3n + 7 = 25", "6"], konst: [() => (25 - 7) / 3, () => 6] },
  // y where y^2 = 16: both roots are admissible; B is fixed at 4
  "qcp-013": {
    tokens: ["y, where y squared = 16", "4"],
    variable: [4, -4].map((y) => [y, 4]),
  },
  "qcp-014": { tokens: ["between 20 and 40", "4"], konst: [() => primesBetween(20, 40), () => 4] },
  "qcp-015": {
    tokens: ["0.3 cubed", "0.3 squared x 0.4"],
    konst: [() => 0.3 ** 3, () => 0.3 ** 2 * 0.4],
  },
  "qcp-016": {
    tokens: ["1/2 + 1/3 + 1/7", "1"],
    konst: [() => 1 / 2 + 1 / 3 + 1 / 7, () => 1],
  },
  "qcp-017": { tokens: ["7^7", "7 factorial"], konst: [() => 7 ** 7, () => factorial(7)] },
  "qcp-018": { tokens: ["three-letter", "ABCDE", "60"], konst: [() => 5 * 4 * 3, () => 60] },
  "qcp-019": { tokens: ["3 + 4", "2 x 3"], konst: [() => 3 + 4, () => 2 * 3] },
  "qcp-020": { tokens: ["100 - 65", "100 - 25"], konst: [() => 100 - 65, () => 100 - 25] },
};

test("every quant-comparison key holds when both quantities are recomputed (qcp-001..020)", () => {
  assert.equal(quantComparison.items.length, 20);
  for (const item of quantComparison.items) {
    assert.equal(item.options!.length, 4, item.id + " must have 4 options (c = 1/4)");
    assert.equal(item.c, 0.25, item.id + " c must be 1/4");
    // Answer indices mean A/B/C/D only under the canonical option order:
    // pin it, so reordering QC_OPTIONS in the bank cannot silently flip
    // the meaning of every key.
    assert.deepEqual(
      item.options,
      QC_CANONICAL,
      item.id + " options must be the canonical QC set in A/B/C/D order",
    );
    const enc = QCP[item.id];
    assert.ok(enc, item.id + " has no encoded quantities in the test");
    // Prompt linkage: the encoded quantities were read from these prompt
    // substrings - a prompt edit without a test update must fail here.
    assert.ok(
      item.prompt.startsWith("Quantity A:") && item.prompt.includes("\nQuantity B:"),
      item.id + " prompt is not a two-quantity comparison",
    );
    for (const token of enc.tokens) {
      assert.ok(
        promptHasToken(item.prompt, token),
        item.id + ' prompt no longer contains "' + token + '" - quantities and prompt drifted apart',
      );
    }
    if (enc.konst) {
      const [qa, qb] = enc.konst;
      assert.equal(
        direction(qa(), qb()),
        expectedDir(item.answer as number),
        item.id + " recomputed comparison contradicts the key",
      );
    } else if (enc.variable) {
      const dirs = new Set(enc.variable.map(([qa, qb]) => direction(qa!, qb!)));
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
  "qcp-002": "fixed-sum-product",
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
  "qcp-019": "sum-vs-product",
  "qcp-020": "remainder-subtraction",
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
  // be a^b-vs-b^a with the same key. Derived from the bank prompts, not
  // from the hand-maintained tags above (the previous form compared two
  // literals in this file's own table and could never fail).
  const byId = (id: string) => quantComparison.items.find((i) => i.id === id)!;
  assert.match(byId("qcp-004").prompt, /2\^5/);
  assert.doesNotMatch(byId("qcp-004").prompt, /square root/i);
  assert.match(byId("qcp-006").prompt, /square root/i);
});

test("quant-comparison instructions disclose that unbound variables range over all reals", () => {
  assert.ok(
    quantComparison.instructions.includes("a variable may take any real value"),
    "instructions must state the all-real-values convention (fairness of D-keyed items)",
  );
});

test("quant-comparison answers are balanced and D is not eliminable on sight (2026-08-21 re-balance regression)", () => {
  // Former bank: A=5, B=6, C=7, D=2, with D keys only on the two
  // bare-variable items - "no visible variable => rule out D" lifted
  // chance from 1/4 to 1/3 on 18 items, and "always equal" scored 35%.
  // Re-balanced bank: A=5, B=5, C=6, D=4.
  const counts = [0, 0, 0, 0];
  for (const item of quantComparison.items) {
    const idx = item.answer as number;
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  for (let k = 0; k < 4; k++) {
    assert.ok(
      counts[k]! >= 4 && counts[k]! <= 6,
      "answer " + k + " occurs " + counts[k] + "/20 times - outside the 4..6 balance band",
    );
  }
  // The D-elimination tell itself: at least one D-keyed item must carry no
  // bare variable (ignoring the English article "a" and the Quantity
  // labels), so "no visible variable -> rule out D" fails on
  // concrete-looking items (currently the fixed-sum product and the
  // fixed-area rectangle).
  const stripLabels = (p: string) => p.replace(/Quantity [AB]:/g, "");
  const hasBareVariable = (p: string) => /(^|[^a-zA-Z])[b-zA-Z]($|[^a-zA-Z])/.test(stripLabels(p));
  const dItems = quantComparison.items.filter((i) => i.answer === 3);
  assert.ok(dItems.length >= 3, "fewer than 3 D-keyed items - D is under-weighted");
  assert.ok(
    dItems.some((i) => !hasBareVariable(i.prompt)),
    "every D-keyed item shows a bare variable - D is eliminable a priori on variable-free-looking items",
  );
});
