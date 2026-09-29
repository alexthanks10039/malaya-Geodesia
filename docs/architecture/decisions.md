# Architecture Decisions

These records document decisions that are observable in the current repository. Where historical motivation is not available from the code/history, it is explicitly marked `reason: unknown`.

## ADR-001 — PostgreSQL + SQL migrations are the active persistence layer

- **Status:** accepted
- **Reason:** unknown
- **Decision:** Runtime CMS/backend persistence uses PostgreSQL through `pg` and ordered SQL migrations under `db/migrations/`.
- **Evidence:** `lib/db.ts`, `lib/cms.ts`, `db/migrations/0001_cms.sql` through `0003_cms_versions.sql`.
- **Consequences:** New persistent backend features must reconcile with the existing SQL schema instead of introducing a second active ORM/data layer.

## ADR-002 — Studio has three explicit layers

- **Status:** accepted
- **Reason:** unknown
- **Decision:** Keep `app/studio/` for route entrypoints, `components/studio/` for React UI, and `studio/` for runtime/config/types.
- **Consequences:** Do not collapse these layers into a single route/component module.

## ADR-003 — Studio password authentication is disabled and archived

- **Status:** accepted for current development state
- **Reason:** documented project instruction; historical rationale unknown
- **Decision:** Password authentication is not active. Previous implementation is preserved under `_module-bank/auth-password/` for deliberate future restoration.
- **Consequences:** Do not silently restore password middleware/auth logic while working on unrelated features.

## ADR-004 — Calculator Lab is isolated from the legacy public calculator

- **Status:** accepted / in development
- **Reason:** safe parallel evolution of calculator architecture
- **Decision:** `lib/calculators-lab/` provides a separate registry/definition/engine contract while the existing `/calculator` remains operational through `lib/calculator.ts`.
- **Consequences:** New technical calculators should prefer the Lab contract rather than adding another one-off calculator architecture.

## ADR-005 — Calculation logic is separated from UI and HTTP

- **Status:** accepted
- **Reason:** deterministic reuse and testing
- **Decision:** React components collect/present data; API routes handle transport; domain engines perform calculations.
- **Consequences:** Do not place pricing formulas inside route handlers or presentation components.

## ADR-006 — Calculator business values should become data-driven

- **Status:** target architectural direction
- **Reason:** product requirement; historical reason unknown
- **Decision:** Values that change with pricing, region, equipment, labor, policy or market should eventually live in versioned configuration/data rather than React/TypeScript source.
- **Current state:** partially implemented through `studio/config/calculator.ts`, not yet a complete DB-backed model.
- **Consequences:** Avoid adding new hard-coded commercial constants when the configuration layer can own them.

## ADR-007 — Calculation results must be reproducible by model version

- **Status:** target architectural requirement
- **Reason:** product requirement
- **Decision:** Future persisted calculations must reference the exact calculation model/configuration version used to produce them.
- **Current state:** not fully implemented for the calculator domain.
- **Consequences:** Do not design saved-calculation storage that depends only on the latest mutable pricing config.

## ADR-008 — Documentation-only changes should not trigger Vercel deployment

- **Status:** development policy
- **Reason:** reduce unnecessary use of limited deployment quota
- **Decision:** Documentation-only commits are not deployment work. CI may validate them, but Vercel deployment should be avoided unless the platform/project configuration makes it unavoidable.
- **Consequences:** AI agents must distinguish code/runtime changes from docs-only changes and must not create deployment work for docs updates.

## ADR-009 — Architecture Map is living documentation

- **Status:** accepted
- **Reason:** reduce repeated repository discovery by AI developers
- **Decision:** `docs/architecture/project-map.json` is the machine-readable entry point. `current-state.md`, `decisions.md` and `AI-DEVELOPER-GUIDE.md` provide human/agent context.
- **Consequences:** When architecture or module state changes, update the map in the same change.
