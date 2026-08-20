import test from "node:test";
import assert from "node:assert/strict";
import { visualPuzzles } from "../src/items/gv-puzzle.ts";
import type { Item, ItemRender } from "../src/core/types.ts";

type VPuzzle = Extract<ItemRender, { kind: "vpuzzle" }>;

const PROMPT = "Select the three pieces that assemble into the target silhouette.";
const LABELS = ["Piece A", "Piece B", "Piece C", "Piece D", "Piece E", "Piece F"];

function vp(item: Item): VPuzzle {
  assert.equal(item.render?.kind, "vpuzzle", item.id + " missing vpuzzle render");
  return item.render as VPuzzle;
}

/** Parse the multi-select key "i,j,k" into indices. */
function parseAnswer(item: Item): number[] {
  assert.equal(typeof item.answer, "string", item.id + " answer must be a string");
  return String(item.answer).split(",").map(Number);
}

function setEq(a: number[], b: number[]): boolean {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

/** 4-neighbours of a cell within the grid (row-major, index = y*cols + x). */
function neighbors(c: number, cols: number, rows: number): number[] {
  const x = c % cols;
  const y = Math.floor(c / cols);
  const out: number[] = [];
  if (x > 0) out.push(c - 1);
  if (x < cols - 1) out.push(c + 1);
  if (y > 0) out.push(c - cols);
  if (y < rows - 1) out.push(c + cols);
  return out;
}

/** Every cell reachable from the first via shared edges (4-connectivity). */
function connected(cells: number[], cols: number, rows: number): boolean {
  if (cells.length === 0) return false;
  const cs = new Set(cells);
  const seen = new Set<number>([cells[0]!]);
  const stack: number[] = [cells[0]!];
  while (stack.length) {
    const c = stack.pop()!;
    for (const n of neighbors(c, cols, rows)) {
      if (cs.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === cs.size;
}

/** Canonical rendered shape: cells translated to the bounding-box origin.
 * This is exactly what PuzzlePieceFigure draws, so equal keys = identical
 * on-screen pieces. */
function shapeKey(cells: number[], cols: number): string {
  const pts = cells.map((c) => ({ x: c % cols, y: Math.floor(c / cols) }));
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  return pts.map((p) => (p.x - minX) + ":" + (p.y - minY)).sort().join("|");
}

function disjoint(a: number[], b: number[]): boolean {
  const A = new Set(a);
  return b.every((x) => !A.has(x));
}

test("bank metadata, ids, prompt and routing are frozen per spec", () => {
  assert.equal(visualPuzzles.id, "visualPuzzles");
  assert.equal(visualPuzzles.name, "Visual Puzzles");
  assert.equal(visualPuzzles.broad, "Gv");
  assert.deepEqual(visualPuzzles.narrow, ["Vz"]);
  assert.equal(visualPuzzles.budgetMin, 9);
  assert.deepEqual(visualPuzzles.routing, {
    maxItems: 12, minItems: 6, ceilingMisses: 4, targetSe: 0.5, entryTheta: 0,
  });
  assert.ok(
    /without turning|without.*flip/i.test(visualPuzzles.instructions),
    "instructions must state that pieces slide without being turned/flipped",
  );
  assert.equal(visualPuzzles.items.length, 15);
  visualPuzzles.items.forEach((item, i) => {
    assert.equal(item.id, "vpz-" + String(i + 1).padStart(3, "0"));
    assert.equal(item.subtest, "visualPuzzles");
    assert.equal(item.broad, "Gv");
    assert.equal(item.narrow, "Vz");
    assert.equal(item.prompt, PROMPT);
  });
});

test("the three keyed pieces partition the target exactly", () => {
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    const key = parseAnswer(item);
    const keyed = key.map((i) => r.pieces[i]!);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        assert.ok(disjoint(keyed[i]!, keyed[j]!), item.id + " keyed pieces " + key[i] + "," + key[j] + " overlap");
      }
    }
    const union = keyed.flat();
    assert.equal(new Set(union).size, union.length, item.id + " keyed union has duplicates");
    assert.ok(setEq(union, r.target), item.id + " keyed union !== target set");
  }
});

test("every distractor fails against every keyed pair and no keyed piece", () => {
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    const key = parseAnswer(item);
    const keyed = key.map((i) => r.pieces[i]!);
    const distractors = r.pieces
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => !key.includes(i));
    assert.equal(distractors.length, 3, item.id + " must have exactly 3 distractors");
    for (const { p, i } of distractors) {
      assert.ok(connected(p, r.cols, r.rows), item.id + " distractor " + i + " is not 4-connected");
      for (const k of keyed) {
        assert.ok(!setEq(p, k), item.id + " distractor " + i + " equals a keyed piece as a set");
      }
      for (let a = 0; a < 3; a++) {
        for (let b = a + 1; b < 3; b++) {
          const union = [...keyed[a]!, ...keyed[b]!, ...p];
          assert.ok(!setEq(union, r.target), item.id + " distractor " + i + " completes keyed pair " + key[a] + "," + key[b]);
        }
      }
    }
  }
});

test("the keyed triple is the UNIQUE tiling among all 20 triples", () => {
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    const key = parseAnswer(item);
    const keyStr = [...key].sort((a, b) => a - b).join(",");
    const solvers: string[] = [];
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        for (let c = b + 1; c < 6; c++) {
          const parts = [r.pieces[a]!, r.pieces[b]!, r.pieces[c]!];          if (disjoint(parts[0]!, parts[1]!) && disjoint(parts[0]!, parts[2]!) && disjoint(parts[1]!, parts[2]!)
            && setEq(parts.flat(), r.target)) {
            solvers.push(a + "," + b + "," + c);
          }
        }
      }
    }
    assert.deepEqual(solvers, [keyStr], item.id + " must have exactly one tiling triple");
  }
});

/** Every in-grid translation of a piece (the authored position included):
 * all (dx, dy) integer offsets that keep every cell inside the grid. */
function placements(piece: number[], cols: number, rows: number): number[][] {
  const pts = piece.map((c) => ({ x: c % cols, y: Math.floor(c / cols) }));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const out: number[][] = [];
  for (let dx = -minX; dx <= cols - 1 - maxX; dx++) {
    for (let dy = -minY; dy <= rows - 1 - maxY; dy++) {
      out.push(pts.map((p) => (p.y + dy) * cols + (p.x + dx)));
    }
  }
  return out;
}

/** Whether three pieces can tile the target when each is independently
 * translated to any in-grid position (pairwise disjoint, union = target). */
function tilesBySliding(parts: number[][][], targetSet: Set<number>): boolean {
  for (const pa of parts[0]!) {
    for (const pb of parts[1]!) {
      if (!disjoint(pa, pb)) continue; // bounding-box/cell pruning
      for (const pc of parts[2]!) {
        if (!disjoint(pa, pc) || !disjoint(pb, pc)) continue;
        const union = new Set([...pa, ...pb, ...pc]);
        if (union.size !== targetSet.size) continue;
        let covers = true;
        for (const t of targetSet) {
          if (!union.has(t)) {
            covers = false;
            break;
          }
        }
        if (covers) return true;
      }
    }
  }
  return false;
}

test("the keyed triple is the unique tiling even when pieces slide to any in-grid position", () => {
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    const keyStr = [...parseAnswer(item)].sort((a, b) => a - b).join(",");
    const targetSet = new Set(r.target);
    const placed = r.pieces.map((p) => placements(p, r.cols, r.rows));
    const solvers: string[] = [];
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        for (let c = b + 1; c < 6; c++) {
          // Prune: three pairwise-disjoint pieces covering an N-cell target
          // must have cell counts summing to exactly N.
          if (r.pieces[a]!.length + r.pieces[b]!.length + r.pieces[c]!.length !== targetSet.size) continue;
          if (tilesBySliding([placed[a]!, placed[b]!, placed[c]!], targetSet)) {
            solvers.push(a + "," + b + "," + c);
          }
        }
      }
    }
    assert.deepEqual(solvers, [keyStr],
      item.id + " must have exactly one tiling triple under any translation of the pieces");
  }
});

test("every piece is 4-connected, 2-6 cells, in range, and renders distinctly", () => {
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    assert.equal(r.pieces.length, 6, item.id + " must offer six pieces");
    for (const [i, p] of r.pieces.entries()) {
      assert.ok(p.length >= 2 && p.length <= 6, item.id + " piece " + i + " has " + p.length + " cells");
      assert.ok(p.every((c) => Number.isInteger(c) && c >= 0 && c < r.cols * r.rows),
        item.id + " piece " + i + " has an out-of-range cell index");
      assert.equal(new Set(p).size, p.length, item.id + " piece " + i + " repeats a cell");
      assert.ok(connected(p, r.cols, r.rows), item.id + " piece " + i + " is not 4-connected");
    }
    const shapes = r.pieces.map((p) => shapeKey(p, r.cols));
    assert.equal(new Set(shapes).size, 6, item.id + " has two options that render identically");
  }
});

test("targets are sorted, unique, connected silhouettes on tiered grids", () => {
  const seen = new Set<string>();
  for (const item of visualPuzzles.items) {
    const r = vp(item);
    const easy = r.cols === 4 && r.rows === 4;
    const hard = (r.cols === 5 && r.rows === 6) || (r.cols === 6 && r.rows === 5);
    assert.ok(easy || hard, item.id + " grid must be 4x4, 5x6 or 6x5");
    const sorted = [...r.target].sort((a, b) => a - b);
    assert.deepEqual(r.target, sorted, item.id + " target must be sorted ascending");
    assert.equal(new Set(r.target).size, r.target.length, item.id + " target repeats a cell");
    assert.ok(r.target.every((c) => c >= 0 && c < r.cols * r.rows), item.id + " target cell out of range");
    assert.ok(connected(r.target, r.cols, r.rows), item.id + " target silhouette is not 4-connected");
    if (easy) {
      assert.ok(r.target.length >= 8 && r.target.length <= 10, item.id + " easy grid must have 8-10 cells");
    } else {
      assert.ok(r.target.length >= 12 && r.target.length <= 16, item.id + " hard grid must have 12-16 cells");
    }
    const canonical = JSON.stringify([r.cols, r.rows, sorted]);
    assert.ok(!seen.has(canonical), item.id + " duplicates an earlier target");
    seen.add(canonical);
  }
});

test("answer format, options, c and multi are frozen per spec", () => {
  for (const item of visualPuzzles.items) {
    const key = parseAnswer(item);
    assert.equal(key.length, 3, item.id + " key must name 3 options");
    assert.equal(new Set(key).size, 3, item.id + " key repeats an option");
    assert.deepEqual(key, [...key].sort((a, b) => a - b), item.id + " key must be ascending");
    assert.ok(key.every((i) => Number.isInteger(i) && i >= 0 && i < 6), item.id + " key index out of range");
    assert.equal(item.multi, 3, item.id + " multi must be 3");
    assert.equal(item.c, 0.05, item.id + " c must be exactly 1/C(6,3) = 0.05");
    assert.deepEqual(item.options, LABELS, item.id + " options must be Piece A..Piece F");
    assert.equal(new Set(item.options).size, 6, item.id + " option labels must be unique");
  }
});

test("key positions are balanced across the bank", () => {
  const counts = new Array(6).fill(0);
  const triples = new Set<string>();
  for (const item of visualPuzzles.items) {
    const key = parseAnswer(item);
    triples.add([...key].sort((a, b) => a - b).join(","));
    for (const i of key) counts[i]!++;
  }
  assert.equal(triples.size, visualPuzzles.items.length, "a keyed triple is repeated across the bank");
  for (let pos = 0; pos < 6; pos++) {
    assert.ok(counts[pos]! >= 5 && counts[pos]! <= 10,
      "key position " + pos + " (" + LABELS[pos] + ") keyed " + counts[pos]! + " times, outside 5-10");
  }
  assert.deepEqual(counts.reduce((s, n) => s + n, 0), visualPuzzles.items.length * 3);
});

test("difficulty spans the authored -1.5 .. +2.2 range with floor and ceiling", () => {
  const bs = visualPuzzles.items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -1.5, "bank floor must reach -1.5");
  assert.ok(Math.max(...bs) >= 2.2, "bank ceiling must reach +2.2");
  for (const item of visualPuzzles.items) {
    assert.ok(item.b >= -1.5 && item.b <= 2.2, item.id + " b outside [-1.5, 2.2]");
    assert.ok(item.a >= 1.0 && item.a <= 1.4, item.id + " a outside [1.0, 1.4]");
  }
});
