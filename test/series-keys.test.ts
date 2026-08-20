import test from "node:test";
import assert from "node:assert/strict";
import { figureSeries } from "../src/items/gf-series.ts";

function parse(spec: string) {
  const [shape, count, fill, rot] = spec.split(":");
  return { shape: shape!, count: Number(count), fill: fill!, rot: Number(rot) };
}

function spec(shape: string, count: number, fill: string, rot: number): string {
  return shape + ":" + count + ":" + fill + ":" + rot;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Each rule re-derives the next figure from the shown figures — the keys are
 * never copied from the bank. */
const RULES: Record<string, (figs: string[]) => string> = {
  "fs-001": (f) => spec(parse(f[0]!).shape, parse(f[2]!).count + 1, parse(f[0]!).fill, parse(f[0]!).rot),
  "fs-002": (f) => spec(parse(f[0]!).shape, 1, "none", mod360(parse(f[1]!).rot - parse(f[0]!).rot + parse(f[2]!).rot)),
  "fs-003": (f) => spec(parse(f[0]!).shape, 1, parse(f[0]!).fill, 0),
  "fs-004": (f) => spec(parse(f[0]!).shape, 1, parse(f[0]!).fill, mod360(parse(f[2]!).rot + (parse(f[1]!).rot - parse(f[0]!).rot))),
  "fs-005": (f) => spec(parse(f[0]!).shape, parse(f[2]!).count * 2, parse(f[0]!).fill, 0),
  "fs-006": (f) => {
    // Shape cycles over the first four distinct shapes; the 5th slot repeats
    // the cycle. Count/fill constant.
    const seq = f.map(parse);
    return spec(seq[1]!.shape, seq[0]!.count, seq[0]!.fill, 0);
  },
  "fs-007": (f) => {
    const step = parse(f[1]!).rot - parse(f[0]!).rot;
    const fills = f.map((x) => parse(x).fill);
    const nextFill = fills[fills.length - 1] === "none" ? "solid" : "none";
    return spec(parse(f[0]!).shape, 1, nextFill, mod360(parse(f[2]!).rot + step));
  },
  "fs-008": (f) => {
    const p = f.map(parse);
    return spec(p[0]!.shape, p[2]!.count + 1, p[0]!.fill, mod360(p[2]!.rot + (p[1]!.rot - p[0]!.rot)));
  },
  "fs-009": (f) => {
    // Four-shape cycle with wrap already shown at term 5; fill alternates.
    const p = f.map(parse);
    const nextShape = p[1]!.shape; // cycle repeats: term 6 = term 2's shape
    const nextFill = p[p.length - 1]!.fill === "none" ? "half" : "none";
    return spec(nextShape, 1, nextFill, 0);
  },
  "fs-010": (f) => {
    const step = parse(f[1]!).rot - parse(f[0]!).rot;
    return spec(parse(f[0]!).shape, 1, parse(f[0]!).fill, mod360(parse(f[2]!).rot + step));
  },
  "fs-011": (f) => {
    const p = f.map(parse);
    return spec(p[0]!.shape, p[2]!.count - 1, p[0]!.fill, mod360(p[2]!.rot + (p[1]!.rot - p[0]!.rot)));
  },
  "fs-012": (f) => {
    const p = f.map(parse);
    const fills = ["none", "half", "solid", "hatch"];
    const nextFill = fills[(fills.indexOf(p[p.length - 1]!.fill) + 1) % 4]!;
    return spec(p[0]!.shape, p[3]!.count + 1, nextFill, mod360(p[3]!.rot + 90));
  },
  "fs-013": (f) => {
    const p = f.map(parse);
    const fills = ["none", "half", "solid", "hatch"];
    const nextFill = fills[(fills.indexOf(p[p.length - 1]!.fill) + 1) % 4]!;
    return spec(p[0]!.shape, p[0]!.count, nextFill, mod360(p[p.length - 1]!.rot + 45));
  },
  "fs-014": (f) => {
    // Rotation increments grow arithmetically (+45, +90, +135, ...): the
    // four shown terms pin the growth rule; the next increment is +180.
    const p = f.map(parse);
    const increments: number[] = [];
    for (let i = 1; i < p.length; i++) increments.push(p[i]!.rot - p[i - 1]!.rot);
    const growth = increments[1]! - increments[0]!;
    const nextIncrement = increments[increments.length - 1]! + growth;
    return spec(p[0]!.shape, p[0]!.count, p[0]!.fill, mod360(p[p.length - 1]!.rot + nextIncrement));
  },
};

test("every figure-series key re-derives from its stated rule", () => {
  for (const item of figureSeries.items) {
    const rule = RULES[item.id];
    assert.ok(rule, item.id + " has no encoded rule in the test");
    assert.equal(item.render?.kind, "series");
    if (item.render?.kind !== "series") continue;
    const derived = rule(item.render.figures);
    assert.equal(item.options![item.answer as number], derived, item.id + " key does not match rule derivation");
  }
});

test("distractors stay inside the series' shape family (elimination regression)", () => {
  for (const item of figureSeries.items) {
    if (item.render?.kind !== "series") continue;
    const family = new Set(item.render.figures.map((f) => parse(f).shape));
    const outside = item.options!.filter((o) => !family.has(parse(o).shape));
    assert.ok(outside.length <= 1, item.id + " has multiple out-of-family distractors — family elimination");
  }
});

test("ambiguous second-difference item demonstrates the growth rule (fs-014 regression)", () => {
  const fs14 = figureSeries.items.find((i) => i.id === "fs-014");
  assert.ok(fs14 && fs14.render?.kind === "series");
  // Four terms: increments 45, 90, 135 — a geometric-growth reading would put
  // the fourth term at 315, which the stimulus itself refutes.
  const rots = fs14.render.figures.map((f) => parse(f).rot);
  assert.deepEqual(rots, [0, 45, 135, 270]);
  assert.equal(fs14.b, 2.3);
});
