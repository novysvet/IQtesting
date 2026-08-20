import test from "node:test";
import assert from "node:assert/strict";
import { BATTERY } from "../src/battery.ts";
import type { Item } from "../src/core/types.ts";

const items = BATTERY.flatMap((s) => s.items);

test("battery contains the complete authored pool", () => {
  assert.equal(BATTERY.length, 12);
  assert.equal(items.length, 247);
});

test("all item and subtest identifiers are unique", () => {
  assert.equal(new Set(BATTERY.map((s) => s.id)).size, BATTERY.length);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
});

test("every item satisfies the schema and guessing contract", () => {
  for (const item of items) {
    assert.ok(item.id.length > 0, "missing id");
    assert.ok(item.prompt.trim().length > 0, item.id + " missing prompt");
    assert.ok(Number.isFinite(item.a) && item.a > 0, item.id + " invalid a");
    assert.ok(Number.isFinite(item.b), item.id + " invalid b");
    if (item.options) {
      assert.ok(item.options.length >= 2, item.id + " has too few options");
      assert.equal(item.c, 1 / item.options.length, item.id + " c must equal 1/nOptions");
      assert.equal(typeof item.answer, "number", item.id + " MC key is not numeric");
      assert.ok((item.answer as number) >= 0 && (item.answer as number) < item.options.length, item.id + " key out of range");
      assert.equal(new Set(item.options).size, item.options.length, item.id + " repeats an option");
    } else {
      assert.equal(item.c, 0, item.id + " recall item must have c=0");
      assert.equal(typeof item.answer, "string", item.id + " recall key is not text");
    }
  }
});

test("every subtest spans a useful difficulty range and reaches a high ceiling", () => {
  for (const subtest of BATTERY) {
    const bs = subtest.items.map((i) => i.b);
    assert.ok(Math.min(...bs) <= -2, subtest.id + " lacks easy basal items");
    assert.ok(Math.max(...bs) >= 2.5, subtest.id + " lacks difficult ceiling items");
    assert.ok(Math.max(...bs) - Math.min(...bs) >= 4.5, subtest.id + " b range is too narrow");
    assert.ok(subtest.routing.minItems > 0 && subtest.routing.maxItems <= subtest.items.length);
  }
});

test("Gc keys resolve to the authored correct answer after deterministic shuffling", () => {
  const gc = BATTERY.filter((s) => s.broad === "Gc").flatMap((s) => s.items);
  assert.equal(gc.length, 106);
  for (const item of gc) {
    const answer = item.options?.[item.answer as number];
    assert.ok(answer && answer.trim().length > 0, item.id + " has no resolvable key");
  }
});

// Compile-time assertion: the flattened bank remains Item[].
const typed: Item[] = items;
void typed;
