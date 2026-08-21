import type { Item, Subtest } from "../core/types.ts";

/**
 * Gs - processing speed, narrow ability P (perceptual speed).
 *
 * Symbol Search (ssr-001..030): WAIS-IV Symbol Search adapted to adaptive
 * item-level administration. Each item shows two target glyphs and a 5-8
 * glyph search row; the examinee decides whether either target occurs in
 * the row. Keys are never hand-authored: answer = 1 iff some target string
 * occurs in the search array, and test/symsearch.test.ts re-derives every
 * key from the render payload.
 *
 * Construction contract (machine-enforced in test/symsearch.test.ts):
 *  - exactly 15 Yes / 15 No items;
 *  - Yes items embed EXACTLY ONE target exactly once, at an index spread
 *    across the row (1-based positions 2-6 for 7-8 glyph rows, 1-4 for
 *    5-glyph rows) so the whole row must be scanned, and always include
 *    >=1 near-miss of the ABSENT target;
 *  - No items contain no target glyph, no duplicate glyph within the row,
 *    distinct targets, and >=2 near-misses - same shape with different
 *    fill, or same shape+fill rotated - which blocks the "check the shape
 *    family only" heuristic;
 *  - every glyph parses against the Figure grammar "shape:1:fill:rot";
 *  - the embedded target's slot inside the targets pair is balanced
 *    across the Yes items (7-8 of 15 per slot), so scanning only one
 *    listed target gains nothing (test/symsearch.test.ts pins this).
 *
 * Fairness rule: circle outlines are rotation-invariant, so no circle
 * near-miss differs from its target ONLY by rotation - circle confusers
 * always differ in fill (otherwise a visually identical glyph would key
 * "No"). Rot twins are used only on shapes where rotation is visible
 * (tri, sq, dia, hex, arw, cross, star).
 *
 * CALIBRATION STATUS: a/b are authored estimates anchored to row length,
 * confuser density and near-miss subtlety (per-item comments), not fitted
 * to response data. Accuracy under time pressure is scored per item via
 * IRT; response latency is recorded in telemetry for future speed-aware
 * calibration of b against speededness.
 */

const SS_OPTIONS = ["No", "Yes"];

// ---------------------------------------------------------------------------
// Difficulty architecture (content-anchored, 2026-08):
//   tier E  ssr-001..008  5-glyph rows, filler families disjoint from the
//                          targets, near-misses maximally salient
//                          (none-vs-solid)           b -2.0 .. -1.1
//   tier M  ssr-009..020  6-glyph rows with 2 near-misses, then 7-glyph
//                          rows; near-miss salience drops (half/hatch and
//                          rot twins on arw/cross/star)  b -0.95 .. +0.3
//   tier H  ssr-021..030  8-glyph rows, dense confusable families, 3
//                          near-misses, rot twins ADJACENT to the embedded
//                          target                     b +0.45 .. +1.2
// a spans 1.1-1.5 but climbs in near-lockstep with b (corr(a,b) = 0.97
// over the 30 items; tier mean a steps 1.15 -> 1.29 -> 1.44 E/M/H) - the
// "parameters-by-position" pattern DIFFICULTY_AUDIT.md section 1 flags as
// an anti-pattern. Authored estimate only: refit a from response data
// before treating discrimination as independent of difficulty here.
// ---------------------------------------------------------------------------

/** Authored ladder: 30 items in difficulty order, Yes/No content intact. */
const SEARCH_BANK: Item[] = [
    {
      id: "ssr-001", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.1, b: -2.0, c: 0.5, timeLimitSec: 15,
      // Yes: tri:solid embedded at index 1; cir:solid is a fill near-miss of
      //   the absent target cir:none (none-vs-solid, maximally salient);
      //   remaining three glyphs from families disjoint from both targets.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["cir:1:none:0", "tri:1:solid:0"],
        search: ["sq:1:half:0", "tri:1:solid:0", "hex:1:none:0", "cir:1:solid:0", "star:1:none:0"],
      },
    },
    {
      id: "ssr-002", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.1, b: -1.9, c: 0.5, timeLimitSec: 15,
      // No: tri:solid near-misses tri:none, sq:none near-misses sq:solid
      //   (both fill changes at maximum salience); 3 disjoint fillers.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["tri:1:none:0", "sq:1:solid:0"],
        search: ["cir:1:none:0", "hex:1:half:0", "star:1:solid:0", "tri:1:solid:0", "sq:1:none:0"],
      },
    },
    {
      id: "ssr-003", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.15, b: -1.75, c: 0.5, timeLimitSec: 15,
      // Yes: sq:solid embedded at index 2; star:hatch near-misses the absent
      //   star:none; dia/cross/hex fillers are disjoint from both targets.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["sq:1:solid:0", "star:1:none:0"],
        search: ["dia:1:half:0", "cross:1:solid:0", "sq:1:solid:0", "hex:1:hatch:0", "star:1:hatch:0"],
      },
    },
    {
      id: "ssr-004", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.1, b: -1.6, c: 0.5, timeLimitSec: 15,
      // No: cir:none near-misses cir:hatch, star:half near-misses
      //   star:solid; tri/hex/dia fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["cir:1:hatch:0", "star:1:solid:0"],
        search: ["tri:1:none:0", "cir:1:none:0", "hex:1:solid:0", "star:1:half:0", "dia:1:solid:45"],
      },
    },
    {
      id: "ssr-005", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.2, b: -1.45, c: 0.5, timeLimitSec: 15,
      // Yes: hex:solid embedded at index 0 (still requires scanning past it);
      //   arw:solid near-misses the absent arw:none:45 by fill only.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["hex:1:solid:0", "arw:1:none:45"],
        search: ["hex:1:solid:0", "cir:1:none:0", "tri:1:hatch:0", "sq:1:none:0", "arw:1:solid:45"],
      },
    },
    {
      id: "ssr-006", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.15, b: -1.3, c: 0.5, timeLimitSec: 15,
      // No: arw:none near-misses arw:solid, hex:solid near-misses hex:none;
      //   sq/cross/cir fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["arw:1:solid:0", "hex:1:none:0"],
        search: ["sq:1:solid:0", "cross:1:none:0", "arw:1:none:0", "hex:1:solid:0", "cir:1:half:0"],
      },
    },
    {
      id: "ssr-007", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.2, b: -1.2, c: 0.5, timeLimitSec: 15,
      // Yes: cross:none embedded at index 1; dia:none near-misses the absent
      //   dia:hatch; tri/hex/sq fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["dia:1:hatch:0", "cross:1:none:0"],
        search: ["tri:1:solid:0", "cross:1:none:0", "hex:1:solid:0", "sq:1:half:0", "dia:1:none:0"],
      },
    },
    {
      id: "ssr-008", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.2, b: -1.1, c: 0.5, timeLimitSec: 15,
      // No: cross:none near-misses cross:solid, dia:solid near-misses
      //   dia:none; tri/star/hex fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["cross:1:solid:0", "dia:1:none:0"],
        search: ["tri:1:hatch:0", "star:1:none:0", "cross:1:none:0", "dia:1:solid:0", "hex:1:half:0"],
      },
    },
    {
      id: "ssr-009", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.2, b: -0.95, c: 0.5, timeLimitSec: 20,
      // Yes: 6 glyphs. sq:none embedded at index 1; tri:solid near-misses
      //   the absent tri:half (half-vs-solid is subtler than none-vs-solid);
      //   hex/cir/arw/star fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["sq:1:none:0", "tri:1:half:0"],
        search: ["hex:1:solid:0", "sq:1:none:0", "cir:1:hatch:0", "arw:1:solid:45", "tri:1:solid:0", "star:1:none:0"],
      },
    },
    {
      id: "ssr-010", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.25, b: -0.85, c: 0.5, timeLimitSec: 20,
      // No: 6 glyphs. hex:hatch near-misses hex:solid, dia:half near-misses
      //   dia:none; tri/star/cir/sq fillers disjoint.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["hex:1:solid:0", "dia:1:none:0"],
        search: ["tri:1:half:0", "hex:1:hatch:0", "star:1:solid:0", "cir:1:none:0", "dia:1:half:0", "sq:1:solid:0"],
      },
    },
    {
      id: "ssr-011", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.2, b: -0.7, c: 0.5, timeLimitSec: 20,
      // Yes: 6 glyphs. star:hatch embedded at index 2; cir:hatch near-misses
      //   the absent cir:solid (fill-adjacent hatch-vs-solid); sq rendered
      //   as a diamond (rot 45) adds a benign shape-family decoy.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["cir:1:solid:0", "star:1:hatch:0"],
        search: ["dia:1:none:0", "cross:1:solid:0", "star:1:hatch:0", "sq:1:none:45", "hex:1:half:0", "cir:1:hatch:0"],
      },
    },
    {
      id: "ssr-012", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.3, b: -0.55, c: 0.5, timeLimitSec: 20,
      // No: 6 glyphs, first ROT twins: arw:solid:0 near-misses arw:solid:45
      //   (arrow rotation is highly visible), sq:hatch near-misses sq:half.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["arw:1:solid:45", "sq:1:half:0"],
        search: ["cross:1:none:0", "arw:1:solid:0", "hex:1:none:0", "tri:1:solid:45", "sq:1:hatch:0", "cir:1:solid:0"],
      },
    },
    {
      id: "ssr-013", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.25, b: -0.45, c: 0.5, timeLimitSec: 20,
      // Yes: 6 glyphs. arw:half embedded at index 2; cross:hatch:45 is a
      //   ROT near-miss of the absent cross:hatch - the hatched cross tips
      //   into an X, forcing a fill check on a rotated twin.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["arw:1:half:0", "cross:1:hatch:0"],
        search: ["sq:1:solid:0", "tri:1:none:0", "arw:1:half:0", "hex:1:solid:45", "cir:1:none:0", "cross:1:hatch:45"],
      },
    },
    {
      id: "ssr-014", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.3, b: -0.35, c: 0.5, timeLimitSec: 20,
      // No: first 7-glyph row. cir:half near-misses cir:none; star:hatch:45
      //   is a rot twin of star:hatch (star rotation clearly visible).
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["cir:1:none:0", "star:1:hatch:0"],
        search: ["sq:1:solid:0", "cir:1:half:0", "tri:1:none:45", "hex:1:solid:0", "star:1:hatch:45", "cross:1:none:0", "dia:1:solid:0"],
      },
    },
    {
      id: "ssr-015", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.25, b: -0.2, c: 0.5, timeLimitSec: 20,
      // Yes: 7 glyphs. hex:half embedded at index 3; sq:solid:45 near-misses
      //   the absent sq:hatch:45 by fill (same rotation); dia:hatch is a
      //   benign diamond decoy next to the rotated square family.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["sq:1:hatch:45", "hex:1:half:0"],
        search: ["tri:1:solid:0", "cir:1:none:0", "star:1:solid:0", "hex:1:half:0", "dia:1:hatch:0", "sq:1:solid:45", "cross:1:none:0"],
      },
    },
    {
      id: "ssr-016", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.35, b: -0.1, c: 0.5, timeLimitSec: 20,
      // No: 7 glyphs, both near-misses are ROT twins (tri:half:0 vs
      //   tri:half:45, cross:solid:45 vs cross:solid:0) - subtler than
      //   fill changes, hence the step up within the tier.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["tri:1:half:45", "cross:1:solid:0"],
        search: ["hex:1:none:0", "sq:1:solid:45", "cir:1:hatch:0", "star:1:none:0", "tri:1:half:0", "cross:1:solid:45", "arw:1:none:0"],
      },
    },
    {
      id: "ssr-017", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.3, b: 0.0, c: 0.5, timeLimitSec: 20,
      // Yes: 7 glyphs. dia:solid embedded at index 4; arw:none:45 is a rot
      //   near-miss of the absent arw:none - a tilted arrow must be
      //   rejected as "not the upright target".
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["dia:1:solid:0", "arw:1:none:0"],
        search: ["arw:1:none:45", "sq:1:half:0", "cross:1:solid:0", "hex:1:none:0", "dia:1:solid:0", "tri:1:hatch:0", "star:1:none:0"],
      },
    },
    {
      id: "ssr-018", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.1, c: 0.5, timeLimitSec: 20,
      // No: 7 glyphs; both near-misses rot twins again (sq:none:0 vs
      //   sq:none:45, dia:hatch:0 vs dia:hatch:45) and the row carries a
      //   second rotated square (star:solid:45) as background noise.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["sq:1:none:45", "dia:1:hatch:45"],
        search: ["tri:1:solid:0", "sq:1:none:0", "hex:1:half:0", "cir:1:solid:0", "dia:1:hatch:0", "star:1:solid:45", "cross:1:none:0"],
      },
    },
    {
      id: "ssr-019", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.35, b: 0.2, c: 0.5, timeLimitSec: 20,
      // Yes: 7 glyphs. star:solid:45 embedded at index 3 with its fill twin
      //   tri:solid ADJACENT at index 4 (near-miss of the absent tri:none);
      //   dia:none:45 adds a tilted-diamond decoy.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["tri:1:none:0", "star:1:solid:45"],
        search: ["cir:1:half:0", "hex:1:none:0", "cross:1:hatch:0", "star:1:solid:45", "tri:1:solid:0", "dia:1:none:45", "sq:1:solid:0"],
      },
    },
    {
      id: "ssr-020", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.35, b: 0.3, c: 0.5, timeLimitSec: 20,
      // No: 7 glyphs. cir:solid near-misses cir:hatch (fill-adjacent);
      //   cross:none:0 is a rot twin of cross:none:45 - an upright cross
      //   must be rejected while the target is the diagonal one.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["cross:1:none:45", "cir:1:hatch:0"],
        search: ["tri:1:solid:0", "sq:1:none:0", "cir:1:solid:0", "hex:1:solid:0", "star:1:none:0", "cross:1:none:0", "arw:1:half:45"],
      },
    },
    {
      id: "ssr-021", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.45, c: 0.5, timeLimitSec: 25,
      // Yes: first 8-glyph row. arw:solid embedded at index 4; tri:solid
      //   near-misses the absent tri:none at the row end; arw:none:45 is a
      //   fill near-miss of the PRESENT target - two arrows in the row.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["arw:1:solid:0", "tri:1:none:0"],
        search: ["hex:1:half:0", "arw:1:none:45", "sq:1:solid:0", "cir:1:hatch:0", "arw:1:solid:0", "star:1:none:45", "cross:1:half:0", "tri:1:solid:0"],
      },
    },
    {
      id: "ssr-022", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.35, b: 0.55, c: 0.5, timeLimitSec: 25,
      // No: 8 glyphs, 3 near-misses: tri:solid:0 and tri:hatch:45 flank the
      //   tri:solid:45 target family, hex:none:45 twins hex:none:0.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["tri:1:solid:45", "hex:1:none:0"],
        search: ["sq:1:half:0", "tri:1:solid:0", "cir:1:hatch:0", "star:1:none:45", "hex:1:none:45", "cross:1:solid:0", "tri:1:hatch:45", "arw:1:half:0"],
      },
    },
    {
      id: "ssr-023", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.45, b: 0.65, c: 0.5, timeLimitSec: 25,
      // Yes: 8 glyphs, dense star family (3 stars). star:hatch embedded at
      //   index 4 with its rot twin star:hatch:45 two places left; sq:none:0
      //   near-misses the absent sq:none:45 by rotation.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["sq:1:none:45", "star:1:hatch:0"],
        search: ["tri:1:solid:45", "cir:1:half:0", "star:1:hatch:45", "hex:1:none:0", "star:1:hatch:0", "sq:1:none:0", "star:1:solid:0", "dia:1:hatch:0"],
      },
    },
    {
      id: "ssr-024", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.75, c: 0.5, timeLimitSec: 25,
      // No: 8 glyphs, 3 near-misses across both families: cir:solid (fill),
      //   star:hatch (fill) and star:solid:45 (rot) vs the star:solid target.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["cir:1:half:0", "star:1:solid:0"],
        search: ["star:1:hatch:0", "cir:1:solid:0", "hex:1:solid:45", "sq:1:none:0", "star:1:solid:45", "dia:1:hatch:0", "cross:1:none:45", "arw:1:solid:0"],
      },
    },
    {
      id: "ssr-025", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.45, b: 0.85, c: 0.5, timeLimitSec: 25,
      // Yes: 8 glyphs. dia:solid:45 embedded at index 5 with its rot twin
      //   dia:solid:0 ADJACENT at index 4 (confusable twin of the present
      //   target); cross:hatch:45 near-misses the absent cross:hatch.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["cross:1:hatch:0", "dia:1:solid:45"],
        search: ["sq:1:half:0", "cross:1:hatch:45", "hex:1:solid:0", "cir:1:none:0", "dia:1:solid:0", "dia:1:solid:45", "arw:1:solid:45", "star:1:half:0"],
      },
    },
    {
      id: "ssr-026", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.4, b: 0.95, c: 0.5, timeLimitSec: 25,
      // No: 8 glyphs, 3 near-misses: two square twins of sq:solid (rot 45,
      //   hatch fill) plus arw:half:0 - the upright twin of arw:half:45.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["arw:1:half:45", "sq:1:solid:0"],
        search: ["tri:1:hatch:0", "sq:1:solid:45", "cir:1:none:0", "arw:1:half:0", "hex:1:half:0", "sq:1:hatch:0", "cross:1:solid:45", "dia:1:none:45"],
      },
    },
    {
      id: "ssr-027", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.5, b: 1.0, c: 0.5, timeLimitSec: 25,
      // Yes: 8 glyphs. hex:half:45 embedded at index 4 with its rot twin
      //   hex:half:0 ADJACENT at index 3 (half-fill rotates with the hex);
      //   arw:none:45 near-misses the absent arw:none at the row end.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["hex:1:half:45", "arw:1:none:0"],
        search: ["tri:1:solid:0", "sq:1:none:0", "star:1:solid:45", "hex:1:half:0", "hex:1:half:45", "cir:1:hatch:0", "cross:1:none:45", "arw:1:none:45"],
      },
    },
    {
      id: "ssr-028", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.45, b: 1.05, c: 0.5, timeLimitSec: 25,
      // No: 8 glyphs, 3 near-misses: dia:none:0 and dia:solid:45 both twin
      //   the dia:none:45 target, cross:half:45 twins cross:half:0.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["dia:1:none:45", "cross:1:half:0"],
        search: ["tri:1:solid:0", "dia:1:none:0", "hex:1:solid:45", "sq:1:half:45", "cir:1:solid:0", "star:1:hatch:45", "dia:1:solid:45", "cross:1:half:45"],
      },
    },
    {
      id: "ssr-029", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.5, b: 1.2, c: 0.5, timeLimitSec: 25,
      // Yes: ceiling item. cross:none embedded at index 3, FLANKED by its
      //   rot twin cross:none:45 (index 2) and by sq:half:0 (index 4), the
      //   fill twin of the absent sq:half:45; sq:solid:45 repeats the
      //   absent family at index 6. Three square-family + two cross-family
      //   glyphs crowd the key.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["sq:1:half:45", "cross:1:none:0"],
        search: ["tri:1:solid:45", "cir:1:none:0", "cross:1:none:45", "cross:1:none:0", "sq:1:half:0", "star:1:hatch:0", "sq:1:solid:45", "arw:1:none:45"],
      },
    },
    {
      id: "ssr-030", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.5, b: 1.2, c: 0.5, timeLimitSec: 25,
      // No: ceiling item. Three near-misses, two of them rot twins:
      //   hex:hatch:0 and hex:solid:45 crowd the hex:hatch:45 target
      //   family, tri:half:45 twins tri:half:0. Eight glyphs, five
      //   shape families, all confusable.
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["hex:1:hatch:45", "tri:1:half:0"],
        search: ["hex:1:hatch:0", "sq:1:solid:45", "tri:1:half:45", "cir:1:none:0", "hex:1:solid:45", "star:1:solid:0", "cross:1:none:45", "dia:1:half:0"],
      },
    },
];

// 2026-08-20 adversarial-verification fix: the authored ladder alternated
// Yes/No with item parity (key = odd/even index), so the answer was
// predictable from difficulty position. This fixed permutation interleaves
// the two answer tiers — breaking the parity pattern and the key-vs-b
// correlation — without touching any stimulus, key, or parameter. Ids are
// renumbered to the presented order; content is unchanged.
const SEARCH_ORDER = [15, 1, 2, 4, 3, 5, 6, 7, 8, 10, 9, 12, 11, 13, 14, 16, 0, 18, 17, 20, 19, 22, 24, 21, 26, 23, 25, 28, 27, 29];

// 2026-08-21 adversarial-verification fix: 13 of the 15 Yes items embedded
// targets[0] and no No item contains any target, so "scan only the FIRST
// listed target; answer Yes iff found" scored 28/30. Six Yes items
// (authored ssr-011/015/019/023/025/029) now list their embedded target
// second, splitting the slots 7/8 - display order only; keys, search
// rows, near-miss structure and a/b are untouched. Single-slot scans sum
// to a constant ((15 + slot0) + (15 + slot1) = 45 because each Yes item
// embeds exactly one target), so a near-even split is the optimum: both
// single-slot strategies sit at 22-23/30, the format-inherent floor.
// test/symsearch.test.ts pins the 6..9 band.

function bankOrder(bank: Item[]): Item[] {
  return SEARCH_ORDER.map((src, i) => ({
    ...bank[src]!,
    id: "ssr-" + String(i + 1).padStart(3, "0"),
  }));
}

export const symbolSearch: Subtest = {
  id: "symbolSearch",
  name: "Symbol Search",
  broad: "Gs",
  narrow: ["P"],
  instructions:
    "Two target symbols are shown on the left of each row. Scan the search group on the right and decide whether either target symbol also appears anywhere in it. Choose Yes if either target is present, No if neither is. Work quickly - each item has a time limit.",
  budgetMin: 3,
  routing: { maxItems: 24, minItems: 10, ceilingMisses: 6, targetSe: 0.50, entryTheta: 0 },
  // Unscored sample: a Yes item with no per-item time cap — the decision and
  // its key are understood before the clock starts.
  practice: [
    {
      id: "prac-ssr-01", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.1, b: -2.5, c: 0.5,
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 1,
      render: {
        kind: "symsearch",
        targets: ["cir:1:none:0", "sq:1:solid:0"],
        search: ["hex:1:none:0", "sq:1:solid:0", "star:1:none:0", "dia:1:half:0", "cross:1:none:0"],
      },
    },
    {
      id: "prac-ssr-02", subtest: "symbolSearch", broad: "Gs", narrow: "P",
      a: 1.1, b: -2.5, c: 0.5,
      prompt: "Is either target symbol present in the search group?",
      options: SS_OPTIONS,
      answer: 0,
      render: {
        kind: "symsearch",
        targets: ["tri:1:solid:0", "cir:1:hatch:0"],
        // tri:none is a fill near-miss of the absent-but-similar target twin.
        search: ["sq:1:none:0", "dia:1:solid:0", "tri:1:none:0", "hex:1:half:0", "star:1:none:0"],
      },
    },
  ],
  items: bankOrder(SEARCH_BANK),
};
