import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import { bankVersion } from "../src/core/telemetry.ts";
import { canonicalCell } from "../src/components/figureGeometry.ts";
import type { CellSpecV2, Item, Subtest } from "../src/core/types.ts";

/**
 * PRACTICE CONTRACT (2026-08-21, pre-norming hardening).
 *
 * Every adaptive subtest opens with unscored sample item(s): instruction
 * miscomprehension must never masquerade as low ability on the first scored
 * items. Practice items live OUTSIDE `subtest.items` — they are never routed,
 * scored, exported as responses, or hashed into bankVersion — but they must
 * still obey the item schema and carry machine-verifiable keys.
 */

const practiceItems: { subtest: Subtest; item: Item }[] = BATTERY.flatMap((s) =>
  (s.practice ?? []).map((item) => ({ subtest: s, item })),
);

test("every subtest opens with a small practice section", () => {
  for (const subtest of BATTERY) {
    if (subtest.matching) {
      // Whole-page matching formats present all items at once: their practice
      // section is a tiny demonstration page through the same UI, never
      // adaptive samples.
      assert.equal(subtest.practice, undefined, subtest.id + " matching format should not carry adaptive practice");
      assert.ok(subtest.matchingPractice, subtest.id + " matching format has no demonstration page");
      assert.ok(
        (subtest.matchingPractice?.defs.length ?? 0) >= 1 && subtest.matchingPractice!.bank.length >= 2,
        subtest.id + " demonstration page is empty",
      );
      continue;
    }
    assert.ok(
      (subtest.practice?.length ?? 0) >= 2,
      subtest.id + " carries fewer than two practice items",
    );
  }
});

test("practice ids are unique across the battery and namespaced", () => {
  const ids = practiceItems.map(({ item }) => item.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate practice id");
  for (const id of ids) assert.ok(id.startsWith("prac-"), id + " must be namespaced prac-");
});

test("practice items satisfy the schema and guessing contract", () => {
  const comb = (n: number, k: number) => {
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  };
  for (const { item } of practiceItems) {
    assert.ok(item.prompt.trim().length > 0, item.id + " missing prompt");
    if (item.multi !== undefined) {
      assert.equal(item.c, 1 / comb(item.options!.length, item.multi), item.id + " c must equal 1/C(options, multi)");
      const idx = (item.answer as string).split(",").map(Number);
      assert.equal(idx.length, item.multi, item.id + " key size mismatch");
      for (const i of idx) assert.ok(i >= 0 && i < item.options!.length, item.id + " key out of range");
      continue;
    }
    if (item.options) {
      assert.equal(item.c, 1 / item.options.length, item.id + " c must equal 1/nOptions");
      assert.ok((item.answer as number) >= 0 && (item.answer as number) < item.options.length, item.id + " key out of range");
      assert.equal(new Set(item.options).size, item.options.length, item.id + " repeats an option");
    } else {
      assert.equal(item.c, 0, item.id + " recall item must have c=0");
      assert.ok(String(item.answer).length > 0, item.id + " empty recall key");
    }
  }
});

test("practice keys re-derive per format", () => {
  for (const { item } of practiceItems) {
    const r = item.render;
    if (r?.kind === "symsearch") {
      // Key follows set membership exactly.
      const expected = r.targets.some((t) => r.search.includes(t)) ? 1 : 0;
      assert.equal(item.answer, expected, item.id + " symsearch key wrong");
    } else if (r?.kind === "symqueue") {
      // Key string re-derived from the persistent legend.
      const map = new Map(r.legend);
      const derived = r.queue.map((g) => map.get(g)).join("");
      assert.equal(item.answer, derived, item.id + " symqueue key wrong");
    } else if (r?.kind === "blocks") {
      // Total = sum of the height map.
      const total = r.heights.reduce((a, b) => a + b, 0);
      assert.equal(item.options![item.answer as number], String(total), item.id + " blocks key wrong");
    } else if (r?.kind === "fold") {
      // Same simulation as test/fold-simulation.test.ts.
      const punches = JSON.parse(r.result) as [number, number][];
      const holes = new Set<number>();
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          let fr = row;
          let fc = col;
          let w = 4;
          let h = 4;
          for (const step of r.steps) {
            if (step === "V") {
              if (fc >= w / 2) fc = w - 1 - fc;
              w /= 2;
            } else {
              if (fr >= h / 2) fr = h - 1 - fr;
              h /= 2;
            }
          }
          if (punches.some(([pr, pc]) => pr === fr && pc === fc)) holes.add(row * 4 + col);
        }
      }
      const keyed = JSON.parse(item.options![item.answer as number] as string) as number[];
      assert.deepEqual(keyed, [...holes].sort((a, b) => a - b), item.id + " fold key wrong");
    } else if (r?.kind === "rotation") {
      // Contract: exactly one candidate is the target figure non-mirrored.
      const [targetFig] = r.target.split(":");
      const nonMirrored = r.candidates
        .map((spec, i) => ({ spec, i }))
        .filter(({ spec }) => spec.split(":")[2] === "0" && spec.split(":")[0] === targetFig);
      assert.equal(nonMirrored.length, 1, item.id + " rotation must have exactly one non-mirrored target candidate");
      assert.equal(nonMirrored[0]!.i, item.answer, item.id + " rotation key is not the rotated target");
      // At least two mirrors, one at the key's own angle.
      const keyAngle = r.candidates[item.answer as number]!.split(":")[1];
      const mirrors = r.candidates.filter((spec) => spec.split(":")[0] === targetFig && spec.split(":")[2] === "1");
      assert.ok(mirrors.length >= 2, item.id + " needs two mirrors");
      assert.ok(mirrors.some((spec) => spec.split(":")[1] === keyAngle), item.id + " needs a mirror at the key's angle");
    } else if (r?.kind === "span") {
      const seq = r.sequence.join("");
      const expected =
        r.recall === "backward"
          ? [...seq].reverse().join("")
          : r.recall === "sorted"
            ? [...r.sequence].sort((a, b) => (/\d/.test(a) === /\d/.test(b) ? a.localeCompare(b) : /\d/.test(a) ? -1 : 1)).join("")
            : seq;
      assert.equal(item.answer, expected, item.id + " span key wrong");
    } else if (r?.kind === "vpuzzle") {
      // The keyed triple tiles the target exactly.
      const cells = new Set<number>();
      for (const idx of (item.answer as string).split(",").map(Number)) {
        for (const c of r.pieces[idx]!) {
          assert.ok(!cells.has(c), item.id + " pieces overlap");
          cells.add(c);
        }
      }
      assert.deepEqual([...cells].sort((a, b) => a - b), [...r.target].sort((a, b) => a - b), item.id + " tiling does not cover the target");
    } else if (r?.kind === "matrix") {
      assert.equal(r.cells.length, 9, item.id + " matrix needs nine cells");
      assert.equal(r.cells[8], null, item.id + " ninth matrix cell must be empty");
      if (typeof r.cells[0] === "string") {
        // Legacy rows: shape constant per row; count/fill/rot each either
        // constant across rows 1-2 or stepping by a fixed delta; extrapolate
        // row 3 from the two given cells of the target row.
        const parse = (spec: string) => {
          const [sh, ct, fl, ro] = spec.split(":");
          return { sh: sh!, ct: Number(ct), fl: fl!, ro: Number(ro) };
        };
        const c7 = parse(r.cells[6] as string);
        const c8 = parse(r.cells[7] as string);
        const p7 = parse(r.cells[3] as string);
        const p8 = parse(r.cells[4] as string);
        // Attribute carried when constant across rows 1-2, else stepped by
        // the target row's own delta.
        const carryOrStep = (refPrev: number, refFirst: number, curFirst: number, curSecond: number) =>
          refPrev === refFirst ? curSecond : curSecond + (curSecond - curFirst);
        const count = carryOrStep(p8.ct, p7.ct, c7.ct, c8.ct);
        const rot = carryOrStep(p8.ro, p7.ro, c7.ro, c8.ro);
        assert.equal(p8.fl, p7.fl, item.id + " legacy fill steps across rows; no fill ladder to extrapolate");
        const expected = c7.sh + ":" + count + ":" + c8.fl + ":" + rot;
        const hits = (item.options ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o === expected);
        assert.equal(hits.length, 1, item.id + " derived key " + expected + " does not match exactly one option");
        assert.equal(hits[0]!.i, item.answer, item.id + " key is not the derived continuation " + expected);
      } else {
        // Structured cells: cell 3 keeps only positions present in BOTH cell 1
        // and cell 2 (intersection), shape from cell 1. Verify rows 1-2, then
        // derive row 3 and compare canonically against the option grids.
        // The ninth cell is the asserted-empty target slot; only the eight
        // given cells must be structured.
        const structCells = r.cells.slice(0, 8).map((c) => {
          if (c === null || typeof c === "string") throw new Error(item.id + " structured matrix needs eight given structured cells");
          return c;
        });
        const byPos = (cell: CellSpecV2) => new Set(cell.marks.map((m) => m.pos));
        const predict = (c1: CellSpecV2, c2: CellSpecV2): CellSpecV2 => ({
          v: 2 as const,
          marks: c1.marks.filter((m) => byPos(c2).has(m.pos)),
        });
        for (const row of [0, 1]) {
          const pred = predict(structCells[3 * row]!, structCells[3 * row + 1]!);
          assert.equal(canonicalCell(pred), canonicalCell(structCells[3 * row + 2]!), item.id + " row " + (row + 1) + " violates the intersection rule");
        }
        const predicted = predict(structCells[6]!, structCells[7]!);
        const oc = r.optionCells ?? [];
        const hits = oc.map((c, i) => ({ c, i })).filter(({ c }) => canonicalCell(c) === canonicalCell(predicted));
        assert.equal(hits.length, 1, item.id + " intersection prediction matches " + hits.length + " options");
        assert.equal(hits[0]!.i, item.answer, item.id + " key is not the intersection prediction");
      }
    }
  }
});

test("practice is invisible to scoring, routing pools, and bankVersion", () => {
  const poolItems = BATTERY.flatMap((s) => s.items);
  assert.equal(poolItems.filter((i) => i.id.startsWith("prac-")).length, 0, "practice leaked into scored pools");
  // Editing a practice item must NOT change the bank hash: it cannot affect
  // any score, so it must not invalidate stored sessions or norm tables.
  const before = bankVersion(BATTERY);
  const withEditedPractice = BATTERY.map((s) =>
    s.practice && s.practice.length > 0
      ? { ...s, practice: [{ ...s.practice[0]!, prompt: s.practice[0]!.prompt + " edited" }] }
      : s,
  );
  assert.equal(bankVersion(withEditedPractice), before, "practice edits must not change bankVersion");
});
