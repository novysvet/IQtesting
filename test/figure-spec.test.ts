import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { MATRIX_SHAPES, MATRIX_FILLS } from "../src/components/figureGeometry.ts";

/**
 * Legacy figure specs ("shape:count:fill:rot") were historically unvalidated,
 * which let a real bug ship: practice item prac-mx-02 carried options like
 * "tri:135:none:0" — degrees written into the count field — and the renderer's
 * clamp Math.max(1, Math.min(9, Number(bits[1]) || 1)) silently turned them
 * into nine triangles in a 3x3 grid. This suite validates every legacy spec
 * that the battery can render (matrix cells, series figures, and option
 * strings where they are true figure specs) so malformed counts, shapes,
 * fills, or rotations fail loudly at test time instead of distorting items.
 */

const SHAPES: readonly string[] = MATRIX_SHAPES;
const FILLS: readonly string[] = MATRIX_FILLS;

/** Returns an error message for a malformed legacy spec, or null if valid. */
export function checkLegacySpec(spec: string): string | null {
  const bits = spec.split(":");
  if (bits.length !== 4) return "expected 4 colon-separated parts, got " + bits.length;
  const [shape, countPart, fill, rotPart] = bits as [string, string, string, string];
  if (!SHAPES.includes(shape)) return "unknown shape '" + shape + "'";
  const count = Number(countPart);
  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || count > 9) {
    return "count '" + countPart + "' is not an integer in 1..9 (renderer would silently clamp it)";
  }
  if (!FILLS.includes(fill)) return "unknown fill '" + fill + "'";
  if (!Number.isFinite(Number(rotPart))) return "rotation '" + rotPart + "' is not finite";
  return null;
}

function validateSpec(spec: string, subtestId: string, itemId: string, where: string): void {
  const error = checkLegacySpec(spec);
  assert.equal(
    error,
    null,
    subtestId + " / " + itemId + " (" + where + ") has invalid figure spec \"" + spec + "\": " + error,
  );
}

test("every rendered legacy figure spec is well-formed", () => {
  for (const s of BATTERY) {
    for (const item of [...(s.practice ?? []), ...s.items]) {
      const render = item.render;
      if (render?.kind === "matrix") {
        for (const cell of render.cells) {
          if (typeof cell === "string") validateSpec(cell, s.id, item.id, "matrix cell");
        }
        if (item.options && !render.optionCells) {
          for (const option of item.options) validateSpec(option, s.id, item.id, "option");
        }
      } else if (render?.kind === "series") {
        for (const figure of render.figures) validateSpec(figure, s.id, item.id, "series figure");
        if (item.options) {
          for (const option of item.options) validateSpec(option, s.id, item.id, "option");
        }
      }
    }
  }
});

test("degrees-in-count-field specs (the prac-mx-02 bug format) are rejected", () => {
  // These exact forms shipped once as answer options and silently rendered as
  // nine clamped figures; the validator must report each one as invalid.
  const historicalBugs = [
    "tri:135:none:0",
    "tri:90:half:0",
    "tri:90:none:0",
    "sq:90:none:0",
    "tri:45:none:0",
  ];
  for (const spec of historicalBugs) {
    assert.match(
      checkLegacySpec(spec) ?? "",
      /count '.+' is not an integer in 1\.\.9/,
      "validator failed to reject known-bad spec \"" + spec + "\"",
    );
  }
});
