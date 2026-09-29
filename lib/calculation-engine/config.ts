/**
 * ARCHITECTURE: Configuration model for the Super Calculator.
 *
 * This module is deliberately UI/HTTP/DB agnostic. It defines the business
 * configuration that can later be stored in CMS/PostgreSQL without changing
 * the Calculation Engine contract.
 *
 * Responsibility split:
 * - ParameterDefinition: what the user may enter.
 * - CoefficientDefinition: business multipliers controlled by configuration.
 * - RateDefinition: monetary/unit rates controlled by configuration.
 * - ConfigFormula: deterministic calculation rules.
 * - CalculationConfig: one versioned bundle of the above.
 *
 * Current stage intentionally keeps this model in code. Stage 03/04 created
 * the domain engine; this stage gives it a stable configuration boundary.
 */

import type { CalculationModel } from "@/lib/calculation-engine";

export type ParameterType = "number" | "select" | "boolean";

export type NumericParameterOption = {
  /** Stable machine value used by the UI. */
  value: string;
  /** Human-readable label. */
  label: string;
  /** Numeric value exposed to the formula engine. */
  numericValue: number;
};

export type ParameterDefinition = {
  key: string;
  label: string;
  type: ParameterType;
  unit?: string;
  description?: string;
  required?: boolean;
  defaultValue?: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: NumericParameterOption[];
};

export type CoefficientDefinition = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  description?: string;
  source?: string;
};

export type RateDefinition = {
  key: string;
  label: string;
  value: number;
  unit: string;
  currency?: string;
  description?: string;
  source?: string;
};

export type ConfigFormula = {
  key: string;
  expression: string;
  description?: string;
  enabled?: boolean;
};

export type CalculationConfig = {
  id: string;
  version: string;
  parameters: ParameterDefinition[];
  coefficients?: CoefficientDefinition[];
  rates?: RateDefinition[];
  formulas: ConfigFormula[];
  outputs: string[];
};

export type ConfigResolution =
  | {
      ok: true;
      model: CalculationModel;
      variables: Record<string, number>;
    }
  | {
      ok: false;
      error: string;
      diagnostics: string[];
    };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function fail(message: string): never {
  throw new Error(message);
}

/**
 * ARCHITECTURE: Input normalization boundary.
 * UI may provide strings (for example from HTML inputs), but the domain
 * engine receives only validated numeric variables. No React state leaks in.
 */
function resolveParameterValue(
  parameter: ParameterDefinition,
  rawValue: unknown,
): number {
  const value = rawValue === undefined ? parameter.defaultValue : rawValue;

  if (value === undefined || value === null || value === "") {
    if (parameter.required !== false) {
      return fail(`Параметр "${parameter.key}" обязателен.`);
    }
    return 0;
  }

  let numericValue: number;

  if (parameter.type === "boolean") {
    if (typeof value === "boolean") numericValue = value ? 1 : 0;
    else if (value === "true" || value === "1" || value === 1) numericValue = 1;
    else if (value === "false" || value === "0" || value === 0) numericValue = 0;
    else return fail(`Параметр "${parameter.key}" должен быть boolean.`);
  } else if (parameter.type === "select") {
    const option = parameter.options?.find((item) => item.value === String(value));
    if (!option) return fail(`Недопустимое значение параметра "${parameter.key}".`);
    numericValue = option.numericValue;
  } else {
    numericValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numericValue)) {
      return fail(`Параметр "${parameter.key}" должен быть числом.`);
    }
  }

  if (!isFiniteNumber(numericValue)) {
    return fail(`Параметр "${parameter.key}" должен быть конечным числом.`);
  }
  if (parameter.min !== undefined && numericValue < parameter.min) {
    return fail(`Параметр "${parameter.key}" меньше минимального значения ${parameter.min}.`);
  }
  if (parameter.max !== undefined && numericValue > parameter.max) {
    return fail(`Параметр "${parameter.key}" больше максимального значения ${parameter.max}.`);
  }

  return numericValue;
}

function assertUniqueKeys(kind: string, keys: string[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (!key.trim()) fail(`Пустой ключ ${kind}.`);
    if (seen.has(key)) fail(`Дублирующийся ключ ${kind}: "${key}".`);
    seen.add(key);
  }
}

/**
 * ARCHITECTURE: Converts business configuration into the existing pure
 * CalculationModel. This is the compatibility seam between configurable
 * business data and the deterministic engine implemented in stage 04.
 */
export function resolveCalculationConfig(
  config: CalculationConfig,
  inputs: Record<string, unknown>,
): ConfigResolution {
  try {
    if (!config.id.trim()) fail("Calculation config id обязателен.");
    if (!config.version.trim()) fail("Calculation config version обязателен.");
    if (!config.formulas.length) fail("Calculation config должен содержать формулы.");

    assertUniqueKeys("параметров", config.parameters.map((item) => item.key));
    assertUniqueKeys("коэффициентов", (config.coefficients ?? []).map((item) => item.key));
    assertUniqueKeys("тарифов", (config.rates ?? []).map((item) => item.key));
    assertUniqueKeys("формул", config.formulas.map((item) => item.key));

    const parameterKeys = new Set(config.parameters.map((item) => item.key));
    for (const inputKey of Object.keys(inputs)) {
      if (!parameterKeys.has(inputKey)) {
        fail(`Неизвестный входной параметр "${inputKey}".`);
      }
    }

    const variables: Record<string, number> = {};
    for (const parameter of config.parameters) {
      variables[parameter.key] = resolveParameterValue(parameter, inputs[parameter.key]);
    }

    for (const coefficient of config.coefficients ?? []) {
      if (!isFiniteNumber(coefficient.value)) {
        fail(`Коэффициент "${coefficient.key}" должен быть числом.`);
      }
      variables[coefficient.key] = coefficient.value;
    }

    for (const rate of config.rates ?? []) {
      if (!isFiniteNumber(rate.value)) {
        fail(`Тариф "${rate.key}" должен быть числом.`);
      }
      variables[rate.key] = rate.value;
    }

    const variableKeys = new Set(Object.keys(variables));
    for (const formula of config.formulas) {
      if (variableKeys.has(formula.key)) {
        fail(`Ключ формулы "${formula.key}" конфликтует с параметром/коэффициентом/тарифом.`);
      }
    }

    return {
      ok: true,
      model: {
        id: config.id,
        version: config.version,
        formulas: config.formulas.map(({ key, expression, enabled }) => ({
          key,
          expression,
          enabled,
        })),
        outputs: config.outputs,
      },
      variables,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось подготовить конфигурацию расчёта.";
    return { ok: false, error: message, diagnostics: [message] };
  }
}
