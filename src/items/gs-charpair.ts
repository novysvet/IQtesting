import type { Subtest } from "../core/types.ts";

/**
 * Gs - Character Pairing (cpm-001..020), narrow ability P (perceptual
 * speed: symbol/digit pairing under time pressure).
 *
 * CALIBRATION STATUS: all a/b parameters are AUTHORED ESTIMATES anchored to
 * item content, not fitted to response data from a real sample. The
 * persistent glyph-to-digit key measures pairing-lookup speed and accuracy;
 * per-response latency telemetry is already captured by the session layer
 * and kept for future speed-aware calibration (a Gs score should eventually
 * model latency, not just accuracy).
 *
 * Format: ONE glyph->digit key shared by ALL items, like the printed key at
 * the top of a WAIS coding sheet. Glyphs reuse the Figure spec grammar
 * "shape:1:fill:rot". The key is built from CONFUSABLE CLUSTERS so
 * difficulty scales with visual-inspection load:
 *
 *   tri  none / solid   digits 7 / 3   (same shape, fill discrimination)
 *   sq   half / hatch   digits 5 / 8   (same shape, fill discrimination)
 *   cir  none / solid   digits 1 / 6   (same shape, fill discrimination)
 *   arw  rot 0 / 45     digits 4 / 9   (rotation twins)
 *   star solid          digit  2       (unclustered foil)
 *
 * Within a cluster the two digits differ by >= 3, so confusing a twin can
 * never earn partial credit under exact string matching. All 9 specs are
 * pairwise distinct; no circle carries a rotation (invisible on a circle).
 *
 * Difficulty anchoring (content-anchored, NOT a uniform ladder):
 *
 *   b = clamp(-1.6 + 0.40*(len - 4) + 0.30*adjConf + 0.20*repLookups,
 *             -1.5, +1.0)
 *
 * where len = row length (4..8), adjConf = adjacent glyph pairs drawn from
 * the same confusable cluster (twin discrimination under eye movement), and
 * repLookups = positions whose glyph already occurred earlier in the row
 * (re-lookup interference). Bank floor -1.5 (cpm-001), ceiling +1.0
 * (cpm-020: all four cluster twins adjacent). a 1.1..1.4 - coding items are
 * comparatively homogeneous, so discrimination stays in a narrow high band
 * without a lockstep ramp. c = 0 (free recall: any wrong digit placement
 * makes the whole row wrong, and blind guessing has no 1/n floor).
 *
 * Keys: answer = sequence.map(g => digitFor(g)).join(""). The bank never
 * hand-copies a digit; test/charpair.test.ts re-derives every answer from
 * the render payload.
 */

/** The single persistent pairing key, shown atop every item (digit order). */
const PAIRING_KEY: [string, string][] = [
  ["cir:1:none:0", "1"],
  ["star:1:solid:0", "2"],
  ["tri:1:solid:0", "3"],
  ["arw:1:none:0", "4"],
  ["sq:1:half:0", "5"],
  ["cir:1:solid:0", "6"],
  ["tri:1:none:0", "7"],
  ["sq:1:hatch:0", "8"],
  ["arw:1:none:45", "9"],
];

const PROMPT = "Type the digit paired with each character, in order.";

export const charPairing: Subtest = {
  id: "charPairing",
  name: "Character Pairing",
  broad: "Gs",
  narrow: ["P"],
  instructions:
    "Each item shows the same key pairing nine characters with the digits 1 to 9, then a row of characters. Type the digit paired with each character in the row, in order, as one number. Look carefully: some characters differ only by shading or tilt. Work quickly but accurately.",
  budgetMin: 3,
  routing: { maxItems: 18, minItems: 8, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0 },
  items: [
    {
      id: "cpm-001", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.1, b: -1.5, c: 0,
      // len 4, adjConf 0, rep 0; raw -1.6 floored at the bank floor.
      // answer: cir 1, arw 4, tri 7, star 2
      prompt: PROMPT,
      answer: "1472",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "arw:1:none:0", "tri:1:none:0", "star:1:solid:0"],
      },
    },
    {
      id: "cpm-002", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.1, b: -1.3, c: 0,
      // len 4, adjConf 1 (tri twin mid-row), rep 0 -> -1.6 + 0.30.
      // answer: sq-half 5, tri 7, tri-solid 3, arw-45 9
      prompt: PROMPT,
      answer: "5739",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["sq:1:half:0", "tri:1:none:0", "tri:1:solid:0", "arw:1:none:45"],
      },
    },
    {
      id: "cpm-003", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.2, b: -1.0, c: 0,
      // len 4, adjConf 2 (tri twin + cir twin), rep 0 -> -1.6 + 0.60.
      // answer: tri 7, tri-solid 3, cir 1, cir-solid 6
      prompt: PROMPT,
      answer: "7316",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:none:0", "tri:1:solid:0", "cir:1:none:0", "cir:1:solid:0"],
      },
    },
    {
      id: "cpm-004", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.2, b: -0.7, c: 0,
      // len 5, adjConf 1 (sq twin), rep 1 (star) -> -1.6 + 0.4 + 0.3 + 0.2.
      // answer: star 2, sq-half 5, sq-hatch 8, star 2, cir 1
      prompt: PROMPT,
      answer: "25821",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["star:1:solid:0", "sq:1:half:0", "sq:1:hatch:0", "star:1:solid:0", "cir:1:none:0"],
      },
    },
    {
      id: "cpm-005", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.2, b: -0.4, c: 0,
      // len 5, adjConf 2 (tri twin + cir twin), rep 1 (cir) -> -1.6+0.4+0.6+0.2.
      // answer: cir 1, cir-solid 6, tri 7, tri-solid 3, cir 1
      prompt: PROMPT,
      answer: "16731",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "tri:1:none:0", "tri:1:solid:0", "cir:1:none:0"],
      },
    },
    {
      id: "cpm-006", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.2, b: -0.2, c: 0,
      // len 6, adjConf 2 (tri twin + sq twin), rep 0 -> -1.6 + 0.8 + 0.6.
      // answer: tri 7, tri-solid 3, sq-half 5, sq-hatch 8, star 2, cir 1
      prompt: PROMPT,
      answer: "735821",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:none:0", "tri:1:solid:0", "sq:1:half:0", "sq:1:hatch:0", "star:1:solid:0", "cir:1:none:0"],
      },
    },
    {
      id: "cpm-007", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: -0.1, c: 0,
      // len 5, adjConf 3 (alternating tri twin), rep 1 (tri-solid)
      // -> -1.6 + 0.4 + 0.9 + 0.2.
      // answer: tri-solid 3, tri 7, tri-solid 3, sq-half 5, sq-hatch 8
      prompt: PROMPT,
      answer: "37358",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:solid:0", "tri:1:none:0", "tri:1:solid:0", "sq:1:half:0", "sq:1:hatch:0"],
      },
    },
    {
      id: "cpm-008", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.0, c: 0,
      // len 6, adjConf 2 (cir twin + arw twin), rep 1 (arw) -> -1.6+0.8+0.6+0.2.
      // answer: cir 1, cir-solid 6, arw 4, arw-45 9, star 2, arw 4
      prompt: PROMPT,
      answer: "164924",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "arw:1:none:0", "arw:1:none:45", "star:1:solid:0", "arw:1:none:0"],
      },
    },
    {
      id: "cpm-009", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.1, c: 0,
      // len 7, adjConf 1 (tri twin at row end), rep 1 (star) -> -1.6+1.2+0.3+0.2.
      // answer: arw 4, star 2, arw-45 9, star 2, cir 1, tri 7, tri-solid 3
      prompt: PROMPT,
      answer: "4292173",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["arw:1:none:0", "star:1:solid:0", "arw:1:none:45", "star:1:solid:0", "cir:1:none:0", "tri:1:none:0", "tri:1:solid:0"],
      },
    },
    {
      id: "cpm-010", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.2, c: 0,
      // len 6, adjConf 2 (cir twin twice), rep 2 (cir, star) -> -1.6+0.8+0.6+0.4.
      // answer: star 2, cir 1, cir-solid 6, cir 1, star 2, sq-hatch 8
      prompt: PROMPT,
      answer: "216128",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["star:1:solid:0", "cir:1:none:0", "cir:1:solid:0", "cir:1:none:0", "star:1:solid:0", "sq:1:hatch:0"],
      },
    },
    {
      id: "cpm-011", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.3, c: 0,
      // len 6, adjConf 3 (alternating tri twin + sq twin), rep 1 (tri-solid)
      // -> -1.6 + 0.8 + 0.9 + 0.2.
      // answer: tri-solid 3, tri 7, tri-solid 3, star 2, sq-half 5, sq-hatch 8
      prompt: PROMPT,
      answer: "373258",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:solid:0", "tri:1:none:0", "tri:1:solid:0", "star:1:solid:0", "sq:1:half:0", "sq:1:hatch:0"],
      },
    },
    {
      id: "cpm-012", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.3, c: 0,
      // len 7, adjConf 1 (tri twin), rep 2 (cir, star) -> -1.6+1.2+0.3+0.4.
      // answer: tri 7, tri-solid 3, cir 1, star 2, cir 1, star 2, sq-hatch 8
      prompt: PROMPT,
      answer: "7312128",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:none:0", "tri:1:solid:0", "cir:1:none:0", "star:1:solid:0", "cir:1:none:0", "star:1:solid:0", "sq:1:hatch:0"],
      },
    },
    {
      id: "cpm-013", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.4, c: 0,
      // len 8, adjConf 0, rep 2 (star x2) - a long clean row prices below a
      // loaded short one: pure lookup load, no twin discrimination.
      // answer: star 2, cir 1, arw 4, star 2, tri 7, sq-hatch 8, cir-solid 6, star 2
      prompt: PROMPT,
      answer: "21427862",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["star:1:solid:0", "cir:1:none:0", "arw:1:none:0", "star:1:solid:0", "tri:1:none:0", "sq:1:hatch:0", "cir:1:solid:0", "star:1:solid:0"],
      },
    },
    {
      id: "cpm-014", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.4, c: 0,
      // len 8, adjConf 0, rep 2 (star, sq-hatch) -> 1.6 base + 0.4.
      // answer: tri 7, star 2, sq-hatch 8, arw 4, star 2, cir-solid 6, tri-solid 3, sq-hatch 8
      prompt: PROMPT,
      answer: "72842638",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:none:0", "star:1:solid:0", "sq:1:hatch:0", "arw:1:none:0", "star:1:solid:0", "cir:1:solid:0", "tri:1:solid:0", "sq:1:hatch:0"],
      },
    },
    {
      id: "cpm-015", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.5, c: 0,
      // len 7, adjConf 3 (cir + sq + tri twins), rep 0 -> -1.6 + 1.2 + 0.9.
      // answer: cir 1, cir-solid 6, sq-half 5, sq-hatch 8, tri-solid 3, tri 7, star 2
      prompt: PROMPT,
      answer: "1658372",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "sq:1:half:0", "sq:1:hatch:0", "tri:1:solid:0", "tri:1:none:0", "star:1:solid:0"],
      },
    },
    {
      id: "cpm-016", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.6, c: 0,
      // len 7, adjConf 2 (cir + sq twins), rep 2 (star, cir) -> -1.6+1.2+0.6+0.4.
      // answer: cir 1, cir-solid 6, star 2, sq-half 5, sq-hatch 8, star 2, cir 1
      prompt: PROMPT,
      answer: "1625821",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "star:1:solid:0", "sq:1:half:0", "sq:1:hatch:0", "star:1:solid:0", "cir:1:none:0"],
      },
    },
    {
      id: "cpm-017", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.6, c: 0,
      // len 8, adjConf 2 (cir + sq twins), rep 0 -> 1.6 base + 0.6.
      // answer: cir 1, cir-solid 6, star 2, sq-half 5, sq-hatch 8, arw 4, tri 7, arw-45 9
      prompt: PROMPT,
      answer: "16258479",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "star:1:solid:0", "sq:1:half:0", "sq:1:hatch:0", "arw:1:none:0", "tri:1:none:0", "arw:1:none:45"],
      },
    },
    {
      id: "cpm-018", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.7, c: 0,
      // len 8, adjConf 1 (tri twin), rep 2 (cir, star) -> 1.6 + 0.3 + 0.4.
      // answer: tri 7, tri-solid 3, cir 1, star 2, cir 1, sq-hatch 8, arw 4, star 2
      prompt: PROMPT,
      answer: "73121842",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:none:0", "tri:1:solid:0", "cir:1:none:0", "star:1:solid:0", "cir:1:none:0", "sq:1:hatch:0", "arw:1:none:0", "star:1:solid:0"],
      },
    },
    {
      id: "cpm-019", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.8, c: 0,
      // len 8, adjConf 2 (cir + tri twins), rep 1 (star) -> 1.6 + 0.6 + 0.2.
      // answer: cir 1, cir-solid 6, sq-half 5, star 2, sq-hatch 8, star 2, tri 7, tri-solid 3
      prompt: PROMPT,
      answer: "16528273",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["cir:1:none:0", "cir:1:solid:0", "sq:1:half:0", "star:1:solid:0", "sq:1:hatch:0", "star:1:solid:0", "tri:1:none:0", "tri:1:solid:0"],
      },
    },
    {
      id: "cpm-020", subtest: "charPairing", broad: "Gs", narrow: "P",
      a: 1.4, b: 1.0, c: 0,
      // len 8, adjConf 4 (ALL cluster twins adjacent), rep 0; raw 1.2 clamped
      // to the bank ceiling: pure twin-discrimination saturation.
      // answer: tri-solid 3, tri 7, sq-hatch 8, sq-half 5, cir-solid 6, cir 1, arw-45 9, arw 4
      prompt: PROMPT,
      answer: "37856194",
      render: {
        kind: "coding", key: PAIRING_KEY,
        sequence: ["tri:1:solid:0", "tri:1:none:0", "sq:1:hatch:0", "sq:1:half:0", "cir:1:solid:0", "cir:1:none:0", "arw:1:none:45", "arw:1:none:0"],
      },
    },
  ],
};
