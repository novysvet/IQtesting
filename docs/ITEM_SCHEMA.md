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
- `c` (guessing floor): EXACTLY `1/options.length` for multiple choice —
  `1/C(options.length, multi)` when `multi` is set. `0` for constructed-response
  (span, recall, numeric entry), for matching items, and for every
  guess-penalty format (Symbol Scan's click-the-match trials carry no options
  grid and ship c = 0 even though blind clicking could succeed ~1/(row+1) —
  the penalty contract makes errors evidence, not noise).
- `answer`: index into `options` for MC. For constructed-response, the exact
  expected string, uppercase, no spaces (e.g. `"4917"`, `"KNIFE"`). For
  multi-select, the chosen option indices ascending, comma-joined
  (e.g. `"0,3,4"`). For matching items, the key word (see Whole-page
  matching below). For Symbol Scan trials, the 0-based row index of the
  embedded target, or `row.length` when neither target occurs.
- `options`: 4 or 5 entries for MC (6 for multi-select Visual Puzzles). All
  distractors must be plausible.
  No joke options, no "none of the above", no giveaway grammar mismatches.
  Symbol Scan has none: the search row itself is the response space, played
  by `SymScanRun`.
- `multi` (multi-select count): when set, exactly this many options must be
  chosen; `answer` holds the chosen indices as above and `c` is
  1/C(options.length, multi). Comparison runs through `normalise`, so
  selection order is irrelevant and a wrong-size selection cannot score.
  Visual Puzzles (choose 3 of 6) is the current user.

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
- The 2026-08-20 expansion banks carry the spans recorded in
  docs/DIFFICULTY_AUDIT.md §8: arithmetic −2.5..+2.6, visualPuzzles
  −1.5..+2.2, artificialLanguage −2.0..+2.4, blockCounting −2.8..+1.9,
  definitions −1.4..+2.3 (corpus-capped: actual bank −1.44..+2.28). The Gs speed formats cap lowest
  (symbolSearch +1.2, symbolSelection +1.0): scanning speed does not generate
  high-b items, and their banks must not pretend otherwise.
- **Floors matter as much as ceilings** (2026-08-21 floor revision, audit §9):
  the adaptive descent must be able to collect evidence AT the bottom of the
  scale, or chance-level performance cannot be located there and the scoring
  layer has no honest place to put it. Banks whose formats allow genuinely
  easy items carry basals down to b ≈ −3 or below (rotation −3.2, folding
  −2.9, number series −3.5, quant comparison −2.8, block counting −2.8).
  When authoring a new bank, ask first "what does the easiest possible item
  in this format look like, and is it in the bank?"

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
- Nor may the key sit at a learnable positional or value-rank pattern: no
  answer slot or option value-rank (e.g. the median value) may dominate a
  bank, key positions must not cycle with bank order, and countable
  side-channel information (piece cell counts, embedded-target slot,
  distractor family shape) must not decide items. Per-bank regression
  guards pin all of these (2026-08-21 audit wave — DIFFICULTY_AUDIT §10).

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
- GLYPH GRAMMAR (shared): glyphs across matrices, series, and Symbol Search
  are spec strings `shape:count:fill:rot` (e.g. `"tri:1:solid:45"`).
  Shapes: `tri`, `sq`, `cir`, `dia`, `hex`, `arw`, `cross`, `star`.
  Fills: `none`, `half`, `solid`, `hatch`. `rot` is clockwise degrees;
  `count` is the number of copies, pinned to 1 wherever a single glyph is
  meant (all Gs stimuli). Figures stay spec strings — never inline SVG — so
  stimuli, keys, and pixels stay in one machine-checkable system;
  `src/components/Figures.tsx` is the single place specs become pixels.
- SYMBOL SCAN (Gs): `render: { kind: "symscan", targets, row }` — exactly two
  target glyphs above one search row of 5–8 glyphs, each entry a glyph spec.
  The examinee presses THE row cell matching either target, or the NO-symbol
  control when neither appears; there is no options grid and no Yes/No. The
  key is the embedded target's 0-based row index, or `row.length` (the NO
  sentinel) when neither target occurs; the timeout path submits −1, which
  can never equal a key. Rows must never repeat a glyph (a duplicate would
  create two valid click targets). The bank carries the guess-penalty
  contract (c = 0, `Subtest.guessPenalty`, penalty stated in instructions)
  and is administered as a clock-bound 2-minute block (minItems = maxItems).
  Rendered/played by `SymScanRun` (`src/components/SpeedFigures.tsx`).
  Replaced the retired binary Yes/No Symbol Search (see DIFFICULTY_AUDIT
  §11).
- SYMBOL SELECTION (Gs): `render: { kind: "symqueue", legend, queue }` — a
  persistent legend binding eight nonsense glyphs (`src/components/
  glyphCatalog.ts`, ids g01..g08 with declared confusion classes) to the
  home-row keys A S D F H J K L, plus a queue of glyphs. The examinee presses
  the key of the CURRENT (highlighted) glyph; wrong presses are recorded but
  do not advance. The answer is the exact pressed-key string (any error
  breaks it; c = 0). This replaced WAIS-style Character Pairing, whose typed
  digit transcription confounded Gs with Gwm. Rendered/played by
  `SymQueueRun` (`src/components/SymQueue.tsx`).
- ANALYTICAL REASONING (Gf/RG): `render: { kind: "logic", entities,
  constraints, given? }` — linear-ordering logic games. Constraint codes:
  `before:A:B`, `adj:A:B`, `notadj:A:B`, `fixed:A:n` (1-based), `notpos:A:n`;
  `given` holds conditional-stem codes ("If R is first..."). The prompt
  duplicates every code as prose via `constraintBullet`; three question
  forms (complete-order / must-be-true / could-be-true) are verified against
  the full permutation space by `test/analytical.test.ts`. Pre-1994 GRE
  Analytical Ability lineage; fills the previously unsampled RG narrow
  ability.
- ANTONYMS (Gc/VL): stems are lexiconData key words; `b = 4 - zipf(stem)`
  with the zipf taken from `lexiconData` and cross-checked between banks by
  `test/antonyms.test.ts` (corpus-capped span ≈ −1.44..+2.28). One keyed
  opposite plus four associates; the "rarest option" exploit cannot apply
  because selection is by opposition, not rarity.
- SENTENCE COMPLETION (Gc/LD): authored sentences with one blank; b anchors
  to keyed-word rarity AND frame density (contrast/causal/elaboration
  scaffolding), so this bank is deliberately NOT corpus-calibrated — a lone
  blank-word zipf misprices jointly determined difficulty. Contract:
  five distinct lowercase options, no option inside its own sentence,
  double-entered keys in `test/sentence-completion.test.ts`.
- BLOCK COUNTING (Gv): `render: { kind: "blocks", cols, rows, heights }` —
  `heights` is a row-major height map over a cols×rows footprint. Piles are
  grounded (every column sits on the floor), so the key is the sum of
  heights. What the format measures is hidden-cube inference: a cube at
  level z is hidden iff it is NOT the top of its column AND its +x
  neighbour (if any) is taller than z AND its +y neighbour (if any) is
  taller than z — i.e. all three exposed faces (top, +x, +y) are occluded;
  boundary columns always expose an outer face, so nothing on the
  perimeter is hidden. This visibility model matches the isometric
  painter's-order renderer in `src/components/SpatialFigures.tsx` exactly.
  Multiple choice, 5 numeric options, c = 1/5 (option sets de-cycled by fixed per-item rotation).
- VISUAL PUZZLES (Gv): `render: { kind: "vpuzzle", cols, rows, target,
  pieces }` — `target` is the silhouette's filled cell indices (row-major,
  cols-wide); `pieces` holds six candidate pieces as cell-index sets in
  TARGET orientation (drawn detached in their own bounding boxes).
  Assembly is translation-only: pieces never rotate or mirror, and the
  instructions say so. Exactly three pieces tile the target and every
  other 3-subset of the six must fail to tile it exactly. `multi: 3`,
  `c = 1/20`, `answer` is the chosen option indices ascending,
  comma-joined (`"i,j,k"`). Rendered by `PuzzleTargetFigure` /
  `PuzzlePieceFigure` (`src/components/SpatialFigures.tsx`).

## Whole-page matching subtests (`Subtest.matching`)

A subtest with `matching: { bank }` is administered as ONE page instead of
an adaptive run (1926-SAT definitions format): every item's definition
displays simultaneously, `bank` lists all words — keys plus distractors —
in display order, and the examinee types a definition number next to each
word. Submit is whole-page: the button, or section expiry (the page
auto-submits typed work; `expireSubtest` is the all-blank fallback). The
semantics are fixed by `answerMatching` in `src/core/session.ts`:

- Item i is correct iff the number typed next to ITS key word
  (`item.answer` is the key word) equals i+1 — the item's 1-based position
  in `items`, not a bank index. `c` = 0 for every matching item.
- Every item is recorded on submit, blanks included: a blank is scored
  incorrect, flagged `timedOut`, and carries `rawAnswer: null`, so
  unattempted items stay distinguishable in the export (the format is
  speeded; unattempted is information).
- The routing config is inert for stopping — no adaptive rules, no
  discontinue; all items are administered and ability is estimated once
  over the full response vector. Every item's latency is page time.
- `bank` is content-hashed with everything else: editing one word changes
  `bankVersion`.

`definitions` (Gc/VL) is the matching user; it replaces `precisionLexicon`.

## Gs — processing speed

The expansion adds the CHC broad factor Gs with narrow ability P (perceptual
speed: scanning; symbol/digit pairing under time pressure). Two subtests,
both speeded and both carrying the guess-penalty contract
(`Subtest.guessPenalty`: c = 0, behavioural time cost, explicit disclosure):

- Symbol Scan (`symbolSearch`): a clock-bound two-minute locate-and-click
  block — press the search-row cell matching either of two targets, or NO
  SYMBOL when neither appears. Key = row index or row.length; c = 0.
  Replaced binary Yes/No Symbol Search, whose 0.5 guessing floor let rapid
  gambling ride for free (DIFFICULTY_AUDIT §11).
- Symbol Selection (`symbolSelection`): choice-reaction over a visible queue
  of nonsense glyphs against a persistent glyph→home-row legend; pressed-key
  string, c = 0. Replaced Character Pairing, whose typed digit transcription
  loaded working memory and confounded Gs with Gwm.

Composite g-weight is 0.7 (`G_WEIGHTS` in `src/core/scoring.ts`) — moderate,
level with Gv, below Gf/Gc/Gq, above Glr. Difficulty in a speeded format is
set jointly by content and time: items carry `timeLimitSec`, Symbol Scan's
section budget IS its 2-minute block, and the section budget bounds every
run. Authored ceilings stay low (+1.2 / +1.0) — perceptual speed is a
floor-to-mid-range factor; do not pad its banks upward.

## Norming telemetry

Sessions carry a `sessionId` and a `bankVersion` content hash — every item
id, parameter, option, key, prompt, render payload, and per-item time cap,
plus each subtest's routing config, budgeted minutes, and matching word bank
(`src/core/telemetry.ts`); the administration form is stamped as a hash
variant, so adaptive and calibration data never mix. Unscored material
(practice items, matchingPractice demos) is excluded from the hash by
design: it cannot affect a score, so it must not invalidate stored sessions.
Every recorded response
keeps the raw answer, the keyed option position, the DISPLAY position of the
key (`keyedPosition` — options are permuted per session via a seeded
Fisher-Yates over `sessionId + itemId`; binary formats are never permuted),
both ordinals, latency, away time, timeout, and the censoring flags
(`omitted`, `interrupted`). Each subtest's export carries its routing
decision log (theta/se at every offer or stop) for exposure and DIF
analysis. `exportSession` in `src/core/telemetry.ts` produces the JSON
calibration record plus an `administration` block (user agent, viewport,
screen, DPR, language, timezone, device class); sessions autosave to
localStorage and restore only onto an identical bank version. Calibration
data must never be produced by a bank whose version is not stamped on the
record.

## Practice items

Every subtest opens with a small practice section OUTSIDE `items`:

- Adaptive subtests carry `practice: Item[]` — at least TWO unscored sample
  items (session phase `"practice"`). Practice items obey the full schema and
  carry machine-verifiable keys (test/practice.test.ts re-derives them per
  format), but they are never routed, scored, exported as responses, or
  hashed into `bankVersion` — editing one cannot invalidate stored sessions.
- Whole-page matching formats carry a `matchingPractice: { defs, bank }`
  demonstration page instead (three definitions against six words in the
  shipped bank), administered through the same matching UI before the scored
  page; the section clock starts only when the real page opens. Ids are
  namespaced `prac-<prefix>-NN`.

## Multi-sitting clock

The battery budget is ACTIVE scored-administration time
(`BATTERY_BUDGET_MIN`, asserted equal to the sum of authored per-subtest
budgets). A segment opens with the first scored item (or matching page) of a
section and closes at the section boundary; between segments the clock is
frozen. Every section ends in a `checkpoint` phase exposing provisional
per-section and composite scores, from which the examinee continues or stops.
Restores re-base the open segment via `resumeSavedSession`: only work time up
to the last autosave is billed, while the SECTION clock is deliberately not
re-based — an abandoned mid-section administration voids exactly that one
section through the normal omission path.

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

The `definitions` bank inherits this contract unchanged now that it replaces
`precisionLexicon` in the battery: every item stores its key word's zipf,
`b` is re-derived as `4 - zipf` (bank span about `-1.4..+2.3` (actual −1.44..+2.28), the
definable pool's honest range), and the bank's test re-derives every `b`
from the stored zipfs. The register-band and attestation rules above apply
to the word bank (`matching.bank`) in place of `options`.

## Subtest inventory (21 subtests, 260 active minutes)

Per-subtest budgets sum to exactly `BATTERY_BUDGET_MIN = 260`
(`src/core/session.ts`; asserted in `test/budget-simulation.test.ts`).
Administration order lives in `src/battery.ts` (fixed, alternates
modalities — no two adjacent sections share a broad factor); the table
groups by broad factor — all seven broad abilities declared in
`src/core/types.ts` are sampled, including RG via analyticalReasoning.
NEW marks 2026-08-20 expansion rows; NEWER marks the 2026-08-21 redesign
wave. `definitions` replaces `precisionLexicon` (Gc/VL, retired).

| id | name | broad | narrow | budget (min) | status |
|---|---|---|---|---|---|
| matrixReasoning | Matrix Reasoning | Gf | I | 21 | — |
| figureSeries | Figure Series | Gf | I | 16 | — |
| analyticalReasoning | Analytical Reasoning | Gf | RG | 14 | NEWER |
| verbalAnalogies | Verbal Analogies | Gc | LD | 11 | — |
| generalInformation | General Information | Gc | K0 | 11 | — |
| definitions | Definitions | Gc | VL | 8 | (replaces precisionLexicon) |
| antonyms | Antonyms | Gc | VL | 10 | NEWER |
| sentenceCompletion | Sentence Completion | Gc | LD | 10 | NEWER |
| artificialLanguage | Artificial Language | Gc | LD | 12 | NEW |
| paperFolding | Paper Folding | Gv | Vz | 20 | — |
| mentalRotation | Mental Rotation | Gv | SR | 14 | — |
| visualPuzzles | Visual Puzzles | Gv | Vz | 9 | NEW |
| blockCounting | Block Counting | Gv | SR | 8 | NEW |
| digitSpan | Digit Span | Gwm | MS | 12 | — |
| letterNumberSeq | Letter–Number Sequencing | Gwm | WM | 14 | — |
| numberSeries | Number Series | Gq | RQ | 16 | — |
| quantComparison | Quantitative Comparison | Gq | RQ | 19 | — |
| arithmetic | Mental Arithmetic | Gq | RQ | 14 | NEW |
| symbolSearch | Symbol Scan | Gs | P | 2 | REBUILT 2026-08-22 (locate-and-click; replaces Yes/No Symbol Search) |
| symbolSelection | Symbol Selection | Gs | P | 3 | NEWER (replaces charPairing) |
| pairedAssociates | Paired Associates | Glr | MA | 15 | — |

Carried-over subtests keep their post-audit parameters (§7 of
docs/DIFFICULTY_AUDIT.md); the NEW banks' spans, caveats, and per-bank
machine-verification duties are recorded in §8 of the same file. The NEWER
redesigns are documented here: Symbol Selection separates Gs from Gwm,
Analytical Reasoning samples RG with solver-verified keys, and the two new
Gc banks extend the pre-1994 SAT/GRE verbal lineage alongside the existing
formats.
