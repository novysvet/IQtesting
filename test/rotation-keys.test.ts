import test from "node:test";
import assert from "node:assert/strict";
import { mentalRotation } from "../src/items/gv-rotation.ts";
import { ROTATION_PATHS } from "../src/components/figureGeometry.ts";

/** Z is drawn with 180-degree (C2) symmetry: rotations repeat mod 180. */
const SYMMETRY_ORDER: Record<string, number> = { Z: 180 };

function parseSpec(spec: string) {
  const [fig, deg, mirrored] = spec.split(":");
  return { fig: fig!, deg: Number(deg), mirrored: mirrored === "1" };
}

/** Two rotation specs render to identical pixels iff figure and chirality
 * match and the angles agree modulo the figure's rotational symmetry. */
function renderKey(spec: string): string {
  const { fig, deg, mirrored } = parseSpec(spec);
  const order = SYMMETRY_ORDER[fig] ?? 360;
  return fig + ":" + mirrored + ":" + (((deg % order) + order) % order);
}

test("every mental-rotation item keys the unique same-figure rotated candidate", () => {
  for (const item of mentalRotation.items) {
    assert.equal(item.render?.kind, "rotation", item.id + " missing rotation render");
    if (item.render?.kind !== "rotation") continue;
    const targetFig = parseSpec(item.render.target).fig;
    const pure = item.render.candidates
      .map((spec, index) => ({ index, ...parseSpec(spec) }))
      .filter((c) => c.fig === targetFig && !c.mirrored);
    assert.equal(pure.length, 1, item.id + " must have exactly one same-figure rotation");
    assert.equal(item.answer, pure[0]!.index, item.id + " does not key the rotation");
    assert.notEqual(parseSpec(item.render.target).deg, pure[0]!.deg % 360 === parseSpec(item.render.target).deg ? -1 : pure[0]!.deg, item.id + " key must be rotated");
  }
});

test("chirality alone cannot solve any item (exploit regression)", () => {
  for (const item of mentalRotation.items) {
    if (item.render?.kind !== "rotation") continue;
    const nonMirrored = item.render.candidates.filter((spec) => parseSpec(spec).mirrored === false);
    assert.ok(nonMirrored.length >= 2, item.id + " has a single non-mirrored option — solvable by chirality alone");
    // The extra non-mirrored option(s) must be different figures (a second
    // same-figure rotation would make two defensible keys).
    const targetFig = parseSpec(item.render.target).fig;
    for (const spec of nonMirrored) {
      const { fig } = parseSpec(spec);
      if (fig === targetFig) continue;
      assert.notEqual(fig, targetFig, item.id + " extra non-mirrored option repeats the target figure");
    }
    // Every item keeps at least one mirror of the target (the chirality
    // discrimination remains the core mechanism).
    const mirrors = item.render.candidates.filter((spec) => parseSpec(spec).mirrored);
    assert.ok(mirrors.length >= 2, item.id + " lost its mirror distractors");
  }
});

test("all candidates render pairwise distinctly", () => {
  for (const item of mentalRotation.items) {
    if (item.render?.kind !== "rotation") continue;
    const keys = item.render.candidates.map(renderKey);
    assert.equal(new Set(keys).size, keys.length, item.id + " has visually duplicate candidates");
    for (const spec of item.render.candidates) {
      assert.ok(ROTATION_PATHS[parseSpec(spec).fig], item.id + " unknown figure in candidates");
    }
  }
});

test("different-figure distractors are confusable at their difficulty tier", () => {
  // F/E/P are near-miss glyphs (one stroke apart) and demand real figure
  // identity checks; they anchor every item from b >= -0.6. The easy-band
  // targets (L/T/Z, b <= -0.9) use right-angle glyphs that must still be
  // told apart from the target at a glance (L vs T-stub, Z vs F/P).
  const CONFUSABLE: Record<string, Set<string>> = {
    F: new Set(["E", "P"]),
    E: new Set(["F", "P"]),
    P: new Set(["F", "E"]),
    L: new Set(["T", "E"]),
    T: new Set(["L", "P"]),
    Z: new Set(["F", "P"]),
  };
  for (const item of mentalRotation.items) {
    if (item.render?.kind !== "rotation") continue;
    const targetFig = parseSpec(item.render.target).fig;
    const others = item.render.candidates
      .map(parseSpec)
      .filter((c) => c.fig !== targetFig)
      .map((c) => c.fig);
    for (const fig of others) {
      assert.ok(CONFUSABLE[targetFig]?.has(fig), item.id + " uses non-confusable figure " + fig + " for target " + targetFig);
    }
    if (item.b >= -0.5) {
      assert.ok(["F", "E", "P"].includes(targetFig), item.id + " hard items must use the confusable F/E/P family");
    }
  }
});

test("difficulty ladder is monotone and re-anchored to the audit range", () => {
  const bs = mentalRotation.items.map((i) => i.b);
  for (let i = 1; i < bs.length; i++) {
    assert.ok(bs[i]! >= bs[i - 1]!, "mental rotation b ladder must be monotone");
  }
  // Floor extended to -3.2 by the 2026-08-21 basal revision (audit §9): the
  // adaptive descent must be able to collect evidence at the scale floor.
  assert.ok(Math.min(...bs) <= -3.0 && Math.max(...bs) <= 1.5, "2D rotation bank must stay inside the honest ceiling");
  assert.equal(mentalRotation.items.length, 17);
  assert.ok(mentalRotation.routing.maxItems <= mentalRotation.items.length);
});

test("answer positions do not follow a short repeating cycle", () => {
  const answers = mentalRotation.items.map((i) => i.answer as number);
  for (const period of [1, 2, 3, 4]) {
    let cyclic = answers.length > period * 2;
    for (let i = period; i < answers.length; i++) {
      if (answers[i] !== answers[i - period]) cyclic = false;
    }
    assert.ok(!cyclic, "answer positions cycle with period " + period);
  }
});
