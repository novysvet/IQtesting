# Norming Protocol — From Authored Priors to Sample-Referenced Scores

**Status:** pipeline built, awaiting data. Every parameter in the bank remains an
authored estimate; every percentile currently reported comes from
`normalCdf(theta)` under an assumed N(0,1) population. This document is the
operating procedure for replacing that assumption with collected data.

---

## 1. The problem being solved

Two failure modes contaminate a norming sample, and both now have mechanical
defenses:

1. **Random responders.** Before the 2026-08-21 scale-floor revision, an
   all-random examinee earned a provisional composite near IQ 75 (audit §9) —
   the EAP prior shrunk chance-level performance up from the floor, and
   nothing distinguished "random clicking" from "genuinely low ability".
   Honest scoring since the revision reports such sessions near IQ 50, but
   they still carry no ability information. Absorbed into a norm sample,
   they deflate the mean and corrupt every percentile derived from it.
   **Defense:** `src/core/validity.ts` screens every session on independent
   signatures of disengagement and contamination (§2). Invalid sessions are
   flagged on the results screen (the score is struck through and declared
   uninterpretable) and the verdict travels inside the export record.

2. **Bank drift.** A norm table describes one exact item bank. After any item
   edit the table is silently wrong.
   **Defense:** every session and every norm table carries a `bankVersion`
   content hash (`src/core/telemetry.ts`). The pipeline drops foreign-bank
   sessions; `validateNorms` rejects tables that do not match the running bank.

## 2. Validity screening (`src/core/validity.ts`)

| Index | Signal | Thresholds |
|---|---|---|
| Person-fit z (lz-style, per subtest) | observed correct vs model-expected correct, each subtest evaluated at its OWN reporting-grade estimate (wide prior), pooled by Σp(1−p). Evaluating against the composite theta biases z at both tails; per-subtest evaluation is the standard multi-scale form. | invalid ≤ −3.0 · questionable ≤ −2.5 |
| Difficulty gradient (theta-free) | point-biserial r(item b, correctness). Every engaged examinee, at any ability level, passes easy items and fails hard ones (r ≈ −0.13..−0.45 measured); guessing is difficulty-blind (r ≈ 0 ± 0.08). This signal carries guesser detection now that scoring reports chance-level performance honestly — at an honest low theta a guesser's pattern LOOKS consistent and lz alone weakens. Computed from n ≥ 60 with ≥ 5 correct and ≥ 15 wrong. | invalid when r > −0.12 AND fit z ≤ −1.5 · questionable when r > −0.12 |
| Rapid responding | share of power-item (no per-item cap) responses under 2000 ms | invalid when ≥ 50% AND fit z ≤ −1.5 · questionable ≥ 40% |
| Straight-lining | longest run of one chosen option index / modal share — computed ONLY over items with ≥ 3 options: binary formats produce long honest runs, and adaptive order reorders keys into streaks. Runs reset at every subtest boundary (2026-08-21): the same option index in two different subtests is a numbering coincidence, not a repeated position selection — without the reset, honest high-ability examinees accumulated cross-subtest runs through subtests whose keys cluster at one index. Modal share stays battery-wide. | invalid run ≥ 10 · questionable run ≥ 7 or modal ≥ 50% |
| Interruption concentration | per-subtest share of `interrupted` responses (tab hidden during memory exposure) — the tab-hide exploit concentrates censoring in one subtest, while ordinary distraction interrupts once or twice. Denominator is every response of the subtest (scored, omitted, and interrupted); subtests with fewer than 5 responses are not screened, so a single interruption can never trip it (1/5 = 20%). Exported as `maxInterruptedSubtestShare` (null when no subtest qualifies) | questionable when any subtest's share > 30% — never invalid on its own |
| Insufficient | fewer than 20 scored responses | never normed |

Verdicts: `valid` → `questionable` → `invalid`, plus `insufficient`.
All thresholds are exported constants — change them in one place, tests follow.

Scale-floor note (2026-08-21): reported scores use the wide reporting prior
(`REPORT_PRIOR_SD`, `src/core/irt.ts`) and the ceiling-discontinue rule is
floor-gated (`src/core/routing.ts`), so chance-level performance reports near
IQ 50 instead of the mid-70s the old estimator produced (audit §9). Validity
screening exists to keep such sessions OUT OF THE NORMING SAMPLE — not to
rescue the score, which is already honest.

## 3. Data collection

### 3.1 Infrastructure (added 2026-08-21)

- **Consent + demographics** gate every fresh session: age ≥ 13 required
  (13–17-year-olds confirm guardian permission on the demographics screen;
  the record is anonymous, so no parental-consent data flow exists),
  research-use consent recorded with a text version, and an optional
  demographics block (age band mandatory; sex, education, native language,
  country, test familiarity, self-chosen participant code optional). All of
  it travels inside every export record.
- **Fixed calibration forms**: `?form=calibration` administers
  deterministic difficulty-stratified linear forms per subtest (stop rules
  disabled; bank hash stamped `calibration-v1`). Norming data should be
  collected under this mode — identical forms across examinees are what IRT
  calibration and DIF analysis require.
- **Collection worker** (`worker/`): the results screen POSTs exports when
  `VITE_SUBMIT_URL` is configured; the worker validates structurally with
  hard size caps (`worker/validator.js`: every string, array, id-like field,
  raw answer, nesting depth, and the total body size is bounded), rate-limits
  per IP, and rejects duplicate session ids. The manual JSON download
  remains as fallback. Worker validation is the only full structural gate —
  the pipeline below re-screens validity, it does not re-validate structure.
- **Comprehension check**: the first scored section is gated by an
  instruction-comprehension question; failures return to the instructions
  and are counted in the export (`comprehensionAttempts`).
- **Censoring flags**: `omitted` (section expired with the item on screen)
  and `interrupted` (tab hidden during memory exposure) responses stay in
  the record but are excluded from ability estimation and person fit. Only
  `interrupted` is also held out of the discontinue miss-streak
  (`src/core/routing.ts`): an omitted response counts as a miss there, but
  omissions are only recorded when a section closes — after which no
  further items are routed — so the streak is never consumed by one
  (README, Censoring policy). Latencies carry `awayMs` so screening judges
  active time.

### 3.2 Procedure

1. Examinees complete the battery normally. The results screen offers
   **Submit response data** (when the endpoint is configured) and
   **Download response data (JSON)** — one `ExportDocument` per session
   containing every response (raw answer, keyed position, display position
   of the key, latency, away time, timeout, omission/interruption flags,
   ordinals), the routing decision log, the composite estimate, and the
   validity verdict.
2. Worker submissions land in KV automatically; manual downloads are
   collected into a directory, e.g. `data/exports/`. One file per examinee;
   filenames are irrelevant to the pipeline.

Minimum viable sample: **N ≥ 100** screened sessions (`MIN_NORM_SAMPLE`).
Below that the pipeline still runs but `validateNorms` refuses to let the
table back reported scores.

## 4. Running the pipeline

```
node --experimental-strip-types tools/norming.ts data/exports --out data/norms.json
```

Collecting under the calibration form? Add `--form calibration` — the tool
then expects and stamps the calibration bank hash (the form variant is part
of `bankVersion`, so adaptive and calibration exports can never back one
table). The flag defaults to `adaptive` and throws loudly on any other
value rather than silently falling back. Options: `--include-questionable`
keeps questionable sessions in the sample (default: excluded). The tool:

1. Loads exports, skipping malformed/foreign-format files (all skips counted).
2. Drops sessions whose `bankVersion` ≠ the current bank hash for the
   selected form (`--form`).
3. **Re-screens validity independently** — the embedded verdict is never
   trusted; a tampered export cannot smuggle a bot into the sample.
4. Computes per-item statistics over surviving sessions, with censored
   responses (`omitted`, `interrupted`) excluded from every diagnostic —
   p, rest score, latency, timeout rate — mirroring the estimation policy:
   - p-value (proportion correct),
   - corrected point-biserial (item-rest r),
   - mean latency, timeout rate,
   - flags: `too-easy(p≥.95)`, `at-or-below-guessing(p≤c+.05)`,
     `weak-discrimination(r<.10, n≥30)`, `high-timeout(>.3)`.
5. Writes two artifacts:
   - `norms.json` — the `NormTable`: sorted composite thetas of the screened
     sample plus provenance (bank hash, N, exclusions, collection window).
   - `norms-report.md` — distribution percentiles, flagged items, exclusion log.

## 5. Consuming the table (`src/core/norms.ts`)

Once `norms.json` exists with N ≥ 100:

- `empiricalPercentile(thetaSample, theta)` — midrank empirical CDF.
- `probit(p)` — inverse normal for IQ-equivalent conversion.
- `normedBand(theta, se, norms, currentBankVersion)` — full band:
  percentile from the SAMPLE's own distribution, IQ equivalent as
  `100 + 15·probit(percentile)`, CI endpoints mapped through the same
  empirical curve (skew-honest, not assumed symmetric).
- `validateNorms(norms, currentBankVersion)` — structural + provenance gate;
  wrong bank, unsorted sample, or N < 100 returns false and callers must fall
  back to the provisional normal-model band.

Wiring point: results rendering swaps `score.g.percentile` for
`normedBand(...)?.percentile ?? score.g.percentile` whenever a valid table for
the running bank is available. Until then nothing changes on screen.

## 6. What this does NOT do (yet)

- **No IRT calibration.** Item a/b/c parameters are untouched. The pipeline
  produces the diagnostics (p, r, flags) that tell you WHICH items to
  re-anchor first; re-estimation from response matrices is the next stage and
  should only run once N ≥ several hundred.
- **No demographic stratification.** The first table references its own
  convenience sample. Report it as such until recruitment is representative.
- **No per-subtest norm tables.** Only the composite distribution is distilled;
  subtest-level raw-score norms are an extension once the sample justifies it.

## 7. Sequence summary

```
collect exports ──► tools/norming.ts ──► norms.json + report
                        │                       │
                 validity re-screen      validateNorms(bank match, N≥100)
                        │                       │
                        ▼                       ▼
                flag/repair items ◄─── normedBand() in scoring
                (DIFFICULTY_AUDIT §6)       (sample-referenced scores)
```
