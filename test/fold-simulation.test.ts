import test from "node:test";
import assert from "node:assert/strict";
import { paperFolding } from "../src/items/gv-fold.ts";

/**
 * Executable statement of the fold convention. A "V" fold moves the RIGHT
 * half onto the stationary LEFT half (col c -> 3-c for c >= 2); an "H" fold
 * moves the BOTTOM half onto the stationary TOP half (row r -> 3-r for r >= 2).
 * Punches are (row, col) in the final folded footprint, top-left anchored. A
 * punch at a footprint cell penetrates every original-sheet cell that maps
 * onto it, so holes = 2^folds x punches.
 */
function unfoldHoles(steps: readonly string[], punches: readonly [number, number][]): number[] {
  const holes = new Set<number>();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let fr = r;
      let fc = c;
      let w = 4;
      let h = 4;
      for (const step of steps) {
        // Each fold halves the CURRENT footprint: the moving half reflects
        // onto the stationary half (footprint stays top-left anchored).
        if (step === "V") {
          if (fc >= w / 2) fc = w - 1 - fc;
          w /= 2;
        } else {
          if (fr >= h / 2) fr = h - 1 - fr;
          h /= 2;
        }
      }
      if (punches.some(([pr, pc]) => pr === fr && pc === fc)) holes.add(r * 4 + c);
    }
  }
  return [...holes].sort((x, y) => x - y);
}

function parseItem(item: (typeof paperFolding.items)[number]) {
  assert.ok(item.render && item.render.kind === "fold", item.id + " missing fold render");
  const render = item.render as { steps: string[]; result: string };
  const punches = JSON.parse(render.result) as [number, number][];
  return { steps: render.steps, punches };
}

test("fold instructions state the simulator convention", () => {
  assert.match(paperFolding.instructions, /right half over to the left/i);
  assert.match(paperFolding.instructions, /bottom half upward/i);
});

test("every paper-folding key re-derives from fold -> punch -> unfold", () => {
  for (const item of paperFolding.items) {
    const { steps, punches } = parseItem(item);
    const derived = unfoldHoles(steps, punches);
    const keyed = JSON.parse(item.options![item.answer as number] as string) as number[];
    assert.deepEqual(keyed, derived, item.id + " key does not match simulation");
    // Punch coordinates must lie inside the final folded footprint.
    let w = 4;
    let h = 4;
    for (const step of steps) {
      if (step === "V") w /= 2;
      else h /= 2;
    }
    for (const [pr, pc] of punches) {
      assert.ok(pr >= 0 && pr < h && pc >= 0 && pc < w, item.id + " punch outside folded footprint");
    }
    // Hole count is structural: 2^folds per punch.
    assert.equal(derived.length, punches.length * 2 ** steps.length, item.id + " hole count wrong");
  }
});

test("no distractor duplicates the derived key and all options are unique", () => {
  for (const item of paperFolding.items) {
    const { steps, punches } = parseItem(item);
    const derived = JSON.stringify(unfoldHoles(steps, punches));
    const seen = new Set<string>();
    for (const option of item.options!) {
      assert.ok(!seen.has(option), item.id + " repeats an option");
      seen.add(option);
    }
    for (let i = 0; i < item.options!.length; i++) {
      if (i === item.answer) continue;
      assert.notEqual(item.options![i], derived, item.id + " distractor equals the key");
    }
  }
});

test("multi-punch items resist count elimination", () => {
  // With 2+ punches the key carries many holes; at least three options must
  // share the key's exact hole count so it cannot be found by counting alone.
  for (const item of paperFolding.items) {
    const { punches } = parseItem(item);
    if (punches.length < 2) continue;
    const keyCount = (JSON.parse(item.options![item.answer as number] as string) as number[]).length;
    const matching = item.options!.filter(
      (o) => (JSON.parse(o as string) as number[]).length === keyCount,
    );
    assert.ok(matching.length >= 3, item.id + " key's hole count is too distinctive");
  }
});

test("single-punch quadrant items keep a plausible same-count competitor", () => {
  for (const item of paperFolding.items) {
    const { punches, steps } = parseItem(item);
    if (punches.length !== 1 || steps.length !== 2) continue;
    const keyCount = (JSON.parse(item.options![item.answer as number] as string) as number[]).length;
    const matching = item.options!.filter(
      (o) => (JSON.parse(o as string) as number[]).length === keyCount,
    );
    assert.ok(matching.length >= 3, item.id + " quadrant key findable by counting holes");
  }
});

test("redesigned ceiling items pf-013/pf-014 are two-fold two-punch asymmetric pairs", () => {
  const pf13 = paperFolding.items.find((i) => i.id === "pf-013");
  const pf14 = paperFolding.items.find((i) => i.id === "pf-014");
  assert.ok(pf13 && pf14);
  assert.equal(unfoldHoles(["V", "H"], [[0, 0], [0, 1]]).join(), "0,1,2,3,12,13,14,15");
  assert.equal(unfoldHoles(["H", "V"], [[0, 0], [1, 0]]).join(), "0,3,4,7,8,11,12,15");
  assert.ok(pf13.b! <= 1.3 && pf13.b! >= 1.0, "pf-013 should sit at the re-anchored ceiling tier");
  assert.ok(pf14.b! <= 1.6 && pf14.b! >= 1.3, "pf-014 should be the subtest ceiling");
});

// 2026-08-21 red-team regression: the authored option orders stepped the key
// through positions 4,2,0,3,1 in bank order across pf-001..pf-013 (lag-5
// agreement 8/11 vs chance 1/5). rotateOptions in gv-fold.ts killed the cycle;
// this guard pins the whole class for fold, mirroring test/blocks.test.ts
// ("key positions do not cycle with bank order") but generalised beyond
// exact period-5 windows to partial cycles and slot concentration.
test("key positions do not cycle with bank order (learnable-position regression)", () => {
  const pos = paperFolding.items.map((i) => i.answer as number);
  assert.equal(pos.length, 16);
  // (a) No exact period up to half the bank length may explain the sequence.
  for (let p = 1; p <= Math.floor((pos.length - 1) / 2); p++) {
    let periodic = true;
    for (let i = 0; i + p < pos.length; i++) {
      if (pos[i] !== pos[i + p]!) {
        periodic = false;
        break;
      }
    }
    assert.ok(!periodic, "answer positions repeat with period " + p);
  }
  // (b) Positional autocorrelation: at lags 1..6 no lag may agree far above
  // chance (1/5). This is what catches a cycle spanning only part of the
  // bank — the authored one was not exactly periodic yet agreed 8/11 at lag 5.
  for (let lag = 1; lag <= 6; lag++) {
    let matches = 0;
    let pairs = 0;
    for (let i = 0; i + lag < pos.length; i++) {
      pairs++;
      if (pos[i] === pos[i + lag]!) matches++;
    }
    assert.ok(
      matches / pairs <= 0.4,
      "key positions correlate at lag " + lag + " (" + matches + "/" + pairs + " agreements)",
    );
  }
  // (c) All five slots carry keys and none holds more than 4/16 — the
  // pigeonhole optimum over 5 slots — so always-guessing one slot stays at
  // 25% maximum instead of drifting toward a modal position.
  const counts = new Map<number, number>();
  for (const p of pos) counts.set(p, (counts.get(p) ?? 0) + 1);
  assert.equal(counts.size, 5, "key positions must spread across all 5 option slots");
  assert.ok(
    Math.max(...counts.values()) <= 4,
    "one option slot holds too many keys: " + JSON.stringify([...counts.entries()]),
  );
  // (d) No three consecutive bank-order items key the same slot.
  for (let i = 0; i + 2 < pos.length; i++) {
    assert.ok(
      pos[i] !== pos[i + 1]! || pos[i + 1] !== pos[i + 2]!,
      "three consecutive keys in slot " + pos[i] + " at bank index " + i,
    );
  }
});
