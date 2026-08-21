import test from "node:test";
import assert from "node:assert/strict";
import type { Item, ItemRender } from "../src/core/types.ts";
import { symbolSelection } from "../src/items/gs-symqueue.ts";
import { GLYPHS, CONFUSION_CLASSES, areTwins } from "../src/components/glyphCatalog.ts";

/**
 * Symbol Selection (syq-001..020): the answer key is never trusted as
 * authored. Every answer is re-derived from the item's own render payload
 * (shared legend + glyph queue), and the shared legend itself is audited for
 * the properties the difficulty design depends on.
 */

type SymQueueRender = Extract<ItemRender, { kind: "symqueue" }>;

function requireSymQueue(item: Item): SymQueueRender {
  const r = item.render;
  if (!r || r.kind !== "symqueue") {
    throw new Error(item.id + " does not use a symqueue render");
  }
  return r;
}

const HOME_ROW = ["A", "S", "D", "F", "H", "J", "K", "L"];

/** Length of the longest run of consecutively ascending legend-order keys. */
function longestLegendOrderRun(answer: string, legendKeys: string[]): number {
  const order = new Map(legendKeys.map((k, i) => [k, i]));
  let best = 0;
  let run = 0;
  for (let i = 0; i < answer.length; i++) {
    const prev = i > 0 ? order.get(answer[i - 1]!) : undefined;
    const cur = order.get(answer[i]!);
    run = cur !== undefined && prev !== undefined && cur === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Twin-adjacent and twin-present counts for a queue (the difficulty anchors). */
function twinStats(queue: string[]): { adj: number; pos: number } {
  let adj = 0;
  let pos = 0;
  for (let i = 0; i < queue.length; i++) {
    if (i + 1 < queue.length && areTwins(queue[i]!, queue[i + 1]!)) adj++;
    if (queue.some((g, j) => j !== i && areTwins(queue[i]!, g))) pos++;
  }
  return { adj, pos };
}

test("subtest metadata and routing match the frozen spec", () => {
  assert.equal(symbolSelection.id, "symbolSelection");
  assert.equal(symbolSelection.name, "Symbol Selection");
  assert.equal(symbolSelection.broad, "Gs");
  assert.deepEqual(symbolSelection.narrow, ["P"]);
  assert.equal(symbolSelection.budgetMin, 3);
  assert.deepEqual(symbolSelection.routing, {
    maxItems: 18, minItems: 8, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0,
  });
});

test("one shared 8-pair legend across all items: catalog glyphs bound once each to the home row", () => {
  assert.equal(symbolSelection.items.length, 20);
  assert.deepEqual(
    symbolSelection.items.map((i) => i.id),
    Array.from({ length: 20 }, (_, k) => "syq-" + String(k + 1).padStart(3, "0")),
    "ids must be exactly syq-001..syq-020 in order",
  );
  const renders = symbolSelection.items.map(requireSymQueue);
  const legend = renders[0]!.legend;
  assert.equal(legend.length, 8, "the legend must bind exactly 8 glyphs");
  assert.deepEqual(
    legend.map((p) => p[1]),
    HOME_ROW,
    "legend keys must be the home row ASDFHJKL in order",
  );
  const glyphs = legend.map((p) => p[0]);
  assert.equal(new Set(glyphs).size, 8, "legend glyphs must be pairwise distinct");
  for (const g of glyphs) {
    assert.ok(GLYPHS[g], "legend glyph " + g + " is not in the catalog");
  }
  for (let i = 1; i < renders.length; i++) {
    assert.deepEqual(
      renders[i]!.legend,
      legend,
      symbolSelection.items[i]!.id + " uses a different legend than syq-001 (the legend is persistent and must be shared)",
    );
  }
  for (const practice of symbolSelection.practice ?? []) {
    const r = requireSymQueue(practice);
    assert.deepEqual(r.legend, legend, practice.id + " uses a different legend");
  }
});

test("confusion classes are symmetric catalog pairs; twins sit on opposite hands", () => {
  for (const [a, b] of CONFUSION_CLASSES) {
    assert.ok(GLYPHS[a] && GLYPHS[b], "confusion class references unknown glyph");
    assert.ok(areTwins(a, b) && areTwins(b, a), "areTwins must be symmetric");
  }
  const keyOf = new Map(symbolSelection.items.map((i) => requireSymQueue(i)).at(0)!.legend);
  const handOf = (key: string) => (HOME_ROW.indexOf(key) < 4 ? "left" : "right");
  for (const [a, b] of CONFUSION_CLASSES) {
    const ka = keyOf.get(a);
    const kb = keyOf.get(b);
    assert.ok(ka && kb, "twin pair " + a + "/" + b + " must both be in the legend");
    assert.notEqual(handOf(ka), handOf(kb), "twins " + a + "/" + b + " share a hand (visual confusion must not compound with finger confusion)");
  }
});

test("every answer re-derives from the shared legend and the item's queue", () => {
  for (const item of symbolSelection.items) {
    const r = requireSymQueue(item);
    const keyFor = new Map(r.legend);
    const derived = r.queue
      .map((g) => {
        assert.ok(GLYPHS[g], item.id + " queue glyph " + g + " is not in the catalog");
        const k = keyFor.get(g);
        assert.ok(k !== undefined, item.id + " queue glyph " + g + " is not covered by the legend");
        return k;
      })
      .join("");
    assert.equal(
      item.answer,
      derived,
      item.id + " answer is not the legend-derived key string",
    );
  }
});

test("answers are home-row strings matching queue length, pairwise distinct, no legend-order-run exploit, >= 4 distinct glyphs", () => {
  let runExploits = 0;
  const seen = new Set<string>();
  for (const item of symbolSelection.items) {
    const r = requireSymQueue(item);
    const ans = item.answer as string;
    assert.match(ans, /^[ASDFHJKL]+$/, item.id + " answer must be a home-row key string");
    assert.equal(ans.length, r.queue.length, item.id + " answer length must equal queue length");
    assert.ok(!seen.has(ans), item.id + " duplicates the answer " + ans);
    seen.add(ans);
    assert.ok(
      r.queue.length >= 4 && r.queue.length <= 8,
      item.id + " queue length must be 4..8",
    );
    assert.ok(
      new Set(r.queue).size >= 4,
      item.id + " queue draws on fewer than 4 distinct glyphs",
    );
    if (longestLegendOrderRun(ans, HOME_ROW) >= 4) runExploits++;
  }
  assert.equal(seen.size, 20, "all 20 answers must be pairwise distinct");
  assert.ok(
    runExploits === 0,
    runExploits + " answers contain a legend-order run like \"ASDF\" (type-the-obvious-pattern exploit)",
  );
});

test("speeded caps price the queue: timeLimitSec = ceil(1.5*len)+2 on scored items, absent on practice", () => {
  for (const item of symbolSelection.items) {
    const expected = Math.ceil(1.5 * requireSymQueue(item).queue.length) + 2;
    assert.equal(item.timeLimitSec, expected, item.id + " time cap drifts from the pricing rule");
  }
  for (const practice of symbolSelection.practice ?? []) {
    assert.equal(practice.timeLimitSec, undefined, practice.id + " tutorial must be untimed");
  }
});

test("difficulty architecture: b follows the twin formula, floor <= -2.0, ceiling >= +1.0, easy items twin-free, hard items twin-dense", () => {
  const items = symbolSelection.items;
  const bs = items.map((i) => i.b);
  assert.ok(Math.min(...bs) <= -2.0, "difficulty floor must reach -2.0 or below");
  assert.ok(Math.max(...bs) >= 1.0, "difficulty ceiling must reach +1.0 or above");
  for (const item of items) {
    const { adj, pos } = twinStats(requireSymQueue(item).queue);
    const raw = -2.0 + 0.35 * (requireSymQueue(item).queue.length - 4) + 0.45 * adj + 0.20 * pos;
    const clamped = Math.max(-2.0, Math.min(1.0, raw));
    assert.ok(
      Math.abs(clamped - item.b) < 1e-9,
      item.id + " b " + item.b + " drifts from the anchored formula (" + clamped + ")",
    );
  }
  for (const item of items.filter((i) => i.b <= -2.0)) {
    const { adj, pos } = twinStats(requireSymQueue(item).queue);
    assert.equal(adj + pos, 0, item.id + " is a floor item but contains confusable twins");
  }
  for (const item of items.filter((i) => i.b >= 0.9)) {
    const { adj } = twinStats(requireSymQueue(item).queue);
    assert.ok(adj >= 2, item.id + " is anchored hard but has fewer than 2 twin adjacencies");
  }
});

test("ids unique, c = 0 exact-match scoring, constant prompt, no duplicate queues, a band 1.1..1.4", () => {
  const items = symbolSelection.items;
  assert.equal(new Set(items.map((i) => i.id)).size, 20, "ids must be unique");
  const rows = items.map((i) => requireSymQueue(i).queue.join("|"));
  assert.equal(new Set(rows).size, 20, "two items present the same glyph queue");
  for (const item of items) {
    assert.equal(item.c, 0, item.id + " c must be 0 (exact-match constructed response)");
    assert.equal(item.subtest, "symbolSelection", item.id + " subtest tag");
    assert.equal(item.broad, "Gs", item.id + " broad tag");
    assert.equal(item.narrow, "P", item.id + " narrow tag");
    assert.equal(
      item.prompt,
      "Press the key matching the highlighted symbol.",
      item.id + " prompt must be the frozen shared prompt",
    );
    assert.ok(item.a >= 1.1 && item.a <= 1.4, item.id + " a outside the authored 1.1..1.4 band");
  }
});

test("practice doubles as the tutorial: legend-order walk then a short random queue", () => {
  const practice = symbolSelection.practice ?? [];
  assert.equal(practice.length, 2, "the tutorial needs exactly two samples");
  const first = requireSymQueue(practice[0]!);
  const legendGlyphs = first.legend.map(([g]) => g);
  assert.deepEqual(
    first.queue,
    legendGlyphs,
    "first practice queue must walk the legend in home-row order (teaches the mapping)",
  );
  assert.equal(practice[0]!.answer, "ASDFHJKL");
  assert.ok(
    requireSymQueue(practice[1]!).queue.length <= 4,
    "second practice queue must be short",
  );
});
