# Project architecture

## Top-level boundaries

- `app/` — Next.js App Router routes, pages, layouts, and route handlers.
- `components/` — reusable React UI. The existing `components/studio/` subtree is reserved for Studio UI.
- `lib/` — server-side/domain logic shared by routes and components.
- `studio/` — Studio core: runtime, configuration, and shared Studio types. It is not a route tree.
- `db/migrations/` — PostgreSQL schema migrations executed by the migration runner.
- `scripts/` — local/CI operational scripts such as migrations, seed and preview.
- `docs/` — product, backend and operational documentation.
- `_module-bank/` — archived modules that are intentionally not part of the active runtime.

## Data layer

The active CMS/backend uses PostgreSQL through `pg` and SQL migrations. `prisma/schema.prisma` is retained as a compatibility/future schema reference and is not an active runtime dependency.

Do not introduce a second active data-access layer without first reconciling it with the SQL migration model.

## Studio boundary

Keep the three Studio layers separate:

- `app/studio/` — route entrypoints.
- `components/studio/` — React UI.
- `studio/` — domain/runtime/config/types.

Password authentication is currently disabled intentionally. The previous implementation is archived in `_module-bank/auth-password/`.

## Refactoring rule

Prefer small domain-local refactors. Do not move large groups of files while backend/API work is in progress unless imports and build verification can be completed in the same change.
