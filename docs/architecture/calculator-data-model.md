# Calculator data model — Stage 03

## Purpose

This stage establishes the persistent configuration model for the Super Calculator without replacing the existing calculator runtime. The model separates business configuration from UI and prepares the next stage (Calculation Engine) to consume versioned, deterministic inputs.

## Design rules

1. **Service is the catalog boundary.** `calculator_services` identifies a calculation product such as topographic survey or 3D scanning.
2. **Parameters describe input, not UI.** `calculator_parameters` defines type, unit, validation, defaults and dependencies. A UI can render these definitions, but must not become their source of truth.
3. **Rates and coefficients are business configuration.** They can vary by region and validity period and therefore must not be hard-coded into React components.
4. **Formulas are configuration.** `calculator_formulas` stores expressions and their variable bindings. The calculation engine will validate/evaluate them; SQL never executes expressions.
5. **Scenarios are named configurations.** They support public/internal modes and future Quick/Detailed/Unit Economics/Commercial/Internal flows.
6. **Cost items are the unit-economics building blocks.** They represent direct/indirect cost categories without exposing them automatically to public users.
7. **A calculation model is versioned.** `calculator_models` is the reproducibility boundary. Published versions are snapshots of the configuration required to reproduce a calculation.
8. **Existing calculator remains untouched.** Stage 03 creates the data foundation only. Migration/adaptation happens in later stages.

## Entity map

```text
CalculatorService
├── Parameter
│   └── ParameterOption
├── Rate
├── Coefficient
├── Formula
│   └── FormulaVariable
├── Scenario
├── CostItem
├── UnitEconomicsModel
└── CalculationModel (versioned snapshot)
    ├── Scenario bindings
    └── Unit Economics binding
```

## Implemented in DB

| Entity | Table | Role |
|---|---|---|
| Service | `calculator_services` | Extensible calculator/service catalog |
| Parameter | `calculator_parameters` | Dynamic calculation inputs |
| ParameterOption | `calculator_parameter_options` | Select/multiselect options |
| Rate | `calculator_rates` | Labor, equipment, transport and other rates |
| Coefficient | `calculator_coefficients` | Complexity/urgency/distance/etc. factors |
| Formula | `calculator_formulas` | Human-editable expression definitions |
| FormulaVariable | `calculator_formula_variables` | Explicit formula dependency bindings |
| Scenario | `calculator_scenarios` | Public/internal calculation scenarios |
| CostItem | `calculator_cost_items` | Unit-economics cost structure |
| UnitEconomicsModel | `calculator_unit_economics_models` | Financial configuration |
| CalculationModel | `calculator_models` | Versioned reproducibility snapshot |
| ModelScenario | `calculator_model_scenarios` | Scenario membership for a model version |
| ModelUnitEconomics | `calculator_model_unit_economics` | Financial model binding |

## Intentionally not implemented yet

The following belong to later stages and are therefore not added as runtime behavior here:

- `Calculation` and `CalculationResult` persistence;
- quote/export entities;
- API contracts for the new engine;
- formula AST/parser replacement;
- Studio CRUD for these tables;
- public/internal UI split implementation;
- RBAC/permissions for financial visibility;
- migration of the current `CalculatorStudioConfig` into DB rows.

## Compatibility

The current code-based calculator and `CalculatorDefinition` contract remain valid. The new schema is additive and has no dependency from the current public calculator on the new tables yet.

## Next-stage input

Stage 04 must consume this model and define a pure Calculation Engine that accepts a **resolved published `calculator_models` snapshot + normalized input values** and returns a deterministic, explainable result. The engine must not read React state directly and must not mutate database configuration.

## Checkpoint

**CHECKPOINT-03**: foundational calculator data model added as migration `db/migrations/0004_calculator_core.sql`; no existing calculator business logic changed.
