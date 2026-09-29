# Current State — Малая геодезия

Аудит: `feature/studio-v4`, 2026-09-29.

Источник истины при расхождениях: фактический код → тесты → конфигурация → документация.

## ✅ Implemented

- Next.js 16 App Router site structure and public route family.
- PostgreSQL persistence through `pg` and SQL migrations.
- CMS content model for `case`, `service`, `knowledge`, `partner`, and `page`.
- CMS draft/published state, CRUD API, audit log and version snapshots.
- Puck page persistence extension and Studio route/UI/core separation.
- Public price/time calculator with configurable Studio pricing/formulas and a legacy fallback.
- Safe formula evaluation/validation in `lib/formula-engine.ts`.
- Calculator Lab registry, definitions, deterministic execution engine, manifest and API foundation.
- Telegram integration layer for lead notifications.
- File metadata/upload boundary based on `file_assets` and Vercel Blob integration.
- CI smoke tests, TypeScript check and production build workflow.

## ⚠️ Partial

### Calculator

The existing `/calculator` is a working preliminary estimator, but it is not yet the final universal calculator platform.

It currently has:

- dynamic-ish inputs from `CalculatorStudioConfig`;
- configurable coefficients and urgency factors;
- formula validation/evaluation;
- breakdown values;
- compatibility fallback when formula configuration is invalid.

It does **not** yet have the complete target model:

- database-backed Parameter entity;
- database-backed Rate entity;
- database-backed Coefficient entity;
- versioned CalculationModel;
- Scenario persistence;
- Unit Economics model;
- public/internal permission boundary;
- saved calculations and calculation IDs;
- quote/export workflow;
- what-if analysis;
- standalone API contract suitable for external clients;
- embeddable widget.

### Studio

CMS and Puck foundations are present. The Studio remains a high-risk UI area because of its layered editor/overlay/state interactions. Password authentication is intentionally disabled.

### Storage

The database metadata model exists, but complete production-grade asset lifecycle management is still a follow-up area.

### Security

The current authentication boundary is deliberately minimal. Enterprise RBAC, Finance-only visibility and fine-grained permissions are not complete.

## 🚧 In Development

- Calculator Lab as an isolated expansion path.
- Migration from the legacy calculator architecture toward a reusable Calculation Core.
- Architecture documentation intended for AI coding agents.
- Continued Studio/CMS refinement.

## ❌ Planned

- Universal calculation model managed through data/configuration rather than source code.
- Public preliminary mode + internal detailed mode as explicit product/runtime boundaries.
- Parameters, options, rates, coefficients, formulas, scenarios and cost items as persisted entities.
- Unit economics engine.
- Versioned calculation models with immutable/reproducible calculation snapshots.
- Formula builder/tester in Calculator Studio.
- Explainable calculation audit/breakdown.
- What-if analysis.
- Saved calculations, sharing and export.
- Commercial proposal generation.
- API-first standalone calculator runtime.
- Embeddable calculator widget.
- AI input extraction layer over deterministic calculation.
- Multi-tenant/enterprise RBAC architecture.

## 🗑 Deprecated / Archived

- Password-authentication implementation in `_module-bank/auth-password/` is archived and intentionally not active.
- Legacy fallback behavior in `lib/calculator.ts` is compatibility behavior, not the target architecture.
- Prisma schema is retained as a future/compatibility reference and is not the active runtime data layer.

## Technical debt priorities

1. Establish a single Calculation Core contract instead of extending `lib/calculator.ts` indefinitely.
2. Move business-changing calculator parameters from code/config into versioned persistence.
3. Separate public estimate data from internal cost/unit-economics data.
4. Add deterministic formula test fixtures and regression cases for the calculation engine.
5. Decompose `lib/cms.ts` carefully into domain-local services only after preserving current API contracts.
6. Generate/maintain a static dependency graph for high-risk modules.
7. Reduce CSS override accumulation and verify mobile Studio/header interaction after visual changes.
8. Make deployment policy explicit so documentation-only commits do not consume Vercel deployment quota.
