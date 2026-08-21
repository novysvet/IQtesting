import { test } from "node:test";
import assert from "node:assert/strict";
import {
  empiricalPercentile, probit, normedBand, validateNorms, MIN_NORM_SAMPLE,
} from "../src/core/norms.ts";
import type { NormTable } from "../src/core/norms.ts";

/** A perfectly normal reference sample of 101 thetas spanning -2..+2. */
const SAMPLE101 = Array.from({ length: 101 }, (_, i) => -2 + i * 0.04);

function table(over: Partial<NormTable> = {}): NormTable {
  return {
    format: "iqtesting-norms",
    version: 1,
    bankVersion: "deadbeef",
    sampleN: SAMPLE101.length,
    excludedInvalid: 0,
    collectedFrom: null,
    collectedTo: null,
    thetaSample: SAMPLE101,
    ...over,
  };
}

test("empiricalPercentile uses the midrank convention", () => {
  const s = [1, 2, 3, 4, 5];
  assert.equal(empiricalPercentile(s, 3), 50); // median sits exactly at P50
  assert.equal(empiricalPercentile(s, 1), 10);
  assert.equal(empiricalPercentile(s, 5), 90);
  assert.equal(empiricalPercentile(s, 0), 0);
  assert.equal(empiricalPercentile(s, 6), 100);
  assert.equal(empiricalPercentile([], 1), null);
});

test("probit inverts normalCdf at known anchors", () => {
  assert.ok(Math.abs(probit(0.5)) < 1e-6);
  assert.ok(Math.abs(probit(0.975) - 1.959964) < 1e-3);
  assert.ok(Math.abs(probit(0.025) + 1.959964) < 1e-3);
  assert.ok(Math.abs(probit(0.8413) - 1) < 1e-3);
});

test("normedBand references the sample, not the normal model", () => {
  // Left-skewed sample: 90 thetas spread over [-3,-0.1], only 30 in [0.2,2.8].
  const low = Array.from({ length: 90 }, (_, i) => -3 + i * (2.9 / 89));
  const high = Array.from({ length: 30 }, (_, i) => 0.2 + i * (2.6 / 29));
  const skewed = table({ thetaSample: [...low, ...high], sampleN: 120 });
  const b = normedBand(0.5, 0.3, skewed)!;
  assert.ok(b.percentile > 70 && b.percentile < 85, `P${b.percentile}`);
  // In a left-skewed sample theta 0.5 is MORE extreme than under normality:
  // normed IQ must exceed the linear map (107.5).
  assert.ok(b.normedScore > 107.5, `normed ${b.normedScore} should exceed linear 107.5`);
});

test("normedBand keeps the CI ordered around the score", () => {
  const b = normedBand(0, 0.4, table())!;
  assert.ok(b.ci95[0] < b.normedScore && b.normedScore < b.ci95[1]);
});

test("validateNorms rejects wrong bank, small samples, unsorted data", () => {
  assert.equal(validateNorms(table()), true);
  // Wrong bank version when a current version is supplied.
  assert.equal(validateNorms(table(), "ffffff00"), false);
  // Below the floor: the lengths MATCH (99 = 99) so the length check passes
  // and the sampleN < MIN_NORM_SAMPLE branch is what rejects.
  assert.equal(validateNorms(table({ sampleN: MIN_NORM_SAMPLE - 1, thetaSample: SAMPLE101.slice(0, MIN_NORM_SAMPLE - 1) })), false);
  // Unsorted: length matches (100 = 100) so rejection must come from the
  // sortedness loop, not a length short-circuit. A sorted 100-entry table
  // with otherwise identical fields is the positive control.
  assert.equal(validateNorms(table({ sampleN: MIN_NORM_SAMPLE, thetaSample: SAMPLE101.slice(0, MIN_NORM_SAMPLE) })), true);
  assert.equal(
    validateNorms(table({
      sampleN: MIN_NORM_SAMPLE,
      thetaSample: Array.from({ length: MIN_NORM_SAMPLE }, (_, i) => MIN_NORM_SAMPLE - i),
    })),
    false,
  );
  // sampleN must equal the array length.
  assert.equal(validateNorms(table({ sampleN: 999 })), false);
  // Wrong format/version markers.
  assert.equal(validateNorms({ ...table(), format: "other" }), false);
  assert.equal(validateNorms(null), false);
});

test("normedBand returns null for tables that cannot back a claim", () => {
  // Lengths match (42 = 42): the rejection is the below-floor branch.
  assert.equal(normedBand(0, 0.3, table({ sampleN: 42, thetaSample: SAMPLE101.slice(0, 42) })), null);
  assert.equal(normedBand(0, 0.3, table({ bankVersion: "otherbank" }), "currentbank"), null);
});

test("a symmetric sample reproduces the linear map at the median", () => {
  // The uniform-grid sample's midpoint lands at P50 by the midrank convention,
  // so the normed IQ at theta 0 is exactly 100.
  const b = normedBand(0, 0.3, table())!;
  assert.equal(b.normedScore, 100);
});
