# Super Calculator — Target Architecture

Статус: Stage 02 — целевая архитектура
Источник фактов о текущем коде: `docs/architecture/project-map.json` и `docs/architecture/current-state.md`.

## 1. Product boundary

Система строится вокруг одного deterministic Calculation Core и двух режимов продукта:

- **Public / Preliminary** — быстрый ориентировочный расчёт для клиента. Показывает только разрешённые клиентские показатели.
- **Internal / Detailed** — точный расчёт для менеджера, геодезиста и финансового пользователя. Использует себестоимость, ставки, оборудование, транспорт, маржу и другие внутренние параметры.

Оба режима должны использовать одну модель расчёта и одну версию calculation model. Различие задаётся правами доступа, набором видимых параметров и представлением результата, а не двумя независимыми калькуляторами.

## 2. Target flow

```text
User / API
   ↓
Calculator UI / API adapter
   ↓
Calculation Request
   ↓
Calculation Core
   ├── Input validation
   ├── Parameter resolver
   ├── Rate resolver
   ├── Coefficient resolver
   ├── Formula Engine
   ├── Cost Engine
   ├── Pricing Engine
   └── Unit Economics Engine (internal only)
   ↓
Calculation Snapshot
   ├── result
   ├── breakdown
   ├── explanation
   ├── modelVersion
   └── source/config references
   ↓
Public Result / Internal Result / Quote / Analytics
```

## 3. Separation of responsibilities

### UI
Отвечает только за ввод, состояние интерфейса, валидацию представления и отображение результата. UI не содержит бизнес-формул.

### Application layer
Принимает команду расчёта, определяет режим (`public` / `internal`), загружает модель и передаёт нормализованный request в Calculation Core.

### Calculation Core
Детерминированно выполняет расчёт. Не зависит от React, Next.js routes, браузера или конкретного UI.

### Configuration / Domain data
Хранит услуги, параметры, ставки, коэффициенты, формулы, сценарии и версии. Бизнес-изменения должны происходить здесь, а не через изменение TypeScript-кода.

### Persistence
Хранит опубликованные модели и immutable snapshots расчётов. Исторический расчёт никогда не должен зависеть от текущей опубликованной конфигурации.

### Studio
Предоставляет интерфейс управления конфигурацией, тестирования формул, preview и публикации версии.

## 4. Core domain objects

На Stage 02 фиксируется целевая модель. Она не означает, что все сущности уже существуют в БД.

- `Calculator` — контейнер продукта расчёта.
- `Service` — конкретный вид геодезической услуги.
- `Parameter` — входной параметр услуги.
- `ParameterOption` — варианты параметра.
- `Rate` — денежная/ресурсная ставка.
- `Coefficient` — множитель/условный фактор.
- `Formula` — декларативное правило расчёта.
- `FormulaVariable` — переменная формулы.
- `Scenario` — сохранённый набор бизнес-правил/настроек расчёта.
- `CostItem` — элемент прямой или косвенной себестоимости.
- `UnitEconomicsModel` — внутренняя модель экономики.
- `CalculationModelVersion` — immutable версия опубликованной модели.
- `Calculation` — сохранённый пользовательский расчёт.
- `CalculationSnapshot` — зафиксированные входы, outputs и ссылки на версию модели.
- `Quote` — коммерческое предложение, производное от расчёта.

## 5. Public vs Internal

### Public

Разрешённые данные:
- параметры, необходимые клиенту;
- ориентировочная цена или диапазон;
- ориентировочный срок;
- выбранные работы;
- понятный breakdown без внутренней себестоимости.

Запрещено раскрывать без явной настройки:
- labor cost;
- equipment cost;
- supplier/subcontractor cost;
- overhead;
- internal margin;
- CAC/LTV и другие внутренние показатели.

### Internal

Доступны:
- все необходимые входы;
- direct costs;
- labor/equipment/transport;
- overhead;
- markup/margin;
- contribution margin;
- what-if analysis;
- formula diagnostics;
- version metadata.

Роли и права определяют, какие именно internal поля доступны конкретному пользователю.

## 6. Calculation request contract

```ts
interface CalculationRequest {
  calculatorId: string;
  serviceId: string;
  mode: "public" | "internal";
  scenarioId?: string;
  modelVersion?: string;
  regionId?: string;
  currency?: string;
  inputs: Record<string, unknown>;
  options?: Record<string, unknown>;
}
```

`modelVersion` опционален только при создании нового расчёта: если не указан, application layer выбирает текущую published version. После выполнения фактическая версия обязательно попадает в snapshot.

## 7. Calculation result contract

```ts
interface CalculationResult {
  calculationId?: string;
  calculatorId: string;
  serviceId: string;
  mode: "public" | "internal";
  modelVersion: string;
  currency: string;
  total: number;
  duration?: number;
  breakdown: BreakdownItem[];
  explanation?: ExplanationStep[];
  internal?: UnitEconomicsResult;
  warnings: CalculationWarning[];
}
```

`internal` не должен сериализоваться/возвращаться публичному клиенту, если текущий principal не имеет соответствующего разрешения.

## 8. Formula engine direction

Первый production-вариант должен быть ограниченным и детерминированным. Не использовать `eval` и произвольный JavaScript.

Поддерживаемые конструкции:
- literals;
- input variables;
- rates;
- coefficients;
- arithmetic operators;
- comparisons;
- conditional branches;
- min/max;
- fixed fee;
- per-unit pricing;
- percentage adjustment;
- tiered/progressive rules.

Формула должна иметь структурированное представление/AST либо безопасный ограниченный expression format. Формула должна проходить validation и test fixtures до publication.

## 9. Versioning

Публикуемая модель неизменяема.

```text
Draft
  ↓ validate
Tested
  ↓ publish
Published vX
  ↓ archive
Archived
```

Изменение published model создаёт новую версию. Старые `CalculationSnapshot` продолжают ссылаться на старую версию.

Rollback означает переключение active published version на ранее проверенную версию, а не изменение исторического snapshot.

## 10. Migration from current calculator

Текущий `/calculator` не удаляется на ранних этапах.

Целевая миграция:

```text
Current lib/calculator.ts
        ↓ adapter
Calculation Core contract
        ↓
new model-backed calculation
```

На переходном этапе legacy fallback сохраняется. Новый engine сначала покрывается regression fixtures, затем становится primary path. Удаление fallback возможно только после подтверждённой совместимости.

## 11. Current project integration

Согласно аудиту:

- current public calculator: `/lib/calculator.ts`, `/components/calculator.tsx`;
- current formula engine: `/lib/formula-engine.ts`;
- current calculator config: `/studio/config/calculator.ts`;
- isolated Calculator Lab: `/lib/calculators-lab`, `/components/calculator-lab`, `/app/calculators-lab`, `/app/api/calculators-lab`;
- persistence: `/lib/db.ts`, `/db/migrations`;
- Studio/CMS: `/app/studio`, `/components/studio`, `/lib/cms.ts`.

На Stage 02 эти модули не переписываются. Зафиксирована целевая граница, к которой последующие этапы будут мигрировать текущую реализацию.

## 12. Architecture constraints

1. UI не содержит бизнес-формул.
2. API route не содержит расчётную бизнес-логику.
3. Calculation Core не зависит от Next.js/React.
4. Public и Internal используют общий deterministic core.
5. Внутренние финансовые данные не попадают в public response.
6. Исторический расчёт воспроизводим по model version + snapshot.
7. Любое бизнес-изменение должно быть возможно без изменения React-компонентов.
8. Новая услуга не должна требовать копирования всего calculator UI.
9. Нельзя создавать второй параллельный Calculation Engine без архитектурного обоснования.
10. Любое изменение core требует unit/regression tests.

## 13. Non-goals for MVP

Не реализуются на этом этапе:
- multi-tenant SaaS;
- desktop application;
- full ERP/CRM;
- AI как источник итоговой цены;
- сложная distributed architecture;
- отдельный микросервис Calculation Core.

Сначала core должен быть чистым внутренним domain module с API-ready контрактом.

## 14. Success criteria for the target architecture

Архитектура считается пригодной для следующего этапа, когда:

- текущий calculator и Calculator Lab имеют понятный migration path;
- public/internal режимы определены одним контрактом;
- бизнес-данные отделены от UI;
- расчёт может быть выполнен без React;
- результат содержит model version и breakdown;
- будущие Rate/Coefficient/Parameter/Formula сущности имеют определённое место;
- сохранён backward compatibility plan;
- дальнейшие этапы могут реализовываться последовательно без переписывания проекта целиком.
