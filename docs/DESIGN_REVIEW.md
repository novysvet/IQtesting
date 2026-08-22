# Design Review — Every Subtest, Against "Optimal"

**Date:** 2026-08-22 · **Scope:** all 23 administered subtests plus the shared
engine they run on · **Method:** full-source read of every bank, its renderer,
its pinned test suite, and the routing/scoring/validity machinery; Gs audited
in depth in-house, the remaining domains by independent read-throughs. A
second same-day wave (§0 items 15–16) added the two literature-flagged
fluid/quantitative formats the review found missing: Figure Weights and Graph
Mapping.

**Ground rule used throughout:** "optimal" means *the format measures its
CHC target with minimal contamination, minimal exploit surface, and a bank
that can actually route and measure across the scale* — not merely "works."
Item parameters everywhere remain authored estimates; several verdicts below
would change after calibration, which is expected and is what norming is for.

---

## 0. Literature pass (2026-08-22, later the same day)

A deep research pass over the reference instruments named above (WAIS-IV/V,
Raven's SPM/APM, SB5, RAIT, WJ-IV COG, KABC-II/KAIT, pre-1994 GRE, 1926 SAT)
and the CAT/testlet psychometrics literature produced the changes below.
Every bank change keeps its machine-verified contract; the full suite is now
302 tests. Sources are named inline; the research memos live with the
session transcript.

**Engine (addresses Cross-cutting 1 and 2):**

1. **Randomesque exposure control** (Kingsbury & Zara 1989; k = 6 per Leroux
   & Dodd 2019, which found k = 6 cuts max exposure ~a third below k = 3 at
   statistically identical RMSE/bias). Selection now administers one of the
   six most-informative unused items, chosen by a PRNG seeded from
   (sessionId, subtest, step) — reproducible per session, different across
   examinees of equal ability. Simulation over 200 spread-ability sessions:
   the most-exposed item fell from **100% of examinees on every bank** to
   0.56–0.64 on the large text banks (analogies, sentence completion,
   antonyms); banks where maxItems approaches bank size stay high, which is
   mathematically irreducible (max exposure ≥ administered/bank) and is what
   bank growth is for. Tests, simulations, and calibration forms keep
   deterministic max-information selection.
2. **PSER no-gain stop** (Choi, Grady & Dodd 2010, predicted-standard-error
   reduction). After minItems, routing now stops when even the BEST unused
   item is expected to shrink the posterior variance by < 0.005 — the PSER
   threshold rescaled to this battery's authored item strengths (their 0.015
   assumed items with ~3× our peak information; unrescaled it would preempt
   the 0.50 precision target itself). This ends runs that have outgrown the
   bank floor/ceiling honestly instead of grinding to maxItems for
   thousandths of a logit, and keeps the reported SE honest about it.
   Terminal stop reason "no-gain" travels with the export for calibration.
3. **Content blocks** (Item.block). Artificial-language items now tag their
   grammar; once a language opens, routing stays inside it until exhausted,
   because learnability transfers across grammars mid-run (an IRT
   stationarity violation flagged in §Gc above).

**Banks:**

4. **Matrix +4 ceiling items** (mx-019..022, b 2.65–3.1) built on the
   Carpenter/Just/Shell rule taxonomy and the MaRs-IB distractor findings
   (rule count + element count + minimal-difference distractors explain
   ~52–70% of difficulty variance; MD distractors add ~1.1 logits): XOR∘rotation
   composition, triple distribution (union + D3 fill + D3 shape), second-order
   rotation progression (baiting the first-order rule as chief distractor),
   and a parity-branch over set operations. Bank ceiling ladder is now
   2.3 → 2.5 → 2.65 → 2.7 → 2.85 → 3.0 → 3.1.
5. **Figure Series +5 ceiling items** (fs-015..019, b 2.5–3.1), all
   conditional/interacting rules — one attribute's behavior depends on
   another's value — which attribute-scan coaching cannot decompose; chief
   distractors are the outputs of the simpler unconditional rules
   (alternative-rule distractors).
6. **Antonyms re-priced with the ETS pair-minimum index** (Enright & Bejar
   RR-89-35): b = 4 − min(zipf(stem), zipf(key)), key zipfs generated from
   the same wordfreq 'en' corpus as lexiconData and double-entered in the
   test. The old stem-only formula had misplaced every rare-key item
   (quiet→DEAFENING was b −0.65; now +1.02, exactly as the review predicted).
7. **Verbal Analogies ceiling extended** +1.5 → +2.8 with eight items whose
   difficulty drivers are the ETS/NITE ones — pair rarity, multi-element
   rationales, negation-flavored relations; the top band carries a = 1.5
   (information scales with a², the only ceiling lever when b is capped).
8. **Sentence Completion 20 → 32 items** (exposure 50% → 31% per sitting at
   maxItems 10), including four TWO-BLANK frames with semicolon-paired
   options — operationally harder per the ETS completion coding (both blanks
   must be satisfied; no partial credit).
9. **Paired Associates redesigned to two probes per list** (the review's
   "mild redesign", now matching the standard PAL architecture — CANTAB PAL
   probes every pair of a studied stage; WMS/BVMT-R test multiple pairs per
   list): each item studies one list then probes two cues in fixed order,
   answer comma-joined. b re-anchored +0.6 (between perfectly correlated
   failures and independent recalls). Study exposure pinned in
   memoryTiming.ts (1400 ms/pair, 6 s floor).
10. **Digit Span direction tags split**: forward items MS, backward items WM
    (Ramsay & Reynolds 1995: distinct constructs; WAIS-V reports them
    separately).
11. **Visual Puzzles c = 0.10** (from nominal 1/20): the effective-guessing
    floor this review estimated at .08–.15, now encoded with the machine
    contract allowing an authored effective floor above nominal.
12. **Artificial Language relabelled Gc/LD → Gf/I** and block-tagged:
    inferring a grammar from exemplars is the WJ-IV Analysis-Synthesis
    construct family (Gf induction), not LD — the lexicons are nonsense by
    construction, so nothing crystallized applies.
13. **Definitions SE inflated by the testlet design effect**
    (√(1+(m−1)·0.20), ρ = 0.20 per the empirical testlet-variance range;
    Kang et al. 2021 recommend exactly this over bundle-polytomous scoring,
    which converges poorly at m = 33): the page's per-item SEs no longer
    claim local-independence precision a single shared stimulus cannot
    deliver.
14. **Honor pledge** appended to the five search-vulnerable Gc instructions
    (dictionaries/translators/search engines prohibited): instructed honor
    commitments measurably reduce unauthorized help (Mukherjee 2023), and the
    formula-scoring literature's central finding is that instructions move
    behavior more than scoring rules do. This is the cheap half of
    Cross-cutting 3; secure administration and telemetry covariates remain
    open.

**Second wave (2026-08-22, later still) — the missing fluid/quantitative
formats, added as new subtests (items 15–16). Suite now 309 tests:**

15. **Figure Weights added** (20 items, fw-001..020, Gq/RQ with a Gf
    cross-loading; budget 15 min). The research pass found the battery's Gf
    domain sampled only rule induction plus deduction, while both current
    Wechsler editions anchor their Fluid Reasoning Index on Matrix Reasoning
    + Figure Weights — the one format simultaneously figural and
    quantitative, and among the highest g-loading WAIS-IV subtests (g ≈ .78;
    Weiss et al. 2013 five-factor CHC validation, where Arithmetic +
    Figure Weights form the RQ factor under Gf). Ours is the Wechsler
    balance-scale format: balanced demonstration scales state hidden
    equivalence relations among colored shapes; the examinee picks the group
    that fills the queried pan. Design choices against the literature's
    documented failure modes: **untimed** (the WISC-V times FW and the
    gifted-identification literature faults exactly that — Silverman &
    Gilman 2020), **color redundant with geometry** (fixed shape→color map;
    Pearson's own color-vision caveat designed out), **three-scale chains at
    the ceiling** (Wechsler FW tops out for high-ability examinees), and
    **exact-rational uniqueness verification** — test/weights.test.ts proves
    by Gaussian elimination over BigInt fractions that the demo scales
    determine every weight up to one global scale factor and that exactly
    one option balances under every consistent assignment (AIG precedent:
    Arendasy & Sommer's generated quantitative-reasoning items).
    Anti-exploit: option-value ranks spread (no "pick the middle"), key
    positions cycle-free, no duplicate-weight options.
16. **Graph Mapping added** (18 items, gm-001..018, Gf/I; budget 12 min).
    Jastrzębski, Ociepka & Chuderski 2022 (*Behavior Research Methods*,
    DOI 10.3758/s13428-022-01846-z) validated this computerized
    structure-mapping task at RAPM-equivalent validity (α = .86, test-retest
    .76, CFA Gf loading .75, correlations with RAPM/analogies/CFT-3 ≈ .60)
    with no response options to eliminate (the Arendasy & Sommer 2013
    critique of matrix formats cannot apply) and experimentally validated
    difficulty dials: edge count, direct-vs-indirect targets, crossed
    drawings — all three authored into the ladder (b −2.2 direct basals →
    +2.2 chorded/dense/crossed ceilings). Format: a colored model graph with
    two ringed nodes beside its rearranged numbered copy; the examinee types
    the two numbers occupying the ringed roles (constructed response, c = 0,
    chance ≈ 1/C(N,2)). The non-obvious shipping condition is
    **automorphism-rigidity**: test/graphmap.test.ts brute-force enumerates
    EVERY isomorphism (N! with edge pruning) and asserts the ringed pair
    maps to the same numbered pair under all of them — no defensible
    alternative answer exists (three hand-authored items died in that check
    during authoring; those graphs were redesigned). Reference node colors
    encode degree classes (machine-checked), so color is structure, not
    decoration. WM overlap is expected (Gf–WM r = .87 in the source); the
    battery's separate Gwm measurement is the control. The battery budget
    rose 259 → 286 minutes for both subtests; the wall-clock simulation
    still fits at every ability level.

**Residual risks after this pass** (honest): the Gs throughput inference and
General Information search-engine vulnerability are unchanged (§1.2, §3);
authored ceilings outside matrix/series/analogies remain thin (folding 1.4,
rotation 1.3–1.4, blocks 1.9); randomesque cannot fix banks where
administered ≈ bank size — those need content growth, not routing; Glr
remains a single-indicator factor (paired associates only) — the cheapest
second indicator is a delayed-recall probe.

---

## Verdict table (superseded verdicts in §0)

| Subtest | Broad | Verdict |
|---|---|---|
| Symbol Scan (redesigned 2026-08-22) | Gs | redesigned this pass — residual risks listed |
| Symbol Selection | Gs | sound; penalty now explicit |
| Matrix Reasoning | Gf | minor improvements possible |
| Figure Series | Gf | format sound; difficulty architecture needs work |
| Analytical Reasoning | Gf | minor improvements possible |
| Verbal Analogies | Gc | minor improvements possible |
| General Information | Gc | borderline redesign (cheating/culture) |
| Antonyms | Gc | minor improvements possible |
| Sentence Completion | Gc | minor improvements possible (bank too small) |
| Definitions (matching page) | Gc | minor improvements possible |
| Artificial Language | Gf | relabelled Gc→Gf this pass (§0.12); format otherwise sound |
| Paper Folding | Gv | minor improvements possible |
| Mental Rotation | Gv | minor improvements possible |
| Visual Puzzles | Gv | minor improvements possible (c mis-specified) |
| Block Counting | Gv | minor improvements possible |
| Digit Span | Gwm | minor improvements possible |
| Letter–Number Sequencing | Gwm | minor improvements possible |
| Paired Associates | Glr | closest to needing redesign in the battery |
| Number Series / Quant Comparison / Arithmetic | Gq | minor improvements possible |
| Figure Weights (added 2026-08-22 wave 2) | Gq/RQ | added this pass — see §0.15 |
| Graph Mapping (added 2026-08-22 wave 2) | Gf | added this pass — see §0.16 |

No subtest besides the two addressed this pass requires a wholesale rebuild;
the systemic weaknesses are shared, not local (see §Cross-cutting).

---

## 1. The Gs pair (deep-dive)

### 1.1 Why binary Symbol Search was structurally wrong

The retired ssr bank was well-engineered *as an item bank* — re-derived keys,
near-miss families blocking shape-only scans, slot balance against
single-target strategies, de-cycled answers — and it still failed as a PSI
instrument for two reasons that no amount of item craft could fix:

1. **The guessing asymptote was load-bearing.** c = 0.5 said a coin flip is
   half-right by design. "Answer everything instantly" had near-zero expected
   cost, so part of the measured variance was gamble tolerance, not scanning.
2. **The response never located anything.** "Is either target present?" can
   be answered from a fuzzy gestalt of the row without ever finding a glyph.
   Classic cancellation tasks measure speed *through* the motor confirmation
   of a found target; a Yes/No judgment skips that step entirely.

### 1.2 The replacement: Symbol Scan (`symscan`, ssr-001..048)

Format: two target glyphs on top; one row of 5–8 nonsense glyphs below; press
THE matching cell — or NO SYMBOL when neither target appears. Key = matched
row index; row.length = NO sentinel; timeout submits −1 (can never equal a
key). Administration: `budgetMin: 2` makes the section clock the block timer
(a true 120-second cancellation-style block); per-trial caps of row+3 seconds
convert stalls into scored timeouts instead of letting one trial eat the
block; and `minItems = maxItems = 40` disables every adaptive stop before the
clock — a precision stop would censor exactly the fastest examinees, which is
the worst possible outcome for a speed test.

Guess-penalty contract (now also formalised on Symbol Selection via
`Subtest.guessPenalty`): banks ship c = 0 so errors are evidence against
ability rather than discounted noise; wrong clicks flash and burn ~0.5 s;
instructions state the subtraction plainly; the results dashboard reports raw
tally net of penalised errors; validity screening counts trials as row+1-choice
items in the straight-lining signal. Blind clicking succeeds ≈1/(row+1) while
every error subtracts — expected value is negative by construction, and the
examinee is told so.

Residual risks (honest):

- **Throughput is still inferred, not observed.** Rate enters scoring through
  per-trial caps (slow examinees time out) and through CAT climbing to harder
  tiers, not through a responses-per-minute metric. A deliberately slow but
  accurate examinee measures lower than their pace warrants only if they
  actually hit caps; calibration should check whether cap-timeout rates
  discriminate speed cleanly or need a latency-informed b refit.
- **Pointer vs keyboard input adds motor variance** (device DIF); the export
  already carries device context so the DIF analysis can see it.
- **48 trials with minItems = maxItems = 40** exposes ~83% of the bank per
  sitting — fine for a homogeneous speed block, worth remembering for
  retest forms later.

### 1.3 Symbol Selection (unchanged format, penalty made explicit)

The choice-reaction queue remains one of the cleanest Gs formats in the
battery: nothing held in memory (no Gwm confound), any error voids the exact-
match key (c = 0 was always implicit), twins sit on opposite hands. What was
missing was disclosure: instructions never told the examinee that errors are
ruinous. They now do, the flag formalises it, and the live wrong-key flash
already provided the behavioural cost.

---

## 2. Gf

**Matrix Reasoning** — best-calibrated bank; keys rule-verified, render-equivalence
guarded. Issues: 16-of-18 items exposed per run with deterministic
max-information selection (mx-007 nearly always first); ceiling is one item
deep (only mx-017 genuinely sits above b 2.5, so SE ≈ 0.6 there and the .50
precision stop never fires); documented-but-live shortcuts remain on mx-011/
013/015/016/018; narrow coachable rule grammar; key slot 4 holds 5/18.
*Next moves:* more b > 2.5 content, exposure control, distractor rework on the
flagged items.

**Figure Series** — format sound, difficulty architecture needs redesign:
every item decomposes into independent per-attribute ladders, so attribute-
scan coaching solves the bank (fs-014 is the only second-order item), and the
b ≤ 2.3 ceiling carries ~0.33 information at its own b — it cannot measure
θ above ~1.5. Thirteen of fourteen items exposed per run compounds both.
*Next moves:* 5+ items at b ≥ 2.5 with interacting/conditional rules before
this measures high ability honestly.

**Analytical Reasoning** — the strongest validity engineering in the repo
(full permutation-space key verification, prose-locked constraint codes,
de-cycled keys, intro-order/restated-bullet exploit regressions). Thin
ceiling (only anl-011/012 above b 2.0); complete-form items are solvable by
constraint-checking rather than deduction; prose stems import reading load
into RG; authored b admits no generating formula, making calibration urgent.

## 3. Gc

**Verbal Analogies** — honest post-audit ceiling (+1.5) but no information
above θ ≈ +2; rank-interpolated b pretends adjacent ranks differ equally;
constant a; encyclopedia-flavored stems gate on vocabulary thresholds; all 36
stems verbatim-searchable. Untimed-at-home verbal MC is the weak flank of the
whole domain (see §Cross-cutting).

**General Information** — widest honest span (−2.6..+3.2) and real floor/ceiling,
but the worst search-engine vulnerability in the battery (nearly every stem is
a query) and an unmitigated Anglo-American canon while `nativeLanguage`/
`country` are collected but unused for DIF. Borderline redesign: parallel-culture
halves selected by demographics, or proctored/timed-only administration.

**Antonyms** — cleanest VL measure here; rarity-outlier exploit structurally
blocked. Difficulty priced purely on *stem* frequency misplaces items whose
keys are rare (ant-013 quiet→deafening plays far harder than b says); several
disputable keys invite complaint noise; stems recur across Gc subtests within
one sitting (cross-subtest leakage).

**Sentence Completion** — best distractor craft in the domain (frame-side
traps), machine-checked authoring contract — but 20 items for adaptive
routing means near-total exposure after a few sittings; expand 2–3× and add
paired-blank frames.

**Definitions (matching page)** — elimination structure justifies c = 0 and
kills blind guessing; position–difficulty decorrelation blocks easy-first
strategies. But inter-item dependence violates the local independence IRT
scoring assumes (per-item SEs are overstated — score the page as a bundle),
duplicate typed numbers are flagged but not blocked, alphabetical bank order
aids elimination, and paste-and-search resolves many dictionary-phrased defs.

**Artificial Language** — nearly cheat-proof by construction (nonsense
lexicons defeat search entirely; prompts provably self-contained). The core
problem is construct labelling: inferring a grammar from exemplars is Gf
induction × Glr, not LD; report mixed or move it. Learnability transfers
across languages mid-run, so stationary IRT misfits; fix item order
(language-blocked) or model drift.

## 4. Gv

**Paper Folding** — textbook Vz; simulation-derived keys; distractors match
hole count and symmetry class so count-elimination fails. Three-fold items
structurally cap the bank near b 1.5 (~IQ 120–125); directional fold
convention decoded from static arrows compresses badly on small screens.

**Mental Rotation** — the two-non-mirrored-candidates redesign forces figure
identity AND chirality checks; basals reach −3.2. Mirror detection by local
feature scan persists on L/F/P/E glyphs (angular disparity only partially
drives difficulty); six glyphs reuse heavily; 2D line figures cap at b 1.4.

**Visual Puzzles** — the strongest guarantees anywhere in the repo (unique
tiling even when pieces slide; ≥2 size-feasible triples so subset-sum never
decides). The honest psychometric doubt is c = 1/C(6,3) = 1/20: partial
knowledge (one or two glance-rejectable pieces among built-as-near-misses)
puts effective c plausibly at .08–.15, inflating low-theta scores until
calibrated. Large grids render tiny on phones.

**Block Counting** — median-value exploit fixed, visible-count attractor
mandated, grounded piles. But column-decoding legitimately converts counting
into small addition, importing number facility; hidden fraction saturates at
3 cubes so the b 1.9 ceiling discriminates thinly above +1σ.

## 5. Gwm / Glr / Gq

**Digit Span** — clean MS core, robust sign-integrity grading, interruption
censoring done right. Backward items import WM manipulation into an MS-tagged
subtest (split tags or estimate direction-specific theta); typing fluency is
an unmodelled motor confound on touch screens.

**Letter–Number Sequencing** — best-fit WM subtest; thin top bank (lengths
8–10 have one–two forms each), so maxItems 12 has little routing freedom near
the ceiling.

**Paired Associates** — weakest construct fit in the memory files: ONE probe
per studied list measures initial binding, not learning over study–test
trials (Glr-MA), and list length imports span demand. Lowest information-per-
minute in the battery. *Needs mild redesign:* probe 2–3 pairs per list, pin
ms/pair exposure inside `memoryTiming.ts`, control word frequency/concreteness.

**Gq trio** — keys executed from encoded rules (series ambiguity checks, BigInt-
exact comparisons, independently re-derived arithmetic tables) — excellent.
All three carry narrow="RQ" where KM/A3 is intended; home administration
cannot enforce no-calculator/no-paper (carried-state multi-step items reward
offloading); multi-sentence arithmetic stems add ESL-sensitive reading load;
canonical series families (squares, cubes, Mersennes) are coachable.

---

## Cross-cutting findings

1. **Tiny banks under near-exhaustive CAT.** Most banks expose 60–95% of
   items per sitting. Fine pre-norming; fatal for repeat sittings. Exposure
   control (randomesque selection, sykion-style exposure budgets) becomes
   mandatory the moment retests matter.
2. **Authored ceilings cluster at b ≈ 1.2–2.3** outside matrix/information.
   The battery measures the population well and the top ~5% thinly; several
   precision stops can therefore never fire where they were designed to.
3. **Unproctored web delivery defeats the verbal domain specifically.** A
   second tab (dictionary, LLM) clears Gc MC formats; artlang is the only
   near-immune subtest. Either treat Gc scores as unsupervised indicators in
   the norming data, add secure administration, or lean on the collected
   telemetry (awayMs, latency shapes) as covariates — today none of these is
   done by design.
4. **The engine itself is not the problem.** Floor-gated discontinue, wide
   reporting prior, dual-prior EAP, censoring policy, and the validity screen
   are unusually well-built; every defect found this pass lived in banks,
   formats, or disclosure — not in estimation or routing.
