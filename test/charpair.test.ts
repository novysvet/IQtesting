import test from "node:test";
import assert from "node:assert/strict";
import type { Item, ItemRender } from "../src/core/types.ts";
import { charPairing } from "../src/items/gs-charpair.ts";

/**
 * Character Pairing (cpm-001..020): the answer key is never trusted as
 * authored. Every answer is re-derived from the item's own render payload
 * (shared key + glyph row), and the shared key itself is audited for the
 * properties the difficulty design depends on.
 */

type CodingRender = Extract<ItemRender, { kind: "coding" }>;

function requireCoding(item: Item): CodingRender {
  const r = item.render;
  if (!r || r.kind !== "coding") {
    throw new Error(item.id + " does not use a coding render");
  }
  return r;
}

const SHAPES = new Set(["tri", "sq", "cir", "dia", "hex", "arw", "cross", "star"]);
const FILLS = new Set(["none", "half", "solid", "hatch"]);

/** Glyph grammar "shape:1:fill:rot": count 1, known shape/fill, rot 0 or 45. */
function validGlyph(spec: string): boolean {
  const bits = spec.split(":");
  return (
    bits.length === 4 &&
    bits[0] !== undefined && SHAPES.has(bits[0]) &&
    bits[1] === "1" &&
    bits[2] !== undefined && FILLS.has(bits[2]) &&
    (bits[3] === "0" || bits[3] === "45")
  );
}

/** Length of the longest run of consecutively ascending digits ("1234" -> 4). */
function longestAscendingRun(s: string): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < s.length; i++) {
    // charCodeAt(-1) is NaN for i = 0, so the comparison is false and the
    // run (re)starts at 1.
    run = s.charCodeAt(i) === s.charCodeAt(i - 1) + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

test("subtest metadata and routing match the frozen spec", () => {
  assert.equal(charPairing.id, "charPairing");
  assert.equal(charPairing.name, "Character Pairing");
  assert.equal(charPairing.broad, "Gs");
  assert.deepEqual(charPairing.narrow, ["P"]);
  assert.equal(charPairing.budgetMin, 3);
  assert.deepEqual(charPairing.routing, {
    maxItems: 18, minItems: 8, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0,
  });
});

test("one shared 9-pair key across all items: valid distinct glyphs, digits 1..9 unique", () => {
  assert.equal(charPairing.items.length, 20);
  assert.deepEqual(
    charPairing.items.map((i) => i.id),
    Array.from({ length: 20 }, (_, k) => "cpm-" + String(k + 1).padStart(3, "0")),
    "ids must be exactly cpm-001..cpm-020 in order",
  );
  const renders = charPairing.items.map(requireCoding);
  const key = renders[0]!.key;
  assert.equal(key.length, 9, "the pairing key must have exactly 9 pairs");
  const digits = key.map((p) => p[1]);
  assert.deepEqual(
    [...digits].sort(),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    "key digits must be 1..9 each exactly once",
  );
  const specs = key.map((p) => p[0]);
  for (const s of specs) {
    assert.ok(validGlyph(s), "key glyph " + s + " is not a valid shape:1:fill:rot spec");
  }
  assert.equal(new Set(specs).size, 9, "key glyphs must be pairwise distinct");
  for (let i = 1; i < renders.length; i++) {
    assert.deepEqual(
      renders[i]!.key,
      key,
      charPairing.items[i]!.id + " uses a different key than cpm-001 (the key is the printed page key and must be shared)",
    );
  }
});

test("every answer re-derives from the shared key and the item's glyph sequence", () => {
  for (const item of charPairing.items) {
    const r = requireCoding(item);
    const digitFor = new Map<string, string>(r.key);
    const derived = r.sequence
      .map((g) => {
        assert.ok(validGlyph(g), item.id + " row glyph " + g + " is not a valid spec");
        const d = digitFor.get(g);
        assert.ok(d !== undefined, item.id + " row glyph " + g + " is not covered by the key");
        return d;
      })
      .join("");
    assert.equal(
      item.answer,
      derived,
      item.id + " answer is not the key-derived digit string",
    );
  }
});

test("answers are digit strings matching row length, pairwise distinct, no ascending-run exploit, >= 4 distinct glyphs", () => {
  let ascendingItems = 0;
  const seen = new Set<string>();
  for (const item of charPairing.items) {
    const r = requireCoding(item);
    const ans = item.answer as string;
    assert.match(ans, /^[1-9]+$/, item.id + " answer must be a digit string");
    assert.equal(ans.length, r.sequence.length, item.id + " answer length must equal row length");
    assert.ok(!seen.has(ans), item.id + " duplicates the answer " + ans);
    seen.add(ans);
    assert.ok(
      r.sequence.length >= 4 && r.sequence.length <= 8,
      item.id + " row length must be 4..8",
    );
    assert.ok(
      new Set(r.sequence).size >= 4,
      item.id + " row draws on fewer than 4 distinct glyphs",
    );
    if (longestAscendingRun(ans) >= 4) ascendingItems++;
  }
  assert.equal(seen.size, 20, "all 20 answers must be pairwise distinct");
  assert.ok(
    ascendingItems <= 2,
    ascendingItems + " answers contain an ascending run like \"1234\" (type-the-obvious-pattern exploit)",
  );
});

test("ids unique, c = 0 recall scoring, constant prompt, no duplicate rows, b floor <= -1.5 and ceiling >= +1.0", () => {
  const items = charPairing.items;
  assert.equal(new Set(items.map((i) => i.id)).size, 20, "ids must be unique");
  const rows = items.map((i) => requireCoding(i).sequence.join("|"));
  assert.equal(new Set(rows).size, 20, "two items present the same glyph row");
  for (const item of items) {
    assert.equal(item.c, 0, item.id + " c must be 0 (recall item)");
    assert.equal(item.subtest, "charPairing", item.id + " subtest tag");
    assert.equal(item.broad, "Gs", item.id + " broad tag");
    assert.equal(item.narrow, "P", item.id + " narrow tag");
    assert.equal(
      item.prompt,
      "Type the digit paired with each character, in order.",
      item.id + " prompt must be the frozen shared prompt",
    );
    assert.ok(item.a >= 1.1 && item.a <= 1.4, item.id + " a outside the authored 1.1..1.4 band");
  }
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -1.5, "difficulty floor must reach -1.5 or below");
  assert.ok(Math.max(...bs) >= 1.0, "difficulty ceiling must reach +1.0 or above");
});
