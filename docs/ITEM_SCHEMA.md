# Item authoring contract

Every bank file exports a `Subtest` from `src/core/types.ts`. Read that file
before authoring. Non-negotiables:

## Item fields

- `id`: unique across the WHOLE battery. Use the subtest prefix, e.g. `vq-017`.
- `broad` / `narrow`: must be the codes declared by the parent subtest.
- `a` (discrimination): 0.6-2.2. Use 1.6-2.2 only for items you believe are
  unusually clean discriminators. Do not give every item a=2.0, and do not
  ramp a in lockstep with b — discrimination is a property of the item's
  distractors, not its position (audit finding: every original bank ramped
  a 1.0→2.0 by index).
- `b` (difficulty, theta units): authored from CONTENT features (rule count,
  sequence length, fold count, distractor confusability), never from item
  position. The 2026-08-20 difficulty audit (docs/DIFFICULTY_AUDIT.md) found
  every position-based ladder mispriced the upper half by 0.5-1.5 logits.
- `c` (guessing floor): EXACTLY `1/options.length` for multiple choice.
  `0` for constructed-response (span, recall, numeric entry).
- `answer`: index into `options` for MC. For constructed-response, the exact
  expected string, uppercase, no spaces (e.g. `"4917"`, `"KNIFE"`).
- `options`: 4 or 5 entries for MC. All distractors must be plausible.
  No joke options, no "none of the above", no giveaway grammar mismatches.

## Difficulty spans are PER SUBTEST and honest

There is no uniform span rule. `test/bank-validation.test.ts` asserts each
subtest's audit-derived basal/ceiling pair (`HONEST_SPANS`). A bank must
claim the ceiling its FORMAT can actually deliver:

- 2D line-figure rotation caps near b +1.4; 4x4 axis-aligned folding near
  +1.5 (any 3-fold punch pattern is a stripe and fold-error-invariant);
  single-probe paired associates near +1.0. These are structural caps, not
  authoring failures — padding them with fictional b values mis-routes the
  adaptive engine at exactly the ability levels where claims matter.
- High-range measurement (b > +2) is carried by matrix reasoning (+3.0),
  general information (+3.2), the span banks (+2.6..+2.9), number series
  (+2.4) and figure series (+2.3).

## Answer-key correctness

This is the failure mode that silently ruins a test. For every item:

1. Solve it yourself from the prompt alone, ignoring your intended answer.
2. Confirm exactly ONE option satisfies the rule. If two do, rewrite.
3. For quantitative items, compute the arithmetic twice.
4. Encode the rule as executable code in the bank's test file so the key is
   re-derived by the suite (see matrix-rules, fold-simulation, series-keys,
   rotation-keys, gq-keys, memory-banks tests). A key that cannot be
   re-derived by machine does not ship.

Ambiguous items are worse than easy items. Cut anything you cannot defend.

## Exploit resistance (audited patterns)

- No format may be solvable by a non-substantive heuristic: the key must not
  be the only non-mirrored option (mental rotation), the only option with its
  mark/hole count (folding, structured matrices), the rarest option
  (lexicon), a numerical neighbor of itself (number-series flanking
  distractors within ±3 of the key), or findable by out-of-family elimination
  (figure series distractors must stay in the series' shape family).
- When the stimulus space forces all candidates into one symmetry class
  (4x4 folding), distractors must share the key's hole count and symmetry
  class, differing only in placement.

## Style

- No cultural trivia that tracks schooling or nationality rather than ability.
- No items whose answer depends on knowing a specific brand, sport, or country.
- Vocabulary items: the target word carries the difficulty, and the options
  must all be real words of comparable length and register. The definition's
  distinctive clause must fit the key and NOT any distractor, and no option
  word may appear inside its own definition.

## Format conventions

- PAPER FOLDING: "V" folds move the RIGHT half onto the stationary LEFT half;
  "H" folds move the BOTTOM half onto the stationary TOP half. Punches are
  (row, col) in the final folded footprint, top-left anchored. The convention
  is executable in `test/fold-simulation.test.ts`.
- MENTAL ROTATION: every item carries two non-mirrored candidates — the key
  (target figure rotated) and a confusable DIFFERENT figure rotated (F/E/P
  family for harder items), plus at least two mirrors of the target, one at
  the key's own angle.

## Norming telemetry

Sessions carry a `sessionId` and a `bankVersion` content hash (every id,
parameter, option, and key). Every recorded response keeps the raw answer,
the keyed option position, and both ordinals; `exportSession` in
`src/core/telemetry.ts` produces the JSON calibration record; sessions
autosave to localStorage and restore only onto an identical bank version.
Calibration data must never be produced by a bank whose version is not
stamped on the record.

## Corpus-calibrated difficulty (Precision Lexicon)

`precisionLexicon` in `src/items/gc.ts` derives `b` from corpus data instead
of authored ranks: `b_theta = 4 - zipf`, where zipf is the wordfreq ('en')
frequency (log10 occurrences per billion words) of the keyed word — i.e.
IQ-unit difficulty `bIQ = 160 - 15*zipf`. Remeasure words with
`tools/lexicon_zipf.py` (candidates in `tools/lexicon_candidates.csv`).

Two additional contracts, enforced by `test/lexicon.test.ts` from the zipf
vectors stored in the bank:

- Register bands: all five options of an item stay within a zipf width cap,
  and the key may not be a rarity outlier (no "pick the rarest word" exploit).
  The top band is allowed a wider band because the keyed word is
  definitionally the rarest in its neighborhood there.
- All option words must be attested (zipf > 0).

Corpus-calibrated banks are exempt from the authored span rule: the
definable vocabulary pool sets the achievable span (about `-1.4..+2.3`).
