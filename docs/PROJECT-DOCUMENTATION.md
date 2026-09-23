
# Малая геодезия — полная техническая документация

Дата актуализации: 23.09.2026  
Репозиторий: alexthanks10039/malaya-Geodesia  
Основная ветка: main  
Тип продукта: многостраничный Next.js-сайт + интерактивный калькулятор + встроенный Studio/CMS.

> Документ описывает фактически реализованное состояние проекта на дату актуализации. Функции с частичной интеграцией и известные ограничения отмечены отдельно.

## 1. Назначение

Малая геодезия — цифровой сервис геодезических работ. Основной путь:

задача → метод → параметры объекта → предварительный расчёт → контакт → обработка заявки.

Проект объединяет публичный сайт, каталог услуг, кейсы, справочник, технологии, калькулятор, lead API, Telegram, CMS, файловое пространство, audit log, Full Studio, Puck и Dev Mode.

Ключевой архитектурный принцип: Studio и CMS являются частью того же Next.js-приложения.

## 2. Стек

Runtime:
- Node.js 24.x
- Next.js 16 App Router
- React 19
- TypeScript 5.9

UI:
- CSS
- lucide-react
- motion
- Three.js
- @puckeditor/core 0.23.0

Backend:
- Next.js Route Handlers
- PostgreSQL через pg
- SQL migrations
- Vercel Blob

Важно: текущий CMS работает через pg и raw SQL. Prisma Client не используется CMS-слоем.

## 3. Карта репозитория

### app

app/page.tsx — главная  
app/layout.tsx — root layout, тема, глобальные CSS, Studio Dev Mode  
app/calculator/page.tsx — калькулятор  
app/services/page.tsx — каталог услуг  
app/services/[slug]/page.tsx — отдельная услуга  
app/cases/page.tsx — архив кейсов  
app/cases/[slug]/page.tsx — отдельный кейс  
app/knowledge/page.tsx — справочник  
app/knowledge/[slug]/page.tsx — отдельный материал  
app/technologies/page.tsx — технологии  
app/partners/page.tsx — партнёры  
app/contacts/page.tsx — контакты  

app/studio/page.tsx — Full Studio  
app/studio/login/page.tsx — временная auth-заглушка  
app/studio/content/page.tsx — CMS UI  
app/studio/preview/page.tsx — Puck draft/published preview

### API

app/api/leads/route.ts  
app/api/telegram/webhook/route.ts

app/api/admin/auth/login/route.ts  
app/api/admin/auth/logout/route.ts  
app/api/admin/audit/route.ts  
app/api/admin/files/route.ts  
app/api/admin/files/upload/route.ts  
app/api/admin/content/[type]/route.ts  
app/api/admin/content/[type]/[id]/route.ts  
app/api/admin/content/[type]/[id]/versions/route.ts

### components

Публичные:
- hero.tsx
- calculator.tsx
- service-card.tsx
- services-archive.tsx
- knowledge-search.tsx
- case-media-carousel.tsx
- case-media-gallery.tsx
- geospatial-index.tsx
- geo-scan-scene.tsx
- scroll-reveal.tsx
- site-header.tsx
- site-footer.tsx
- theme-toggle.tsx

Studio:
- studio-workspace.tsx
- dev-mode.tsx
- page-editor.tsx
- calculator-editor.tsx
- case-editor.tsx
- content-studio.tsx
- studio-logout.tsx
- puck/config.tsx
- puck/editor.tsx

### lib

- calculator.ts — calculation engine
- formula-engine.ts — parser/evaluator
- cms.ts — CMS service layer
- cms-types.ts — content contracts
- db.ts — PostgreSQL pool/query/transaction
- data.ts — static seed/fallback
- partners.ts — partner fallback
- telegram.ts — Telegram API + operator UI
- telegram-leads.ts — in-memory lead state
- admin-auth.ts — Studio/admin auth

### studio

- types.ts — browser Studio state contracts
- runtime/storage.ts — localStorage persistence
- config/pages.ts — page list
- config/calculator.ts — calculator configuration

### DB

- db/migrations/0001_cms.sql
- db/migrations/0002_puck_pages.sql
- db/migrations/0003_cms_versions.sql
- prisma/schema.prisma

### scripts

- db-migrate.mjs
- db-migrate-if-configured.mjs
- seed.ts
- live-preview.mjs
- codespace-preview.sh

## 4. Публичные маршруты

| URL | Назначение | Источник |
|---|---|---|
| / | Главная | Puck published или React fallback |
| /services | Каталог услуг | static data |
| /services/[slug] | Детальная услуга | CMS published/fallback |
| /calculator | Калькулятор | calculator engine |
| /cases | Архив кейсов | CMS published/fallback |
| /cases/[slug] | Детальный кейс | CMS published/fallback |
| /knowledge | Справочник | CMS published/fallback |
| /knowledge/[slug] | Материал | CMS published/fallback |
| /technologies | Технологии | static data |
| /partners | Партнёры | CMS published/fallback |
| /contacts | Контакты | React |
| /studio | Full Studio | auth gate |
| /studio/content | CMS | auth gate |
| /studio/preview | Preview | auth gate |

Основные CMS-зависимые страницы используют force-dynamic.

## 5. Главная

Главная имеет два источника.

При наличии корректной опубликованной page-записи типа page со slug home и payload kind=puck-page страница рендерится через Puck Render.

Если опубликованной Puck-страницы нет, используется обычная React-композиция:

1. Hero
2. сценарии
3. Pipeline
4. услуги
5. Geospatial Index
6. технологии
7. кейсы
8. CTA

Это даёт рабочий fallback без внешней CMS.

## 6. Продуктовые сущности

### Service

slug, name, category, short, description, when, deliverable, technologies[], formats[], features[], process[]

Текущий seed:
- Топографическая съёмка
- Аэрофотосъёмка
- Лазерное сканирование
- Исполнительная съёмка
- 3D-моделирование
- Расчёт объёмов

### Case

slug, category, title, location, area, technology, task, result, deliverables, duration, media[]

Текущие статические кейсы:
- topoplan
- karer
- fasad

### KnowledgeItem

slug, type, title, summary, body, related[]

### Partner

slug, title, category, description

## 7. Калькулятор

Цепочка:

Calculator UI → Calculator Engine → Formula Engine → Estimate → POST /api/leads.

Входы:
- type
- area
- complexity[]
- output
- urgency
- phone

Четыре шага:
1. Метод
2. Размер
3. Условия
4. Контакт

Результат показывает ориентир цены и срока.

## 8. Pricing Engine

Основная логика находится в lib/calculator.ts.

Переменные:
- basePrice
- area
- areaBase
- minAreaFactor
- maxAreaFactor
- conditionCount
- complexityFactorPerCondition
- selectedFormatFactor
- selectedUrgencyFactor
- dayBase
- dayAreaWeight
- dayComplexityWeight
- urgencyDaysReduction
- veryUrgentDaysReduction
- urgencyMinDays
- roundingStep

Основные выражения:

areaFactor =
clamp(area / areaBase, minAreaFactor, maxAreaFactor)

complexityFactor =
1 + conditionCount * complexityFactorPerCondition

rawPrice =
basePrice * areaFactor * complexityFactor * formatFactor * urgencyFactor * seasonFactor + siteVisitFee

price =
roundTo(rawPrice, roundingStep)

baseDays =
max(2, round(dayBase + areaFactor * dayAreaWeight + conditionCount * dayComplexityWeight))

Итоговый срок дополнительно корректируется срочностью.

Цены являются предварительной продуктовой логикой, а не подтверждённым прайс-листом.

## 9. Formula Engine

lib/formula-engine.ts — собственный безопасный expression parser.

Поддерживаются:
+ - * / ^
скобки
числа
идентификаторы

Функции:
abs, ceil, clamp, floor, max, min, pow, round, roundTo

Ограничения:
- формула не более 600 символов;
- не более 240 токенов;
- деление на ноль запрещено;
- неизвестные функции запрещены;
- неизвестные переменные запрещены;
- циклы между формулами обнаруживаются;
- ключ формулы должен быть валидным identifier.

Если диагностика formula config не проходит, calculateEstimate использует legacy calculation как fallback.

## 10. Lead API

POST /api/leads.

Проверяет:
- телефон;
- type;
- area;
- output;
- urgency;
- complexity.

Телефон после нормализации должен иметь 10–16 символов.

Площадь:
0 < area <= 10 000 000 м².

complexity — массив строк, максимум 20 элементов.

Lead ID формируется как GEO- + timestamp.

Критическое ограничение: текущий /api/leads не сохраняет lead в PostgreSQL. Он формирует объект lead и при наличии TG_KEY и OWNER_ID передаёт его в Telegram.

Целевой durable flow:

Calculator → validation → Lead DB → notification → operator.

## 11. Telegram

Endpoint:

POST /api/telegram/webhook

ENV:
TG_KEY
OWNER_ID

Поток:

POST /api/leads
→ sendOwnerLeadNotification
→ Telegram Bot API
→ OWNER_ID

Операторский интерфейс поддерживает:
- новые заявки;
- заявки в работе;
- статистику;
- открытие заявки;
- взять в работу;
- изменение статуса;
- главное меню.

Статусы:
new
in_work
reassigned
done
cancelled

Ограничение: lib/telegram-leads.ts использует in-memory Map. После рестарта serverless/runtime state сбрасывается.

## 12. CMS

CMS-ядро:
lib/cms.ts
lib/cms-types.ts

Типы:
- case
- service
- knowledge
- partner
- page

Content route prefixes:
- case → /cases
- service → /services
- knowledge → /knowledge
- partner → /partners
- page → /

CmsContent содержит:
id, type, slug, path, publishedSlug, publishedPath, status, data, publishedData, version, createdAt, updatedAt, publishedAt.

## 13. CMS lifecycle

Статусы:
draft
changes
published

Create → draft.

Update:
- меняет draft;
- если публикация существовала, статус становится changes.

Publish:
- draft_slug → published_slug
- draft_path → published_path
- draft_data → published_data
- status → published

Unpublish очищает published values и сохраняет draft.

Delete удаляет CMS record.

## 14. Slug и URL

slugify:
- приводит к lower-case;
- транслитерирует кириллицу;
- нормализует символы в дефисы;
- ограничивает длину 80 символами.

DB constraints защищают уникальность draft_path и published_path.

## 15. Version History

Таблица cms_content_versions появилась в migration 0003.

Хранит:
- content_id
- content_type
- version
- action
- slug
- path
- status
- draft_data
- published_data
- created_at

Rollback создаёт новое состояние draft на основе выбранной версии.

CMS использует expectedVersion для optimistic concurrency.

Несовпадение версии возвращает 409 Version conflict.

## 16. Audit Log

Таблица cms_audit_log.

В записи:
- entity_type
- entity_id
- action
- actor
- before_data
- after_data
- metadata
- created_at

Действия включают create, update_draft, publish, unpublish, delete и соответствующие file events.

## 17. File Space

Vercel Blob хранит сами объекты.

PostgreSQL хранит metadata:
- id
- pathname
- url
- filename
- contentType
- size
- folder
- createdAt

Upload:
POST /api/admin/files/upload

List/Delete:
GET /api/admin/files
DELETE /api/admin/files

Поддерживаются JPEG, PNG, WebP, GIF, MP4, WebM, QuickTime, PDF, ZIP, binary и CSV.

## 18. Full Studio

Основной workspace:
components/studio/studio-workspace.tsx.

Studio работает поверх реального preview/DOM.

Page list:
- Главная
- Калькулятор
- Услуги
- Кейсы
- Справочник
- Технологии
- Партнёры
- Контакты

Основные режимы:
- Layers
- Design
- Data
- Review
- Select
- Interact

Viewport:
- Desktop
- Tablet 1024 px
- Mobile 390 px

Zoom:
60–130%.

Studio поддерживает:
- DOM tree;
- поиск по text/tag/class;
- click-to-select;
- текст;
- ссылки;
- alt/title;
- hidden;
- locked;
- CSS;
- responsive CSS;
- constraints;
- position offsets;
- inserted blocks;
- undo/redo;
- comments;
- snapshots;
- import/export.

## 19. Inspector

Редактируемые CSS-группы.

Typography:
fontSize, lineHeight, fontWeight, letterSpacing, textAlign

Layout:
display, flexDirection, flexWrap, justifyContent, alignItems, alignSelf, width, maxWidth, height, minWidth, minHeight, gap, padding, margin, position, zIndex

Appearance:
color, background, border, borderRadius, boxShadow, opacity

Advanced:
transform, transition, customCss

Attributes:
href, alt, title

## 20. Responsive

Studio поддерживает:
- desktop;
- tablet 1024;
- mobile 390.

Для отдельных устройств используются:
responsiveCss
responsivePositionOffset
responsiveConstraints

Constraints:
horizontal = none/left/right/stretch
vertical = none/top/bottom/stretch

При необходимости элемент переводится в absolute positioning относительно родителя.

## 21. Runtime blocks

Studio может добавлять:
- Text
- Button
- Divider
- Container

Они получают data-studio-inserted=true и сохраняются как данные draft.

Важно: runtime inserted block не изменяет исходный JSX автоматически. Для production source изменение нужно отдельно принять в код.

## 22. Browser Draft

Основные localStorage keys:
- malaya-studio-overrides
- malaya-studio-calculator
- malaya-studio-mode
- malaya-studio-puck-draft

Это browser draft layer. Он не является Git source control и не заменяет CMS publish.

## 23. Design Tokens

Поддерживаются:
--bg
--paper
--ink
--muted
--acid
--line
--acid-soft

## 24. Dev Mode

components/studio/dev-mode.tsx — быстрый DOM editor.

Поддерживает:
- DEV ON/OFF;
- SELECT;
- TEST;
- Layers;
- search;
- element selection;
- text/CSS edits;
- reset;
- export;
- selector copy.

Legacy Dev Mode сохранён для совместимости.

## 25. Page Editor

components/studio/page-editor.tsx.

Отвечает за:
- iframe preview;
- tree;
- selection;
- text;
- CSS;
- responsive;
- tokens;
- reset;
- export/import.

Он работает на StudioState из studio/runtime/storage.ts.

## 26. Calculator Studio

components/studio/calculator-editor.tsx.

Редактируются:
- типы;
- hint/tag;
- base price;
- formats;
- urgency;
- conditions;
- area presets;
- min/max;
- step;
- area base;
- coefficients;
- сроки;
- rounding;
- formulas.

Есть test scenario и Formula Diagnostics.

Текущее ограничение: calculator editor хранит конфигурацию в browser localStorage, а не в durable CMS.

## 27. Case Studio

components/studio/case-editor.tsx.

Поддерживает:
- создание кейсов;
- редактирование;
- media;
- URL фото;
- URL видео;
- порядок media;
- удаление media;
- сохранение local draft.

Ограничение: этот editor исторически localStorage-based. Основной CMS Content Studio уже умеет работать с case records.

## 28. Puck

Puck конфиг находится в components/studio/puck/config.tsx.

Компоненты:
Layout:
- SectionBlock
- HeadingBlock
- TextBlock
- SpacerBlock

Content:
- HeroBlock
- PipelineBlock
- ServiceGridBlock
- CaseGridBlock
- GeoIndexBlock
- CtaBlock

Actions:
- ButtonBlock

Root props:
- pageTitle
- pageDescription

Главная Puck page сейчас имеет slug home.

## 29. Puck persistence

Puck editor:
components/studio/puck/editor.tsx

CMS endpoint:
api/admin/content/page

Puck payload оборачивается в объект kind=puck-page и сохраняется в CMS page.

Local backup:
malaya-studio-puck-draft

Статусы UI:
LOADING
SYNCED
SAVING
DRAFT SAVED
PUBLISHED
OFFLINE DRAFT
LOCAL CONFLICT
ERROR

## 30. Puck Preview

/studio/preview?mode=draft
/studio/preview?mode=published

Draft берётся из CMS draft page.

Published берётся из published page.

При отсутствии валидного Puck payload используется initialPuckData.

## 31. Admin API

Content:
GET/POST /api/admin/content/[type]
GET/PATCH/DELETE /api/admin/content/[type]/[id]
GET/POST /api/admin/content/[type]/[id]/versions

Files:
GET/DELETE /api/admin/files
POST /api/admin/files/upload

Audit:
GET /api/admin/audit

Auth:
POST /api/admin/auth/login
POST /api/admin/auth/logout

## 32. Admin Auth — текущее состояние

На 23.09.2026 auth Studio временно отключена.

В lib/admin-auth.ts:
STUDIO_AUTH_DISABLED = true

Из-за единого guard это открывает не только /studio, но и admin API.

В коде сохранён временный пароль 1 как значение для последующего возврата password flow.

При восстановлении авторизации нужно проверить:
- Studio page;
- CMS;
- preview;
- content API;
- versions API;
- file API;
- audit API.

Сессионная архитектура использует HMAC и cookie malaya_studio_session с TTL 12 часов.

## 33. PostgreSQL

lib/db.ts создаёт общий pg Pool.

По умолчанию:
- max 5;
- idle timeout 30s;
- connection timeout 10s.

Для local DB SSL выключен.

Для remote DB SSL используется с rejectUnauthorized=false, если отдельно не задано DATABASE_SSL=false.

## 34. Database migrations

npm run db:migrate запускает db-migrate.mjs.

prebuild запускает db-migrate-if-configured.mjs.

Если DATABASE_URL отсутствует, build пропускает migration step.

0001:
- cms_migrations
- cms_content
- file_assets
- cms_audit_log
- updated_at trigger

0002:
- добавляет content_type=page
- page index

0003:
- cms_content_versions
- initial snapshots

## 35. Prisma

prisma/schema.prisma содержит модели Service, Case, KnowledgeItem, Lead, Technology.

Но текущий SQL migration layer также содержит:
- cms_content;
- file_assets;
- cms_audit_log;
- cms_content_versions;
- page content type.

Prisma schema не является полной моделью текущей CMS БД.

## 36. Seed

npm run db:seed.

Использует:
lib/data.ts
lib/partners.ts

Seed создаёт published CMS records с ID seed-<type>-<slug>.

Используется ON CONFLICT DO NOTHING, поэтому существующие records не перезаписываются.

## 37. Fallback без БД

Публичный контент может работать без DATABASE_URL.

lib/cms.ts переключается на staticMap:
- cases
- services
- knowledge
- partners

CMS write operations без БД недоступны.

Это позволяет запускать P0 без PostgreSQL.

## 38. Deployment и CI

CI:
.github/workflows/ci.yml

Запускается на push и PR в main.

Шаги:
1. checkout
2. Node 24
3. npm install
4. npm run lint
5. npm run build

Preview:
.github/workflows/preview.yml

Создаёт preview artifact.

Live Preview:
.github/workflows/live-preview.yml

На push в main:
1. запускает next dev;
2. создаёт Cloudflare Quick Tunnel;
3. публикует trycloudflare.com URL;
4. проверяет публичный endpoint;
5. держит preview в рамках workflow.

Это dev-preview, не production.

Visual Preview:
.github/workflows/visual-preview.yml

Снимает desktop/mobile screenshots homepage, Studio и calculator.

## 39. Local / Codespaces

npm run dev — обычный Next.js dev.

npm run live — Next dev + Cloudflare Quick Tunnel.

npm run codespace — проверка Node, npm install, TypeScript check и Next dev.

Codespaces:
- Node 24;
- port 3000;
- auto npm install;
- private port visibility.

## 40. Design system

Направление:
geospatial / engineering / digital twin.

Характер:
- technical;
- high information density;
- dark/light;
- acid accent;
- responsive;
- restrained motion.

Основные CSS:
- app/globals.css
- app/product-polish.css
- components/ui-polish.css
- components/theme.css
- components/design-sprint.css
- studio-specific CSS

## 41. Theme

theme-toggle.tsx управляет theme.

localStorage key:
malaya-geodesia-theme

Root layout выставляет data-theme до hydration.

## 42. 3D и geospatial visuals

Ключевые компоненты:
- geo-scan-scene.tsx
- geospatial-index.tsx

Three.js используется как визуальный слой.

Это не полноценный geodata processing engine.

## 43. Durable / browser / in-memory

Durable:
- CMS data в PostgreSQL;
- CMS versions;
- audit log;
- file metadata;
- Vercel Blob files.

Browser-only:
- Full Studio overrides;
- Calculator Studio config;
- Case Studio draft;
- Puck local backup.

In-memory:
- Telegram lead runtime state.

Synthetic:
- текущий leadId в /api/leads.

## 44. Known gaps

1. Lead persistence отсутствует.
2. Telegram state не durable.
3. CMS ↔ все public pages связаны не везде одинаково.
4. Browser drafts и CMS published data существуют как отдельные lifecycle layers.
5. Calculator Studio не persistent.
6. Case Studio и CMS Case editor дублируют редакционные функции.
7. DOM/CSS editor пока частично raw, а не полностью semantic block editor.
8. Production auth сейчас временно выключена.
9. Prisma schema не синхронизирована с полной фактической CMS SQL schema.

## 45. Рекомендуемый порядок разработки

1. Lead → PostgreSQL → notifications → Telegram status persistence.
2. Единая CMS model для public entities.
3. Единый Studio draft/publish lifecycle.
4. File Space как единый media layer.
5. Semantic block editor.
6. Persistent calculator configuration.
7. PostGIS/maps.
8. 3D expansion.
9. pgvector/RAG/AI search.

## 46. Правила изменения проекта

Перед изменением:
- проверить текущую реализацию;
- проверить types;
- определить источник данных;
- определить fallback.

После изменения:
npm run lint
npm run build

Для UI:
- desktop 1440;
- tablet 1024;
- mobile 390.

Для CMS:
- draft;
- preview;
- publish;
- rollback.

Для API:
- success;
- validation error;
- missing configuration;
- persistence behavior.

## 47. Definition of Done

Функция готова, когда:
1. пользовательский сценарий работает;
2. TypeScript проходит;
3. production build проходит;
4. responsive не ломается;
5. источник данных определён;
6. способ изменения определён;
7. error/empty state предусмотрен;
8. критическое действие даёт понятный результат;
9. preview работает;
10. документация обновлена.

## 48. Архитектура в одном рисунке

PUBLIC SITE
│
├── Services
├── Cases
├── Knowledge
├── Calculator
│
└── Studio
    ├── Full Studio
    ├── Dev Mode
    ├── Puck
    ├── CMS
    ├── Files
    ├── Audit
    ├── Versions
    └── Preview
            │
            ↓
       PUBLISHED SITE

Инфраструктура:

Next.js
├── Route Handlers
├── UI
├── Calculator
└── Studio
      ├── PostgreSQL
      └── Vercel Blob

## 49. Operational state на 23.09.2026

Последние auth-коммиты:
- f3af965357bedecc14226c183557a98823e1aaa9
- 3d52b94ee0184a16b61bdc9909585f97e429d74c

Последние изменения включают временное отключение Studio auth и пометку «Авторизация временно отключена, включить позже».

Последний GitHub status для auth-коммита показывает Vercel failure с причиной build-rate-limit.

По текущему Vercel connector доступ конкретного deployment не подтверждён, поэтому production после этих коммитов нельзя считать визуально проверенным.

## 50. Главные файлы для нового разработчика

Рекомендуемый порядок чтения:

README.md
AGENTS.md
app/layout.tsx
app/page.tsx
components/calculator.tsx
lib/calculator.ts
lib/formula-engine.ts
lib/cms.ts
lib/cms-types.ts
components/studio/studio-workspace.tsx
components/studio/content-studio.tsx
components/studio/puck/config.tsx
components/studio/puck/editor.tsx
studio/runtime/storage.ts
studio/config/calculator.ts
db/migrations/*

Логика чтения:
продукт → UI → calculator → CMS → Studio → persistence → deployment.
