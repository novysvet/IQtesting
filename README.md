# CHC Cognitive Battery (IQtesting)

A browser-administered adaptive cognitive battery built around the
Cattell–Horn–Carroll model: 21 subtests sampling seven broad abilities
(Gf, Gc, Gv, Gwm, Gq, Gs, Glr) over a 438-item pool (inventory in
`src/battery.ts`), scored with 3PL IRT, EAP estimation, and
maximum-information routing.

## Contents

- [Running](#running)
- [Multi-sitting administration](#multi-sitting-administration)
- [Administration modes](#administration-modes)
- [Data collection](#data-collection-norming-pipeline)
- [Censoring policy](#censoring-policy)
- [Documentation](#documentation)
- [Testing](#testing)
- [License](#license)
- [Disclaimer](#disclaimer)

## Running

```
pnpm install
pnpm dev          # vite dev server on :5190
pnpm test         # node --test over test/*.test.ts
pnpm typecheck    # tsc -b --noEmit
pnpm build        # production bundle in dist/ (Pages base /IQtesting/)
```

## Multi-sitting administration

The battery is built to be taken test by test. The battery budget
(`BATTERY_BUDGET_MIN` in `src/core/session.ts`, the sum of the per-subtest
budgets in `src/battery.ts` — 260 minutes at authoring) is
ACTIVE scored time only: it accrues while a section is open and freezes
during instructions, practice samples, checkpoints, and any pause between
sittings. Every completed section lands on a **checkpoint** showing that
section's IQ, the standings for every finished section, and the provisional
FSIQ — with the choice to continue or save and finish later. Returning in
the same browser resumes at the next section, however much later.

Stopping is only supported at checkpoints. Abandoning mid-section voids that
one section (the in-flight item is censored as omitted); the rest of the
battery keeps its full remaining budget.

## Administration modes

- **Adaptive** (default): per-subtest CAT with floor-gated discontinue and
  precision stops.
- **Calibration form** (`?form=calibration`): deterministic fixed linear
  forms — difficulty-stratified item samples served easiest-first, stop rules
  disabled. Every calibration examinee sees identical forms, which is what
  IRT calibration and DIF analysis require. The bank hash is stamped with the
  form variant (`calibration-v1`), so data from the two modes never mixes.

## Data collection (norming pipeline)

1. **Consent + demographics** gate every fresh session (age ≥ 13 required;
   13–17-year-olds confirm guardian permission — the record is fully
   anonymous, so no parental-consent data flow exists; only the age band is
   mandatory). Records travel inside the export.
2. **Submission**: the results screen POSTs the export to the collection
   worker when `VITE_SUBMIT_URL` is configured at build time; the manual JSON
   download remains as fallback.
3. **Worker** (`worker/`): Cloudflare Worker validating every submission
   (`worker/validator.js` — structural validation with size caps: strings,
   arrays, ids, raw answers, nesting depth, and total body size are all
   bounded), rate-limiting per IP, and rejecting duplicate session ids.
   Worker validation is the only full validation gate; the norming pipeline
   later re-screens validity independently (see NORMING.md §4). Deployed at
   `https://iqtesting-collect.novysvet.workers.dev` (KV namespaces `SESSIONS`
   and `RATE`); pushes to `main` under `worker/` redeploy automatically via
   `.github/workflows/worker-deploy.yml` (requires the `CLOUDFLARE_API_TOKEN`
   repo secret). Manual deploys: `npx wrangler deploy` in `worker/` — see
   `worker/wrangler.toml` (entry `index.js`).
4. **Pipeline**:
   ```
   node --experimental-strip-types tools/norming.ts data/exports --out data/norms.json
   ```
   re-screens validity independently, computes item statistics, and distills
   a `NormTable`. Pass `--form calibration` when the exports were collected
   under the calibration form (the bank hash is form-stamped, so adaptive
   and calibration data never mix). When `norms.json` (N ≥ 100, matching
   bank+form hash) ships at the deploy root, the results screen
   automatically switches percentiles from the assumed N(0,1) model to the
   sample's empirical distribution.

## Censoring policy

Responses that carry no ability evidence are flagged, not discarded:
`omitted` (section expired with the item on screen) and `interrupted`
(tab hidden during memory exposure) stay in the export but are excluded from
ability estimation and person fit. Of the two, only `interrupted` is also
held out of the discontinue miss-streak (`src/core/routing.ts`) — an
omitted response technically counts as a miss, but omissions are only ever
recorded when a section (or the battery) closes, at which point no further
items are routed, so the streak is never actually consumed by one.
Concentrated interruption (over 30% of a subtest's responses) is itself
flagged by validity screening. Latencies carry `awayMs` so validity
screening judges active time, not wall-clock time.

## Documentation

- `docs/DIFFICULTY_AUDIT.md` — the full audit history: per-item findings,
  fixes applied, honest spans, scale-floor revision (§9).
- `docs/ITEM_SCHEMA.md` — the item authoring contract and format conventions.
- `docs/NORMING.md` — the operating procedure for replacing authored priors
  with collected data.

## Testing

288 tests pin the engine: key re-derivation for every bank (fold simulation,
matrix rules, series rules, rotation structure, tiling uniqueness, artlang
grammars, logic-game solution spaces, corpus-calibrated zipfs), scale-floor
behaviour under random responding, routing stop rules, fixed-form
administration, option-permutation balance, key-position de-cycling and
exploit-resistance regressions, practice contracts, multi-sitting clock
semantics, export enrichment, the bank-version content hash, validity
screening, persistence, norms gating, and the endpoint validator.

## License

Licensed under the Apache License, Version 2.0. See `LICENSE.txt` for the
full text.

## Disclaimer

This is a pre-norming research instrument. Every item parameter is an
authored estimate, not a value fitted to response data. Scores are internally
ordered but their absolute IQ-equivalent level is provisional until the
norming study completes. The results screen says exactly this; do not use any
number it shows for diagnosis, placement, or high-stakes decisions.
