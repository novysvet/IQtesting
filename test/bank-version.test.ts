import test from "node:test";
import assert from "node:assert/strict";
import { bankVersion, CALIBRATION_FORM_TAG } from "../src/core/telemetry.ts";
import type { Item, Subtest } from "../src/core/types.ts";

/**
 * bankVersion CONTENT COVERAGE (P1 fix, 2026-08-21).
 *
 * The hash backs two provenance contracts: persistence restores a save only
 * onto the bank that produced it (persistence.ts stale-save guard), and norm
 * tables bind to the bank+form they were collected under. Both are void if
 * examinee-visible content can change without changing the hash. These tests
 * use a tiny synthetic subtest — never the real banks — so the expectations
 * survive concurrent item-bank edits, and every expected hash is COMPUTED,
 * never hard-coded (other agents regenerate option sets in place).
 *
 * Regression provenance: before the fix, mutating `prompt`, `render`,
 * `timeLimitSec`, or `budgetMin` all left the hash identical (audit finding
 * routing-telemetry-validity P1 / battery-hub P1, verified by perturbation).
 */

/** Minimal type-valid subtest, deep-fresh on every call so tests may mutate freely. */
function mkSubtest(): Subtest {
  const item: Item = {
    id: "fx-1",
    subtest: "fixture",
    broad: "Gf",
    narrow: "I",
    a: 1.0,
    b: 0.0,
    c: 0.25,
    prompt: "Which figure completes the matrix?",
    options: ["alpha", "beta", "gamma", "delta"],
    answer: 2,
    timeLimitSec: 30,
    render: {
      kind: "matrix",
      cells: ["sq:1:solid:0", null, "cir:1:half:90"],
      rows: 1,
      cols: 3,
    },
  };
  return {
    id: "fixture",
    name: "Fixture Subtest",
    broad: "Gf",
    narrow: ["I"],
    instructions: "Fixture instructions.",
    budgetMin: 5,
    routing: { maxItems: 10, minItems: 4, ceilingMisses: 5, targetSe: 0.35, entryTheta: 0 },
    items: [item],
  };
}

/** Fresh copy of the one-item bank with `mutate` applied to the (only) item. */
function withItem(mutate: (i: Item) => Item): Subtest[] {
  const s = mkSubtest();
  return [{ ...s, items: [mutate({ ...s.items[0]! })] }];
}

test("bankVersion is deterministic and 8-hex for identical inputs", () => {
  const a = bankVersion([mkSubtest()]);
  const b = bankVersion([mkSubtest()]);
  assert.equal(a, b, "two structurally identical banks must hash identically");
  assert.equal(bankVersion([mkSubtest()]), a, "hash must be stable across repeated calls");
  // worker/validator.js rejects anything but 8 lowercase hex digits.
  assert.match(a, /^[0-9a-f]{8}$/);
});

test("changing an item's prompt changes the bank version", () => {
  const baseline = bankVersion([mkSubtest()]);
  const edited = withItem((i) => ({ ...i, prompt: i.prompt + " (reworded)" }));
  assert.notEqual(bankVersion(edited), baseline, "a prompt rewording silently pooled old and new sessions");
});

test("changing the render payload changes the bank version", () => {
  const baseline = bankVersion([mkSubtest()]);
  // Deep payload edit: same kind, one nested figure-spec value changed.
  const deepEdit = withItem((i) => ({
    ...i,
    render: { ...(i.render as { kind: "matrix"; cells: (string | null)[]; rows: number; cols: number }), cells: ["sq:1:solid:0", null, "cir:1:half:180"] },
  }));
  assert.notEqual(bankVersion(deepEdit), baseline, "a changed figure payload must re-key the bank");
  // Presence vs absence: dropping the renderer entirely must also re-key.
  const removed = withItem((i) => ({ ...i, render: undefined }));
  assert.notEqual(bankVersion(removed), baseline, "removing a render payload must re-key the bank");
});

test("changing an item's timeLimitSec changes the bank version", () => {
  const baseline = bankVersion([mkSubtest()]);
  const raised = withItem((i) => ({ ...i, timeLimitSec: 45 }));
  assert.notEqual(bankVersion(raised), baseline, "a per-item time-cap change alters scored outcomes (timeout auto-submit)");
  const dropped = withItem((i) => ({ ...i, timeLimitSec: undefined }));
  assert.notEqual(bankVersion(dropped), baseline, "removing a time cap must re-key the bank");
  assert.notEqual(bankVersion(dropped), bankVersion(raised), "absent and 45 s are different banks");
});

test("changing a subtest's budgetMin changes the bank version", () => {
  const baseline = bankVersion([mkSubtest()]);
  const bank: Subtest[] = [{ ...mkSubtest(), budgetMin: 6 }];
  assert.notEqual(bankVersion(bank), baseline, "a budget change alters the administration contract");
});

test("the form variant still distinguishes calibration from adaptive", () => {
  const bank = [mkSubtest()];
  const adaptive = bankVersion(bank);
  const calibration = bankVersion(bank, CALIBRATION_FORM_TAG);
  assert.notEqual(adaptive, calibration, "same content under different administration forms must not share a version");
  assert.equal(bankVersion(bank, CALIBRATION_FORM_TAG), calibration, "variant hash must be deterministic");
  // Distinct variants stay distinct: the variant space cannot collide.
  assert.notEqual(bankVersion(bank, "other-form"), calibration);
});
