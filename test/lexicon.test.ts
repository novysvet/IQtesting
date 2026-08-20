import test from "node:test";
import assert from "node:assert/strict";
import { lexiconData, precisionLexicon } from "../src/items/gc.ts";

/**
 * Precision Lexicon regression: corpus-calibrated difficulty + register rules.
 *
 * Every item stores the wordfreq 'en' Zipf value of its keyed word and all
 * distractors. Difficulty must be exactly b = 4 - zipf(key), and the option
 * set must stay inside a register band so no strategy (e.g. "pick the rarest")
 * beats knowing the definition. Zipf bands are descriptive buckets; counts
 * may drift by one when word data shifts.
 */

function bandOf(z: number): number {
  return z >= 4.9 ? 1 : z >= 4.45 ? 2 : z >= 3.8 ? 3 : z >= 3.0 ? 4 : 5;
}

test("lexicon bank has 50 items with unique keys and resolvable answers", () => {
  assert.equal(precisionLexicon.items.length, 50);
  assert.equal(lexiconData.length, 50);
  const keyed = new Set<string>();
  for (const [definition, correct] of lexiconData) {
    assert.ok(definition.trim().length > 0, "empty definition");
    assert.ok(!keyed.has(correct), "duplicate keyed word: " + correct);
    keyed.add(correct);
  }
  for (const item of precisionLexicon.items) {
    const answer = item.options?.[item.answer as number];
    assert.ok(answer, item.id + " has no resolvable key");
  }
});

test("each stored zipf vector places its keyed word in the item's options", () => {
  for (const [index, datum] of lexiconData.entries()) {
    const item = precisionLexicon.items[index]!;
    const [, correct, distractors] = datum;
    assert.equal(item.options!.length, 5, item.id + " must have five options");
    assert.equal(item.options![item.answer as number], correct, item.id + " key does not resolve to the authored word");
    assert.deepEqual([...item.options!].sort(), [...distractors, correct].sort(), item.id + " option set mismatch");
  }
});

test("difficulty is exactly the corpus calibration b = 4 - zipf(key)", () => {
  for (const [index, datum] of lexiconData.entries()) {
    const item = precisionLexicon.items[index]!;
    const zipfs = datum[3];
    assert.ok(zipfs.every((z) => z > 0), item.id + " has an unattested word (zipf 0)");
    assert.equal(item.b, Number((4 - zipfs[0]).toFixed(2)), item.id + " b does not match stored zipf");
    assert.equal(item.a, 1.35);
    assert.equal(item.c, 0.2);
  }
});

test("option register stays inside a band; the key is not a rarity outlier", () => {
  for (const [index, datum] of lexiconData.entries()) {
    const item = precisionLexicon.items[index]!;
    const zipfs = datum[3];
    const [zKey, ...zOthers] = zipfs;
    const all = [...zipfs];
    // Round away float dust: the caps are exact 2-decimal constants.
    const width = Number((Math.max(...all) - Math.min(...all)).toFixed(2));
    const drift = Number((zKey - zOthers.reduce((a, b) => a + b, 0) / zOthers.length).toFixed(2));
    // At the top of the scale (band 5) the keyed word is definitionally the
    // rarest in its neighborhood; constraints are relaxed there and only there.
    const ceiling = bandOf(zKey) === 5;
    const widthCap = ceiling ? 1.8 : 1.6;
    const driftCap = ceiling ? 1.25 : 0.9;
    assert.ok(width <= widthCap, item.id + " register width " + width.toFixed(2) + " > " + widthCap);
    assert.ok(Math.abs(drift) <= driftCap, item.id + " key drift " + drift.toFixed(2) + " > " + driftCap);
    assert.ok(zKey >= Math.min(...zOthers) - 1.1, item.id + " key is far rarer than every option (rarest-key exploit)");
    assert.ok(zKey <= Math.max(...zOthers) + 0.9, item.id + " key is far commoner than every option");
  }
});

test("bank covers five difficulty bands and the full calibrated span", () => {
  const bs = precisionLexicon.items.map((i) => i.b);
  const counts = new Map<number, number>();
  for (const datum of lexiconData) {
    const b = bandOf(datum[3][0]);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  assert.deepEqual([...counts.keys()].sort(), [1, 2, 3, 4, 5], "a band is empty");
  for (const [band, count] of counts) {
    assert.ok(count >= 9 && count <= 11, "band " + band + " has " + count + " items");
  }
  assert.ok(Math.min(...bs) <= -1.2, "no basal coverage");
  assert.ok(Math.max(...bs) >= 2.2, "no ceiling coverage");
  assert.ok(Math.max(...bs) - Math.min(...bs) >= 3.4, "span too narrow");
});

test("no definition contains any of its own option words (stem-leak regression)", () => {
  // A definition that embeds one of its options hands that option to anyone
  // who reads the stem carefully (audit: lex-030 leaked "hesitant", lex-035
  // leaked "gentle"). Word-boundary, case-insensitive.
  const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [definition, correct, distractors] of lexiconData) {
    for (const word of [correct, ...distractors]) {
      const pattern = new RegExp("\\b" + escape(word) + "\\b", "i");
      assert.ok(
        !pattern.test(definition),
        'definition of "' + correct + '" contains its own option word "' + word + '"',
      );
    }
  }
});

test("outside the ceiling band the key is not the uniquely rarest option (rarest-key regression)", () => {
  // In the common-word bands everyone knows every option, but if the key is
  // still the strict rarity minimum, "pick the rarest option" beats knowing
  // the definition (audit: lex-045/049/050 exploits). Band-5 items are exempt
  // per the existing band rules above: at the ceiling the keyed word is
  // definitionally the rarest word in its neighborhood (and stays within the
  // -1.1 cap asserted above).
  for (const [index, datum] of lexiconData.entries()) {
    const item = precisionLexicon.items[index]!;
    const [zKey, ...zOthers] = datum[3];
    if (bandOf(zKey) === 5) continue;
    assert.ok(
      zKey >= Math.min(...zOthers),
      item.id + " key is the uniquely rarest option (rarest-key exploit)",
    );
  }
});
