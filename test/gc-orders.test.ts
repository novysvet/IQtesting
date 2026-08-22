import test from "node:test";
import assert from "node:assert/strict";
import { generalInformation, lexiconData, verbalAnalogies } from "../src/items/gc.ts";

/**
 * Regression for the audit-derived DIFFICULTY_ORDER rebuild and span
 * compression (docs/DIFFICULTY_AUDIT.md §2.11–2.12). The order tables live in
 * src/items/gc.ts; these tests pin them to the exact audited arrays so a
 * stray edit cannot silently re-rank the banks, and pin the lexicon keys so
 * distractor/definition edits cannot silently re-key items.
 */

// Easiest -> hardest, datum indices 1-based: items 1-36 keep the audit order
// exactly (docs/DIFFICULTY_AUDIT.md §2.11); items 37-44 are the 2026-08-22
// ceiling extension interleaved at the top per the rarity/rationale pricing
// documented in src/items/gc.ts.
const VAN_ORDER = [3, 1, 2, 4, 8, 7, 6, 11, 5, 9, 20, 10, 12, 14, 15, 17, 31, 33, 34, 16, 19, 18, 13, 29, 26, 30, 32, 36, 24, 37, 21, 27, 23, 25, 35, 22, 38, 28, 39, 40, 41, 42, 43, 44] as const;
const GIN_ORDER = [3, 1, 4, 2, 5, 6, 11, 7, 9, 10, 8, 24, 13, 12, 15, 16, 20, 14, 29, 17, 28, 18, 27, 25, 19, 23, 26, 22, 30, 21] as const;

/** The 50 keyed words in bank order — locked so distractor/definition edits
 * cannot silently change what an item tests (b values must not move). */
const EXPECTED_LEX_KEYS = [
  "early", "important", "wrong", "easy", "strong", "private", "difficult", "dark", "clean", "rich",
  "famous", "dangerous", "patient", "ancient", "cheap", "quiet", "obvious", "empty", "brief", "hungry",
  "curious", "confident", "brave", "frequent", "crucial", "generous", "urgent", "adequate", "polite", "reluctant",
  "skeptical", "pragmatic", "prudent", "ubiquitous", "meek", "meticulous", "diligent", "esoteric", "inept", "tenacious",
  "ephemeral", "capricious", "cogent", "elucidate", "disparage", "ameliorate", "inchoate", "supercilious", "ineluctable", "equivocate",
] as const;

function isPermutationOf(order: readonly number[], n: number): boolean {
  return order.length === n && new Set(order).size === n && order.every((v) => v >= 1 && v <= n);
}

function idFor(prefix: string, datumIndex: number): string {
  return prefix + "-" + String(datumIndex).padStart(3, "0");
}

function byAscendingB<T extends { b: number }>(items: readonly T[]): readonly T[] {
  return [...items].sort((x, y) => x.b - y.b);
}

test("van and gin order tables are exact permutations of their bank sizes", () => {
  assert.equal(verbalAnalogies.items.length, 44);
  assert.equal(generalInformation.items.length, 30);
  assert.ok(isPermutationOf(VAN_ORDER, 44), "VAN_ORDER must be a permutation of 1..44");
  assert.ok(isPermutationOf(GIN_ORDER, 30), "GIN_ORDER must be a permutation of 1..30");
});

test("van items realize the audited order: ascending b yields exactly VAN_ORDER", () => {
  const ranked = byAscendingB(verbalAnalogies.items);
  const ids = ranked.map((item) => item.id);
  assert.deepEqual(ids, [...VAN_ORDER].map((n) => idFor("van", n)));
});

test("gin items realize the audited order: ascending b yields exactly GIN_ORDER", () => {
  const ranked = byAscendingB(generalInformation.items);
  const ids = ranked.map((item) => item.id);
  assert.deepEqual(ids, [...GIN_ORDER].map((n) => idFor("gin", n)));
});

test("van b values: min -2.5 at GLOVE:HAND, max +2.8 at APOTHEOSIS, strictly increasing in rank", () => {
  const bs = verbalAnalogies.items.map((i) => i.b);
  assert.equal(Math.min(...bs), -2.5, "van span floor");
  assert.equal(Math.max(...bs), 2.8, "van span ceiling");
  const ranked = byAscendingB(verbalAnalogies.items);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i]!.b > ranked[i - 1]!.b, "van b not strictly increasing at rank " + i);
  }
  const glove = verbalAnalogies.items.find((i) => i.prompt.startsWith("GLOVE is to HAND"));
  assert.ok(glove, "GLOVE:HAND item not found");
  assert.equal(glove.id, "van-003");
  assert.equal(glove.b, -2.5);
  const apotheosis = verbalAnalogies.items.find((i) => i.prompt.startsWith("APOTHEOSIS"));
  assert.ok(apotheosis, "APOTHEOSIS item not found");
  assert.equal(apotheosis.id, "van-044");
  assert.equal(apotheosis.b, 2.8);
  // The 2026-08-22 ceiling band carries the raised discrimination.
  for (const item of verbalAnalogies.items) {
    if (item.b >= 1.8) assert.equal(item.a, 1.5, item.id + " ceiling band must carry a 1.5");
  }
});

test("gin b values: min -2.6 at Shakespeare (Hamlet), max +3.2 at Abelard (ceiling)", () => {
  const bs = generalInformation.items.map((i) => i.b);
  assert.equal(Math.min(...bs), -2.6, "gin span floor");
  assert.equal(Math.max(...bs), 3.2, "gin span ceiling");
  const ranked = byAscendingB(generalInformation.items);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i]!.b > ranked[i - 1]!.b, "gin b not strictly increasing at rank " + i);
  }
  const hamlet = generalInformation.items.find((i) => i.prompt === "Who wrote Hamlet?");
  assert.ok(hamlet, "Hamlet item not found");
  assert.equal(hamlet.id, "gin-003");
  assert.equal(hamlet.b, -2.6);
  const abelard = generalInformation.items.find((i) => i.prompt.includes("Sic et Non"));
  assert.ok(abelard, "Abelard item not found");
  assert.equal(abelard.id, "gin-021");
  assert.equal(abelard.b, 3.2);
});

test("lexicon keys are locked to the pre-revision keyed words (in order)", () => {
  assert.equal(lexiconData.length, EXPECTED_LEX_KEYS.length);
  for (const [index, key] of EXPECTED_LEX_KEYS.entries()) {
    const item = lexiconData[index]!;
    assert.equal(item[1], key, "lex-" + String(index + 1).padStart(3, "0") + " key changed");
  }
});

test("van-031/033/034 use the same-domain replacement distractors, not the degenerate originals", () => {
  const find = (id: string) => {
    const item = verbalAnalogies.items.find((i) => i.id === id);
    assert.ok(item, id + " not found");
    return item;
  };
  const cases = [
    { id: "van-031", key: "mine", kept: ["granary", "barn", "field", "orchard"], dropped: ["forest", "harbor", "mill", "forge"] },
    { id: "van-033", key: "day", kept: ["sunrise", "noon", "dusk", "sunlight"], dropped: ["dawn", "season", "year", "twilight"] },
    { id: "van-034", key: "places", kept: ["maps", "landmarks", "surfaces", "regions"], dropped: ["periods", "languages", "species", "numbers"] },
  ] as const;
  for (const { id, key, kept, dropped } of cases) {
    const item = find(id);
    const options = item.options!;
    for (const word of kept) {
      assert.ok(options.includes(word), id + " missing replacement distractor " + word);
    }
    for (const word of dropped) {
      assert.ok(!options.includes(word), id + " still carries degenerate distractor " + word);
    }
    assert.ok(options.includes(key), id + " lost its key " + key);
    assert.equal(options[item.answer as number], key, id + " key does not resolve");
  }
});
