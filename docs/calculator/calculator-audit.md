# Calculator Audit — CHECKPOINT-01

Repository: `alexthanks10039/malaya-Geodesia`
Branch: `feature/studio-v4`
Audited ref: `8645f16baae7f398c178f16ee918716317e8f5ce`
Scope: audit only; no business logic changed.

## Executive finding

There are currently two calculator subsystems and they are not yet one Calculation Core.

1. Public pricing calculator: `app/calculator/page.tsx` -> `components/calculator.tsx` -> `lib/calculator.ts` -> `lib/formula-engine.ts`. Configuration lives in `studio/config/calculator.ts` and is currently persisted in browser localStorage through `studio/runtime/storage.ts`.
2. Calculator Lab: `lib/calculators-lab/registry.ts` -> `engine.ts` -> `definitions.ts` -> `math.ts` / `parsers.ts`. It contains technical calculators and is covered by `scripts/calculator-lab-smoke.ts`.

The next architecture step must define one canonical Calculation Core and migrate both systems behind adapters. Do not merge them by copying implementation.

## Existing boundaries

- `app/`: Next.js App Router pages and API routes.
- `components/`: React UI.
- `components/studio/`: Studio UI and editors.
- `studio/`: Studio runtime, configuration and types.
- `lib/`: shared server/domain logic.
- `db/migrations/`: active PostgreSQL schema migrations.
- `lib/db.ts`: active PostgreSQL connection/transaction boundary.
- `lib/cms.ts`: active CMS persistence/application service.
- `prisma/schema.prisma`: compatibility/future reference, not active runtime persistence.
- `scripts/`: migrations, seed, preview and smoke checks.
- `_module-bank/`: archived inactive modules.

## Public pricing calculator

`components/calculator.tsx` owns the public four-step UX and local UI state: work type, area, conditions, urgency, output format, phone, submit/loading/error state.

`lib/calculator.ts` is currently a compatibility/migration facade. It builds variables from `CalculatorStudioConfig`, validates configured formulas and evaluates them through `lib/formula-engine.ts`. If diagnostics fail or evaluation throws, it falls back to `legacyEstimate()`.

Therefore the public calculator currently has two possible calculation paths:

```text
valid configured formulas -> Formula Engine
invalid/failed formulas  -> legacyEstimate()
```

This is a critical migration constraint: the next engine must reproduce current results before the fallback can be removed.

## Current configuration model

`studio/config/calculator.ts` defines `CalculatorStudioConfig` containing:
- types;
- outputs;
- urgencies;
- conditions;
- area presets;
- pricing;
- coefficients;
- formula definitions;
- selected price/day formula keys.

The current default configuration contains six work types and configurable pricing/factors. It is still TypeScript-defined.

`studio/runtime/storage.ts` stores calculator configuration under `malaya-studio-calculator` in browser localStorage. The public calculator reads it only while Studio mode is enabled in session storage.

Conclusion: calculator configuration is not currently a server-authoritative persisted business model.

## Formula Engine

`lib/formula-engine.ts` provides a safe deterministic expression evaluator:
- tokenizer;
- recursive-descent parser;
- variable resolution;
- formula dependencies;
- cycle detection;
- caching;
- allowlisted functions;
- validation.

It intentionally avoids `eval()` / `Function()`.

It is currently a formula evaluator, not yet a complete enterprise Calculation Engine. There is no persisted calculation model, parameter schema, rate model, scenario model, calculation snapshot or unit-economics model.

## Calculator Lab

Current files:

```text
lib/calculators-lab/
├── engine.ts
├── registry.ts
├── types.ts
├── definitions.ts
├── math.ts
└── parsers.ts
```

The Lab runtime is:

```text
calculator id
  ↓
registry
  ↓
engine
  ↓
definition.calculate()
  ↓
CalculatorResult
```

`CalculatorDefinition` contains executable TypeScript `calculate` functions. This makes the Lab reusable and testable, but not yet configuration-only. Changing its business logic still requires code.

Current smoke checks cover six calculators: `area-xy`, `inverse-geodesic`, `stakeout`, `slope`, `trench-volume`, `topo-cost`.

`cut-fill-grid` exists as a laboratory calculation and explicitly warns that production surface/grid handling is not implemented.

## Studio calculator editor

`components/studio/calculator-editor.tsx` already edits types, base prices, outputs, urgencies, conditions, area presets, pricing fields, coefficients and formulas, and runs a sample calculation.

However it persists through browser localStorage, not the active PostgreSQL CMS/backend. Versioning, publishing, rollback and durable audit for calculator models are therefore not implemented at the calculator-domain level.

## CMS relationship

Active CMS persistence is PostgreSQL through `lib/db.ts` and `lib/cms.ts`, with migrations for `cms_content`, `file_assets`, `cms_audit_log` and `cms_content_versions`.

The active calculator domain has no dedicated SQL tables in the current migrations. Do not hide the future calculator domain inside generic CMS JSON merely to avoid creating domain persistence.

## Lead conversion

`components/calculator.tsx` posts to `/api/leads`. `app/api/leads/route.ts` validates the request and sends Telegram notification through `lib/telegram.ts` when `TG_KEY` and `OWNER_ID` are configured.

The current route creates a transient `GEO-*` id and does not persist the lead into PostgreSQL. `prisma/schema.prisma` contains a `Lead` model, but Prisma is not the active runtime persistence layer. This is an architectural gap, not a stage-01 fix.

## Authentication

`lib/admin-auth.ts` currently returns successful authentication unconditionally. Password authentication is intentionally disabled; the previous password implementation is archived in `_module-bank/auth-password/`.

This is a development-state constraint. The future Calculator Studio must establish an explicit security boundary instead of inheriting the current open state.

## Verification and deployment

`package.json` provides:
- `npm run lint` = `tsc --noEmit`;
- `npm run build` = `next build`;
- `npm run test:cms`;
- `npm run test:calculator-lab`.

GitHub CI runs CMS smoke, Calculator Lab smoke, TypeScript check and production build. Preview workflow is manual. No Vercel deployment was requested or performed for this audit.

## Critical risks

### P0
1. Two calculator execution models exist.
2. Public pricing configuration is browser-local rather than server-authoritative.
3. No persisted versioned Calculation Model exists.
4. Public pricing has a legacy calculation fallback.
5. Calculator Lab business logic is still code-defined.

### P1
1. No persisted Calculation snapshot model.
2. No first-class Parameter/Coefficient/Rate/Scenario domain persistence.
3. No Unit Economics Engine.
4. No API-level Client/Internal calculation boundary.
5. No calculation-specific RBAC.
6. No calculation audit trail of intermediate values.

### P2
1. No standalone Calculator Core package boundary.
2. No embeddable widget contract.
3. No dedicated calculation API.
4. No property-based formula tests.
5. No full browser E2E coverage for Calculator/Studio.

## Do not break

- `/calculator` public flow and its current result contract.
- `calculateEstimate()` compatibility behavior.
- formula validation and safe parser behavior.
- Calculator Lab registry/engine smoke tests.
- Studio route/UI/runtime separation.
- PostgreSQL SQL migrations as the active persistence model.
- CMS CRUD/versioning.
- Telegram lead notification.
- existing public URLs.

## Migration direction

The correct next step is to define a canonical contract:

```text
Calculator Definition
        ↓
Calculation Model
        ↓
Calculation Engine
        ↓
Calculation Result
```

Then migrate the public calculator and Calculator Lab behind adapters. Remove legacy fallback only after regression parity is proven.

## Audit conclusion

The project already has strong building blocks: a safe formula parser, configurable Studio pricing model, generic Calculator Lab registry, PostgreSQL/CMS infrastructure and smoke-test tooling. The central problem is fragmentation. Stage 02 should define the canonical Calculation Core and migration boundaries before adding new calculation features.
