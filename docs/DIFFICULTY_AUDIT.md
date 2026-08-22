# Difficulty Audit — Pre-Norming Speculation

**Date:** 2026-08-20 · **Method:** 17-agent swarm audit (14 per-item/per-subtest auditors, 1 engine audit, 1 battery simulation calling the project's own `irt.ts`/`routing.ts`/`scoring.ts`, 1 literature-anchor review with primary sources). All 257 items across 12 subtests covered.

**POST-AUDIT REVISION (same day): every finding marked actionable below has been implemented.** See §7 "Fixes applied" for the item-level changes, new test coverage, and remaining limitations. The predicted-b tables in §2 are preserved as the reasoning record; where fixes landed, the §7 values supersede them.

**Status of every number below:** authored parameters remain authored; predicted b values are structured speculation from cognitive analysis + published anchors, ±0.3–0.8 logits per item. Nothing here is calibrated. Scale: b in logits, θ=0 = general adult population mean, IQ ≈ 100 + 15·b.

---

## 1. Executive summary — five systemic findings

1. **Parameters-by-position, not parameters-by-content.** Most banks were authored as arithmetic ladders (uniform b steps in item index, a rising in lockstep). Cognitive analysis and LLTM literature (e.g. +0.51 logit per matrix rule, +0.98/+2.1/+3.8 logits for geometric/multiplicative/second-difference series rules) say real difficulty is a step function of content features. Result: upper halves of most banks are over-authored by 0.5–1.5 logits, and several "ceiling" items are empirically mid-range or even easy.

2. **Seven of twelve subtests have fictional ceilings.** Under audit, the effective (predicted) bank maxima are: mentalRotation ≈ −0.3 (IQ ~95!), paperFolding ≈ +1.2 (IQ ~118), verbalAnalogies ≈ +1.5 (IQ ~122), pairedAssociates ≈ +1.2 (IQ ~118), quantComparison ≈ +1.6 (IQ ~124), figureSeries ≈ +2.3, numberSeries ≈ +2.4. Matrix reasoning and general information are the only subtests whose top items genuinely sit near their authored b (+3.0 / +3.2 predicted). High-ability routing targets items that will not function as designed.

3. **Format exploits and structural tells exist despite the design goal.** Mental rotation: the key is always the only non-mirrored option, so angles are decorative and the subtest collapses to "which letter isn't backwards." Paper folding: pf-013/014 are degenerate (any 4-fold or 3-fold-2-punch item on a 4×4 grid is necessarily a full grid — authored as the two hardest items, predicted among the easiest). Number series: nsr-012 has the same difference chain as nsr-005 (2.8-logit authored gap for the same item); nsr-013 is near-isomorphic to nsr-006. Verbal analogies: rarity was equated with difficulty, but in ~10 items the key hangs on the *familiar* second-pair word while the rare word sits in the stem. Lexicon: three ceiling items reintroduce "rarest option is the key."

4. **One confirmed instruction/key defect (paper folding) + one item with a genuinely ambiguous key (fs-014).** Verified by hand-derivation: the fold simulator uses a stationary-left/stationary-top convention, while the instructions state the moving-left/moving-top convention. Under the literal instructions, pf-001's answer ([5,6]) is not even offered, and pf-003's literal answer ([0,3,13,14]) is offered — as a *distractor*. Either the instruction wording or the punch rendering/simulator convention must change. fs-014 (second-difference rotation, b=3.4) has two defensible keys (270 arithmetic growth vs 315 geometric growth from only two observed increments).

5. **The norming pipeline does not exist yet.** No response persistence of any kind (page close loses everything), the raw answer is discarded after grading, there is no session ID, no item-bank version stamp, and answer-position permutation is a deterministic hash (reconstructable only from a source snapshot). Separately, the adaptive precision targets are unreachable: 0 of 144,000 simulated runs achieved targetSe; every session ends at maxItems (θ≥0) or discontinue (θ≤−1), with tail bias of ±9–18 IQ points at θ=±3.

---

## 2. Per-subtest audit

### 2.1 Matrix Reasoning (mx-001..018) — best-calibrated bank

| id | authored b | predicted b (range) | verdict | flags |
|---|---|---|---|---|
| mx-001 | −2.6 | −2.5 (−2.8..−2.1) | ALIGNED | — |
| mx-002 | −2.1 | −2.3 (−2.6..−1.9) | ALIGNED | 2 shape distractors eliminated without rule |
| mx-003 | −1.7 | −1.8 (−2.1..−1.4) | ALIGNED | dual convergent rules lower b |
| mx-004 | −1.1 | −1.0 (−1.3..−0.7) | ALIGNED | — |
| mx-005 | −0.7 | −0.9 (−1.2..−0.6) | ALIGNED | novel-fill distractor = near-instant elimination |
| mx-006 | −0.3 | −1.3 (−1.6..−0.9) | **TOO-HARD-by-1.0** | fill rule never needed (local copy); arrow rotation hyper-salient |
| mx-007 | 0.1 | 0.0 (−0.4..+0.4) | ALIGNED | — |
| mx-008 | 0.4 | 0.5 (0.1..0.9) | ALIGNED | NE/NW mirror near-miss distractor |
| mx-009 | 0.7 | 0.45 (0.1..0.8) | TOO-EASY-by-0.25 | **EXPLOIT: key is the only 2-mark option** |
| mx-010 | 1.0 | 1.1 (0.7..1.5) | ALIGNED | best diagnostics in family |
| mx-011 | 1.2 | 0.8 (0.4..1.2) | **TOO-HARD-by-0.4** | row-3 surface-mirrors row-1 → "copy the similar row" solves it; parity construct underdemonstrated |
| mx-012 | 1.6 | 1.4 (1.0..1.8) | ALIGNED | — |
| mx-013 | 1.9 | 1.8 (1.3..2.4) | ALIGNED | AMBIGUITY: alternate rule fits both examples and keys distractor A; lower a to ~1.5 |
| mx-014 | 2.5 | 2.2 (1.7..2.7) | ALIGNED | best distractor set in range |
| mx-015 | 2.2 | 1.9 (1.4..2.5) | TOO-HARD-by-0.3 | row-only solving; column constraint redundant |
| mx-016 | 2.9 | 2.3 (1.8..3.0) | TOO-HARD-by-0.6 | every needed computation has verbatim precedent in examples |
| mx-017 | 3.7 | 3.0 (2.4..3.6) | TOO-HARD-by-0.6 | true ceiling item; keeps top rank |
| mx-018 | 3.3 | 2.3 (1.8..2.9) | **TOO-HARD-by-0.9** | decomposable; locally redundant with mx-016's trick |

Fixes: mx-006 → ≈ −1.2 (biggest single error; also opens a ~1-logit hole at the legacy→CellSpecV2 transition that should be bridged); invert mx-010/mx-011; mx-018 → ≈ 2.3; add 1–2 genuine items at b 3.2–4.0 if IQ 145+ measurement in Gf is a goal (current effective ceiling ≈ θ 2.8–3.0).

### 2.2 Precision Lexicon (lex-001..050) — zipf mapping: right on average, wrong in the tails

Authored b = 4 − zipf(key), a=1.35, c=0.2 for all. Full per-item tables from the four slice auditors are consistent with these summaries:

- **Band 1 (lex-001..013, zipf > 4.8 — approximate banding; the enforced cuts in `test/lexicon.test.ts` are 4.9/4.45/3.8/3.0, and lex-012/013 sit at 4.79/4.77):** everyone knows every option; difficulty is cue crispness and distractor overlap, not rarity. Authored spread 0.66 logits should be ~1.0. Worst: lex-006 *private* TOO-EASY-by-0.35 (personal/secret partially fit; AMBIGUITY), lex-010 *rich* TOO-HARD-by-0.4 (absurd distractors → elimination), lex-013 *patient* AMBIGUITY (calm fits "without becoming annoyed"). Adjacent authored gaps (0.02–0.09) are pseudo-precision; slice-internal order is effectively arbitrary.
- **Band 2 (lex-014..025):** mapping saturates; authored spread 0.44 vs predicted ~1.3–1.5. Worst: lex-020 *hungry* TOO-EASY-by-0.85 (picture-vocabulary giveaway), lex-021 *curious* effective 2-choice (strange/odd/unusual are mutual synonyms), lex-025 *crucial* TOO-HARD-by-0.35 (vital is a dictionary synonym of the key; AMBIGUITY), lex-017 *obvious* AMBIGUITY (clear).
- **Band 3 (lex-026..038):** broadly credible (8/13 within ±0.2). Exceptions: lex-029 *polite* TOO-EASY-by-0.45 (idiomatic giveaway), lex-032 *pragmatic* TOO-HARD-by-0.40 (distractor "practical" has a near-identical definition; AMBIGUITY). Stem leaks: lex-030 and lex-035 embed their own distractors ("hesitant", "gentle") in the definition.
- **Band 4 ceiling (lex-039..050):** systematic ceiling compression −0.2 to −0.35 per item. Causes: GRE-fame of the keys (elucidate, disparage, ameliorate, inchoate, supercilious, equivocate are all prep-list words), and rarest-option-is-key / elimination exploits in lex-045, 049, 050. Authored ceiling b=2.28 (IQ 134) → predicted effective ≈ 1.9 (IQ ~128); nothing measures IQ 140+ here.

Recommended: re-stem the 6 AMBIGUITY items (lex-006, 013, 017, 023, 025, 032) and the 2 stem-leak items (030, 035); accept that the 5-option format with c=0.2 structurally caps useful b near ~2.8; if Gc ceiling matters, add items keyed on zipf 1.1–1.5 words *with common-word distractors that partially fit* (that is what actually makes lexicon items hard).

### 2.3 Figure Series (fs-001..014) — ladder too steep above −0.5

| id | authored b | predicted b | verdict |
|---|---|---|---|
| fs-001 | −2.4 | −2.3 | ALIGNED |
| fs-002 | −2.0 | −1.8 | ALIGNED |
| fs-003 | −1.5 | −1.4 | ALIGNED (half/hatch visual confusability → lower a) |
| fs-004 | −1.0 | −1.5 | TOO-HARD-by-0.5 (rotation more salient than fill cycling) |
| fs-005 | −0.5 | −0.5 | ALIGNED |
| fs-006 | −0.1 | −1.1 | **TOO-HARD-by-1.0 + EXPLOIT** (2 of 5 options out-of-family; cycle pre-demonstrated in-stimulus) |
| fs-007 | +0.3 | −0.2 | TOO-HARD-by-0.5 |
| fs-008 | +0.7 | +0.2 | TOO-HARD-by-0.5 (best distractor architecture in the bank) |
| fs-009 | +1.1 | +0.3 | TOO-HARD-by-0.8 |
| fs-010 | +1.5 | +0.9 | TOO-HARD-by-0.6 |
| fs-011 | +1.9 | +0.4 | **TOO-HARD-by-1.4** (near-clone of fs-008) |
| fs-012 | +2.3 | +1.2 | TOO-HARD-by-1.1 |
| fs-013 | +2.8 | +0.9 | **TOO-HARD-by-1.9** (two rules cannot be harder than fs-012's three; star rotation low-salience) |
| fs-014 | +3.4 | +2.3 | TOO-HARD-by-1.1 + **KEY-RISK** (270 vs 315 both defensible; add a 4th term) |

8 of 14 items over-priced (mean overshoot ≈ +0.8 in the upper half). Nothing real exists above ~2.3, so the authored span to +3.4 is fiction for CAT routing purposes. fs-012, not fs-014, is the natural ceiling anchor.

### 2.4 Number Series (nsr-001..016) — practice-contaminated + two structural duplicates

b is a mechanical 0.4-step ladder −2.5 → +3.8; keys all verified arithmetically correct. Canonical-sequence recognition replaces induction for most of the easy half (triangular, squares, cubes, Mersenne, ×2 are the most practice-contaminated formats in aptitude testing): nsr-001..005, 007..010, 012 all TOO-EASY by 0.4–1.0. Structural errors:

- **nsr-012 (authored +1.9) has the identical difference chain (4,6,8,10) as nsr-005 (authored −0.9)** — the same item priced 2.8 logits apart; also local dependence when co-administered.
- **nsr-013 (×3−2, +2.4) is near-isomorphic to nsr-006 (×3+2, −0.5)** via the geometric-differences route.
- Flanker distractors cluster tightly around the key in nsr-006/013 (727/728/729; 243/244/245) → effective c ≈ 1/3.
- Learnable meta-pattern: every item includes a repeat-last-difference distractor; key position cycles deterministically.

Genuine hard items survive: nsr-014 → ≈1.3, nsr-015 → ≈1.8, nsr-016 → ≈2.4 (real ceiling, matching the LLTM literature's second-difference ≈ +3.8 in student samples ≈ +2.4–2.8 general-population). Fix the two duplicates before anything else.

### 2.5 Quantitative Comparison (qcp-001..018) — bottom two-thirds solid, top third over-placed

All 18 keys re-solved and verified (including both "cannot be determined" edge-case items — bank instructions lack GRE's "all numbers are real" clause, worth adding). Items 001–009 align well. The top third collapses:

- qcp-010 (+1.1 → ≈+0.4), qcp-012 (+1.7 → ≈+0.7, one-step equation), qcp-013 (+2.0 → ≈+1.1, famous ±root trick), qcp-014 (+2.3 → ≈+1.2, grind not insight), qcp-015 (+2.6 → ≈+1.5), qcp-016 (+3.0 → ≈+1.6, shortcut 5/6+1/7<1).
- **qcp-017 (+3.3 → ≈+0.8) and qcp-018 (+3.7 → ≈+1.2): TOO-HARD-by-2.5 each** — 7! vs 7⁷ is a knowledge check of "factorial"; 5P3 is standard mid-GRE.
- qcp-004/qcp-006 are structural twins (a^b vs b^a, same key) near-adjacent — separate or rekey.
- The authored +0.3–0.8 premium on D-keyed items is directionally right but over-priced on qcp-013. Note the literature could not quantify the D-avoidance effect; treat it as unanchored.

### 2.6 Paper Folding (pf-001..014) — **confirmed instruction/key defect + degenerate ceiling**

All 14 keys verified correct *under the simulator's convention* (stationary-left/top; punch drawn top-left-anchored in the folded footprint). **The written instructions state the opposite (moving-left/top) convention.** Verified by hand: under the literal instructions pf-001's answer is [5,6] — not offered — and pf-003's literal answer [0,3,13,14] is offered as a distractor. Every punch sits in the moving half, so the mismatch is universal. Fix before any data collection (reword instructions or mirror the punch coordinate).

Difficulty: authored ladder assumes fold-count drives b, but count + double-symmetry backward-solving flattens it (matches Burte et al. 2019, who document the same shortcut). pf-005..012 each TOO-HARD by 0.5–1.7 (compressing into a ≈0.3-logit band around −0.5..+0.8). **pf-013 (b=3.0) and pf-014 (b=3.6) are degenerate: 3-fold-2-punch and 4-fold on a 4×4 grid are necessarily full/near-full grids — predicted −1.0/−1.2, i.e. among the easiest items in the bank.** Post-correction subtest ceiling ≈ +1.2 (IQ ~118); nothing measures above IQ ~125 without finer grids or diagonal folds.

### 2.7 Mental Rotation (mr-001..013) — format exploit collapses the subtest

Rendering verified: every item's key is the only option with `mirrored=0`; chirality (mirror vs rotation) is the entire task, and it is self-paced — so angular disparity (the intended difficulty driver) affects effort/RT, not accuracy. On top of that, Z has C2 symmetry: mr-006 and mr-012's keys render as near-copies of the stem ("pick the lookalike"). mr-005..013 are TOO-EASY by 0.7–3.9 logits; predicted bank range is [−1.8, −0.3] against authored [−2.2, +3.3]. Also: 4 options with c=0.25 (fine per schema), answer positions cycle 0,1,2,3 from mr-005 on, and 13 items vs maxItems 12.

Structural remedies (needed before norming — this subtest currently measures "can you spot a backwards letter" at IQ 67–95): same-chirality wrong-angle distractors, different-figure distractors, replace Z or use odd angles, break the position cycle, and add genuinely 3D or multi-element compound figures if a ceiling above θ ≈ 0 is wanted. Literature check: 2D letter rotation is empirically 1.5–2 logits easier than 3D MRT items — consistent with the audit.

### 2.8 Digit Span (dsp-001..020) — wrong b-to-length slope

All keys verified. Bank is internally monotone, but authored b climbs ~1.1 logits per *slot* while the adult span distribution supports only ~0.8–1.1 logits per *digit* — and the bank has two items per length placed 0.7–0.8 apart (they will collapse onto each other post-calibration). Everything at length ≥ 5 authored above b=0 is too hard, increasingly up the bank: dsp-013 (7-forward, authored +1.5, predicted 0.0 — 7-forward is the *median* adult item), dsp-015 (+2.2 → 0.0), dsp-017 (8-forward, +2.9 → +0.5), dsp-019 (9-forward, +3.6 → +1.3, the true ceiling), dsp-020 (9-backward, +3.9 → +2.6). Consequence: a median adult exits this subtest ≈ 1–1.5 SD inflated. No length-10 items → no ceiling for the top ~2%. Also: single trial per item (WAIS gives 2–3), all-or-nothing typed exact match (typos will flatten empirical a below the authored 0.9→2.0 ramp), 1.4 s/symbol visual presentation is more generous than the ~1 s/symbol auditory norms (predictions are therefore conservative floors), and no practice items despite schema support. Design note (disproven during verification): the recall input is correctly gated behind `memoryReady` — no shadow-typing hole exists.

### 2.9 Letter-Number Sequencing (lns-001..014) — same slope error, milder

First item of each length pair is essentially aligned (lns-001..007, 009, 011); the second of each pair is too hard from lns-008 up (by 0.6–1.45 by the top). Authored uniform 0.42-step staircase vs a step-function reality (~0.6–0.8 logits between adjacent lengths, both items at a length calibrating together). True bank ceiling ≈ +2.0 (nothing above length 9). Strict output-order scoring (digits-then-letters, exact match, no partial credit) will surface as left-skewed misfit: examinees recalling the content correctly but typing letters first score 0.

### 2.10 Paired Associates (pas-001..014) — span logic imported into a non-span format

Format established: all pairs shown simultaneously (~1.4–2 s/pair), then **one** pair probed per item via free-typed cued recall, exact match. Single-probe immediate recall is far easier than the authored 6.1-logit list-length slope: predicted range [−1.7, +1.2] vs authored [−2.4, +3.7]; pas-014 (authored +3.7 / "IQ 156") is predicted ≈ +0.95 (IQ ~114). Escalating a (1.0→2.0) unjustified; expect flat a ≈ 0.8–1.1. Additional noise sources: rare/archaic free-typed targets (BRAMBLE, LOAM) measure spelling; cross-list word repetitions (SADDLE, MARSH, DOOR/DOORPOST) create proactive-interference variance that is not in any parameter; ceilingMisses=3 will never fire for able examinees. Either accept a low-ceiling recognition-format subtest or re-anchor b to the single-probe literature.

### 2.11 Verbal Analogies (36 items, DIFFICULTY_ORDER) — ordering table substantially wrong

Systematic flaw: rarity-in-stem was treated as difficulty, but where the keyed relation attaches to the familiar second-pair word, the rare stem word is ignorable. Three items are degenerate second-pair giveaways (van-031 GRANGER:COAL MINER:mine — authored +2.2, predicted −0.6; van-033 NOCTIVAGANT:DIURNAL:day — +2.6 → −0.4; van-034 PROSOPOGRAPHY:TOPOGRAPHY:places — +2.8 → −0.4). Overpromoted by the override table: van-013 (+3.4 → +0.2), van-028 (+3.8 → +1.2), van-030 (+4.0 → +0.5), van-022 (+3.6 → +1.2). Under-promoted (should be *easier* than ranked): van-005, 006 (school-science giveawaays demoted to hard). Predicted empirical ceiling ≈ +1.2–1.5 — the upper half of the authored −3..+4 grid is fiction; high-ability examinees will run the table. Literature cross-check: relation-type category effects on difficulty are empirically near-null (Ben-Simon, Bejar); difficulty lives in word rarity of the *keyed* pair, negation, and order — audit agrees. Rebuild DIFFICULTY_ORDER from this table before norming, or better, key b to the keyed-pair rarity.

### 2.12 General Information (30 items, DIFFICULTY_ORDER) — best of the three ordered banks, cohort-drift risk

Floor and ceiling genuinely survive audit (hardest: gin-021 Abelard ≈ +3.2, gin-030 ascending node ≈ +2.8 — real IQ ~145 items). The mid-band is where routing actually lives and contains the worst errors: **gin-016 (oxygen most abundant in crust) is a misconception item ranked 10th easiest but predicted +0.3 — majority answers silicon — direction-reversed ranking**; gin-010 (Rosetta, self-answering prompt, +0.14 → −1.2) and gin-011 (Versailles, −0.10 → −1.5) over-ranked ~1.3–1.4. Wrong ranks by severity: gin-029 (anaphora is taught in secondary English), 023 (Cantor is math-history famous, +4.0 → +2.0), 028, 011, 010, 016, 020, 027, 013, 015. Norming-specific warnings: gin-028 (Mansa Musa) is *actively drifting easier* (viral content since ~2015, ~0.2 logits/decade culture drift per Gonthier 2022); gin-003/005/008/010/021 are Euro-Anglo-centric. Flag 028 and 024 for recalibration or removal at first norming refresh.

---

## 3. Battery-level simulation (authored parameters, project's own engine)

- **Precision stop never fires:** 0/144,000 runs reached targetSe (0.28–0.32 implies administered information 8.8–11.8; 2–4 achieved). Real subtest SEs are 6.5–10.4 IQ points — 1.5–2.2× the targets. maxItems is the de facto stop rule at θ≥0; discontinue dominates at θ≤−1 (86–92% for memory subtests).
- **Tail bias (EAP shrinkage):** at θ=+3 every subtest underestimates by 8.8–18.2 IQ points (worst: mentalRotation, numberSeries, paperFolding); at θ=−3 overestimates by +14 to +26 IQ. Inverse-variance compositing does not correct this; battery IQ claims at 145+ read ~10–13 points low *given the current authored banks* (fixing the fictional ceilings will partially fix this).
- **Coverage:** densest at IQ 85–115 (as intended); IQ 148–160 has only 13 items battery-wide, IQ 55–63 only 8. Lexicon contributes zero items near IQ ≥138 or ≤78. Weakest subtests above θ=+2: mentalRotation, figureSeries, quantComparison, paperFolding, numberSeries; strongest: digitSpan (per authored b — see slope warning), verbalAnalogies/generalInformation (per authored b — see ordering warning), matrixReasoning.
- **Budget:** Σ budgetMin = exactly 180 min; simulated sessions run 148 (θ=−2) to 175 (θ≥+1) — <4% headroom at the top; five sections overrun authored budgets at θ≥+2 (lexicon +38%); enforcing section time limits truncates ~10% of items at θ=+3, degrading SE exactly where coverage is thinnest.

---

## 4. Literature anchors used (strongest per paradigm)

| Paradigm | Anchor | Mapping to our scale | Conf. |
|---|---|---|---|
| Matrices | Zorowitz 2023 MaRs-IB (N=1501): +0.514 logit/rule, +0.579/element; Mackintosh & Bennett 2005 APM p-by-rule | D2 ≈ +2.2, D3 ≈ +1.2, A/S ≈ −0.3 (adult gen. pop.) | High |
| Number/figure series | Loe et al. 2018; Sun et al. 2019 LLTM weights (already logits) | geometric +1.0, multiplicative +2.1, interleaved +1.5, 2nd-difference +3.8 (student ≈ general+~1) | High |
| Vocabulary | GSS Wordsum (5-option, representative US adults): p .19–.95 | zipf>5 → −2.5..−1; 4–5 → −0.5..+1; <3.5 → +1.5+ | High |
| Mental rotation | VK-MRT ≈60% in students; 2D letter tasks ~85–90% | 2D mirror-spotting ≈ −1.5..−2.0; 3D 180° ≈ +0.7 | Med-high |
| Span | LDSF μ≈7.4 σ≈1.0; LNS ≈ forward at +1 length | ≈0.8–1.1 logits per digit; bwd/LNS +1.0–1.5 vs forward | Medium |
| Paper folding | Burte 2019 (folds×punches interaction; count-shortcut documented); no public VZ-2 IRT table | ~+0.5–0.7 per fold/punch step — analogy, not calibration | Low |
| Quant comparison | No published quantification of D-avoidance found anywhere peer-reviewed | treat D-premium 0.3–0.5 as assumption | Low |
| Analogies | Relation-type category effects ≈ null (Ben-Simon, Bejar); rarity r≈.2 | difficulty = keyed-pair rarity, negation, order — not taxonomy | Med-high |

---

## 5. Norming readiness — engine findings

Model/engine (verified, `src/core/`; engine description as of audit date): 3PL, EAP on a 181-point grid with N(0,1) prior (a 225-point [−7,+7] grid since §9; subtest reporting now uses the wide `REPORT_PRIOR_SD = 2` prior, routing keeps N(0,1)), max-information routing, inverse-variance broad pooling, fixed literature g-weights, linear IQ map. Engine is deterministic and tested — fine as a scoring machine, but:

| Prerequisite | Status |
|---|---|
| Item-level response capture (id, raw answer, correct, latency, timeout, position, order) | **MISSING** — `Response` in memory only; raw answer discarded after grading (`session.ts:94-100`) |
| Any persistence (localStorage / export / server) | **MISSING** — zero hits repo-wide; page close loses everything |
| Session/participant ID, retest linkage, bot screening | **MISSING** |
| Bank/form versioning (hash stamped on records) | **MISSING** — answer position derivable only from a source snapshot |
| Calibration swap-point (provenance-flagged params) | PARTIAL — comments/wording only |
| Item metadata sidecar | PARTIAL — derivable from source; no frozen snapshot |
| Engine determinism for data collection | READY |

Additional engine risks (pre-fix status as written 2026-08-20): composite/broad SEs assume independent subtest errors (anti-conservative CI, real g-correlation makes ±3-point composites too narrow); timed-out answered items scored incorrect; tab-blur during memory presentation scores as an unavoidable wrong answer feeding the 3-miss discontinue (ability-uncorrelated censoring); unanswered items at section expiry are omitted (informative censoring); no routing telemetry (exposure/DIF analysis impossible); G_WEIGHTS not data-derived. *Since fixed: composite SEs floor at the best single component (§7.3); tab-blur responses are recorded `interrupted` and excluded from estimation and the discontinue streak, with concentrated interruption now screened (§10.2); expiry omissions are censored flags excluded from estimation; routing telemetry ships in every export (§7.3). Still open: G_WEIGHTS stay literature-fixed pending norming data.*

---

## 6. Priority actions before data collection

1. **Build the data pipeline** (nothing else matters without it): persist every item event incl. raw answer + displayed answer position + latency + timeout flag; session ID; bank-version hash stamped on every record; export (JSON download or endpoint). 
2. **Fix the paper-folding instruction/simulator convention mismatch** (confirmed defect; contaminates all 14 items' keys under the literal instructions).
3. **Repair or quarantine the degenerate/duplicate items:** pf-013/014 (full-grid degenerates), nsr-012/013 (duplicates of nsr-005/006), mr-005..013 (exploit format — needs distractor redesign, not just re-b), van-031/033/034 (second-pair giveaways), fs-014 (ambiguous key), mx-009 (count exploit), qcp-004/006 twins.
4. **Re-anchor the systematically mispriced banks** using §2 predictions as starting values: digitSpan/lns slope correction (biggest single inflation source at the middle of the scale), figureSeries upper half, quantComparison top third, pairedAssociates slope, verbalAnalogies DIFFICULTY_ORDER.
5. **Decide the high-range story honestly:** after corrections the battery measures well to roughly IQ 130–135, thinly beyond (matrix + gin carry the top). Either author genuine ceiling items (Gf matrices at true b 3.2–4.0; 3D rotation; finer-grid folding; length-10 spans; lexicon with fitting common-word distractors) or state the ceiling in the results caveat.
6. **Re-simulate after re-anchoring**, then reset targetSe to achievable values (or accept maxItems-fixed forms for the calibration phase — fixed-form exposure also simplifies norming).

*All predicted b values above are speculation with documented reasoning, intended as priors for re-authoring and as hypotheses for the first calibration study — not as calibrated parameters.*

---

## 7. Fixes applied (2026-08-20, post-audit)

All changes verified by new/extended machine-checked tests; full suite, typecheck, and build green at the time of commit. Bank grew 257 → 261 items.

### 7.1 Confirmed defects repaired

- **Paper-folding convention (all 14 items).** Instructions and arrows now state the simulator's actual convention (right half folds left / bottom half up — the folded stack stays top-left where the renderer draws it). Under the old wording, pf-001's literal answer was not offered and pf-003's literal answer appeared as a distractor. The convention is now executable: `test/fold-simulation.test.ts` re-derives every key from steps+punches.
- **pf-013/014 degenerates.** The "hardest two" items (3-fold-2-punch, 4-fold: necessarily full grids) were replaced with asymmetric 2-fold-2-punch items (b +1.2/+1.5) whose distractors all share the key's hole count and symmetry class — on 4×4 every unfold pattern is 4-fold symmetric, so placement (not count/symmetry) is the only discriminator, which forces actual folding. All 2-punch and 2-fold-quadrant items received count-matched distractor sets (anti-elimination).
- **nsr-012 duplicate.** Rebuilt as a doubling-differences series (3,4,6,10,18,34 → 66, b +1.2). The old item shared nsr-005's difference chain at a 2.8-logit premium.
- **nsr-013 near-duplicate.** Rebuilt as alternating +1/×2 (2,3,6,7,14,15,30 → 31, b +0.7).
- **qcp-006 twin.** Moved off qcp-004's a^b-vs-b^a structure (now √50 vs 7, key verified in code). During machine verification a fraction item keyed "B greater" was found to be actually equal and fixed.
- **fs-014 ambiguous key.** Fourth term added (0°,45°,135°,270°): the geometric-growth reading now placed term 4 at 315°, refuted in-stimulus; key 90° is unique; b re-anchored 3.4 → 2.3.
- **mx-009 count exploit.** The weak 1-mark distractor replaced by a same-count XOR-minus-one near-miss; b 0.7 → 0.5.
- **Mental-rotation format exploit (whole subtest).** Every item now carries two non-mirrored candidates — the key (target rotated) plus a confusable DIFFERENT figure rotated (new E path = F plus one arm; F/E/P family anchors every item above b −0.6) — and at least two mirrors of the target, one at the key's own angle. "Spot the non-backwards letter" no longer solves anything: `test/rotation-keys.test.ts` enforces the structure, render-distinctness (Z's C2 duplicates), and a non-cyclic answer-position pattern. Bank 13 → 14 items; b span honest at −1.8..+1.4.
- **Lexicon ambiguity/exploits.** Re-stemmed: lex-006 (ownership sense), 013, 017, 025, 030 (stem leak), 035 (stem leak), 014 (stem leak found by the new regression). Synonym distractors replaced: lex-023 bold→reckless, 025 vital→serious, 032 practical→efficient (+utilitarian), 010 absurd→in-domain traps, 021 synonym cluster→attentive/observant. Rarest-key exploits killed in lex-045/049/050 (rare non-fitting distractors: extol, irrevocable, declaim) and, via the new rarest-key regression, in 8 further mid-band items. All 50 keys and zipfs (hence all b values) unchanged.
- **van degenerate giveaways.** van-031/033/034 distractors replaced with same-domain traps (granary/barn/field/orchard; sunrise/noon/dusk/sunlight; maps/landmarks/surfaces/regions) so the relation, not elimination, is required.

### 7.2 Re-anchored parameters (authored priors, audit-derived)

- **Matrix:** mx-002 −2.2, mx-005 −0.9, mx-006 −1.2 (fill rule never inductive), mx-009 0.5, mx-011 0.85 (row-1 analogy shortcut), mx-015 1.9, mx-016 2.3, mx-017 3.0 (true ceiling), mx-018 2.3 (decomposable); mx-013 a→1.5.
- **Figure series:** full re-anchor per §2.3 table (fs-006 → −1.1 with in-family distractors; fs-011 → +0.4; fs-013 → +0.9; fs-014 → +2.3); a flattened 1.0–1.5; fs-009 shows five terms so the shape-cycle wrap is demonstrated in-stimulus; all distractors in-family (≤1 out-of-family per item).
- **Number series:** b set to content anchors (−2.8 … +2.4); a flattened 0.9–1.4; no distractor within ±3 of any key (flanker regression); difference chains pairwise unique (duplicate regression); error-type distractors varied; answer positions de-cycled.
- **Quant comparison:** b per §2.5 midpoints (top third down 0.7–2.5 logits; 17/18 → +0.8, 18 → +1.2); a flattened; "variables may take any real value" clause added to instructions (makes the two D-keyed items fair).
- **Digit span:** b re-anchored to the span literature (7-fwd = 0.0; same-length parallel forms share identical b); ceiling extended with dsp-021 (10-fwd, +2.0) and dsp-022 (10-bwd, +2.9).
- **LNS:** pair-collapsed ladder (−2.1 … +1.95 per length); ceiling extended with lns-015 (10 symbols, +2.6).
- **Paired associates:** re-anchored to single-probe recall reality (−1.7 … +0.95); cross-list word repeats removed (SADDLE, MARSH, DOORPOST/DOOR, MEADOW, WHEEL, WINDOW — the last three found by the new no-repeat regression); multi-word target "RED ORE" → single word.
- **Verbal analogies:** DIFFICULTY_ORDER rebuilt from §2.11 predictions; span compressed to the audit-honest [−2.5, +1.5] (the old −3..+4 grid's upper half had no items operating above ~+1.2).
- **General information:** order rebuilt per §2.12 (oxygen-crust misconception item moved to its true hard-mid rank; Rosetta/Versailles demoted; Abelard kept as +3.2 ceiling); span [−2.6, +3.2].

### 7.3 Engine and norming pipeline

- **Response capture built.** Every response now records the raw answer, keyed option position, subtest id, both ordinals, latency, and timeout flag. Sessions carry a random `sessionId` and a `bankVersion` content hash (ids, parameters, options, keys, routing); `exportSession` produces a complete JSON calibration record; results screen offers a download. Sessions autosave to localStorage and restore only onto an identical bank version (stale saves rejected). "FORM CHC–A" now displays the bank hash.
- **Composite SE floor.** Broad-factor and g pooling no longer assume independent errors: pooled SE is floored at the best single component's SE (errors correlate through g). Confidence intervals are now honest rather than anti-conservative.
- **targetSe made honest.** All 12 subtests now target 0.50 (was 0.28–0.32, unreachable in 144,000 simulated runs). Simulation regression added: targets ≥ 0.45, terminal SE ≤ 0.70 at θ=0, precision stop actually fires.
- **Results caveat** extended: precision thins at the extremes; estimates beyond ~99th percentile rest on few items and shrink toward the mean.
- **bank-validation** rewritten to per-subtest honest spans (HONEST_SPANS) replacing the uniform −2/+2.5 fiction; **ITEM_SCHEMA.md** rewritten (content-anchored authoring, per-subtest ceilings, fold convention, rotation design, exploit patterns, telemetry contract).

### 7.4 Known remaining limitations (honest)

- All parameters remain authored priors — the audit's predictions are now the bank's values, but only response data can calibrate them. The provisional-calibration caveat stands everywhere scores appear.
- Battery high-range measurement (IQ 145+) rests on matrix (b 3.0), general information (3.2), digit span (2.9), LNS (2.6): folding, rotation, quant comparison, paired associates, and analogies have honest ceilings at or below b ≈ +1.5.
- Lexicon ceiling stays corpus-capped (max b 2.28); the 5-option format with c=0.2 structurally caps useful vocabulary difficulty near b ≈ 2.8 regardless.
- Answer-position permutation remained deterministic at audit time (hash of item id); positions were recorded per response so bias was auditable from collected data. A seeded per-session permutation was implemented on 2026-08-21 (Fisher-Yates over `sessionId + itemId`, `src/core/presentation.ts`; binary formats are never permuted) — documented as current in ITEM_SCHEMA's telemetry section.
- gin-028 (Mansa Musa) and gin-024 (event horizon) are flagged for drift monitoring at the first calibration refresh; gin Euro-Anglo-centric items remain a norming-sample consideration.

---

## §8 2026-08-20 battery expansion (Gs + WAIS-classic coverage)

### 8.1 Motivation (user feedback)

Users flagged two gaps. First, the battery had **no processing-speed measurement at all**: every subtest was an un-timed power test, so the CHC broad factor Gs (narrow ability P, perceptual speed — scanning, symbol/digit pairing under time pressure) went unsampled. Second, several classic formats were missing: symbol search, coding/character pairing, arithmetic, visual puzzles, and block counting. The expansion adds all of these plus two 1926-SAT formats, artificial language and definitions — the latter **replacing precisionLexicon** (same corpus-calibrated Gc/VL construct, new whole-page matching administration) to break format monotony: twelve subtests of one-at-a-time adaptive pages was producing page-format fatigue that modality alternation could not offset. Battery grows 12 → 18 subtests and 180 → 226 budgeted minutes (superseded later on 2026-08-21 by the redesign wave: 21 subtests / 438 items / 260 min — see ITEM_SCHEMA's inventory); Gs enters the composite at g-weight 0.7 (`G_WEIGHTS`, `src/core/scoring.ts` — level with Gv). New-format authoring contracts: docs/ITEM_SCHEMA.md.

### 8.2 Honest spans for the new banks

Same contract as every other bank (§1.1): a bank claims only the ceiling its FORMAT can deliver. Each span below becomes the bank's `HONEST_SPANS` entry in `test/bank-validation.test.ts` when the bank lands.

| subtest | authored span | primary difficulty driver |
|---|---|---|
| arithmetic | −2.5..+2.6 | story-problem steps, fraction/percent/rate layering, multi-step compound items |
| symbolSearch | −2.0..+1.2 | search-row length, near-miss confusability — scanning speed caps low by format |
| charPairing — retired 2026-08-21; superseded by `symbolSelection` (−2.0..+1.0: choice-reaction over a glyph queue, pressed-key string, c = 0) | −1.5..+1.0 | row length, key-confusable glyph pairs; typed output, c = 0 |
| blockCounting | −1.8..+1.9 (floor deepened to −2.8 by §9) | hidden-cube count, footprint size |
| visualPuzzles | −1.5..+2.2 | silhouette size, confusable non-tiling piece triples |
| artificialLanguage | −2.0..+2.4 | lexicon size, grammar-rule depth |
| definitions | −1.44..+2.28 | corpus-derived (b = 4 − zipf of the key word), not authored ranks |

### 8.3 Standing caveat

Every parameter in the new banks is an **authored estimate pending response data** — the identical epistemic status the header caveat and §7.4 attach to the pre-existing banks. No §8.2 span is calibrated. Collect response data via the JSON exports (`exportSession`, `bankVersion` stamped on every record) before promoting any of these numbers to calibrated status. The Gs banks carry extra risk: authored b cannot anticipate how per-item timing interacts with difficulty once real administration timings exist.

### 8.4 Machine verification, per bank

The answer-key rule (a key that cannot be re-derived by machine does not ship) applies to every new bank; each ships a test re-deriving every key:

- **arithmetic**: keys computed from the stated quantities by exact arithmetic, twice independently.
- **symbolSearch**: keys re-derived from targets/search set membership.
- **charPairing** (retired 2026-08-21): digit strings re-derived from the persistent key + sequence. Successor contract — **symbolSelection**: keys re-derived from the legend + queue as the exact pressed-key string (`test/symqueue.test.ts`).
- **blockCounting**: totals re-computed from the height maps; the hidden-cube visibility model (hidden iff not top of column AND +x neighbour taller AND +y neighbour taller) asserted per cube.
- **visualPuzzles**: tiling verified by set algebra — the key triple's union equals the target exactly, and every other 3-subset of the six pieces fails to tile it.
- **artificialLanguage**: independent translators — two implementations of the glossary + grammar — agree on every key.
- **definitions**: every b re-derived from the stored lexicon zipfs.

### 8.5 Design decision: visual puzzles are translation-only

Pieces appear in TARGET orientation and are translated, never rotated or mirrored — stated explicitly in the instructions. This is a deliberate scope choice, not an oversight: rotation-free assembly lets pieces render unambiguously in target orientation, keeps the uniqueness proof pure set algebra (no orbit enumeration over rotations), and keeps the format distinct from mental rotation. The cost is some Gv ceiling; rotated variants are the identified extension lever if the bank under-delivers at the top.

### 8.6 Post-authoring adversarial verification (2026-08-20, same day)

An independent verifier re-derived every key of the seven new banks from item
data alone (hand-re-solved arithmetic; re-parsed the artlang grammars from
prompt text; exhaustively enumerated puzzle tilings and block visibility;
ray-sampled the isometric renderer's occlusion). Findings and dispositions:

- **BLOCKER, fixed**: vpz-001/vpz-002 each admitted three translation-valid
  tilings (the bank test had verified the 20 triples only at authored
  positions — translation-blind). Both items re-authored so the keyed triple
  is the unique tiling under ALL in-grid translations (enforced by a new
  exhaustive enumeration test in test/vpuzzle.test.ts); §8.4's "set algebra"
  claim is thereby upgraded to translation-aware uniqueness.
- **MAJOR, fixed**: symbolSearch keys alternated Yes/No with item parity and
  blockCounting keys cycled option positions 3,1,4,0,2 with bank order —
  both guessable from difficulty position. Fixed by a fixed presentation
  permutation (ssr) and fixed per-item option rotations (blc), each pinned by
  new anti-pattern regressions in the banks' tests.
- **MINOR, fixed**: isCorrect now rejects negated typed answers for
  unsigned keys (normalise strips "-" by design for span responses); docs
  corrected (blockCounting is MC c=1/5; definitions span −1.44..+2.28).
- **Noted, no action**: artlang Language A relies on structural SOV
  disambiguation (no overt case) — verified all 18 keys remain the unique
  defensible options; four definitions distractors are defensible-inferior
  near-mits (serious/kind/cynical/new) — intentional format difficulty.

Full-battery browser walk (18 sections as of that date — 21 since the
2026-08-21 redesign wave; wrong-answer run): all new renderers
mount, the matching page records per-definition responses, multi-select
puzzle submission works, results composite includes Gs.

---

## §9 2026-08-21 scale-floor revision (random responding → IQ ~50)

### 9.1 The defect

User-reported and reproduced by seeded full-battery simulation through the real
session state machine: a completely random examinee averaged **IQ 72.5**
(θ ≈ −1.83, 30 seeds, range 70–75). Worse, a genuine θ = −2 examinee averaged
**IQ 84.6** — the entire bottom third of the scale was compressed upward by
8–15 points. Three compounding causes:

1. **Unit-prior shrinkage in reporting.** Reported subtest estimates used EAP
   with an N(0,1) prior. A chance-level pattern's likelihood supports
   θ ≈ −3.3 and below, but with the short runs that discontinue produces the
   prior outweighed the evidence and dragged estimates up to ≈ −1.8.
2. **Starved descent.** The ceiling-discontinue rule (`ceilingMisses`
   consecutive misses) fired long before routing walked down to items near the
   bank floor. The discriminating evidence — failing even the easiest items —
   was never collected; estimates rested on failures of mid-band items.
3. **Shallow bank floors.** Several banks bottomed out at b −1.4..−1.8
   (definitions −1.44, visualPuzzles/charPairing −1.5, paperFolding −1.6,
   mentalRotation/blockCounting/pairedAssociates −1.7/−1.8), leaving no items
   with which to locate performance below IQ ~70.

### 9.2 Fixes applied

**Engine** (`src/core/irt.ts`, `src/core/routing.ts`, `src/core/scoring.ts`):

- **Wide reporting prior.** `estimateAbility` takes `{ priorSd }`; routing
  keeps the population-scale N(0,1) prior (shrinkage is stabilising there),
  while `scoreSubtest` reports with `REPORT_PRIOR_SD = 2`. The prior stays
  centered at 0, so mid-range anchoring is intact; quadrature extended to
  [−7, +7] so deep posteriors are not truncated.
- **Floor-gated ceiling rule.** `nextItem` stops on a miss streak only when
  `state.theta <= poolFloor + FLOOR_BAND` (0.75). Above the floor band, a
  streak means "keep descending" — reversal-style testing as in SB5/WAIS.
  maxItems still bounds every run.

**Banks** (+11 items, 358 → 369 — superseded later the same day by the
2026-08-21 redesign wave (438 items; NEWER rows in ITEM_SCHEMA's inventory);
every key machine-re-derived by the banks' existing test contracts):

| bank | new basals | floor |
|---|---|---|
| mentalRotation | mr-015..017 (90° disparities, L/T/Z family) | −1.8 → −3.2 |
| paperFolding | pf-015/016 (single-fold corner punches) | −1.6 → −2.9 |
| numberSeries | nsr-017/018 (+2 step, counting) | −2.8 → −3.5 |
| quantComparison | qcp-019/020 (single-operation comparisons) | −2.2 → −2.8 |
| blockCounting | blc-016/017 (flat height-1 slabs) | −1.8 → −2.8 |

Deliberately NOT deepened: definitions (would break the frozen 1926-format
33/66 page for ~1–2 composite points; broad-level pooling already dilutes its
drag), visualPuzzles (c = 1/20 already lands guessers at θ̂ ≈ −3.1),
charPairing / pairedAssociates / span banks (c = 0 recall formats already
report ≤ −3.2 for chance-level data).

**Validity screening** (`src/core/validity.ts`) — honest scoring weakens lz:
once a guesser's estimate sits where their pattern is consistent, person-fit z
loses power exactly when it used to "detect" them. Added:

- **Difficulty-gradient signal (theta-free).** Point-biserial r(item b,
  correctness): strongly negative for every engaged examinee at any ability
  level (measured −0.13 to −0.45), ≈ 0 for guessing (−0.05 to −0.09).
  Flat gradient + fit z ≤ −1.5 → invalid; flat alone → questionable.
- **Per-subtest person fit.** lz now evaluates each subtest's responses
  against that subtest's own reporting-grade estimate instead of the pooled
  composite — removes tail bias that flagged genuine θ = +2 examinees.
- **Straight-lining restricted to ≥3-option items.** Binary (Yes/No) formats
  produce long honest same-answer runs, and adaptive order reorders keys into
  streaks; position concentration there is uninformative.
- `QUESTIONABLE_FIT_Z` relaxed −2.0 → −2.5: authored b-prices amplify misfit
  at the floor for genuinely low examinees.
- `screenSession(subtests, responses)` no longer takes the composite theta
  (per-subtest estimates are computed internally).

### 9.3 Post-fix measurements (seeded simulation, engaged pace)

| true θ | mean reported IQ (n=12–40 seeds) | validity verdict |
|---|---|---|
| random | **52.4** (49–56) | 39/40 invalid, 1 questionable |
| −2.5 | 66.3 | valid |
| −2 | 70.6 | valid |
| −1 | 84.2 | valid |
| 0 | 98.2 | valid |
| +1 | 111.5 | valid |
| +2 | 125.9 | valid |

Position-0 spammer: IQ 51, invalid (rapid + straight-line + gradient).
Consistent θ=0 run: IQ 103. Wall-clock budget simulations still pass at every
ability level (the descent adds items only where examinees answer quickly).

Residual honesty notes: θ = −2.5 compresses to ~66 (banks cannot fully
separate −2.5 from −3+ once c lifts MC floors); θ = +2 compresses to ~126
(honest ceilings per §7.4). Both are stated scale limits, not defects;
per the user's direction, no effort is spent extending measurement above
IQ 145 — norming data must come first.

Regression pinning all of this: `test/random-floor.test.ts`.

---

## §10 2026-08-21 audit wave (exploit regeneration + collection hardening)

A second audit pass (docs-vs-code reality sweep, per-bank red-teaming, engine
and worker review) landed same-day fixes after §9. Bank shape is unchanged —
21 subtests / 438 items / Σ budget 260 min; per-subtest item counts and every
authored a/b/c are untouched; each change below is pinned by a new or extended
regression test. The `bankVersion` hash necessarily rotated (§10.2), so any
export or norm table predating this section is correctly rejected as
wrong-bank.

### 10.1 Bank regenerations (display/distractor layer; examinee-visible correct answers preserved)

- **analyticalReasoning (anl)** — key positions de-cycled (no answer slot
  holds more than 3 of 12 keys; longest same-slot run 1). The
  intro/alphabetical-order tell killed: in the four complete-order items
  whose intro order WAS the consistent key (anl-001/004/008 + practice),
  that order is now offered as a genuinely-violating distractor and the key
  moved to a different consistent order. The restated-bullet tell killed:
  must-be items re-keyed from stated conditions to DERIVED claims
  (anl-003/006/009/011 + practice; no claim item offers a verbatim
  restatement of a given). Zero-deduction strategies now score 0 on both
  tell classes. The false closed-form b-provenance claim retired; per-item
  authored rationales documented instead (b values unchanged).
- **numberSeries (nsr)** — distractor value sets re-authored on 10 of 18
  items + both practice items so the key's value-rank spreads across all
  five ranks (4/4/3/3/4); "always pick the modal rank" drops from 8/18 to
  4/18. Keys, difference chains, prompts, and positions unchanged.
- **quantComparison (qcp)** — qcp-002 and qcp-010 converted to genuinely
  underdetermined (D-keyed) items with no visible variable, so "no visible
  variable ⇒ eliminate D" fails on concrete-looking items. A/B/C/D answer
  histogram now 5/5/6/4.
- **blockCounting (blc)** — distractor families re-authored per item. The
  old fixed family (total±1 / visible / total+2) made the key the median
  option value in 17/17 items ("pick the middle number" scored 100% at
  chance 20%). Value-rank histogram now {2nd-smallest 6, median 5,
  2nd-largest 6}; the visible count is still offered on every burying
  pile (the "forgot the hidden blocks" attractor survives); authored
  answer positions re-spread (max 4/17 per slot).
- **paperFolding (pf)** — options rotated by a non-cyclic per-item
  schedule; key positions max 4/16 per slot, lag-1..6 positional
  autocorrelation at or below the 1/5 chance rate, no exact period ≤ 7.
  Every keyed option string is unchanged; only its index moved.
- **visualPuzzles (vpz)** — the subset-sum tell killed: the distractor in
  the three size-decidable items (vpz-001/002 + practice) was resized so
  every scored AND practice item has ≥2 size-feasible triples — counting
  cells never decides an item; tiling uniqueness is geometric (exhaustive
  translation enumeration). prac-vpz-02 re-authored: the old demo had
  four defensible triples, three identically-rendering piece pairs, and
  disconnected/1-cell pieces.
- **symbolSearch (ssr)** — embedded-target slot balanced 7/8 across the 15
  Yes items (was 13/2): each single-slot scan strategy now scores 22–23/30,
  the format-inherent floor (15 free No-item hits + ceil(15/2)); the
  13-vs-2 learnable pattern (binomial p = 0.0037) is gone.
- **matrixReasoning (mx)** — mx-001 re-authored: its cell grid was
  render-identical to practice item prac-mx-01, so the bank's floor item
  (b = −2.6) measured practice exposure. Same rule class, same b/a/c,
  fresh rows and key (regression forbids any scored item sharing a grid
  with a practice item). prac-mx-02's demo rows re-authored — three cells
  rendered identically and the square row's 0°≡90°, making the taught
  rotation rule invisible.

### 10.2 Engine, collection, and validity

- **`bankVersion` now covers prompt/render/timeLimitSec/budgetMin**
  (`src/core/telemetry.ts`): previously a prompt edit, render-payload
  change, per-item time cap, or budget change could leave the hash
  identical while the examinee's experience changed. The canonical string
  now hashes every item's prompt, serialized render payload, and
  timeLimitSec plus each subtest's budgetMin (perturbation-pinned by
  `test/bank-version.test.ts`). Unscored material (practice,
  matchingPractice) stays excluded by design; the form-variant stamping
  mechanism is unchanged.
- **Validity screening** (`src/core/validity.ts`): straight-lining runs
  now reset at subtest boundaries — the same raw-answer index in two
  subtests is a numbering coincidence, not a repeated selection, and
  cross-subtest accumulation had been flagging honest high-ability
  examinees. New interruption-concentration screen: a subtest in which
  more than 30% of responses (minimum 5) are `interrupted` flags
  questionable — the concentrated tab-hide pattern — exported as
  `maxInterruptedSubtestShare`. Thresholds otherwise unchanged.
- **Session/administration** (`src/core/session.ts`, `src/App.tsx`):
  multi-select answers map display indices back to original option indices
  before grading (exactly-correct Visual Puzzles picks were graded wrong
  under non-order-preserving permutations); calibration-form saves restore
  under the form-aware bank hash (previously rejected as stale-bank);
  battery expiry records in-flight work — the on-screen item as an
  omission, an open matching page as timed-out blanks — instead of
  discarding it.
- **Worker** (`worker/`): wrangler entrypoint corrected to `index.js`; the
  validator now enforces hard size caps (strings ≤ 2048, arrays ≤ 512,
  id-like fields ≤ 64, rawAnswer ≤ 64, nesting depth ≤ 32, responses
  ≤ 2000, raw body ≤ 2 MiB); rate limiting delegates to the tested
  `checkRate` with write-first KV accounting; the stored KV record is the
  validated document itself plus `receivedAt`, so worker-collected
  sessions load in the norming pipeline instead of being skipped as
  wrong-format.
- **Norming pipeline** (`tools/norming.ts`): `--form calibration` selects
  the calibration bank hash for filtering and table stamping (unknown
  values throw loudly); censored responses (`omitted`/`interrupted`) are
  excluded from item statistics (p, rest-r, latency, timeout rate),
  mirroring the estimation policy.

### 10.3 Standing caveat

Nothing in this section calibrates anything. Every a/b/c remains an authored
prior, every span remains un-normed, and the provisional caveat stands
everywhere scores appear. The regenerations remove measured
non-substantive strategies — pre-fix, "pick the median value" scored 17/17
on blockCounting, "pick the intro order" 4/5 on analytical, "pick the modal
rank" 8/18 on number series, and a single-slot scan 28/30 on symbol search;
post-fix each sits at or near its format's chance floor, and the new
regression guards bound any residual concentration (quant comparison's C
remains modal by one item, 6/20 vs 5/20 — documented, guarded, accepted).
None of this validates the difficulty scale.

## §11 2026-08-22 Symbol Search replacement (binary Yes/No → locate-and-click Symbol Scan)

### 11.1 Why the binary format was retired

The §10 regeneration had already pinned the single-slot scan exploit at its
format-inherent floor (22–23/30), but the deeper defect was structural: a
two-option decision cannot separate scanning speed from gambling tolerance.

- **The guessing asymptote was the design.** c = 0.5 encoded that a coin
  flip succeeds half the time, so "answer everything instantly" had near-zero
  expected cost; the measure partly reflected gamble tolerance, not PSI.
- **The response never located anything.** "Is either target present?" can
  be answered from a fuzzy gestalt of the row without ever finding a glyph —
  the motor confirmation that makes cancellation tasks measure perceptual
  speed was missing.

### 11.2 The replacement

`symbolSearch` is now **Symbol Scan** (ssr-001..048, render kind `symscan`):
two target glyphs above one row of 5–8 nonsense glyphs; the examinee presses
THE row cell that matches either target, or the NO-symbol control when
neither appears. The key is the matched cell's row index (row.length = NO
sentinel; timeout submits −1, which can never equal a key).

- **Administration is clock-bound:** budgetMin 2 (the section clock IS the
  120-second block, cancellation-task style), per-trial caps of row+3
  seconds convert stalls into scored timeouts, and minItems = maxItems = 40
  disables every adaptive stop before the clock — a precision stop would
  censor exactly the fastest examinees, the worst outcome for a speed test.
- **Guess penalty (Subtest.guessPenalty, both Gs subtests):** c = 0 (errors
  are evidence, not noise), wrong clicks flash and burn ~0.5 s, instructions
  state the subtraction plainly, and the results dashboard reports the raw
  tally net of penalised errors. Blind clicking succeeds ~1/(row+1) while
  every error subtracts — expected value is negative by construction.
- **Difficulty architecture** keeps the tiered near-miss engineering
  (E/M/H by row length × salience), b span −2.0..+1.2, a hand-decoupled
  (|corr(a,b)| < 0.9 guard retained), plus new guards: no duplicate glyphs
  in a row (two valid targets would corrupt the key), slot balance, index
  spread, and a modal-answer ceiling against fixed-position spam.
- **Validity screening** now counts Symbol Scan trials as row+1-choice items
  in the straight-lining signal (a fixed-cell spammer runs constant indices).

### 11.3 Standing caveat

All ssr a/b values remain authored estimates; the format change resets the
bank's calibration status exactly as any new bank would. The retired
binary bank's responses are not comparable to Symbol Scan responses (new
bankVersion hash), so mixed-form norming data must be filtered by hash as
the pipeline already requires.
