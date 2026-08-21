import { test } from "node:test";
import assert from "node:assert/strict";
import { spanFrame, spanDurationMs } from "../src/core/memoryTiming.ts";

/**
 * TIMING CONTRACT for the standardized visual working-memory presentation
 * (src/core/memoryTiming.ts). The boundary arithmetic — which side of each
 * comparison every boundary instant falls on — is pinned here against
 * independent literals (never the SPAN_* exports), so a regression such as
 * flipping a `<` to `<=` cannot silently alter every span exposure.
 *
 * Contract (verified clean by the 2026-08-21 audit, memory.md):
 *   ready      [0, 1500)
 *   symbol k   [1500 + k*1400, 1500 + k*1400 + 1100)
 *   gap        the rest of each 1400 cycle (300 ms)
 *   recall     exactly at spanDurationMs(n) = 1500 + n*1400, and forever after
 */

const READY_MS = 1500;
const SYMBOL_MS = 1100;
const CYCLE_MS = 1400; // SYMBOL_MS + 300 ms gap

test("the ready frame spans [0, 1500) and the first symbol starts exactly at 1500", () => {
  assert.deepEqual(spanFrame(0, 3), { kind: "ready" });
  assert.deepEqual(spanFrame(READY_MS - 1, 3), { kind: "ready" });
  assert.deepEqual(spanFrame(READY_MS, 3), { kind: "symbol", index: 0 });
});

test("symbol k occupies [1500 + k*1400, +1100); the remainder of the cycle is gap", () => {
  const n = 10;
  for (let k = 0; k < 4; k++) {
    const start = READY_MS + k * CYCLE_MS;
    assert.deepEqual(spanFrame(start, n), { kind: "symbol", index: k }, "cycle " + k + " opening instant");
    assert.deepEqual(spanFrame(start + SYMBOL_MS - 1, n), { kind: "symbol", index: k }, "last symbol instant");
    assert.deepEqual(spanFrame(start + SYMBOL_MS, n), { kind: "gap" }, "first gap instant");
    assert.deepEqual(spanFrame(start + CYCLE_MS - 1, n), { kind: "gap" }, "last gap instant");
    if (k < 3) {
      assert.deepEqual(spanFrame(start + CYCLE_MS, n), { kind: "symbol", index: k + 1 }, "next cycle opens on the next symbol");
    }
  }
});

test("recall begins exactly at spanDurationMs(n); one instant earlier is still the final gap", () => {
  for (const n of [2, 3, 7, 10]) {
    assert.equal(spanDurationMs(n), READY_MS + n * CYCLE_MS, "duration for n=" + n);
    assert.deepEqual(spanFrame(spanDurationMs(n) - 1, n), { kind: "gap" });
    assert.deepEqual(spanFrame(spanDurationMs(n), n), { kind: "recall" });
    assert.deepEqual(spanFrame(spanDurationMs(n) + 60_000, n), { kind: "recall" });
  }
});

test("a sequence of length n shows exactly n distinct symbols in order before recall", () => {
  for (const n of [2, 3, 7, 10]) {
    const indices: number[] = [];
    for (let k = 0; k < n; k++) {
      const frame = spanFrame(READY_MS + k * CYCLE_MS, n);
      assert.equal(frame.kind, "symbol", "n=" + n + " symbol " + k);
      if (frame.kind === "symbol") indices.push(frame.index);
    }
    assert.deepEqual(indices, Array.from({ length: n }, (_, k) => k));
    // Past the last symbol cycle the presentation is at recall, never a
    // phantom (n+1)-th symbol.
    assert.deepEqual(spanFrame(READY_MS + n * CYCLE_MS, n), { kind: "recall" });
  }
});
