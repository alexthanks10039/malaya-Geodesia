# Малая геодезия — Backend Backlog

## CI/tooling follow-up — 11.10.2026

Changes are in `chore/ci-stabilization-and-tooling`; treat as complete only after CI passes and the pull request is merged.

- JSX revision-history condition is explicitly narrowed before it is used in React rendering.
- CI runs TypeScript, production build, and Playwright smoke tests for the core public routes.
- Live Preview runs only by manual dispatch and is limited to 60 minutes. The Quick Tunnel remains public to anyone with the URL.
- Dependabot is configured for weekly npm and GitHub Actions update PRs.
- README, AGENTS.md, and deployment documentation are aligned with the current workflow behavior.
- **Vercel deployment investigation (11.10.2026):** `vercel.json` currently schedules `/api/cron/telegram-retry` every 5 minutes (`*/5 * * * *`). The failing Vercel status link redirects to Cron Jobs usage/pricing documentation. Vercel Hobby only supports daily cron schedules; the current team plan has not been confirmed because the connected Vercel scope returns 403. Do **not** silently change this to daily: the route drains a Telegram retry outbox. Verify the plan in Vercel, then either use an eligible plan or move retries to an external scheduler/queue before changing the cadence.
- **Open:** generate and commit `package-lock.json` in a network-enabled environment; verify it; then switch CI to `npm ci` and cache against the lockfile. The current runner container could not resolve dependencies to generate it locally.
- **Open:** restore/verify Vercel project scope, production env vars, production migrations, and real Telegram/Blob integration.
- **Open:** enable branch protection and required CI checks if available in repository settings.


Актуально на 23.09.2026.

## Статус проекта

### Уже реализовано
- Next.js App Router + Route Handlers.
- PostgreSQL infrastructure и migration runner.
- CMS: draft / changes / published.
- CMS versions + optimistic concurrency + rollback.
- CMS audit log.
- Vercel Blob + file metadata.
- Lead model `geo_leads`.
- Lead creation через `POST /api/leads`.
- Telegram Bot API wrapper.
- Telegram owner notification.
- Telegram operator menu: новые / в работе / статистика / карточка / статусы.
- Telegram webhook secret validation.
- Durable Telegram update deduplication table.
- Audit для Telegram lead status changes.
- Studio admin guard.
- Studio auth теперь читает пароль из `ADMIN_PASSWORD`, а отключение контролируется `STUDIO_AUTH_DISABLED=true`.

### Не считать завершённым
- Production Telegram webhook не подтверждён реальным запросом.
- Production DB migration не подтверждён.
- Production Vercel build сейчас блокируется `build-rate-limit`.
- Production Studio auth не проверен после возврата env-based режима.
- Нет полноценного operator REST API для лидов.
- Нет retry/outbox для Telegram notifications.
- Нет rate limiting / abuse protection для публичного Lead API.
- Telegram operator workflow реализован; production webhook/Telegram delivery всё ещё не подтверждены.
- Нет health/readiness endpoint.
- Нет автоматических backend integration tests.

# Backend roadmap

## P0 — Production safety

### B0.1 Auth hardening
Статус: выполнено в коде.
- [x] убрать hardcoded admin password;
- [x] пароль только через `ADMIN_PASSWORD`;
- [x] `STUDIO_AUTH_DISABLED` только через env;
- [ ] выставить production env;
- [ ] проверить `/studio`;
- [ ] проверить все `/api/admin/*`.

### B0.2 Database migration safety
Статус: следующий блок.
- [x] сделать migration runner идемпотентным и наблюдаемым;
- [x] миграции `0001`–`0008` добавлены и проверены статически;
- [x] добавить migration status;
- [x] исключить запуск конкурентных migrations;
- [ ] проверить production DB;
- [ ] добавить понятный failure state.

### B0.3 Lead persistence
Статус: базовая реализация есть.
- [x] `geo_leads`;
- [x] create/read/list/stats;
- [x] status/history;
- [x] persistence failure не маскируется;
- [x] убрать in-memory fallback для production DB reads;
- [x] добавить idempotency key;
- [ ] добавить created/updated source metadata;
- [ ] добавить server-side schema validation.

### B0.4 Telegram delivery
Статус: базовая интеграция есть.
- [x] Bot API wrapper;
- [x] owner notification;
- [x] webhook;
- [x] secret;
- [x] update dedup;
- [x] retry failed updates;
- [x] notification outbox;
- [x] delivery status;
- [ ] защита от Telegram API timeout/rate-limit;
- [ ] webhook health/status.

### B0.5 Public Lead API protection
- [x] rate limiting;
- [x] request size limit;
- [ ] stricter phone validation;
- [ ] idempotency;
- [ ] spam/bot protection;
- [x] structured error codes;
- [ ] request correlation ID.

## P1 — Operator backend

### B1.1 Lead REST API
- [x] `GET /api/admin/leads`;
- [x] `GET /api/admin/leads?id=...`;
- [x] `PATCH /api/admin/leads` для статуса и assignment;
- [x] status transitions;
- [x] assignment;
- [x] pagination;
- [x] filtering;
- [ ] sorting;
- [ ] audit.

### B1.2 Telegram operator workflow
- [ ] proper assignment UI;
- [ ] employee roster;
- [ ] reassignment;
- [ ] callback authorization;
- [ ] stale callback handling;
- [ ] pagination for >10 leads;
- [ ] notification on status change.

### B1.3 Audit
- [x] CMS audit;
- [x] Telegram status audit;
- [ ] unified actor format;
- [ ] request/update correlation ID;
- [ ] audit API filters by action/actor/time;
- [ ] retention strategy.

## P1 — Reliability

### B1.4 Health
- [x] `/api/health`;
- [ ] DB connectivity;
- [ ] Telegram configuration;
- [ ] migration state;
- [ ] version/build SHA;
- [ ] readiness vs liveness.

### B1.5 Error handling
- [ ] typed backend errors;
- [ ] stable API error codes;
- [ ] no secret leakage;
- [ ] Telegram errors normalized;
- [ ] DB errors normalized;
- [ ] structured logging.

### B1.6 Tests
- [ ] calculator API;
- [ ] lead validation;
- [ ] lead persistence;
- [ ] status transitions;
- [ ] Telegram callbacks;
- [ ] webhook authentication;
- [ ] webhook dedup;
- [ ] CMS concurrency;
- [ ] auth.

## P2 — Data architecture

### B2.1 Unified CMS
- [ ] reconcile SQL CMS and Prisma schema;
- [ ] page content model;
- [ ] public page → CMS consistency;
- [ ] one repository for all editable content.

### B2.2 Calculator persistence
- [ ] move calculator config from localStorage to DB/CMS;
- [ ] versions;
- [ ] draft/publish;
- [ ] preview;
- [ ] rollback;
- [ ] audit.

### B2.3 Files
- [ ] unified media references;
- [ ] orphan cleanup;
- [ ] upload validation;
- [ ] size limits;
- [ ] image metadata;
- [ ] signed/private asset strategy if needed.

## P3 — Geo backend
- [ ] PostGIS;
- [ ] coordinate validation;
- [ ] project/object model;
- [ ] survey datasets;
- [ ] terrain/point-cloud metadata;
- [ ] job processing;
- [ ] exports;
- [ ] storage lifecycle.

# Current execution order
Работаем не параллельно, а последовательно:
1. B0.1 Auth hardening → код сделан.
2. B0.2 DB migration safety → выполнено в коде.
3. B0.3 Lead persistence + idempotency → выполнено в коде.
4. B0.4 Telegram reliability/outbox → выполнено в коде.
5. B0.5 Public API protection → выполнено в коде.
6. B1.1 Operator REST API → выполнено в коде.
7. B1.2 Telegram operator workflow.
8. B1.3 Unified audit.
9. B1.4 Health/readiness → health выполнен, readiness остаётся.
10. B1.5 Error handling + structured logging.
11. B1.6 Backend integration tests.
12. Затем P2/P3.

## Definition of Done
- код реализован;
- типы проходят;
- build проходит;
- migration добавлена при необходимости;
- happy path проверен;
- invalid/error path проверен;
- persistence проверен;
- security implications проверены;
- документация актуальна;
- изменение попало в `main`.