/**
 * ARCHITECTURE: Legacy pricing service / migration adapter.
 * Содержит текущую реализацию публичного расчёта до полного перехода на Calculation Core.
 * Не добавляем сюда новые независимые формулы: цель модуля — безопасная совместимость со старым /calculator.
 */

import {
  evaluateFormulas,
  validateFormulaDefinitions,
} from "@/lib/formula-engine";
import {
  defaultCalculatorStudioConfig,
  type CalculatorStudioConfig,
} from "@/studio/config/calculator";

export type CalculatorInput = {
  type: string;
  area: number;
  complexity: string[];
  output: string;
  urgency?: string;
};

export type EstimateBreakdownItem = {
  key: string;
  label: string;
  value: number;
  kind: "input" | "factor" | "formula";
};

export type CalculatorEstimate = {
  price: number;
  days: number;
  breakdown: EstimateBreakdownItem[];
  formulaValues: Record<string, number>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildCoefficientVariables(config: CalculatorStudioConfig): Record<string, number> {
  return Object.fromEntries(
    config.pricing.coefficients.map((coefficient) => [coefficient.key, coefficient.value]),
  );
}

function resolveUrgency(input: CalculatorInput, config: CalculatorStudioConfig): {
  urgency: string;
  selectedUrgencyFactor: number;
  urgencyDaysReduction: number;
  urgencyMinDays: number;
} {
  const urgency = input.urgency && config.urgencies.includes(input.urgency)
    ? input.urgency
    : config.urgencies[0] ?? "Обычный срок";

  const index = config.urgencies.indexOf(urgency);
  const selectedUrgencyFactor = config.pricing.urgencyFactor[urgency] ?? 1;

  if (index === 2) {
    return {
      urgency,
      selectedUrgencyFactor,
      urgencyDaysReduction: config.pricing.veryUrgentDaysReduction,
      urgencyMinDays: 1,
    };
  }

  if (index === 1) {
    return {
      urgency,
      selectedUrgencyFactor,
      urgencyDaysReduction: config.pricing.urgentDaysReduction,
      urgencyMinDays: 2,
    };
  }

  return {
    urgency,
    selectedUrgencyFactor,
    urgencyDaysReduction: 0,
    urgencyMinDays: 2,
  };
}

export function buildCalculatorVariables(
  input: CalculatorInput,
  config: CalculatorStudioConfig = defaultCalculatorStudioConfig,
): Record<string, number> {
  const pricing = config.pricing;
  const area = clamp(
    Number.isFinite(input.area) ? input.area : pricing.minArea,
    pricing.minArea,
    pricing.maxArea,
  );
  const type = config.types.find((item) => item.name === input.type)?.name ?? config.types[0]?.name ?? "";
  const basePrice = pricing.base[type] ?? pricing.base[config.types[0]?.name ?? ""] ?? 0;
  const selectedFormatFactor = pricing.formatFactor[input.output] ?? 1;
  const urgency = resolveUrgency(input, config);

  return {
    area,
    areaBase: pricing.areaBase,
    minAreaFactor: pricing.minAreaFactor,
    maxAreaFactor: Math.max(pricing.minAreaFactor, pricing.maxAreaFactor),
    basePrice,
    conditionCount: input.complexity.length,
    complexityFactorPerCondition: pricing.complexityFactorPerCondition,
    selectedFormatFactor,
    selectedUrgencyFactor: urgency.selectedUrgencyFactor,
    dayBase: pricing.dayBase,
    dayAreaWeight: pricing.dayAreaWeight,
    dayComplexityWeight: pricing.dayComplexityWeight,
    urgentDaysReduction: pricing.urgentDaysReduction,
    veryUrgentDaysReduction: pricing.veryUrgentDaysReduction,
    urgencyDaysReduction: urgency.urgencyDaysReduction,
    urgencyMinDays: urgency.urgencyMinDays,
    roundingStep: pricing.roundingStep,
    ...buildCoefficientVariables(config),
  };
}

function legacyEstimate(input: CalculatorInput, config: CalculatorStudioConfig): CalculatorEstimate {
  const pricing = config.pricing;
  const variables = buildCalculatorVariables(input, config);
  const areaFactor = clamp(
    variables.area / variables.areaBase,
    variables.minAreaFactor,
    variables.maxAreaFactor,
  );
  const complexityFactor = 1 + variables.conditionCount * variables.complexityFactorPerCondition;
  const formatFactor = variables.selectedFormatFactor;
  const deadlineFactor = variables.selectedUrgencyFactor;
  const raw = variables.basePrice * areaFactor * complexityFactor * formatFactor * deadlineFactor;
  const price = Math.round(raw / pricing.roundingStep) * pricing.roundingStep;

  const baseDays = Math.max(
    2,
    Math.round(
      pricing.dayBase +
      areaFactor * pricing.dayAreaWeight +
      variables.conditionCount * pricing.dayComplexityWeight,
    ),
  );
  const urgency = resolveUrgency(input, config);
  const days = urgency.urgency === "Очень срочно"
    ? Math.max(1, baseDays - pricing.veryUrgentDaysReduction)
    : urgency.urgency === "Срочно"
      ? Math.max(2, baseDays - pricing.urgentDaysReduction)
      : baseDays;

  const formulaValues = {
    areaFactor,
    complexityFactor,
    formatFactor,
    urgencyFactor: deadlineFactor,
    rawPrice: raw,
    price,
    baseDays,
    days,
  };

  return {
    price,
    days,
    formulaValues,
    breakdown: [
      { key: "basePrice", label: "База", value: variables.basePrice, kind: "input" },
      { key: "areaFactor", label: "Площадь", value: areaFactor, kind: "factor" },
      { key: "complexityFactor", label: "Условия", value: complexityFactor, kind: "factor" },
      { key: "formatFactor", label: "Формат", value: formatFactor, kind: "factor" },
      { key: "urgencyFactor", label: "Срочность", value: deadlineFactor, kind: "factor" },
    ],
  };
}

export function getFormulaDiagnostics(
  config: CalculatorStudioConfig = defaultCalculatorStudioConfig,
): string[] {
  const firstType = config.types[0]?.name ?? "";
  const firstOutput = config.outputs[0] ?? "DWG";
  const variables = buildCalculatorVariables(
    {
      type: firstType,
      area: Math.max(config.pricing.minArea, 1000),
      complexity: [],
      output: firstOutput,
      urgency: config.urgencies[0],
    },
    config,
  );

  const errors = validateFormulaDefinitions(config.formulas.definitions, variables);

  if (!config.formulas.definitions.some((item) => item.key === config.formulas.priceFormulaKey && item.enabled !== false)) {
    errors.push("Не выбрана активная формула цены.");
  }

  if (!config.formulas.definitions.some((item) => item.key === config.formulas.daysFormulaKey && item.enabled !== false)) {
    errors.push("Не выбрана активная формула срока.");
  }

  return Array.from(new Set(errors));
}

export function calculateEstimate(
  input: CalculatorInput,
  config: CalculatorStudioConfig = defaultCalculatorStudioConfig,
): CalculatorEstimate {
  const diagnostics = getFormulaDiagnostics(config);
  if (diagnostics.length) return legacyEstimate(input, config);

  try {
    const variables = buildCalculatorVariables(input, config);
    const evaluation = evaluateFormulas(config.formulas.definitions, variables);
    const price = Math.max(0, Math.round(evaluation.values[config.formulas.priceFormulaKey] ?? 0));
    const days = Math.max(1, Math.round(evaluation.values[config.formulas.daysFormulaKey] ?? 1));

    const breakdownKeys = [
      "basePrice",
      "areaFactor",
      "complexityFactor",
      "formatFactor",
      "urgencyFactor",
      "rawPrice",
    ];

    const labels: Record<string, string> = {
      basePrice: "База",
      areaFactor: "Площадь",
      complexityFactor: "Условия",
      formatFactor: "Формат",
      urgencyFactor: "Срочность",
      rawPrice: "До округления",
    };

    const breakdown: EstimateBreakdownItem[] = breakdownKeys
      .map((key) => {
        const value = Object.prototype.hasOwnProperty.call(variables, key)
          ? variables[key]
          : evaluation.values[key];
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
        return {
          key,
          label: labels[key] ?? key,
          value,
          kind: key === "basePrice" ? "input" : key === "rawPrice" ? "formula" : "factor",
        } satisfies EstimateBreakdownItem;
      })
      .filter((item): item is EstimateBreakdownItem => item !== null);

    return {
      price,
      days,
      breakdown,
      formulaValues: evaluation.values,
    };
  } catch {
    return legacyEstimate(input, config);
  }
}
