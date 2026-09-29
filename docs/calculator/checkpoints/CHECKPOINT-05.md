# CHECKPOINT-05

## Stage
05 — Formula / Parameter / Coefficient / Rate System

## Scope
- Hardened the configurable calculation namespace.
- Added explicit validation for cross-category key collisions.
- Added output validation.
- Extended smoke coverage for duplicate namespaces, duplicate rates and invalid outputs.
- Added Formula System architecture documentation.

## Changed
- `lib/calculation-engine/config.ts`
- `scripts/calculation-config-smoke.ts`
- `docs/calculator/formula-system.md`
- this checkpoint

## Architecture
`Parameters + Coefficients + Rates + Formulas -> resolved variables -> Calculation Engine`

## What works
- typed parameter definitions;
- numeric/select/boolean input normalization;
- coefficients;
- rates;
- configurable formulas;
- formula dependency resolution;
- cycle detection;
- safe allowlisted functions;
- deterministic calculation trace;
- namespace collision validation;
- output validation.

## Verification
Required CI checks:
- calculation config smoke;
- calculation engine smoke;
- Calculator Lab smoke;
- CMS smoke;
- TypeScript;
- production build.

Checkpoint is considered valid only when the CI status for this commit is successful.

## Rollback
Revert this checkpoint commit together with the immediately preceding Stage 05 implementation commits, or reset the working branch to the last known-good checkpoint before Stage 05.

## Next input
Stage 06 receives the validated Formula System and must add Unit Economics without duplicating formula execution.
