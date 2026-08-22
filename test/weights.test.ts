import test from "node:test";
import assert from "node:assert/strict";
import type { Item, WeightShapeId } from "../src/core/types.ts";
import { figureWeights } from "../src/items/gq-weights.ts";

/**
 * Executable statement of the Figure Weights conventions.
 *
 * LEVEL 1 — ground truth: under the authored weight vector, every
 * demonstration scale balances, the keyed option's weight equals the query
 * gap (weight(query.left) - weight(query.right)), and no offered option
 * ties the key.
 *
 * LEVEL 2 — uniqueness from displayed evidence alone: the demonstration
 * scales form a homogeneous linear system A.w = 0 over the shape weights.
 * The examinee can only exclude an option if the displayed scales exclude
 * it. We verify, by exact rational Gaussian elimination (BigInt fractions,
 * no float tolerance), that:
 *   (a) rank(A) = nShapes - 1: the demos determine every weight up to ONE
 *       global scale factor — the item is solvable at all;
 *   (b) the key's balancing functional lies in the row space of A: the key
 *       balances under EVERY consistent assignment;
 *   (c) every distractor's functional lies OUTSIDE the row space: with a
 *       1-dimensional nullspace and f_d(w*) != 0 at the authored weights,
 *       no positive consistent assignment balances any distractor.
 * Together: exactly one option is consistent with the evidence. A key that
 * cannot be re-derived by machine does not ship.
 */

/** Exact rational arithmetic (small BigInt fractions). */
class Frac {
  n: bigint;
  d: bigint;
  constructor(n: bigint | number, d: bigint | number = 1n) {
    let nn = typeof n === "bigint" ? n : BigInt(n);
    let dd = typeof d === "bigint" ? d : BigInt(d);
    if (dd === 0n) throw new Error("zero denominator");
    if (dd < 0n) { nn = -nn; dd = -dd; }
    const g = Frac.gcd(nn < 0n ? -nn : nn, dd);
    this.n = nn / g;
    this.d = dd / g;
  }
  static gcd(a: bigint, b: bigint): bigint {
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1n;
  }
  isZero() { return this.n === 0n; }
}

/** Rank of an exact rational matrix (row echelon, destructive copy). */
function rank(rowsIn: number[][]): number {
  const rows = rowsIn.map((r) => r.map((x) => new Frac(x)));
  if (rows.length === 0) return 0;
  const cols = rows[0]!.length;
  let r = 0;
  for (let c = 0; c < cols && r < rows.length; c++) {
    let piv = -1;
    for (let i = r; i < rows.length; i++) {
      if (!rows[i]![c]!.isZero()) { piv = i; break; }
    }
    if (piv === -1) continue;
    [rows[r], rows[piv]] = [rows[piv]!, rows[r]!];
    const pr = rows[r]!;
    for (let i = r + 1; i < rows.length; i++) {
      const row = rows[i]!;
      if (row[c]!.isZero()) continue;
      const factor = new Frac(row[c]!.n * pr[c]!.d, row[c]!.d * pr[c]!.n);
      for (let j = c; j < cols; j++) {
        row[j] = new Frac(row[j]!.n * pr[j]!.d * factor.d - row[j]!.d * pr[j]!.n * factor.n, row[j]!.d * pr[j]!.d * factor.d);
      }
    }
    r++;
  }
  return r;
}

function weightsRender(item: Item) {
  const r = item.render;
  if (!r || r.kind !== "fweights") assert.fail(item.id + " must carry an fweights render");
  return r;
}

/** group weight under the authored vector, plus its coefficient vector. */
function groupCoeffs(group: WeightShapeId[], order: WeightShapeId[]): number[] {
  const v = order.map(() => 0);
  for (const s of group) v[order.indexOf(s)]! += 1;
  return v;
}

test("every key is the unique option consistent with the displayed scales", () => {
  for (const item of figureWeights.items) {
    const r = weightsRender(item);
    const order = r.weights.map(([s]) => s);
    assert.equal(new Set(order).size, order.length, item.id + " repeats a shape kind in weights");
    const w = new Map(r.weights);

    // (a) ground truth: demos balance.
    for (const [l, rr] of r.demo) {
      const lw = l.reduce((s, s2) => s + w.get(s2)!, 0);
      const rw = rr.reduce((s, s2) => s + w.get(s2)!, 0);
      assert.equal(lw, rw, item.id + " demonstration scale does not balance (" + lw + " vs " + rw + ")");
      assert.ok(l.length >= 1 && rr.length >= 1 && l.length <= 5 && rr.length <= 5, item.id + " pan size outside 1..5");
    }

    // Query gap under ground truth.
    const gap = r.query.left.reduce((s, s2) => s + w.get(s2)!, 0) - r.query.right.reduce((s, s2) => s + w.get(s2)!, 0);
    assert.ok(gap >= 1, item.id + " query gap must be positive");
    assert.ok(r.query.left.length >= 1 && r.query.left.length <= 5 && r.query.right.length <= 4, item.id + " query pan size outside range");

    // Options decode as groups of declared shapes.
    assert.ok(Array.isArray(item.options) && (item.options.length === 4 || item.options.length === 5), item.id + " needs 4 or 5 options");
    assert.equal(new Set(item.options).size, item.options!.length, item.id + " repeats an option group");
    const groups = item.options!.map((o) => o.split(",") as WeightShapeId[]);
    for (const g of groups) {
      assert.ok(g.length >= 1 && g.length <= 4, item.id + " option group size outside 1..4");
      for (const s of g) assert.ok(w.has(s), item.id + " option uses undeclared shape " + s);
    }
    assert.equal(item.c, 1 / item.options!.length, item.id + " c must equal 1/nOptions");

    // (b) key weight = gap; option weights pairwise distinct.
    const weights = groups.map((g) => g.reduce((s, s2) => s + w.get(s2)!, 0));
    const keyIdx = item.answer as number;
    assert.equal(weights[keyIdx], gap, item.id + " keyed option weighs " + weights[keyIdx] + ", gap is " + gap);
    assert.equal(new Set(weights).size, weights.length, item.id + " two options share a weight");

    // Distractor plausibility: within a half/double/substitution error of the gap.
    for (let i = 0; i < weights.length; i++) {
      if (i === keyIdx) continue;
      assert.ok(Math.abs(weights[i]! - gap) <= Math.max(3, gap), item.id + " distractor weight " + weights[i]! + " implausibly far from gap " + gap);
    }

    // (c) exact-rational uniqueness. Rows: demo equations (left - right = 0).
    const A: number[][] = r.demo.map(([l, rr]) => {
      const cl = groupCoeffs(l, order);
      const cr = groupCoeffs(rr, order);
      return cl.map((x, i) => x - cr[i]!);
    });
    const rankA = rank(A);
    assert.equal(rankA, order.length - 1, item.id + " demo system rank " + rankA + " != nShapes-1: weights not determined up to scale");

    const gapCoeffs = groupCoeffs(r.query.left, order).map((x, i) => x - groupCoeffs(r.query.right, order)[i]!);
    for (let i = 0; i < groups.length; i++) {
      const f = groupCoeffs(groups[i]!, order).map((x, j) => x - gapCoeffs[j]!);
      const rankWith = rank([...A, f]);
      if (i === keyIdx) {
        assert.equal(rankWith, rankA, item.id + " key does not balance under every consistent assignment");
      } else {
        assert.equal(rankWith, rankA + 1, item.id + " option " + i + " also balances under some consistent assignment — ambiguous item");
      }
    }

    // Shape economy: at most 4 kinds, integer weights 1..9.
    assert.ok(order.length <= 4, item.id + " uses more than 4 shape kinds");
    for (const [, wt] of r.weights) assert.ok(Number.isInteger(wt) && wt >= 1 && wt <= 9, item.id + " weight " + wt + " outside 1..9");
  }
});

test("authored value ranks, key positions, and stimuli resist side-channel exploits", () => {
  const items = figureWeights.items;
  const rankHistogram = new Map<number, number>();
  const posHistogram = new Map<number, number>();
  const stimuli = new Set<string>();
  for (const item of items) {
    const r = weightsRender(item);
    const w = new Map(r.weights);
    const gap = r.query.left.reduce((s, s2) => s + w.get(s2)!, 0) - r.query.right.reduce((s, s2) => s + w.get(s2)!, 0);
    const weights = item.options!.map((o) => (o.split(",") as WeightShapeId[]).reduce((s, s2) => s + w.get(s2)!, 0));
    const sorted = [...weights].sort((a, b) => a - b);
    const rank = sorted.indexOf(gap);
    assert.equal(rank, sorted.lastIndexOf(gap), item.id + " key weight appears twice");
    rankHistogram.set(rank, (rankHistogram.get(rank) ?? 0) + 1);
    posHistogram.set(item.answer as number, (posHistogram.get(item.answer as number) ?? 0) + 1);
    stimuli.add(JSON.stringify(item.render));
  }
  // No "pick the middle number" (or any fixed value-rank) exploit.
  for (const [rank, count] of rankHistogram) {
    assert.ok(count <= 6, "key sits at value rank " + rank + " in " + count + "/20 items (max 6)");
  }
  // Key positions spread across all option slots.
  for (let slot = 0; slot < 5; slot++) {
    assert.ok((posHistogram.get(slot) ?? 0) >= 1, "option slot " + slot + " never carries a key");
  }
  assert.equal(stimuli.size, items.length, "two items share an identical stimulus");
  // No learnable key-position cycle with bank order.
  const pos = items.map((i) => i.answer as number);
  for (let p = 1; p <= 4; p++) {
    let periodic = true;
    for (let i = 0; i + p < pos.length; i++) if (pos[i] !== pos[i + p]!) { periodic = false; break; }
    assert.ok(!periodic, "answer positions repeat with period " + p);
  }
});

test("bank metadata, difficulty anchors, and practice keys are frozen", () => {
  assert.equal(figureWeights.id, "figureWeights");
  assert.equal(figureWeights.name, "Figure Weights");
  assert.equal(figureWeights.broad, "Gq");
  assert.deepEqual(figureWeights.narrow, ["RQ"]);
  assert.equal(figureWeights.budgetMin, 15);
  assert.deepEqual(figureWeights.routing, { maxItems: 15, minItems: 7, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 });

  const items = figureWeights.items;
  assert.equal(items.length, 20, "bank must hold exactly 20 items");
  assert.deepEqual(
    items.map((i) => i.id),
    Array.from({ length: 20 }, (_, i) => "fw-" + String(i + 1).padStart(3, "0")),
    "ids must be fw-001..fw-020 in difficulty order",
  );
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.6, "b floor must reach -2.6");
  assert.ok(Math.max(...bs) >= 2.4, "b ceiling must reach +2.4");
  for (const b of bs) assert.ok(b >= -2.6 && b <= 2.4, "b=" + b + " outside the anchored -2.6..+2.4 span");
  for (const item of items) {
    assert.equal(item.subtest, "figureWeights");
    assert.equal(item.broad, "Gq");
    assert.equal(item.narrow, "RQ");
    assert.equal(item.prompt, "Every scale is perfectly balanced. Which group of shapes should replace the question mark so that the last scale also balances?");
  }
  const as = items.map((i) => i.a);
  assert.ok(Math.max(...as) <= 1.35 && Math.min(...as) >= 0.9, "a outside authored band");

  // Practice items: ground-truth level verification (full subspace uniqueness
  // is the scored bank's contract; practice re-derives key = gap here and in
  // test/practice.test.ts through the same arithmetic).
  for (const p of figureWeights.practice ?? []) {
    assert.ok(p.render && p.render.kind === "fweights", p.id + " needs an fweights render");
    if (p.render.kind !== "fweights") continue;
    const w = new Map(p.render.weights);
    for (const [l, rr] of p.render.demo) {
      assert.equal(l.reduce((s, s2) => s + w.get(s2)!, 0), rr.reduce((s, s2) => s + w.get(s2)!, 0), p.id + " demo scale unbalanced");
    }
    const gap = p.render.query.left.reduce((s, s2) => s + w.get(s2)!, 0) - p.render.query.right.reduce((s, s2) => s + w.get(s2)!, 0);
    const keyed = (p.options![p.answer as number] as string).split(",") as WeightShapeId[];
    assert.equal(keyed.reduce((s, s2) => s + w.get(s2)!, 0), gap, p.id + " practice key is not the gap");
    for (let i = 0; i < p.options!.length; i++) {
      if (i === p.answer) continue;
      const dw = (p.options![i] as string).split(",").reduce((s, s2) => s + w.get(s2 as WeightShapeId)!, 0);
      assert.notEqual(dw, gap, p.id + " practice distractor " + i + " ties the key");
    }
  }
});
