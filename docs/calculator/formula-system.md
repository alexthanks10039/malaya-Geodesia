# Formula System

## Purpose

Formula System is the configuration boundary between business calculation rules and the deterministic Calculation Engine.

The target dependency is:

`Parameters + Coefficients + Rates + Formulas -> resolved variables -> Calculation Engine -> Result`

The UI, HTTP API and database must not be required by the core formula execution path.

## Current implementation

### `lib/formula-engine.ts`

Responsible for:

- tokenizing expressions;
- parsing arithmetic expressions;
- resolving variables;
- resolving formula-to-formula dependencies;
- detecting formula cycles;
- enforcing the allowed function list;
- returning deterministic formula values and execution order.

It deliberately does not use `eval()` or `new Function()`.

### `lib/calculation-engine/config.ts`

Responsible for the configurable business layer:

- `ParameterDefinition`: user/system inputs;
- `CoefficientDefinition`: non-monetary business multipliers;
- `RateDefinition`: monetary or unit rates;
- `ConfigFormula`: deterministic expressions;
- `CalculationConfig`: versioned bundle of the above.

The module converts this configuration into the numeric contract consumed by `lib/calculation-engine.ts`.

## Namespace rule

After resolution, parameters, coefficients, rates and formulas share one variable namespace.

Therefore this is invalid:

`area` as a parameter and also `area` as a coefficient.

The validator rejects cross-category collisions before calculation.

## Output rule

Configured outputs must reference declared formulas. This prevents a configuration from publishing a value that is not actually produced by its calculation model.

## Current limitation

The configuration is currently code-defined. The architecture is prepared for PostgreSQL/CMS persistence, but Stage 05 does not move configuration into the database.

That migration belongs to the versioning/persistence stages and must preserve the same typed contract.

## Safety rules

1. Formula keys use a restricted identifier format.
2. Expressions have bounded size.
3. Only allowlisted mathematical functions are executable.
4. Division by zero is rejected.
5. Cyclic formula dependencies are rejected.
6. Non-finite numeric results are rejected.
7. Unknown input parameters are rejected.
8. Cross-namespace key collisions are rejected.
9. Invalid outputs are rejected before execution.

## Change policy

Any change to formula parsing, configuration resolution or namespace rules requires:

1. checkpoint;
2. smoke tests;
3. TypeScript check;
4. production build;
5. regression comparison with the existing calculator;
6. rollback if any required check fails.

## Next stage input

Stage 06 receives:

- typed Parameter/Coefficient/Rate definitions;
- validated Formula System;
- deterministic Calculation Engine contract;
- calculation trace;
- configuration validation rules.

Stage 06 adds Unit Economics without duplicating formula execution.
