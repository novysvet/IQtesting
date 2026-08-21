# CHC Cognitive Battery (IQtesting)

A browser-administered adaptive cognitive battery built around the
Cattell–Horn–Carroll model: 18 subtests sampling seven broad abilities
(Gf, Gc, Gv, Gwm, Gq, Gs, Glr) over a 369-item pool, scored with 3PL IRT,
EAP estimation, and maximum-information routing.

## Contents

- [Running](#running)
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

## Administration modes

- **Adaptive** (default): per-subtest CAT with floor-gated discontinue and
  precision stops.
- **Calibration form** (`?form=calibration`): deterministic fixed linear
  forms — difficulty-stratified item samples served easiest-first, stop rules
  disabled. Every calibration examinee sees identical forms, which is what
  IRT calibration and DIF analysis require. The bank hash is stamped with the
  form variant (`calibration-v1`), so data from the two modes never mixes.

## Data collection (norming pipeline)

1. **Consent + demographics** gate every fresh session (age ≥ 18 required;
   only the age band is mandatory). Records travel inside the export.
2. **Submission**: the results screen POSTs the export to the collection
   worker when `VITE_SUBMIT_URL` is configured at build time; the manual JSON
   download remains as fallback.
3. **Worker** (`worker/`): Cloudflare Worker validating every submission
   (`worker/validator.js`, re-checked offline), rate-limiting per IP, and
   rejecting duplicate session ids. Deploy with `wrangler` — see
   `worker/wrangler.toml`.
4. **Pipeline**:
   ```
   node --experimental-strip-types tools/norming.ts data/exports --out data/norms.json
   ```
   re-screens validity independently, computes item statistics, and distills
   a `NormTable`. When `norms.json` (N ≥ 100, matching bank+form hash) ships
   at the deploy root, the results screen automatically switches percentiles
   from the assumed N(0,1) model to the sample's empirical distribution.

## Censoring policy

Responses that carry no ability evidence are flagged, not discarded:
`omitted` (section expired with the item on screen) and `interrupted`
(tab hidden during memory exposure) stay in the export but are excluded from
estimation, person fit, and the discontinue streak. Latencies carry `awayMs`
so validity screening judges active time, not wall-clock time.

## Documentation

- `docs/DIFFICULTY_AUDIT.md` — the full audit history: per-item findings,
  fixes applied, honest spans, scale-floor revision (§9).
- `docs/ITEM_SCHEMA.md` — the item authoring contract and format conventions.
- `docs/NORMING.md` — the operating procedure for replacing authored priors
  with collected data.

## Testing

220 tests pin the engine: key re-derivation for every bank (fold simulation,
matrix rules, series rules, rotation structure, tiling uniqueness, artlang
grammars), scale-floor behaviour under random responding, routing stop rules,
fixed-form administration, option-permutation balance, practice contracts,
export enrichment, persistence, norms gating, and the endpoint validator.

## License

Licensed under the Apache License, Version 2.0. See `LICENSE.txt` for the
full text.

## Disclaimer

This is a pre-norming research instrument. Every item parameter is an
authored estimate, not a value fitted to response data. Scores are internally
ordered but their absolute IQ-equivalent level is provisional until the
norming study completes. The results screen says exactly this; do not use any
number it shows for diagnosis, placement, or high-stakes decisions.
