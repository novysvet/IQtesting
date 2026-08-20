import { test } from "node:test";
import assert from "node:assert/strict";
import {
  thetaToStandard, band, normalCdf, combineInverseVariance,
  scoreComposite, erf,
} from "../src/core/scoring.ts";
import type { Item, Response, Subtest } from "../src/core/types.ts";

test("theta maps to the 100/15 scale", () => {
  assert.equal(thetaToStandard(0), 100);
  assert.equal(thetaToStandard(1), 115);
  assert.equal(thetaToStandard(-2), 70);
});

test("erf and normalCdf are accurate at known points", () => {
  assert.ok(Math.abs(erf(0)) < 1e-9);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normalCdf(1.6449) - 0.95) < 1e-3);
  assert.ok(Math.abs(normalCdf(-1.6449) - 0.05) < 1e-3);
});

test("band produces an ordered CI containing the score", () => {
  const b = band(1, 0.3);
  assert.equal(b.score, 115);
  assert.ok(b.ci95[0] < b.score && b.score < b.ci95[1]);
  assert.ok(b.percentile > 50 && b.percentile < 99.9);
});

test("percentile is clamped away from 0 and 100", () => {
  assert.ok(band(-6, 0.2).percentile >= 0.1);
  assert.ok(band(6, 0.2).percentile <= 99.9);
});

test("inverse-variance weighting favors the precise estimate", () => {
  // Precise 2.0 vs noisy 0.0 -> result must sit much closer to 2.0.
  const c = combineInverseVariance([
    { theta: 2.0, se: 0.2 },
    { theta: 0.0, se: 0.8 },
  ]);
  assert.ok(c.theta > 1.7, `expected pull toward precise estimate, got ${c.theta}`);
  // Combined SE must beat the best single SE.
  assert.ok(c.se < 0.2);
});

test("combining equal-precision estimates averages them", () => {
  const c = combineInverseVariance([{ theta: 1, se: 0.5 }, { theta: -1, se: 0.5 }]);
  assert.ok(Math.abs(c.theta) < 1e-9);
});

test("combineInverseVariance handles empty and degenerate input", () => {
  assert.deepEqual(combineInverseVariance([]), { theta: 0, se: 1 });
  const c = combineInverseVariance([{ theta: 5, se: 0 }]);
  assert.ok(Number.isFinite(c.theta) && Number.isFinite(c.se));
});

function item(id: string, subtest: string, broad: any, b: number): Item {
  return { id, subtest, broad, narrow: "I", a: 1.5, b, c: 0.2, prompt: id, answer: 0 };
}
function sub(id: string, broad: any): Subtest {
  return {
    id, name: id, broad, narrow: ["I"], instructions: "", budgetMin: 10,
    routing: { maxItems: 10, minItems: 3, ceilingMisses: 4, targetSe: 0.3, entryTheta: 0 },
    items: Array.from({ length: 6 }, (_, k) => item(`${id}-${k}`, id, broad, -1.5 + k * 0.6)),
  };
}

test("composite scoring aggregates subtests into broad factors and g", () => {
  const subs = [sub("gf1", "Gf"), sub("gf2", "Gf"), sub("gc1", "Gc")];
  const responses: Response[] = subs.flatMap((s) =>
    s.items.map((i, k) => ({ itemId: i.id, correct: k < 4, latencyMs: 100, timedOut: false })),
  );
  const comp = scoreComposite(subs, responses);
  assert.equal(comp.subtests.length, 3);
  // Two Gf subtests collapse into one Gf broad score.
  assert.equal(comp.broad.length, 2);
  const gf = comp.broad.find((b) => b.broad === "Gf")!;
  assert.deepEqual(gf.subtests.sort(), ["gf1", "gf2"]);
  assert.ok(Number.isFinite(comp.g.score));
  assert.ok(comp.g.ci95[0] < comp.g.score && comp.g.score < comp.g.ci95[1]);
});

test("subtests with no responses are excluded, not scored as zero", () => {
  const subs = [sub("gf1", "Gf"), sub("unused", "Gv")];
  const responses: Response[] = subs[0]!.items.map((i) => ({
    itemId: i.id, correct: true, latencyMs: 100, timedOut: false,
  }));
  const comp = scoreComposite(subs, responses);
  assert.equal(comp.subtests.length, 1);
  assert.equal(comp.broad.length, 1);
  assert.equal(comp.broad[0]!.broad, "Gf");
});

test("higher performance yields a higher g composite", () => {
  const subs = [sub("gf1", "Gf"), sub("gc1", "Gc")];
  const mkResp = (n: number): Response[] =>
    subs.flatMap((s) => s.items.map((i, k) => ({
      itemId: i.id, correct: k < n, latencyMs: 100, timedOut: false,
    })));
  const low = scoreComposite(subs, mkResp(1));
  const high = scoreComposite(subs, mkResp(6));
  assert.ok(high.g.score > low.g.score, `${high.g.score} !> ${low.g.score}`);
});
