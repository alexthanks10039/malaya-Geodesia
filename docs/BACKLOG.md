# Малая геодезия — Backend Backlog

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
- Telegram operator state требует дальнейшего hardening.
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
- [ ] сделать migration runner идемпотентным и наблюдаемым;
- [ ] проверить `0001`–`0005`;
- [ ] добавить migration status;
- [ ] исключить запуск конкурентных migrations;
- [ ] проверить production DB;
- [ ] добавить понятный failure state.

### B0.3 Lead persistence
Статус: базовая реализация есть.
- [x] `geo_leads`;
- [x] create/read/list/stats;
- [x] status/history;
- [x] persistence failure не маскируется;
- [ ] убрать in-memory fallback для production DB reads;
- [ ] добавить idempotency key;
- [ ] добавить created/updated source metadata;
- [ ] добавить server-side schema validation.

### B0.4 Telegram delivery
Статус: базовая интеграция есть.
- [x] Bot API wrapper;
- [x] owner notification;
- [x] webhook;
- [x] secret;
- [x] update dedup;
- [ ] retry failed updates;
- [ ] notification outbox;
- [ ] delivery status;
- [ ] защита от Telegram API timeout/rate-limit;
- [ ] webhook health/status.

### B0.5 Public Lead API protection
- [ ] rate limiting;
- [ ] request size limit;
- [ ] stricter phone validation;
- [ ] idempotency;
- [ ] spam/bot protection;
- [ ] structured error codes;
- [ ] request correlation ID.

## P1 — Operator backend

### B1.1 Lead REST API
- [ ] `GET /api/admin/leads`;
- [ ] `GET /api/admin/leads/:id`;
- [ ] `PATCH /api/admin/leads/:id`;
- [ ] status transitions;
- [ ] assignment;
- [ ] pagination;
- [ ] filtering;
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
- [ ] `/api/health`;
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
2. B0.2 DB migration safety → следующий.
3. B0.3 Lead persistence + idempotency.
4. B0.4 Telegram reliability/outbox.
5. B0.5 Public API protection.
6. B1.1 Operator REST API.
7. B1.2 Telegram operator workflow.
8. B1.3 Unified audit.
9. B1.4 Health/readiness.
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