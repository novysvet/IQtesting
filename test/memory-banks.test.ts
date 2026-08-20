import { test } from "node:test";
import assert from "node:assert/strict";
import { digitSpan, letterNumberSeq, pairedAssociates } from "../src/items/memory.ts";
import { isCorrect, normalise } from "../src/core/session.ts";
import type { Item } from "../src/core/types.ts";

/** The app's grading pipeline, re-used so these tests cannot drift from it. */

type SpanRender = { kind: "span"; sequence: string[]; recall: "forward" | "backward" | "sorted" };

function spanRender(item: Item): SpanRender {
  const r = item.render;
  if (!r || r.kind !== "span") throw new Error(item.id + " is not a span item");
  return r;
}

/** Re-derive the intended key from the presented sequence (forward/backward/sorted). */
function deriveKey(sequence: string[], recall: SpanRender["recall"]): string {
  if (recall === "forward") return normalise(sequence.join(""));
  if (recall === "backward") return normalise(sequence.slice().reverse().join(""));
  const digits: string[] = [];
  const letters: string[] = [];
  for (const symbol of sequence) {
    for (const ch of normalise(symbol)) (ch >= "0" && ch <= "9" ? digits : letters).push(ch);
  }
  return digits.sort().join("") + letters.sort().join("");
}

/** Map sequence length -> b values, for one recall direction. */
function ladder(items: Item[], direction?: SpanRender["recall"]): Map<number, number[]> {
  const byLength = new Map<number, number[]>();
  for (const item of items) {
    const r = spanRender(item);
    if (direction && r.recall !== direction) continue;
    const bs = byLength.get(r.sequence.length) ?? [];
    bs.push(item.b);
    byLength.set(r.sequence.length, bs);
  }
  return byLength;
}

/**
 * Monotonicity + collapse checks for a re-anchored span ladder.
 *
 * Parallel forms (same length + direction) must share b to within 0.1 logits,
 * and adjacent lengths must climb by 0.4–1.2 logits (the adult span anchor:
 * ~0.8–1.0 logits per digit, backward ≈ forward one length higher). The
 * appended length-10 ceiling items sit at the compressed top of the scale
 * (e.g. dsp-022 is anchored 0.3 logits above dsp-020), so the step onto
 * length 10 only needs to be non-collapsed (>= 0.2) rather than a full 0.4.
 */
function assertLadder(name: string, byLength: Map<number, number[]>): void {
  const lengths = [...byLength.keys()].sort((x, y) => x - y);
  assert.ok(lengths.length >= 2, name + ": too few length levels to form a ladder");
  for (const [len, bs] of byLength) {
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        assert.ok(
          Math.abs(bs[i]! - bs[j]!) <= 0.1,
          name + ": parallel forms at length " + len + " differ by " + Math.abs(bs[i]! - bs[j]!).toFixed(2) + " logits",
        );
      }
    }
  }
  for (let i = 1; i < lengths.length; i++) {
    const lo = lengths[i - 1]!;
    const hi = lengths[i]!;
    assert.equal(hi - lo, 1, name + ": length step " + lo + "->" + hi + " skips a length");
    const gap = Math.min(...byLength.get(hi)!) - Math.max(...byLength.get(lo)!);
    assert.ok(gap > 0, name + ": b does not increase from length " + lo + " to " + hi);
    const floor = hi >= 10 ? 0.2 : 0.4;
    assert.ok(
      gap >= floor && gap <= 1.2,
      name + ": adjacent-length gap " + lo + "->" + hi + " is " + gap.toFixed(2) + " (expected " + floor + "..1.2)",
    );
  }
}

test("dsp/lns stored keys equal the sequence-derived key and are already normalised", () => {
  for (const bank of [digitSpan, letterNumberSeq]) {
    for (const item of bank.items) {
      const r = spanRender(item);
      const key = deriveKey(r.sequence, r.recall);
      const stored = item.answer as string;
      assert.equal(normalise(stored), key, item.id + ": answer does not match the key derived from its sequence");
      assert.equal(stored, normalise(stored), item.id + ": stored key is not in normalised form");
      assert.equal(isCorrect(item, key), true, item.id + ": grading rejects the canonical key");
      assert.equal(normalise(stored).length, r.sequence.length, item.id + ": key symbol count differs from sequence length");
      for (let i = 1; i < r.sequence.length; i++) {
        assert.notEqual(r.sequence[i], r.sequence[i - 1], item.id + ": adjacent repeated symbol at index " + i);
      }
    }
  }
});

test("dsp b ladders are monotone in length with parallel forms collapsed onto one b", () => {
  assertLadder("dsp-forward", ladder(digitSpan.items, "forward"));
  assertLadder("dsp-backward", ladder(digitSpan.items, "backward"));
});

test("lns b ladder is monotone in length with both items per length sharing b", () => {
  assertLadder("lns", ladder(letterNumberSeq.items));
});

test("lns answers mix digits and letters and are stored in canonical order", () => {
  for (const item of letterNumberSeq.items) {
    const key = normalise(item.answer as string);
    const digits = [...key].filter((ch) => ch >= "0" && ch <= "9");
    const letters = [...key].filter((ch) => ch >= "A" && ch <= "Z");
    assert.ok(digits.length >= 1, item.id + ": no digits in answer");
    assert.ok(letters.length >= 1, item.id + ": no letters in answer");
    const canonical = digits.sort().join("") + letters.sort().join("");
    assert.equal(key, canonical, item.id + ": answer is not digits-ascending-then-letters-alphabetical");
    assert.equal(isCorrect(item, canonical), true, item.id + ": grading rejects the canonical response");
  }
});

test("pas words are unique across lists, targets are single words, and b climbs with list length", () => {
  const ownerOf = new Map<string, string>();
  let firstLength = 0;
  let prevLength = 0;
  let prevB = -Infinity;
  for (const item of pairedAssociates.items) {
    const r = item.render;
    assert.ok(r && r.kind === "pairs", item.id + " is not a pairs item");
    if (!r || r.kind !== "pairs") continue;
    const answer = item.answer as string;

    // Target must be a single word (multi-word answers grade inconsistently
    // under space-stripping normalisation and measure typing, not memory).
    assert.equal(answer, answer.trim(), item.id + ": target has stray whitespace");
    assert.ok(!/\s/.test(answer), item.id + ": target must be a single word");

    // The cue named in the prompt must be paired with the stored target.
    const cueMatch = /paired with (.+)\?$/.exec(item.prompt);
    assert.ok(cueMatch, item.id + ": prompt does not name a cue");
    const cue = normalise(cueMatch[1] ?? "");
    const probed = r.pairs.filter(([c, t]) => normalise(c) === cue && normalise(t) === normalise(answer));
    assert.equal(probed.length, 1, item.id + ": probed cue->target pair is missing or duplicated");

    // No cue or target (normalised) may appear in another item's study list,
    // and no word may repeat within a list: cross-list repeats create
    // proactive-interference variance that is in no item parameter.
    const inThisList = new Set<string>();
    for (const [c, t] of r.pairs) {
      for (const word of [normalise(c), normalise(t)]) {
        assert.ok(!inThisList.has(word), item.id + ": word " + word + " repeats within its own list");
        inThisList.add(word);
        const owner = ownerOf.get(word);
        assert.ok(
          owner === undefined,
          item.id + ": word " + word + " already appears in " + (owner ?? item.id) + "'s study list",
        );
        ownerOf.set(word, item.id);
      }
    }

    // List length grows 3..9 and b is strictly increasing with list length.
    assert.ok(r.pairs.length >= 3 && r.pairs.length <= 9, item.id + ": list length outside 3..9");
    assert.ok(r.pairs.length >= prevLength, item.id + ": list length shrank");
    assert.ok(item.b > prevB, item.id + ": b is not strictly increasing down the bank");
    if (firstLength === 0) firstLength = r.pairs.length;
    prevLength = r.pairs.length;
    prevB = item.b;
  }
  assert.equal(firstLength, 3, "pas ladder should start at 3 pairs");
  assert.equal(prevLength, 9, "pas ladder should top out at 9 pairs");
});

test("new length-10 ceiling items exist with the audit-anchored parameters", () => {
  const expected: Array<[Item | undefined, string, number, number, number, SpanRender["recall"]]> = [
    [digitSpan.items.find((i) => i.id === "dsp-021"), "dsp-021", 2.0, 1.2, 10, "forward"],
    [digitSpan.items.find((i) => i.id === "dsp-022"), "dsp-022", 2.9, 1.3, 10, "backward"],
    [letterNumberSeq.items.find((i) => i.id === "lns-015"), "lns-015", 2.6, 1.3, 10, "sorted"],
  ];
  for (const [item, id, b, a, length, recall] of expected) {
    assert.ok(item, id + " missing from its bank");
    if (!item) continue;
    assert.equal(item.b, b, id + ": wrong b");
    assert.equal(item.a, a, id + ": wrong a");
    const r = spanRender(item);
    assert.equal(r.sequence.length, length, id + ": wrong sequence length");
    assert.equal(r.recall, recall, id + ": wrong recall direction");
  }
});
