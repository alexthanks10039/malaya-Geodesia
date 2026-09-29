# Calculator Product Blueprint

Дата: 2026-09-29
Проект: Малая геодезия

## 0. Executive decision

Цель: превратить калькулятор стоимости в универсальную deterministic Calculation & Pricing Platform.

Архитектурная цепочка:

UI → Application API → Calculation Core → Published Calculation Model → Catalog / Rates / Coefficients / Rules → Database

Calculation Core должен быть чистым TypeScript-модулем без React, Next.js, PostgreSQL, cookies и AI.

Одна и та же модель должна работать в публичном калькуляторе, Manager/Finance режиме, Studio, API, будущей PWA/Desktop версии и embeddable widget.

Ключевой объект воспроизводимости: Calculation хранит ссылку на immutable CalculationModelVersion и snapshot входов/результатов. Изменение тарифа никогда не изменяет исторический расчёт.

## 1. Current architecture audit

Текущий проект уже содержит:
- components/calculator.tsx — публичный 4-шаговый wizard;
- lib/calculator.ts — расчёт цены/срока и breakdown;
- lib/formula-engine.ts — безопасный arithmetic parser без eval;
- studio/config/calculator.ts — методы, форматы, срочность, коэффициенты и формулы;
- components/studio/calculator-editor.tsx — редактирование текущей конфигурации и live test;
- PostgreSQL + SQL migrations;
- CMS CRUD/version/audit/file layer;
- Calculator Lab с registry/engine и 7 техническими калькуляторами;
- API manifest для Calculator Lab.

Ограничения:
1. Service сейчас представляет собой массив types, а не полноценную сущность.
2. Большинство Parameters implicit и связаны с конкретным React UI.
3. Rates и Coefficients смешаны внутри calculator config.
4. Formula engine использует JS number и не имеет полноценного typed AST и trace.
5. Rules ограничены списком строк и conditionCount.
6. Нет immutable published calculation model.
7. Нет полноценного сохранённого Calculation snapshot.
8. Нет отдельного Cost Engine и Unit Economics Engine.
9. Source of truth текущего Studio config — browser/localStorage.
10. Current admin auth намеренно открыт. Финансовый контур нельзя защищать только этой проверкой.

Вывод: сайт не надо переписывать. Нужно добавить новый Calculation Core и сделать adapter от старого /calculator.

## 2. Product Vision

Система позволяет бизнесу собирать модель расчёта:

Service → Parameters → Rates → Coefficients → Rules → Formulas → Cost Structure → Pricing → Scenario → Result.

Client видит customer result.
Manager видит commercial breakdown.
Finance видит economics.
Admin управляет model.
Engineer отвечает за engine contracts.

## 3. Jobs-to-be-Done

Client:
"Дай реалистичный ориентир цены и срока без звонка менеджеру."

Manager:
"Собери расчёт, измени допущения и подготовь КП."

Engineer:
"Проверь технические объёмы, нормативы, оборудование и трудозатраты."

Finance:
"Пойми себестоимость и последствия изменения ставки."

Owner:
"Пойми экономику каждого типа проекта."

Admin:
"Измени прайс, коэффициент или формулу без frontend release."

## 4. User roles

Client:
- public published calculator;
- estimate;
- share;
- request quote.

Manager/PM:
- saved calculations;
- scenarios;
- commercial parameters;
- quote.

Engineer:
- technical inputs;
- resource assumptions;
- technical validation.

Finance:
- cost items;
- margins;
- customer economics.

Admin:
- catalog;
- rates;
- coefficients;
- formulas;
- rules;
- versions;
- publish.

Viewer:
- read-only.

Enterprise future:
- Tenant Admin;
- Regional Admin;
- API Client.

## 5. Information Architecture

Public:
- /calculators
- /calculators/[slug]
- /calculator — legacy compatibility
- /calculations/[id]

Internal:
- /studio/calculators
  - Overview
  - Services
  - Parameters
  - Rate Cards
  - Coefficients
  - Rules
  - Formulas
  - Cost Structure
  - Unit Economics
  - Scenarios
  - Versions
  - Test Lab
  - Preview
  - Audit

## 6. Core domain model

Calculator:
id, slug, name, description, status, category, default_mode, current_published_version_id, timestamps.

Service:
id, key, name, description, unit, active.

Parameter:
id, key, name, type, unit, data_type, default_value, min_value, max_value, options, validation, description, active.

ServiceParameter:
service_id, parameter_id, required, order, visibility_rule, default_override, validation_override.

Rate:
id, key, name, value, currency, unit, scope, region_id, valid_from, valid_to, source, status.

Coefficient:
id, key, name, value_type, numeric_value, table_rule, service_id, region_id, valid_from, valid_to, description, status.

Formula:
id, key, name, expression_ast, output_type, unit, description, enabled.

Rule:
id, key, priority, conditions, actions, hit_policy, enabled.

Scenario:
id, calculator_version_id, key, name, overrides, visibility, active.

CostItem:
id, key, type, driver, rate_id, formula_id, allocation_method, taxable, direct_or_overhead, active.

UnitEconomicsModel:
id, calculator_version_id, revenue_formula, cogs_formula, overhead_formula, contribution_formula, margin_policy, customer_economics_model, currency.

CalculationModelVersion:
id, calculator_id, version_major, version_minor, status, schema_version, engine_version, configuration_json, checksum, author_id, comment, published_at, archived_at.

Calculation:
id, public_code, calculator_id, model_version_id, scenario_id, mode, region_id, currency, input_snapshot, variable_snapshot, trace_snapshot, result_snapshot, created_by, created_at.

Quote:
id, calculation_id, customer snapshot, scope snapshot, commercial terms snapshot, document metadata.

AuditLog:
append-only actor/action/before/after/metadata/correlation id.

## 7. Relationships

Calculator 1:N CalculationModelVersion.
CalculationModelVersion 1:N Scenario.
CalculationModelVersion N:M Service.
Service N:M Parameter through ServiceParameter.
Formula references inputs/rates/coefficient/formulas.
Rule references inputs/variables and emits deterministic actions.
Calculation references exactly one model version.
Quote references exactly one Calculation.
AuditLog references mutable configuration entities.

## 8. Calculation Core

Recommended package boundary:

lib/calculation-core/
- types
- schema
- expression/lexer
- expression/parser
- expression/ast
- expression/evaluator
- rules/engine
- pricing/engine
- cost/engine
- unit-economics/engine
- trace
- validator
- hash

Contract:

CalculationRequest:
calculatorId
modelVersionId
inputs
scenarioId
mode
context = regionId, currency, taxProfileId

CalculationResponse:
calculationId
modelVersionId
result
trace
warnings

Invariant:
same model version + same inputs + same context = same result.

## 9. Formula Engine

Current parser is a useful prototype. Production should evolve to:

expression string → tokens → AST → validation → evaluator.

AST:
- literal
- variable
- unary
- binary
- function
- conditional
- lookup
- tier
- aggregate

Functions:
abs, ceil, floor, min, max, clamp, pow, round, roundTo.

Later:
if, sum, avg, tier, lookup, coalesce.

No eval, Function constructor or arbitrary user JavaScript.

Store:
- source expression;
- compiled AST;
- dependencies;
- result type;
- unit;
- validation status.

Studio shows visual builder first and raw expression as advanced mode.

## 10. Rules / decision tables

MVP rule model:
- all / any / not;
- eq / neq / gt / gte / lt / lte / in;
- left operand = input/variable/formula;
- right operand = literal/reference;
- action = set/add/multiply/enable/disable/setRate.

Decision table UI compiles into the same internal rule model.

Reference patterns:
JSON rules engines provide serializable nested boolean conditions and safe evaluation without eval. DMN provides formal decision tables and hit policies. For this product, those are patterns to borrow, not dependencies to import wholesale. Sources: json-rules-engine and Drools DMN. citeturn475201search0turn475201search2turn542938search1

## 11. Pricing models

Core should support:
- flat;
- per unit;
- per area;
- per length;
- per point;
- package;
- tiered/graduated;
- volume;
- stairstep;
- base fee + usage;
- cost-plus;
- base cost + markup;
- minimum charge;
- maximum charge;
- discounts;
- surcharges.

Stripe and Chargebee expose similar explicit pricing models, including flat, per-unit, tiered, volume and usage/package patterns. citeturn475201search6turn784524search0turn784524search1

Important distinction:
tiered/graduated pricing bills successive quantity bands;
volume pricing applies one rate based on the total band reached. citeturn475201search6turn784524search3

Recommended domain object:
PriceRule = model + driver + optional tiers + base + unitRate + min/max + adjustments.

## 12. Cost Engine

Price and cost are independent.

Flow:
Operational Inputs
→ Resource Requirements
→ Resource Quantities
→ Rates
→ Direct Costs
→ Overhead Allocation
→ COGS
→ Gross Profit
→ Contribution Margin.

Examples:
labor = team_hours × labor_rate
transport = km × vehicle_rate + visits × visit_fee
equipment = equipment_hours × equipment_rate
processing = processed_area × processing_rate
subcontractor = units × supplier_rate

Never calculate cost as a percentage of price unless the business rule explicitly says so.

## 13. Unit economics

Project level:
- Revenue
- COGS
- Direct Costs
- Labor
- Equipment
- Transport
- Processing
- Subcontractors
- Overhead
- Gross Profit
- Gross Margin
- Markup
- Contribution Margin

Customer/business level:
- CAC
- ARPU
- ARPPU
- retention
- repeat rate
- LTV
- ROMI
- payback.

Important:
CAC/LTV/ARPU/ARPPU are not intrinsic to a single project. They belong to customer/company analytics and must remain outside the deterministic project pricing kernel.

## 14. Explainability / calculation trace

Every calculation returns a trace tree.

Example:
price = 405000 KZT
base = 250000
area = 5000 m2
rate = 30 KZT/m2
complexity = 1.20x
urgency = 1.30x
transport = 30000
total = 405000

Each trace node has:
- key;
- label;
- input values;
- formula;
- intermediate result;
- source rate/coefficient;
- version;
- unit.

This powers audit, Studio Test Lab and customer-friendly "How calculated" view.

## 15. Versioning

Publishing:
Draft → Validate → Regression Tests → Publish → Immutable.

Historical Calculation stores:
- model_version_id;
- engine_version;
- input_snapshot;
- resolved_variables;
- result;
- trace.

Rate changes must create a new effective model or resolve from an effective-dated rate card. Historical calculation remains tied to the earlier version.

Deterministic versioning is a proven pattern for systems where existing executions must continue under the logic they started with. citeturn672366search12turn672366search0

## 16. Dynamic schema

Use JSON Schema 2020-12 for structural validation of dynamic model configuration and input documents. JSON Schema supports types, enums and conditional if/then/else validation. citeturn672366search4turn672366search9

Do not use JSON Schema as the calculation language. Schema validates; Calculation DSL evaluates.

## 17. Money and precision

Current project uses JavaScript number. Technical geometry may continue to use floating point where acceptable.

Financial math should use Decimal arithmetic.
JavaScript Number is IEEE-754 binary floating point with 53-bit integer precision. citeturn672366search10turn672366search5
PostgreSQL numeric/decimal is exact and supports explicit precision. citeturn672366search11

Recommendation:
- DB monetary/rate values = numeric;
- financial engine = Decimal;
- intermediate rounding only when formula explicitly requires it;
- final display rounding according to currency policy.

## 18. Region, currency, tax

MVP:
- KZT;
- one default region;
- configurable tax profile.

Future:
Region → RateCard → Rate.
Currency → RoundingPolicy.
TaxProfile → TaxRule.

No tax, wage or regional price constants inside React or core code.

## 19. UX architecture

Public:
1. Select service.
2. Required inputs.
3. Conditional advanced sections.
4. Scenario/urgency.
5. Live result.
6. Breakdown.
7. Save/share/request quote.

Progressive disclosure, smart defaults, contextual help and inline validation.

Desktop:
left input workspace, right sticky result.

Mobile:
one logical section at a time, sticky total and bottom CTA.

Never expose all 30 fields at once.

## 20. Modes

Quick Estimate:
minimal inputs, customer-friendly.

Detailed Calculation:
all operational drivers.

Internal Calculation:
cost + margin.

Unit Economics:
financial model.

Commercial Proposal:
calculation + scope + terms + quote.

Modes control visibility and workflow, not calculation truth. All modes call the same model version.

## 21. Scenarios / What-if

Scenario is a named set of model overrides.

What-if is temporary and never mutates the model.

POST /api/calculations/what-if:
baseCalculationId
overrides

Response:
- price delta;
- cost delta;
- gross profit delta;
- margin delta;
- duration delta.

## 22. Studio / Admin

Calculator Studio:
- Overview
- Services
- Parameters
- Rate Cards
- Coefficients
- Rules
- Formulas
- Cost Structure
- Unit Economics
- Scenarios
- Versions
- Test Lab
- Preview
- Audit.

Formula editor:
left = model tree
center = formula builder
right = variables/properties
bottom = test runner

Raw expression mode is advanced, not default.

## 23. Formula Test Lab

Each model version has fixtures.

Fixture:
- test name;
- input JSON;
- expected outputs;
- tolerance;
- expected warnings.

Publishing is blocked if mandatory regression fixtures fail.

## 24. API

Public:
GET /api/calculators
GET /api/calculators/:slug
POST /api/calculations/estimate
POST /api/calculations/what-if
POST /api/calculations
GET /api/calculations/:id
POST /api/calculations/:id/share
POST /api/calculations/:id/quote

Admin:
CRUD /api/admin/calculators
CRUD /api/admin/services
CRUD /api/admin/parameters
CRUD /api/admin/rates
CRUD /api/admin/coefficients
CRUD /api/admin/rules
CRUD /api/admin/formulas
CRUD /api/admin/scenarios
CRUD /api/admin/versions
CRUD /api/admin/formula-tests

Version APIs separately:
v1 remains stable while implementation evolves.

Public API returns an allowlist of customer-safe result fields only.

## 25. Standalone / offline

Package boundary:
@malaya/calculation-core
↑
web adapter / API / desktop / mobile / widget

Offline candidates:
- public calculation;
- public published configuration;
- static geometry/calculation functions.

Server-side:
- protected cost model;
- internal rates;
- finance data;
- customer/account data.

Public widget must never receive private finance configuration.

## 26. Embeddable

Do not embed a Next.js page as the product boundary.

Later package:
@malaya/calculator-widget

Delivery modes:
- iframe;
- Web Component;
- React package;
- API-only.

Embed token should define:
calculator;
model version;
locale;
visible fields;
result allowlist;
theme;
callback.

## 27. AI layer

AI sits before deterministic calculation:

Natural language
→ structured extraction
→ schema validation
→ user confirmation
→ CalculationRequest
→ deterministic engine.

AI use cases:
- parameter collection;
- clarification;
- scenario suggestion;
- result explanation;
- quote draft.

AI must not:
- invent prices;
- mutate published models;
- bypass validation;
- become the source of truth.

## 28. Security / RBAC

Current Studio auth is intentionally open. Before exposing internal economics, implement real authorization.

Permission groups:
- calculator.read_public
- calculation.create
- calculation.read
- cost.read
- formula.write
- rate.write
- model.publish
- quote.write
- audit.read
- admin.manage

Public endpoints should be response-allowlisted, never "hide finance fields in UI".

## 29. Audit

Configuration mutation records:
- actor;
- timestamp;
- entity;
- action;
- before;
- after;
- comment;
- model version;
- correlation/request id.

Publish and archive are auditable events.

Calculation record is immutable.

## 30. Analytics

Separate analytics from Calculation Core.

Events:
calculator_open
service_selected
calculation_started
calculation_completed
calculation_error
scenario_selected
quote_created
lead_submitted
calculation_shared

Derived:
- completion;
- estimate→lead;
- quote conversion;
- average quote;
- margin by service;
- usage by service;
- input failure rate.

## 31. Migration strategy

Phase A — Adapter
Keep /calculator UI.
Map legacy input to new CalculationRequest.
Run new core and return legacy CalculatorEstimate.

Phase B — Shadow mode
Run legacy and new engine in parallel.
Store result comparison.
Define accepted difference thresholds.

Phase C — Feature flag
calculatorEngine=v2.
Switch traffic to new core.
Keep legacy rollback.

Phase D — Persisted models
Move calculator config from localStorage to DB-backed versioned models.
Migrate current Studio config into model v1.0.

Phase E — Deprecation
Retire old lib/calculator.ts path only after regression coverage and successful historical replay.

## 32. MVP / CORE / P0 / P1 / P2 / ENTERPRISE

CORE:
- service catalog;
- dynamic parameters;
- rates;
- coefficients;
- arithmetic formulas;
- rules;
- cost items;
- price;
- trace;
- immutable model versions;
- saved calculation;
- safe public/private separation.

P0:
- Calculation Core;
- schema;
- Service/Parameter/Rate/Coefficient;
- AST formula engine;
- small rule engine;
- deterministic trace;
- versioned DB model;
- calculation API;
- legacy adapter;
- Studio MVP;
- regression tests.

P1:
- scenarios;
- what-if;
- Cost Engine;
- Unit Economics;
- Quote;
- saved calculations;
- sharing;
- regional rate cards;
- currencies/taxes.

P2:
- visual decision tables;
- analytics;
- API keys;
- widget SDK;
- offline public bundle;
- AI parameter adapter.

Enterprise future:
- multi-tenant;
- SSO/SAML/OIDC;
- approval workflow;
- tenant-specific rate cards;
- API management;
- webhooks;
- ERP/CRM;
- regional organizations;
- audit retention;
- signed share tokens;
- SLA/observability.

## 33. Technical backlog

P0:
CALC-001 Calculation Core contracts
CALC-002 Extract formula evaluator interface
CALC-003 AST parser/evaluator
CALC-004 Decimal financial arithmetic
CALC-005 Parameter schema validator
CALC-006 Model validator
CALC-007 Trace engine
CALC-008 Calculation model/version tables
CALC-009 Service/Parameter/Rate/Coefficient tables
CALC-010 Calculation API
CALC-011 Legacy adapter
CALC-012 Calculation snapshots

P1:
CALC-020 Scenario engine
CALC-021 What-if API
CALC-022 Cost Engine
CALC-023 Unit Economics
CALC-024 Quote generator
CALC-025 Save/share
CALC-026 Regional pricing
CALC-027 Currency/tax

P2:
CALC-040 Visual rules
CALC-041 Analytics
CALC-042 Widget SDK
CALC-043 Offline public package
CALC-044 AI adapter

## 34. UX backlog

UX-001 Dynamic schema-driven wizard
UX-002 Sticky result/breakdown
UX-003 Mode switcher
UX-004 Progressive disclosure
UX-005 What-if controls
UX-006 Trace visualization
UX-007 Formula Test Lab
UX-008 Manager/Finance workspace
UX-009 Mobile bottom result
UX-010 Accessibility
UX-011 RU/KZ/EN localization layer

## 35. QA backlog

QA-001 Golden fixtures per model version
QA-002 Parser/AST unit tests
QA-003 Formula dependency cycle tests
QA-004 Rule conflict tests
QA-005 Rounding tests
QA-006 Boundary tests
QA-007 Decimal precision tests
QA-008 Version replay tests
QA-009 Legacy/new shadow comparison
QA-010 API contract tests
QA-011 RBAC tests
QA-012 Public/internal field leakage tests
QA-013 E2E public estimate
QA-014 E2E manager → quote
QA-015 E2E admin edit → publish → calculate
QA-016 Responsive mobile tests
QA-017 Property/metamorphic tests for business invariants

## 36. Definition of Done

A calculator is production-ready when:
- service/parameters/rates are data-driven;
- no business price constant is required in React;
- formulas/rules validate;
- published model is immutable;
- calculation references exact model version;
- result is reproducible;
- trace explains result;
- public response contains no protected economics;
- unit tests cover normal/boundary cases;
- E2E passes;
- rollback is possible;
- Studio preview equals public runtime.

A model release is production-ready when:
- regression suite passes;
- checksum is stored;
- publish is audited;
- previous model remains usable for historical calculations.

## 37. Acceptance criteria

1. Admin creates a new service without editing TypeScript.
2. Admin adds parameter siteVisits.
3. Admin adds rate visitFee.
4. Admin adds coefficient terrainFactor.
5. Admin creates formula price = base + siteVisits * visitFee.
6. Admin publishes model v1.0.
7. Client selects service and enters values.
8. Engine returns price + trace.
9. Admin changes visitFee.
10. System creates model v1.1.
11. New calculations use v1.1.
12. Old calculations still resolve from v1.0.
13. Manager sees cost/margin.
14. Client cannot access internal economics.
15. Invalid formula blocks publication.
16. Existing /calculator still works during migration.
17. Browser and server execution of the same request match.

## 38. Recommended delivery sequence

Sprint A:
Core + schemas + versioning + adapter.

Sprint B:
DB + API + public dynamic calculator.

Sprint C:
Studio Service/Parameter/Rate/Coefficient/Formula/Test Lab.

Sprint D:
Cost + Unit Economics + Calculation history + Quote.

Sprint E:
Scenarios + What-if + analytics.

Sprint F:
Widget + offline + AI.

Do not start multi-tenant/SSO/ERP before deterministic core + versioning + end-to-end replay are stable.

## 39. Final product boundary

The product should not create multiple independent calculation engines.

Use one Calculation Core with:
- reusable primitives;
- service-specific schemas;
- multiple calculation models;
- multiple pricing/cost strategies.

The Calculator Lab becomes the source of technical/domain calculations, not the final public architecture.

The existing /calculator becomes a compatibility surface over the new engine.

Final platform boundary:

Catalog + Model Studio + Calculation Core + Pricing/Cost + Calculation Snapshot + Quote/API.
