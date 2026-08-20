# Item authoring contract

Every bank file exports a `Subtest` from `src/core/types.ts`. Read that file
before authoring. Non-negotiables:

## Item fields

- `id`: unique across the WHOLE battery. Use the subtest prefix, e.g. `vq-017`.
- `broad` / `narrow`: must be the codes declared by the parent subtest.
- `a` (discrimination): 0.6-2.2. Use 1.6-2.2 only for items you believe are
  unusually clean discriminators. Do not give every item a=2.0.
- `b` (difficulty, theta units): -3.0 to +4.0. THE BANK MUST SPAN THE RANGE.
  A bank clustered at b in [-1, 1] cannot measure the tails, which is the
  entire reason this battery exists.
- `c` (guessing floor): EXACTLY `1/options.length` for multiple choice.
  `0` for constructed-response (span, recall, numeric entry).
- `answer`: index into `options` for MC. For constructed-response, the exact
  expected string, uppercase, no spaces (e.g. `"4917"`, `"KNIFE"`).
- `options`: 4 or 5 entries for MC. All distractors must be plausible.
  No joke options, no "none of the above", no giveaway grammar mismatches.

## Difficulty distribution required per bank

Roughly, and it is checked by an automated test:

| b range      | share |
|--------------|-------|
| below -1.0   | ~15%  |
| -1.0 to 0    | ~20%  |
| 0 to +1.0    | ~25%  |
| +1.0 to +2.0 | ~22%  |
| above +2.0   | ~18%  |

## Answer-key correctness

This is the failure mode that silently ruins a test. For every item:

1. Solve it yourself from the prompt alone, ignoring your intended answer.
2. Confirm exactly ONE option satisfies the rule. If two do, rewrite.
3. For quantitative items, compute the arithmetic twice.

Ambiguous items are worse than easy items. Cut anything you cannot defend.

## Style

- No cultural trivia that tracks schooling or nationality rather than ability.
- No items whose answer depends on knowing a specific brand, sport, or country.
- Vocabulary items: the target word carries the difficulty, and the options
  must all be real words of comparable length and register.

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

Corpus-calibrated banks are exempt from the authored `-2..+2.5` span rule:
the definable vocabulary pool sets the achievable span (about `-1.4..+2.3`),
and the automated span test asserts the calibrated span instead.
