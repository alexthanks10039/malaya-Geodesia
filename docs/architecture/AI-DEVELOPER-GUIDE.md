# AI Developer Guide

This file is the operating procedure for GPT, Claude, Copilot and other AI coding agents working on **Малая геодезия**.

## 1. Read before coding

Always start with:

1. `docs/architecture/project-map.json`
2. `docs/architecture/current-state.md`
3. `docs/architecture/decisions.md`
4. `AGENTS.md`
5. the specific module files involved in the requested change

Do not treat older prose documentation as higher authority than actual code.

## 2. Resolve the task to a module

Before editing, identify:

- route/page;
- UI component;
- domain/service module;
- database model/migration;
- external integration;
- tests;
- deployment workflow.

Then trace both directions:

`changed module -> dependencies`

and

`changed module -> consumers`.

If a dependency is unclear, inspect imports and call sites instead of guessing.

## 3. Check the architecture boundary

Keep these boundaries intact:

- `app/` = route/HTTP/page entry points;
- `components/` = React presentation/application UI;
- `lib/` = server/domain/infrastructure services;
- `studio/` = Studio runtime/config/types;
- `db/migrations/` = persisted schema;
- `scripts/` = operational automation;
- `_module-bank/` = inactive archived modules.

For calculators specifically:

`UI -> input state -> domain engine -> formula/config -> result`

Do not move pricing logic into React components or API route handlers.

## 4. Before modification

1. Read the Architecture Map.
2. Inspect the exact current implementation.
3. Identify affected consumers.
4. Check whether a module already solves the problem.
5. Check for an existing test/smoke harness.
6. Create a checkpoint/known-good reference before risky changes.
7. Define the smallest safe change.

Do not create a parallel subsystem when an existing subsystem can be extended safely.

## 5. Calculator rules

The current public calculator is a preliminary estimator. Do not present its prices as verified market prices.

Calculator Lab is the preferred isolated path for new technical calculators.

The target architecture is:

`Calculator UI`
`-> Calculator state`
`-> Calculation Core`
`-> Formula Engine`
`-> Parameters / Coefficients / Rates`
`-> Pricing / Cost`
`-> Unit Economics`
`-> versioned result`

The target entities such as `Parameter`, `Rate`, `Coefficient`, `Formula`, `Scenario`, `CalculationVersion` and `UnitEconomicsModel` are not all implemented yet. Do not pretend they exist.

Public and internal calculation modes must remain separate conceptually:

- **Public:** preliminary estimate, only client-safe information.
- **Internal:** detailed cost, margin and operational parameters subject to permissions.

The final calculation engine must be deterministic. AI may collect/normalize inputs but must not be the source of truth for arithmetic.

## 6. CMS and Studio rules

CMS persistence is PostgreSQL + SQL migrations. Do not introduce Prisma or another active persistence layer without an explicit reconciliation decision.

Studio remains split into:

- `app/studio` — routes;
- `components/studio` — UI;
- `studio` — runtime/config/types.

Do not silently restore the archived password module.

For CMS changes preserve:

- draft vs published data;
- version history;
- rollback semantics;
- audit log;
- content type constraints;
- file metadata relationships.

## 7. Database changes

A schema change requires:

1. migration file;
2. compatibility review;
3. affected `lib/` service review;
4. smoke/integration verification;
5. rollback consideration;
6. Architecture Map update when the model/boundary changes.

Never edit the production schema manually as a substitute for a migration.

## 8. Testing after code changes

Minimum verification for application code:

```text
npm run lint
npm run build
```

For relevant modules also run:

```text
npm run test:cms
npm run test:calculator-lab
```

For UI changes, perform browser verification when tooling/environment permits. Check mobile and desktop for layout/navigation changes.

If a check fails, fix the reported root cause before unrelated refactoring.

## 9. Rollback

If a change creates a regression:

1. stop adding unrelated changes;
2. identify the last known-good checkpoint;
3. rollback the affected change;
4. rerun the failing check;
5. reproduce the original scenario;
6. make the smallest corrected change;
7. rerun regression checks.

Never hide a failing build by weakening TypeScript or deleting functionality unless explicitly requested.

## 10. Documentation synchronization

After successful architecture/code changes:

1. update `project-map.json` if module/dependency/state changed;
2. update `current-state.md` if status changed;
3. add/update an ADR when a lasting architectural decision was made;
4. update this guide only when the development procedure itself changes.

The map must never knowingly describe a future design as implemented.

## 11. Deployment discipline

Vercel deployment quota is limited.

Rules:

- Documentation-only changes: **do not deploy**.
- Pure tests/CI configuration: do not deploy unless runtime behavior is affected.
- Code/runtime changes: build and verify first; deploy only when required.
- Do not trigger multiple redundant Vercel deployments for the same logical change.
- Prefer one verified checkpoint over a sequence of speculative deployments.

## 12. Final change checklist

```text
READ ARCHITECTURE
    ↓
ANALYZE DEPENDENCIES
    ↓
PLAN SMALLEST SAFE CHANGE
    ↓
BACKUP / CHECKPOINT
    ↓
IMPLEMENT
    ↓
TARGETED TESTS
    ↓
TYPECHECK + BUILD
    ↓
BROWSER/UX VERIFICATION WHEN RELEVANT
    ↓
UPDATE ARCHITECTURE MAP
    ↓
CREATE CHECKPOINT
    ↓
DEPLOY ONLY IF RUNTIME CHANGE REQUIRES IT
```

## 13. Non-negotiable constraints

- Do not invent APIs, env vars, database fields or deployment state.
- Do not expose secrets in code or documentation.
- Do not delete existing functionality to make a build pass.
- Do not create duplicate data layers.
- Do not turn comments into a substitute for tests.
- Do not treat the Architecture Map as more authoritative than the actual code.
- Do not change business logic during a documentation-only audit.
