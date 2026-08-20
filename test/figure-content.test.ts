import test from "node:test";
import assert from "node:assert/strict";
import { figureLayout, MAX_FIGURE_COUNT, ROTATION_PATHS } from "../src/components/figureGeometry.ts";
import { figureSeries } from "../src/items/gf-series.ts";
import { matrixReasoning } from "../src/items/gf-matrix.ts";
import { paperFolding } from "../src/items/gv-fold.ts";

function keyedSpec(id: string): string {
  const item = figureSeries.items.find((candidate) => candidate.id === id);
  assert.ok(item?.options, id + " missing options");
  return item.options[item.answer as number]!;
}

test("repeated symbols use a compact, legible grid", () => {
  for (let count = 1; count <= MAX_FIGURE_COUNT; count += 1) {
    const layout = figureLayout(count);
    assert.ok(layout.columns * layout.rows >= count);
    assert.ok(layout.columns <= 3 && layout.rows <= 3);
    assert.ok(layout.width >= 30 && layout.height >= 30);
  }
  assert.deepEqual(figureLayout(4), { columns: 2, rows: 2, width: 60, height: 60 });
  assert.deepEqual(figureLayout(8), { columns: 3, rows: 3, width: 90, height: 90 });
});

test("rotation figures use non-retracing path branches", () => {
  assert.equal(Object.keys(ROTATION_PATHS).length, 6);
  for (const [id, path] of Object.entries(ROTATION_PATHS)) {
    assert.match(path, /^M/);
    assert.ok(!path.includes("NaN") && !path.includes("undefined"), id + " invalid path");
  }
  assert.equal(ROTATION_PATHS.F, "M7 20 V4 H18 M7 11 H15");
  assert.equal(ROTATION_PATHS.T, "M5 5 H19 M12 5 V20 M12 14 H18");
  assert.equal(ROTATION_PATHS.E, "M7 20 V4 H18 M7 12 H15 M7 20 H16");
});

test("revised figure series have demonstrated cycles and representable keys", () => {
  assert.equal(keyedSpec("fs-003"), "sq:1:none:0");
  assert.equal(keyedSpec("fs-005"), "dia:8:none:0");
  assert.equal(keyedSpec("fs-006"), "sq:1:none:0");
  assert.equal(keyedSpec("fs-009"), "sq:1:half:0");
  assert.equal(keyedSpec("fs-012"), "arw:5:none:0");
  assert.equal(keyedSpec("fs-013"), "star:2:none:180");
  assert.equal(keyedSpec("fs-014"), "arw:1:none:90");

  for (const item of figureSeries.items) {
    const specs = [...(item.render?.kind === "series" ? item.render.figures : []), ...(item.options ?? [])];
    for (const spec of specs) {
      const count = Number(spec.split(":")[1]);
      assert.ok(Number.isInteger(count) && count >= 1 && count <= MAX_FIGURE_COUNT, item.id + " invalid count " + count);
    }
  }
});

test("visual-rule options do not use rotationally symmetric shapes to encode rotation", () => {
  const symmetricAt90 = new Set(["cir", "sq", "dia", "cross"]);
  const entries: { shape: string; rot: number; owner: string }[] = [];
  const fromSpec = (spec: string, owner: string) => {
    const bits = spec.split(":");
    entries.push({ shape: bits[0]!, rot: Number(bits[3]) || 0, owner });
  };
  for (const item of [...matrixReasoning.items, ...figureSeries.items]) {
    const render = item.render;
    if (render?.kind === "matrix") {
      for (const spec of render.cells) if (spec !== null && typeof spec === "string") fromSpec(spec, item.id);
      if (render.optionCells) {
        // Structured items: options are structured cells; the option strings
        // are never-rendered placeholders.
        for (const option of render.optionCells) {
          for (const mark of option.marks) entries.push({ shape: mark.shape, rot: mark.rot, owner: item.id });
        }
      } else {
        for (const spec of item.options ?? []) fromSpec(spec, item.id);
      }
    } else if (render?.kind === "series") {
      for (const spec of [...render.figures, ...(item.options ?? [])]) fromSpec(spec, item.id);
    }
  }
  const byShape = new Map<string, Set<number>>();
  for (const entry of entries) {
    const rotations = byShape.get(entry.shape) ?? new Set<number>();
    rotations.add(entry.rot);
    byShape.set(entry.shape, rotations);
  }
  for (const [shape, rotations] of byShape) {
    assert.ok(!symmetricAt90.has(shape) || rotations.size <= 1, "items use rotation-invariant " + shape + " to encode rotation");
  }
});

test("paper-folding administration states the fold direction", () => {
  assert.match(paperFolding.instructions, /right half over to the left/i);
  assert.match(paperFolding.instructions, /bottom half upward/i);
});

// The full mental-rotation structure contract (identity + chirality, exploit
// resistance, render distinctness) lives in test/rotation-keys.test.ts.
