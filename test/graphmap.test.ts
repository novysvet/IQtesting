import test from "node:test";
import assert from "node:assert/strict";
import type { Item } from "../src/core/types.ts";
import { graphMapping } from "../src/items/gf-graphmap.ts";

/**
 * Executable statement of the Graph Mapping conventions. Every key is
 * re-derived from the two graph structures alone (never from the builder's
 * permutation): the test enumerates EVERY isomorphism from the reference to
 * the scrambled copy by brute force (N <= 8, so N! with edge-set pruning is
 * exhaustive) and asserts the image of the ringed pair is the SAME pair
 * under every isomorphism. That is the shipping condition: an examinee who
 * perfectly understands the structure has exactly one defensible answer,
 * no matter which isomorphic reading they trace. It also re-asserts the
 * difficulty anchors (direct vs indirect targets, crossed scrambled
 * drawings) and the layout contract (reference drawings stay planar).
 */

function graphRender(item: Item) {
  const r = item.render;
  if (!r || r.kind !== "graphmap") assert.fail(item.id + " must carry a graphmap render");
  return r;
}

const edgeKey = (a: number, b: number) => (a < b ? a + "-" + b : b + "-" + a);

/** All permutations of 0..n-1. */
function permutations(n: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const walk = () => {
    if (cur.length === n) { out.push([...cur]); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      walk();
      cur.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

/** Images of the target pair under every isomorphism ref -> scrambled. */
function allTargetImages(refEdges: [number, number][], n: number, targets: [number, number], scrEdges: [number, number][]): string[] {
  const scr = new Set(scrEdges.map(([a, b]) => edgeKey(a, b)));
  const images: string[] = [];
  for (const sigma of permutations(n)) {
    let ok = true;
    for (const [a, b] of refEdges) {
      if (!scr.has(edgeKey(sigma[a]!, sigma[b]!))) { ok = false; break; }
    }
    if (!ok) continue;
    const pair = [sigma[targets[0]]!, sigma[targets[1]]!].sort((x, y) => x - y);
    images.push(pair.join(","));
  }
  return images;
}

/** Degrees of every node under an edge list. */
function degrees(n: number, edges: [number, number][]): number[] {
  const d = new Array<number>(n).fill(0);
  for (const [a, b] of edges) { d[a]!++; d[b]!++; }
  return d;
}

/** Proper crossings between drawn edges (pairs sharing a node excluded). */
function crossings(positions: [number, number][], edges: [number, number][]): number {
  const segs: [[number, number], [number, number], number, number][] =
    edges.map(([a, b]) => [positions[a]!, positions[b]!, a, b]);
  const orient = (p: [number, number], q: [number, number], r: [number, number]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const onSeg = (p: [number, number], q: [number, number], r: [number, number]) =>
    Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) &&
    Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  let count = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [a1, b1, n1a, n1b] = segs[i]!;
      const [a2, b2, n2a, n2b] = segs[j]!;
      // Shared endpoints never count as crossings.
      if (n1a === n2a || n1a === n2b || n1b === n2a || n1b === n2b) continue;
      const o1 = orient(a1, b1, a2);
      const o2 = orient(a1, b1, b2);
      const o3 = orient(a2, b2, a1);
      const o4 = orient(a2, b2, b1);
      if (((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0))) count++;
      else if (o1 === 0 && onSeg(a1, b1, a2)) count++; // collinear overlap
      else if (o2 === 0 && onSeg(a1, b1, b2)) count++;
    }
  }
  return count;
}

function checkGraphItem(item: Item) {
  const r = graphRender(item);
  const n = r.ref.positions.length;
  assert.equal(r.scrambled.positions.length, n, item.id + " node counts differ");
  assert.ok(n >= 5 && n <= 8, item.id + " N outside 5..8");

  for (const [label, positions, edges] of [
    ["ref", r.ref.positions, r.ref.edges],
    ["scrambled", r.scrambled.positions, r.scrambled.edges],
  ] as const) {
    assert.equal(edges.length, new Set(edges.map(([a, b]) => edgeKey(a, b))).size, item.id + " " + label + " repeats an edge");
    for (const [a, b] of edges) {
      assert.ok(a !== b, item.id + " " + label + " has a self-loop");
      assert.ok(a >= 0 && a < n && b >= 0 && b < n, item.id + " " + label + " edge endpoint out of range");
    }
    assert.equal(new Set(positions.map((p) => p.join(","))).size, n, item.id + " " + label + " repeats a node position");
    for (const [x, y] of positions) {
      assert.ok(x >= 10 && x <= 140 && y >= 10 && y <= 120, item.id + " " + label + " node outside the drawing bounds");
    }
  }
  assert.ok(r.ref.edges.length >= 3 && r.ref.edges.length <= 11, item.id + " edge count outside 3..11");
  assert.equal(r.ref.edges.length, r.scrambled.edges.length, item.id + " edge counts differ");

  // The key: identical image of the target pair under EVERY isomorphism.
  const images = allTargetImages(r.ref.edges, n, r.ref.targets, r.scrambled.edges);
  assert.ok(images.length >= 1, item.id + " graphs are not isomorphic");
  assert.equal(new Set(images).size, 1, item.id + " target pair maps to " + new Set(images).size + " different node pairs across isomorphisms — ambiguous item");
  const expected = images[0]!.split(",").map(Number).map((v) => v + 1).sort((a, b) => a - b).join(",");
  assert.equal(item.answer, expected, item.id + " key is not the unique isomorphic image of the target pair");
  assert.match(item.answer as string, /^[1-8],[1-8]$/, item.id + " key format must be ascending comma pair");

  // Degree colouring is well-defined: every degree falls in the renderer's
  // 1..5 colour map and matching degrees imply matching colours by design.
  const refDeg = degrees(n, r.ref.edges);
  for (const d of refDeg) assert.ok(d >= 1 && d <= 5, item.id + " degree " + d + " outside the colour map");
  const t0 = r.ref.targets[0]!;
  const t1 = r.ref.targets[1]!;
  assert.ok(t0 !== t1, item.id + " rings one node twice");

  // Reference stays a clean planar drawing; the scrambled copy must be a
  // genuinely different arrangement, and crossed for the hardest items.
  assert.equal(crossings(r.ref.positions, r.ref.edges), 0, item.id + " reference drawing crosses itself");
  const sameLayout = r.ref.positions.every((p, i) => p.join(",") === r.scrambled.positions[i]!.join(","));
  assert.ok(!sameLayout, item.id + " scrambled layout is identical to the reference");

  return { item, n, refDeg, t0, t1, refEdges: r.ref.edges, scrCross: crossings(r.scrambled.positions, r.scrambled.edges) };
}

test("every key is the unique isomorphic image of the ringed pair", () => {
  const checked = [...graphMapping.items, ...(graphMapping.practice ?? [])].map(checkGraphItem);
  assert.equal(checked.length, 20, "18 scored + 2 practice items expected");
});

test("difficulty anchors: direct basals, indirect mid/ceiling, crossed tops", () => {
  const answers = new Set<string>();
  const numberUse = new Map<number, number>();
  for (const { item, n, refDeg, t0, t1, scrCross } of graphMapping.items.map(checkGraphItem)) {
    answers.add(item.answer as string);
    for (const numStr of (item.answer as string).split(",")) {
      const num = Number(numStr);
      assert.ok(num >= 1 && num <= n, item.id + " answer number outside 1..N");
      numberUse.set(num, (numberUse.get(num) ?? 0) + 1);
    }
    // Indirect items (b >= 0.15): every target shares its degree with at
    // least one other node — degree reading alone cannot find the pair.
    if (item.b >= 0.15) {
      for (const t of [t0, t1]) {
        assert.ok(
          refDeg.filter((d) => d === refDeg[t]).length >= 2,
          item.id + " (b=" + item.b + ") target " + t + " is degree-unique: direct item in the indirect zone",
        );
      }
    } else {
      // Direct basals (b <= -2.0): the target degree multiset is unique
      // among ALL node pairs, so the paper's "direct" reading suffices.
      // (gm-003 at b=-1.9 is deliberately between zones: its hub is
      // degree-unique but the tail carries two degree-2 nodes, so one
      // adjacency check separates them.)
      const want = [refDeg[t0]!, refDeg[t1]!].sort((a, b) => a - b).join(",");
      let pairs = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if ([refDeg[i]!, refDeg[j]!].sort((a, b) => a - b).join(",") === want) pairs++;
        }
      }
      if (item.b <= -2.0) assert.equal(pairs, 1, item.id + " (b=" + item.b + ") is not solvable by degree reading alone");
    }
    // Dense tops carry more structure, and the hardest items cross.
    const rr = item.render;
    assert.ok(rr?.kind === "graphmap", item.id + " lost its render");
    if (rr?.kind === "graphmap") {
      if (item.b >= 1.35) assert.ok(rr.ref.edges.length >= 8, item.id + " ceiling item too sparse");
      if (item.b >= 1.65) assert.ok(scrCross >= 1, item.id + " (b=" + item.b + ") scrambled drawing has no crossing");
    }
    if (item.b <= -0.9) assert.ok(scrCross >= 0, "unreachable");
  }
  // No answer repeats, and no single node number dominates the keys.
  assert.equal(answers.size, graphMapping.items.length, "duplicate answer pair across the bank");
  const maxUse = Math.max(...numberUse.values());
  assert.ok(maxUse <= Math.ceil(0.4 * graphMapping.items.length), "one number appears in " + maxUse + " keys — side-channel concentration");
});

test("bank metadata and difficulty span are frozen", () => {
  assert.equal(graphMapping.id, "graphMapping");
  assert.equal(graphMapping.name, "Graph Mapping");
  assert.equal(graphMapping.broad, "Gf");
  assert.deepEqual(graphMapping.narrow, ["I"]);
  assert.equal(graphMapping.budgetMin, 12);
  assert.deepEqual(graphMapping.routing, { maxItems: 13, minItems: 6, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0 });

  const items = graphMapping.items;
  assert.equal(items.length, 18, "bank must hold exactly 18 items");
  assert.deepEqual(
    items.map((i) => i.id),
    Array.from({ length: 18 }, (_, i) => "gm-" + String(i + 1).padStart(3, "0")),
    "ids must be gm-001..gm-018 in difficulty order",
  );
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.2, "b floor must reach -2.2");
  assert.ok(Math.max(...bs) >= 2.2, "b ceiling must reach +2.2");
  for (const item of items) {
    assert.equal(item.subtest, "graphMapping");
    assert.equal(item.broad, "Gf");
    assert.equal(item.narrow, "I");
    assert.equal(item.c, 0, item.id + " constructed response must carry c = 0");
    assert.equal(item.options, undefined, item.id + " recall item must have no options");
    assert.ok(item.prompt.startsWith("The first diagram is the model"), item.id + " prompt drift");
  }
  const as = items.map((i) => i.a);
  assert.ok(Math.max(...as) <= 1.35 && Math.min(...as) >= 0.9, "a outside authored band");
});
