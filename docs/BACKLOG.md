# Backlog — Малая геодезия

**Ветка:** `feature/studio-v4`  
**Актуализация:** 2026-09-28

> Проценты — текущая оценка готовности задачи. Не являются метрикой качества.

## P0 — Критично

| Задача | Статус |
|---|---:|
| Стабильная production-сборка | 🟡 ~80% |
| Исправить duplicate `rollbackContent` | ✅ 100% |
| Исправить контракт `requireAdminApi` | ✅ 100% |
| Исправить Puck `version/setVersion` | ✅ 100% |
| Исправить Content Studio rollback | ✅ 100% |
| Studio без пароля | ✅ 100% |
| `/studio/login` → `/studio` | ✅ 100% |
| Password auth в Module Bank | ✅ 100% |
| Полный production build после последних изменений | 🔴 В работе |
| Smoke-test Studio | 🔴 Не проверено |
| Smoke-test Admin API | 🔴 Не проверено |

## P1 — Backend

| Задача | Статус |
|---|---:|
| PostgreSQL архитектура | 🟢 ~90% |
| SQL migrations | 🟢 ~95% |
| CMS CRUD | ✅ 100% |
| Content versions | ✅ 100% |
| Rollback | ✅ 100% |
| Audit log | ✅ 100% |
| File storage | ✅ 100% |
| Admin Files API | ✅ 100% |
| Google Forms → backend | 🟡 ~60% |
| Telegram backend | 🟡 ~70% |
| Telegram notifications | 🟡 ~70% |
| Telegram retry/error handling | 🔴 ~30% |
| Leads storage | 🟡 ~60% |
| Unique URLs / publication slugs | 🟡 ~50% |
| Draft / published state | 🟡 ~60% |

### Telegram
- [x] Webhook
- [x] Durable update deduplication
- [x] Fail-closed webhook secret
- [x] Lead notifications
- [x] Operator roster `TG_OPERATORS`
- [x] Assignment / reassignment
- [x] «Взять в работу»
- [x] Pagination
- [x] Operator notifications
- [ ] Stale processing lease recovery
- [ ] Надёжный retry failed updates

### Leads
- [x] PostgreSQL storage
- [x] Idempotency key
- [x] DB-backed rate limiting
- [x] Correlation ID
- [x] Pagination
- [ ] Полный lead lifecycle
- [ ] Единый API для lead detail
- [ ] CRM-like статусная модель

## P2 — Studio / CMS

| Задача | Статус |
|---|---:|
| Studio UI | 🟢 ~85% |
| Puck integration | 🟢 ~80% |
| Puck editor | 🟡 ~80% |
| Preview | 🟡 ~75% |
| Content management | ✅ 100% |
| Version history UI | ✅ 100% |
| Rollback UI | ✅ 100% |
| File manager | ✅ 100% |
| Audit UI | ✅ 100% |
| Calculator Studio | 🟢 ~90% |
| Редактирование формул и коэффициентов | 🟢 ~90% |
| Dynamic calculator | 🟢 ~95% |
| Password authentication | ✅ Отключена |

## P3 — Продукт и UX

| Задача | Статус |
|---|---:|
| Calculator UX polish | 🟡 ~80% |
| Cases | 🟢 ~80% |
| Фото/видео кейсов | 🟡 ~70% |
| Shadow carousel | 🟡 ~70% |
| Services UI | 🟡 ~70% |
| Knowledge base | 🟡 ~65% |
| Search по геодезическим данным | 🟡 ~60% |
| Partners | 🟡 ~60% |
| Contact / lead flow | 🟡 ~65% |
| Animation #1 | 🟢 ~90% |
| Animation #2 — участок как массив пространственных данных | 🟢 ~85% |
| Mobile UI | 🟡 ~75% |
| Burger menu | 🟡 ~75% |
| Dark / light theme | 🟢 ~90% |

## P4 — Дальнейшее развитие

| Задача | Статус |
|---|---:|
| Интерактивная карта | 🔴 0% |
| Привязка участка к геоданным | 🔴 0% |
| PostGIS | 🔴 0% |
| Геопространственный поиск | 🔴 ~10% |
| Wizard выбора технологии | 🔴 0% |
| Сравнение технологий | 🔴 0% |
| Расширенная 3D/geospatial visualization | 🟡 ~30% |
| AI-функции | 🔴 ~5% |
| pgvector | 🔴 0% |
| AI-поиск по базе знаний | 🔴 0% |

## Сводка

| Приоритет | Готовность |
|---|---:|
| P0 | ~85% |
| P1 | ~70% |
| P2 | ~78% |
| P3 | ~72% |
| P4 | ~10% |

## Порядок работ

**P0 → P1 → P2 → P3 → P4**

1. Чистый production build.
2. Deployment + smoke-test.
3. Telegram и Leads → production-ready.
4. CMS CRUD закрыт, затем files и audit.
5. Studio/CMS → полноценная рабочая админка.
6. UX, cases, knowledge base.
7. PostGIS, карта, геопространственная модель и AI.

## Закрыто

- Dynamic calculator — готов.
- Редактирование формул и коэффициентов через Studio — готово.
- Password auth — намеренно отключена.
- Старая password auth сохранена в `_module-bank/auth-password/`.
- Архитектурные границы проекта зафиксированы.
- Большой структурный рефакторинг отложен до стабилизации backend/API.

## CMS — 100%

Текущий CMS-контур закрывает product scope: case, service, knowledge, partner, page; PostgreSQL storage; draft/changes/published; create/read/update/delete; optimistic locking; version history; rollback; audit before/after/metadata; unique draft/published URL; search; status filters; pagination; file storage через Vercel Blob; загрузка и удаление с сохранением консистентности метаданных; cache revalidation для опубликованных маршрутов; Puck → CMS для главной страницы; published reads используют только publishedSlug.

Ограничение текущего продукта: authentication Studio намеренно отключена и остаётся отдельной задачей безопасности, а полноценный Lead/CRM контур не является частью CMS.
