import test from "node:test";
import assert from "node:assert/strict";
import { matrixReasoning } from "../src/items/gf-matrix.ts";
import { canonicalCell, validateCellSpec } from "../src/components/figureGeometry.ts";
import type { CellSpecV2, MatrixFill, MatrixMark, MatrixPosition, MatrixShape } from "../src/core/types.ts";

/**
 * Machine verification for the matrix bank.
 *
 * Each item's stated rule is restated here as executable code. For every
 * STRUCTURED item (mx-007..mx-018) the test asserts: (1) the rule reproduces
 * the GIVEN third cell of rows 1 and 2, (2) the rule applied to row 3 equals
 * the keyed option exactly, (3) no distractor equals the rule output, (4)
 * every cell and option passes validateCellSpec, uses rot 0, stacks at most
 * 3 marks on a position, and no two options coincide. mx-015 and mx-018 have
 * no row-function rule: their given cells are checked to FORCE a unique
 * ninth cell — the key, with every distractor violating a constraint — and
 * their dedicated tests below verify row-AND-column consistency. The legacy
 * floor item mx-001 is keyed by its count-ladder simulation, and two
 * practice regressions guard the practice→scored handoff: no scored grid
 * duplicates a practice grid (priming), and practice demo rows render
 * pairwise-distinct cells (non-degenerate demonstration).
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

/**
 * Exact rotational symmetry period (degrees) of each shape's artwork in
 * Figures.tsx shapePath, computed against the authored polygons: a circle
 * renders identically under any rotation; sq, dia, and cross repeat every
 * 90 degrees; the authored hexagon every 180 (ideal 60, but its polygon is
 * elongated); tri, arw, and the authored star have none below 360. Two
 * legacy cells therefore render identically exactly when shape, count,
 * fill, and rot-mod-period all agree.
 */
const SHAPE_PERIOD: Record<string, number> = {
  cir: 1, sq: 90, dia: 90, cross: 90, hex: 180, star: 360, tri: 360, arw: 360,
};

/** Render-equivalence key for a legacy "shape:count:fill:rot" cell. */
function legacyVisualKey(spec: string): string {
  const [shape, count, fill, rot] = spec.split(":");
  const period = SHAPE_PERIOD[shape ?? ""] ?? 360;
  const normRot = (((Number(rot) % period) + period) % period);
  return "legacy:" + shape + ":" + count + ":" + fill + ":" + normRot;
}

/** Canonical render key for any matrix cell, legacy or structured. */
function cellRenderKey(spec: CellSpecV2 | string): string {
  return typeof spec === "string" ? legacyVisualKey(spec) : canonicalCell(spec);
}

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

// mx-019 (2026-08-22 ceiling pass): XOR, then every survivor advances a
// QUARTER-TURN clockwise (QUARTER_CW — a 90-degree grid rotation, the same
// transform family as mx-012/mx-017, not mx-014's one-ring-step neighbor
// move). Shape/fill ride along with the surviving marks.
const ruleXorRotCW: RowRule = (c1, c2) => {
  return marks(...ruleXor(c1, c2).marks.map((m) => reshape(m, QUARTER_CW[m.pos])));
};

// mx-020: union of positions; fill and shape are each the value MISSING from
// {none, half, solid} / {tri, sq, cir} relative to the row's first two cells
// (distribution of three over two attributes plus a union — the distractors
// each violate exactly one constraint).
const ruleTripleDistribution: RowRule = (c1, c2) => {
  const missing = <T,>(domain: readonly T[], a: T, b: T): T => {
    const left = domain.filter((v) => v !== a && v !== b);
    assert.equal(left.length, 1, "distribution rule needs exactly one missing domain value");
    return left[0]!;
  };
  const shape = missing(["tri", "sq", "cir"] as const, c1.marks[0]!.shape, c2.marks[0]!.shape);
  const fill = missing(["none", "half", "solid"] as const, c1.marks[0]!.fill, c2.marks[0]!.fill);
  const positions = new Set([...byPos(c1).keys(), ...byPos(c2).keys()]);
  return marks(...[...positions].map((pos) => ({ shape, fill, rot: 0, pos })));
};

// mx-022: even total mark count -> intersection with solid fill; odd ->
// symmetric difference with no fill.
const ruleParitySetOp: RowRule = (c1, c2) => {
  if ((c1.marks.length + c2.marks.length) % 2 === 0) {
    const p1 = byPos(c1);
    const out: MatrixMark[] = [];
    for (const [pos, m] of p1) if (byPos(c2).has(pos)) out.push(reshape(m, pos, "solid"));
    return marks(...out);
  }
  return marks(...ruleXor(c1, c2).marks.map((m) => reshape(m, m.pos, "none")));
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
  "mx-019": ruleXorRotCW,
  "mx-020": ruleTripleDistribution,
  "mx-022": ruleParitySetOp,
};

/**
 * Constraint items have no row-function rule: the given cells plus the
 * constraints FORCE the ninth cell. Each derivation computes the forced
 * completion from the eight givens so the main test can key the answer
 * and reject every distractor, exactly as the rule simulations do.
 */
const FORCED_COMPLETION: Record<string, (cells: (CellSpecV2 | null)[]) => CellSpecV2> = {
  // mx-015: shape, fill, and position are each Latin (tri/sq/cir over
  // none/half/solid over NW/C/SE): row 3 pins each attribute to the one
  // domain value its two given cells lack, which must also be the value
  // column 3 lacks.
  "mx-015": (cells) => {
    const forced: Record<"shape" | "fill" | "pos", string> = { shape: "", fill: "", pos: "" };
    for (const attr of ["shape", "fill", "pos"] as const) {
      const inRow3 = new Set([0, 1].map((c) => cells[6 + c]!.marks[0]![attr]));
      const inCol3 = new Set([0, 1].map((r) => cells[3 * r + 2]!.marks[0]![attr]));
      const domain = [...new Set(cells.slice(0, 8).map((c) => c!.marks[0]![attr]))];
      const missing = domain.filter((value) => !inRow3.has(value));
      assert.equal(missing.length, 1, "mx-015 row 3 leaves " + attr + " underdetermined");
      assert.ok(!inCol3.has(missing[0]!), "mx-015 column 3 already repeats the forced " + attr);
      forced[attr] = missing[0]!;
    }
    return { v: 2, marks: [{ shape: forced.shape as MatrixShape, fill: forced.fill as MatrixFill, rot: 0, pos: forced.pos as MatrixPosition }] };
  },
  // mx-018: shape is Latin over tri/sq/cir; fill values add mod 3 across the
  // row (cell 3 = cell 1 + cell 2); every mark shares one position.
  "mx-018": (cells) => {
    const inRow3 = new Set([0, 1].map((c) => cells[6 + c]!.marks[0]!.shape));
    const inCol3 = new Set([0, 1].map((r) => cells[3 * r + 2]!.marks[0]!.shape));
    const missing = (["tri", "sq", "cir"] as const).filter((s) => !inRow3.has(s));
    assert.equal(missing.length, 1, "mx-018 row 3 leaves the shape underdetermined");
    assert.ok(!inCol3.has(missing[0]!), "mx-018 column 3 already repeats the forced shape");
    const value = (i: number) => FILL_VALUE[cells[i]!.marks[0]!.fill] % 3;
    const fill = VALUE_FILL[(value(6) + value(7)) % 3]!;
    const positions = [...new Set(cells.slice(0, 8).flatMap((c) => c!.marks.map((m) => m.pos)))];
    assert.equal(positions.length, 1, "mx-018 given marks must share one position");
    return { v: 2, marks: [{ shape: missing[0] as MatrixShape, fill, rot: 0, pos: positions[0] as MatrixPosition }] };
  },
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

test("the structured matrix set is exactly mx-007 through mx-022 minus the legacy item", () => {
  const items = structuredItems();
  // mx-021 is a legacy-spec second-order rotation item (string options), so
  // the structured set is every mx id from 007 to 022 except mx-021.
  const expected = Array.from({ length: 16 }, (_, i) => "mx-" + String(i + 7).padStart(3, "0"))
    .filter((id) => id !== "mx-021");
  assert.equal(items.length, expected.length);
  assert.deepEqual(items.map((i) => i.id), expected);
});

test("every structured item is well-formed and keys exactly its derived completion", () => {
  for (const item of structuredItems()) {
    const { cells, optionCells, answer } = item;
    assert.equal(cells.length, 9, item.id + " needs nine cells");
    assert.equal(cells[8], null, item.id + " must leave the ninth cell empty");
    assert.equal(optionCells.length, 5, item.id + " needs five options");

    // Structural checks cover EVERY structured item, constraint items
    // included: the test-figures audit caught the old early `continue`
    // silently skipping mx-015/mx-018 here.
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

    // No two displayed options may coincide: a duplicated distractor makes the
    // five-choice format degenerate even when the key itself is unique.
    for (let i = 0; i < optionCells.length; i++) {
      for (let j = i + 1; j < optionCells.length; j++) {
        assert.notEqual(canonicalCell(optionCells[i]!), canonicalCell(optionCells[j]!),
          item.id + " options " + i + " and " + j + " are identical");
      }
    }

    const rule = RULES[item.id];
    if (rule) {
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
    } else {
      // Constraint item: the givens must force a unique completion — the
      // keyed one — and every distractor must violate at least one constraint.
      const derive = FORCED_COMPLETION[item.id];
      assert.ok(derive, item.id + " has neither a row-function rule nor a forced-completion derivation");
      const predicted = derive(cells);
      assert.equal(canonicalCell(predicted), canonicalCell(optionCells[answer]!), item.id + " key is not the constraint-forced completion");
      optionCells.forEach((option, index) => {
        if (index !== answer) {
          assert.notEqual(canonicalCell(option), canonicalCell(predicted), item.id + " distractor " + index + " also satisfies the constraints");
        }
      });
    }
  }
});

test("mx-001 keys its legacy count-ladder rule", () => {
  // The bank floor: each row's counts climb a fixed ladder (1,2,3) while
  // shape, fill, and rotation stay constant within the row. Simulated the
  // same way as the structured rules: recover the step from the given rows,
  // verify they realize it, then extrapolate the target row.
  const item = matrixReasoning.items.find((i) => i.id === "mx-001");
  assert.ok(item, "mx-001 missing from the bank");
  const render = item.render;
  if (render?.kind !== "matrix") throw new Error("mx-001 must render a matrix");
  const parse = (spec: string) => {
    const [sh, ct, fl, ro] = spec.split(":");
    return { sh: sh!, ct: Number(ct), fl: fl!, ro: Number(ro) };
  };
  const cells = render.cells.map((c) => {
    if (c !== null && typeof c !== "string") throw new Error("mx-001 must use legacy string cells");
    return c === null ? null : parse(c);
  });
  assert.equal(cells.length, 9, "mx-001 needs nine cells");
  assert.equal(cells[8], null, "mx-001 must leave the ninth cell empty");
  const step = (r: number) => cells[3 * r + 1]!.ct - cells[3 * r]!.ct;
  assert.equal(step(0), step(1), "mx-001 demonstration rows use different count steps");
  assert.equal(cells[2]!.ct, cells[1]!.ct + step(1), "mx-001 row 1 third cell violates the ladder");
  assert.equal(cells[5]!.ct, cells[4]!.ct + step(1), "mx-001 row 2 third cell violates the ladder");
  for (const r of [0, 1, 2]) {
    for (const attr of ["sh", "fl", "ro"] as const) {
      assert.equal(cells[3 * r + 1]![attr], cells[3 * r]![attr], "mx-001 row " + (r + 1) + " varies " + attr + " within the row");
    }
  }
  const expected = cells[6]!.sh + ":" + (cells[7]!.ct + step(1)) + ":" + cells[7]!.fl + ":" + cells[7]!.ro;
  const hits = (item.options ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o === expected);
  assert.equal(hits.length, 1, "mx-001 derived key " + expected + " matches " + hits.length + " options");
  assert.equal(hits[0]!.i, item.answer as number, "mx-001 key is not the derived ladder continuation");
});

test("mx-021 keys its second-order rotation progression (step doubles)", () => {
  // Legacy-spec ceiling item: within each row the rotation step DOUBLES
  // (+d then +2d), and both example rows refute the first-order reading
  // in-stimulus (their third cells overshoot a constant step). The chief
  // distractor is the first-order continuation of row 3.
  const item = matrixReasoning.items.find((i) => i.id === "mx-021");
  assert.ok(item, "mx-021 missing from the bank");
  const render = item.render;
  if (render?.kind !== "matrix") throw new Error("mx-021 must render a matrix");
  const rot = (cell: string) => Number(cell.split(":")[3]);
  const cells = render.cells as (string | null)[];
  for (const r of [0, 1, 2]) {
    const a = rot(cells[3 * r] as string);
    const b = rot(cells[3 * r + 1] as string);
    const step = (b - a + 360) % 360;
    if (r < 2) {
      const c = rot(cells[3 * r + 2] as string);
      assert.equal((c - b + 360) % 360, (2 * step) % 360, "row " + (r + 1) + " third cell violates the doubling rule");
    }
    // Shape/count/fill constant within the row.
    for (const attr of [0, 1, 2]) {
      assert.equal(
        (cells[3 * r] as string).split(":")[attr],
        (cells[3 * r + 1] as string).split(":")[attr],
        "row " + (r + 1) + " varies attribute " + attr,
      );
    }
  }
  // Row 3: 270 -> 0 (step 90) -> doubling gives 180.
  const key = "tri:1:none:180";
  const hits = (item.options ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o === key);
  assert.equal(hits.length, 1, "mx-021 derived key matches " + hits.length + " options");
  assert.equal(hits[0]!.i, item.answer as number, "mx-021 key is not the second-order continuation");
  // The first-order continuation (270, 0, +90 -> 90) must be present as a
  // distractor so the item actually discriminates the two readings.
  assert.ok((item.options ?? []).includes("tri:1:none:90"), "mx-021 must bait the first-order rule");
});

test("mx-015 is a Latin square over shape, fill, AND position in rows and columns", () => {  const item = structuredItems().find((i) => i.id === "mx-015");
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

test("no scored item shares its full cell grid with a practice item", () => {
  // Priming guard (the mx-001 class): practice is administered immediately
  // before scoring starts, so a scored matrix whose grid renders
  // identically to a practice grid measures recent exposure, not ability.
  // Compared at render equivalence, which subsumes byte-identical grids.
  const practice = matrixReasoning.practice ?? [];
  assert.ok(practice.length > 0, "matrixReasoning must carry practice items");
  const practiceGrids = practice.map((p) => {
    const render = p.render;
    if (render?.kind !== "matrix") throw new Error(p.id + " must render a matrix");
    return { id: p.id, grid: render.cells.map((c) => (c === null ? "empty" : cellRenderKey(c))).join(";;") };
  });
  for (const item of matrixReasoning.items) {
    const render = item.render;
    if (render?.kind !== "matrix") continue;
    const grid = render.cells.map((c) => (c === null ? "empty" : cellRenderKey(c))).join(";;");
    for (const { id, grid: practiceGrid } of practiceGrids) {
      assert.notEqual(grid, practiceGrid, item.id + " duplicates practice item " + id + "'s cell grid");
    }
  }
});

test("practice demo rows render pairwise-distinct cells, so the taught rule is visible", () => {
  // Degeneracy guard (the prac-mx-02 class): a rotation-progression row
  // whose cells collide visually — three circles at any angle, a square
  // whose 90 degrees equals its 0 — cannot demonstrate the rule it teaches.
  // Render keys normalize rotation by each shape's symmetry period, so the
  // check catches adjacent collisions and first-vs-last ones alike; it
  // applies to every given cell pair within each of the three rows.
  for (const practice of matrixReasoning.practice ?? []) {
    const render = practice.render;
    if (render?.kind !== "matrix") throw new Error(practice.id + " must render a matrix");
    for (let r = 0; r < 3; r += 1) {
      const keys = render.cells.slice(3 * r, 3 * r + 3)
        .map((c) => (c === null ? null : cellRenderKey(c)))
        .filter((k): k is string => k !== null);
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          assert.notEqual(keys[i], keys[j],
            practice.id + " row " + (r + 1) + " cells " + (i + 1) + " and " + (j + 1) + " render identically; the row cannot demonstrate its rule");
        }
      }
    }
  }
});
