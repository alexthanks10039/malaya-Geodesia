# Super Calculator — Requirements Baseline

Stage: 02
Status: approved baseline for implementation sequence

## Product goal

Создать универсальный deterministic calculation product для геодезических услуг, который начинает с предварительной публичной оценки и постепенно добавляет точный внутренний расчёт, unit economics, конфигурируемые модели и сохранение версий.

## Personas and jobs

| Role | Job | Required view |
|---|---|---|
| Client | Быстро понять порядок стоимости | Public / Preliminary |
| Manager / PM | Подготовить точный расчёт и КП | Internal / Detailed |
| Engineer | Проверить технические параметры и нормативы | Internal / Detailed |
| Finance | Проверить себестоимость и маржу | Finance subset |
| Admin / Product Admin | Настроить услуги, параметры, ставки, формулы | Studio/Admin |

## Functional requirements

### FR-01 Service catalog

Сервис должен получать услугу по идентификатору, а не по hard-coded switch в UI. Услуга определяет schema inputs и calculation model.

### FR-02 Dynamic parameters

Параметр должен поддерживать тип, единицу, default, validation, options и visibility. Поля интерфейса генерируются из schema.

### FR-03 Deterministic calculation

Одинаковые inputs + одна версия модели должны давать одинаковый результат.

### FR-04 Public preliminary mode

Публичный режим не должен требовать внутренних cost inputs и не должен раскрывать internal economics.

### FR-05 Internal detailed mode

Внутренний режим должен позволять учитывать труд, транспорт, оборудование, обработку, overhead, markup/margin и другие разрешённые cost items.

### FR-06 Explainability

Результат должен содержать breakdown и объяснение промежуточных вычислений для пользователей с соответствующим правом.

### FR-07 Versioning

Каждый published calculation model имеет immutable version. Saved calculation фиксирует версию.

### FR-08 Formula management

Формулы должны редактироваться как конфигурация через Studio после появления соответствующего persistence layer, а не через React source.

### FR-09 Scenarios

Один сервис может иметь несколько calculation scenarios без копирования UI.

### FR-10 What-if

Internal mode должен уметь пересчитывать результат при изменении выбранных inputs без изменения сохранённой исходной версии расчёта.

### FR-11 Saved calculations

Расчёт может сохраняться с ID и snapshot.

### FR-12 Export/quote

Расчёт должен быть пригоден как источник данных для КП и экспортных форматов на последующих этапах.

## Non-functional requirements

- deterministic;
- type-safe;
- server/client boundary explicit;
- no arbitrary code execution from formulas;
- backward-compatible migration;
- testable without browser;
- API-ready;
- mobile and desktop capable;
- auditable;
- version-reproducible.

## MVP boundary

### Core

- service selection;
- dynamic inputs;
- deterministic engine;
- safe formula evaluation;
- price result;
- breakdown;
- public/internal boundary;
- model version in result.

### P0

- Calculation Core contract;
- public/internal modes;
- typed domain contracts;
- migration adapter from current calculator;
- regression fixtures;
- first persisted model version;
- first configurable Parameter/Rate/Coefficient/Formula representation.

### P1

- Studio formula builder;
- scenario management;
- unit economics;
- saved calculations;
- what-if;
- quote/export.

### P2

- sharing;
- embed;
- regional pricing;
- advanced analytics;
- AI input extraction.

### Enterprise future

- multi-tenant;
- advanced RBAC;
- external API keys;
- webhooks;
- CRM/ERP integrations;
- standalone app packaging.

## Definition of ready for Stage 03

Stage 03 may start only when:

1. Stage 02 documents are committed.
2. Current project state is known.
3. Migration boundary is explicit.
4. Public/internal boundary is explicit.
5. Core contracts have a clear home outside React/UI.
6. No business logic is changed by Stage 02 itself.
7. A rollback branch/checkpoint exists for the pre-stage state.
