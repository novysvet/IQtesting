import test from "node:test";
import assert from "node:assert/strict";
import { figureLayout, MAX_FIGURE_COUNT, ROTATION_PATHS } from "../src/components/figureGeometry.ts";
import { figureSeries } from "../src/items/gf-series.ts";
import { matrixReasoning } from "../src/items/gf-matrix.ts";
import { paperFolding } from "../src/items/gv-fold.ts";
import { mentalRotation } from "../src/items/gv-rotation.ts";

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
  assert.equal(Object.keys(ROTATION_PATHS).length, 5);
  for (const [id, path] of Object.entries(ROTATION_PATHS)) {
    assert.match(path, /^M/);
    assert.ok(!path.includes("NaN") && !path.includes("undefined"), id + " invalid path");
  }
  assert.equal(ROTATION_PATHS.F, "M7 20 V4 H18 M7 11 H15");
  assert.equal(ROTATION_PATHS.T, "M5 5 H19 M12 5 V20 M12 14 H18");
});

test("revised figure series have demonstrated cycles and representable keys", () => {
  assert.equal(keyedSpec("fs-003"), "sq:1:none:0");
  assert.equal(keyedSpec("fs-005"), "dia:8:none:0");
  assert.equal(keyedSpec("fs-006"), "sq:1:none:0");
  assert.equal(keyedSpec("fs-009"), "tri:1:none:0");
  assert.equal(keyedSpec("fs-012"), "arw:5:none:0");
  assert.equal(keyedSpec("fs-013"), "star:2:none:180");

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
  for (const item of [...matrixReasoning.items, ...figureSeries.items]) {
    const renderSpecs = item.render?.kind === "matrix"
      ? item.render.cells.filter((spec): spec is string => spec !== null)
      : item.render?.kind === "series" ? item.render.figures : [];
    const byShape = new Map<string, Set<number>>();
    for (const spec of [...renderSpecs, ...(item.options ?? [])]) {
      const bits = spec.split(":");
      const shape = bits[0]!;
      const rotations = byShape.get(shape) ?? new Set<number>();
      rotations.add(Number(bits[3]));
      byShape.set(shape, rotations);
    }
    for (const [shape, rotations] of byShape) {
      assert.ok(!symmetricAt90.has(shape) || rotations.size <= 1, item.id + " uses rotation-invariant " + shape + " to encode rotation");
    }
  }
});

test("paper-folding administration states the fold direction", () => {
  assert.match(paperFolding.instructions, /left half to the right/i);
  assert.match(paperFolding.instructions, /top half downward/i);
});

test("mental-rotation items have exactly one non-mirrored candidate and key it", () => {
  for (const item of mentalRotation.items) {
    assert.equal(item.render?.kind, "rotation");
    if (item.render?.kind !== "rotation") continue;
    const pure = item.render.candidates
      .map((spec, index) => ({ index, mirrored: spec.split(":")[2] === "1" }))
      .filter((candidate) => !candidate.mirrored);
    assert.equal(pure.length, 1, item.id + " must have one pure rotation");
    assert.equal(item.answer, pure[0]!.index, item.id + " does not key the pure rotation");
  }
});
