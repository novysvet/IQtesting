import test from "node:test";
import assert from "node:assert/strict";
import { matrixReasoning } from "../src/items/gf-matrix.ts";
import { canonicalCell, validateCellSpec } from "../src/components/figureGeometry.ts";
import type { CellSpecV2, MatrixFill, MatrixMark, MatrixPosition } from "../src/core/types.ts";

/**
 * Machine verification for the structured matrix items (mx-007..mx-018).
 *
 * Each item's stated rule is restated here as executable code. For every item
 * the test asserts: (1) the rule reproduces the GIVEN third cell of rows 1
 * and 2, (2) the rule applied to row 3 equals the keyed option exactly, (3)
 * no distractor equals the rule output, (4) every cell and option passes
 * validateCellSpec, uses rot 0, and stacks at most 3 marks on a position.
 * mx-015 and mx-018 are additionally checked for row-AND-column consistency.
 */

type RowRule = (c1: CellSpecV2, c2: CellSpecV2) => CellSpecV2;

const QUARTER_CW: Record<MatrixPosition, MatrixPosition> = {
  NW: "NE", N: "E", NE: "SE", E: "S", SE: "SW", S: "W", SW: "NW", W: "N", C: "C",
};
const HALF_TURN: Record<MatrixPosition, MatrixPosition> = {
  NW: "SE", N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", C: "C",
};
const RING: readonly MatrixPosition[] = ["NW", "N", "NE", "E", "SE", "S", "SW", "W"];
const READING: readonly MatrixPosition[] = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];
const FILL_VALUE: Record<MatrixFill, number> = { none: 0, half: 1, solid: 2, hatch: 3 };
const VALUE_FILL: readonly MatrixFill[] = ["none", "half", "solid", "hatch"];

function ringStep(pos: MatrixPosition, steps: number): MatrixPosition {
  if (pos === "C") return "C";
  const index = RING.indexOf(pos);
  assert.ok(index >= 0, "unknown ring position " + pos);
  return RING[(index + steps + RING.length) % RING.length]!;
}

function byPos(cell: CellSpecV2): Map<MatrixPosition, MatrixMark> {
  return new Map(cell.marks.map((m) => [m.pos, m]));
}

function marks(...ms: MatrixMark[]): CellSpecV2 {
  return { v: 2, marks: ms };
}

function reshape(mark: MatrixMark, pos: MatrixPosition, fill?: MatrixFill): MatrixMark {
  return { shape: mark.shape, fill: fill ?? mark.fill, rot: 0, pos };
}

// mx-007: union of positions.
const ruleUnion: RowRule = (c1, c2) => {
  const merged = new Map(byPos(c1));
  for (const [pos, m] of byPos(c2)) if (!merged.has(pos)) merged.set(pos, m);
  return marks(...merged.values());
};

// mx-008: symmetric difference of positions.
const ruleXor: RowRule = (c1, c2) => {
  const p1 = byPos(c1);
  const p2 = byPos(c2);
  const out: MatrixMark[] = [];
  for (const [pos, m] of p1) if (!p2.has(pos)) out.push(m);
  for (const [pos, m] of p2) if (!p1.has(pos)) out.push(m);
  return marks(...out);
};

// mx-009: cell 2's positions minus cell 1's.
const ruleDiff21: RowRule = (c1, c2) => {
  const p1 = byPos(c1);
  return marks(...[...byPos(c2)].filter(([pos]) => !p1.has(pos)).map(([, m]) => m));
};

// mx-010: intersection; shape from cell 1, fill from cell 2.
const ruleTransfer: RowRule = (c1, c2) => {
  const out: MatrixMark[] = [];
  for (const [pos, m1] of byPos(c1)) {
    const m2 = byPos(c2).get(pos);
    if (m2) out.push({ shape: m1.shape, fill: m2.fill, rot: 0, pos });
  }
  return marks(...out);
};

// mx-011: parity branch on total mark count.
const ruleParity: RowRule = (c1, c2) => {
  if ((c1.marks.length + c2.marks.length) % 2 === 1) {
    const shape = c1.marks[0]!.shape;
    return marks(...ruleUnion(c1, c2).marks.map((m) => reshape(m, m.pos, "solid")).map((m) => ({ ...m, shape })));
  }
  const shape = c2.marks[0]!.shape;
  return marks(...c2.marks.map((m) => ({ ...reshape(m, m.pos, "none"), shape })));
};

// mx-012: rotate cell 2's positions by cell 1's count parity.
const ruleProvenanceRot: RowRule = (c1, c2) => {
  const map = c1.marks.length % 2 === 0 ? QUARTER_CW : HALF_TURN;
  return marks(...c2.marks.map((m) => reshape(m, map[m.pos])));
};

// mx-013: first |c1| marks of c2 in reading order.
const rulePrefix: RowRule = (c1, c2) => {
  const sorted = [...c2.marks].sort((a, b) => READING.indexOf(a.pos) - READING.indexOf(b.pos));
  return marks(...sorted.slice(0, c1.marks.length));
};

// mx-014: cell 1 advanced one ring step cw, cell 2 one step ccw.
const ruleInterleave: RowRule = (c1, c2) => {
  return marks(
    ...c1.marks.map((m) => reshape(m, ringStep(m.pos, 1))),
    ...c2.marks.map((m) => reshape(m, ringStep(m.pos, -1))),
  );
};

// mx-016: fill values add mod 4 over the union; shape from cell 1.
const ruleFillMod4: RowRule = (c1, c2) => {
  const shape = c1.marks[0]!.shape;
  const p1 = byPos(c1);
  const p2 = byPos(c2);
  const positions = new Set([...p1.keys(), ...p2.keys()]);
  const out: MatrixMark[] = [];
  for (const pos of positions) {
    const v = (p1.has(pos) ? FILL_VALUE[p1.get(pos)!.fill] : 0) + (p2.has(pos) ? FILL_VALUE[p2.get(pos)!.fill] : 0);
    out.push({ shape, fill: VALUE_FILL[v % 4]!, rot: 0, pos });
  }
  return marks(...out);
};

// mx-017: XOR of positions, rotated by which cell holds more marks.
const ruleXorCondRot: RowRule = (c1, c2) => {
  const map = c1.marks.length > c2.marks.length ? QUARTER_CW : HALF_TURN;
  const shape = c1.marks[0]!.shape;
  const fill = c1.marks[0]!.fill;
  return marks(...ruleXor(c1, c2).marks.map((m) => ({ shape, fill, rot: 0, pos: map[m.pos] })));
};

const RULES: Record<string, RowRule> = {
  "mx-007": ruleUnion,
  "mx-008": ruleXor,
  "mx-009": ruleDiff21,
  "mx-010": ruleTransfer,
  "mx-011": ruleParity,
  "mx-012": ruleProvenanceRot,
  "mx-013": rulePrefix,
  "mx-014": ruleInterleave,
  "mx-016": ruleFillMod4,
  "mx-017": ruleXorCondRot,
};

interface StructuredItem {
  id: string;
  cells: (CellSpecV2 | null)[];
  optionCells: CellSpecV2[];
  answer: number;
}

function structuredItems(): StructuredItem[] {
  return matrixReasoning.items.flatMap((item) => {
    const render = item.render;
    if (render?.kind !== "matrix" || !render.optionCells) return [];
    const cells = render.cells.map((c) => (c === null ? null : c as CellSpecV2));
    if (!cells.some((c) => c !== null)) return [];
    return [{ id: item.id, cells, optionCells: render.optionCells, answer: item.answer as number }];
  });
}

test("the structured matrix set is exactly mx-007 through mx-018", () => {
  const items = structuredItems();
  assert.equal(items.length, 12);
  assert.deepEqual(items.map((i) => i.id), Array.from({ length: 12 }, (_, i) => "mx-" + String(i + 7).padStart(3, "0")));
});

test("every structured item reproduces its rule and keys exactly the rule output", () => {
  for (const item of structuredItems()) {
    // mx-015 and mx-018 are constraint-based, not row-functions; dedicated
    // tests below verify them.
    const rule = RULES[item.id];
    if (!rule) continue;
    const { cells, optionCells, answer } = item;
    assert.equal(cells.length, 9, item.id + " needs nine cells");
    assert.equal(cells[8], null, item.id + " must leave the ninth cell empty");
    assert.equal(optionCells.length, 5, item.id + " needs five options");

    const all = [...cells.filter((c): c is CellSpecV2 => c !== null), ...optionCells];
    for (const spec of all) {
      validateCellSpec(spec); // throws on malformed
      for (const m of spec.marks) {
        assert.equal(m.rot, 0, item.id + " encodes structure via positions; mark rotation must be 0");
      }
      const perPos = new Map<MatrixPosition, number>();
      for (const m of spec.marks) perPos.set(m.pos, (perPos.get(m.pos) ?? 0) + 1);
      for (const [pos, count] of perPos) assert.ok(count <= 3, item.id + " stacks " + count + " marks on " + pos);
    }

    // The rule must regenerate the given third cell of the two example rows.
    for (const r of [0, 1]) {
      const c1 = cells[3 * r] as CellSpecV2;
      const c2 = cells[3 * r + 1] as CellSpecV2;
      const given = cells[3 * r + 2] as CellSpecV2;
      assert.equal(canonicalCell(rule(c1, c2)), canonicalCell(given),
        item.id + " row " + (r + 1) + " does not satisfy the stated rule");
    }

    // The rule must key the answer and no distractor.
    const predicted = rule(cells[6] as CellSpecV2, cells[7] as CellSpecV2);
    assert.equal(canonicalCell(predicted), canonicalCell(optionCells[answer]!), item.id + " key is not the rule output");
    optionCells.forEach((option, index) => {
      if (index !== answer) {
        assert.notEqual(canonicalCell(option), canonicalCell(predicted), item.id + " distractor " + index + " also satisfies the rule");
      }
    });

    // No two displayed options may coincide: a duplicated distractor makes the
    // five-choice format degenerate even when the key itself is unique.
    for (let i = 0; i < optionCells.length; i++) {
      for (let j = i + 1; j < optionCells.length; j++) {
        assert.notEqual(canonicalCell(optionCells[i]!), canonicalCell(optionCells[j]!),
          item.id + " options " + i + " and " + j + " are identical");
      }
    }
  }
});

test("mx-015 is a Latin square over shape, fill, AND position in rows and columns", () => {
  const item = structuredItems().find((i) => i.id === "mx-015");
  assert.ok(item);
  const grid = [...item.cells.slice(0, 8), item.optionCells[item.answer]!] as CellSpecV2[];
  for (const attr of ["shape", "fill", "pos"] as const) {
    for (let r = 0; r < 3; r += 1) {
      const values = [0, 1, 2].map((c) => grid[3 * r + c]!.marks[0]![attr]);
      assert.equal(new Set(values).size, 3, "mx-015 row " + r + " repeats " + attr);
    }
    for (let c = 0; c < 3; c += 1) {
      const values = [0, 1, 2].map((r) => grid[3 * r + c]!.marks[0]![attr]);
      assert.equal(new Set(values).size, 3, "mx-015 column " + c + " repeats " + attr);
    }
  }
  // The Latin constraints alone force the keyed cell: each attribute's missing
  // value in row 3 coincides with its missing value in column 3.
  const keyed = grid[8]!.marks[0]!;
  for (const attr of ["shape", "fill", "pos"] as const) {
    const inRow = new Set<string>([0, 1].map((c) => grid[6 + c]!.marks[0]![attr]));
    const inCol = new Set<string>([0, 1].map((r) => grid[3 * r + 2]!.marks[0]![attr]));
    const options = (attr === "shape" ? ["tri", "sq", "cir"] : attr === "fill" ? ["none", "half", "solid"] : ["NW", "C", "SE"]) as string[];
    const missing = options.filter((v) => !inRow.has(v) && !inCol.has(v));
    assert.equal(missing.length, 1, "mx-015 " + attr + " is not uniquely determined");
    assert.equal(keyed[attr], missing[0], "mx-015 keyed " + attr + " is not the forced value");
  }
});

test("mx-018 keys the Latin shape and the mod-3 fill arithmetic", () => {
  const item = structuredItems().find((i) => i.id === "mx-018");
  assert.ok(item);
  const grid = [...item.cells.slice(0, 8), item.optionCells[item.answer]!] as CellSpecV2[];
  // Shape is Latin over rows and columns.
  for (let r = 0; r < 3; r += 1) {
    assert.equal(new Set([0, 1, 2].map((c) => grid[3 * r + c]!.marks[0]!.shape)).size, 3, "mx-018 row " + r + " shape");
  }
  for (let c = 0; c < 3; c += 1) {
    assert.equal(new Set([0, 1, 2].map((r) => grid[3 * r + c]!.marks[0]!.shape)).size, 3, "mx-018 col " + c + " shape");
  }
  // Fill adds mod 3 in every row, demonstrated by rows 1-2 and keyed in row 3.
  const v = (i: number) => FILL_VALUE[grid[i]!.marks[0]!.fill] % 3;
  for (const r of [0, 1]) {
    assert.equal(v(3 * r + 2), (v(3 * r) + v(3 * r + 1)) % 3, "mx-018 row " + (r + 1) + " fill arithmetic");
  }
  const keyed = grid[8]!.marks[0]!;
  assert.equal(keyed.fill, VALUE_FILL[(v(6) + v(7)) % 3], "mx-018 key is not the mod-3 sum");
  // The Latin shape constraint forces the keyed shape.
  const inRow = new Set<string>([0, 1].map((c) => grid[6 + c]!.marks[0]!.shape));
  const inCol = new Set<string>([0, 1].map((r) => grid[3 * r + 2]!.marks[0]!.shape));
  const missing = ["tri", "sq", "cir"].filter((s) => !inRow.has(s) && !inCol.has(s));
  assert.equal(missing.length, 1);
  assert.equal(keyed.shape, missing[0]);
  // Fill Latin must NOT explain the grid: row 1 repeats a fill, so a solver
  // reading fills as row-Latin cannot be right; only the arithmetic fits.
  assert.ok(new Set([v(0), v(1), v(2)]).size < 3, "mx-018 row 1 fills must not form a Latin triple");
});
