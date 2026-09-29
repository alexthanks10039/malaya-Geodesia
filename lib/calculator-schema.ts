/**
 * Calculator schema layer.
 *
 * ARCHITECTURE: keeps business-editable parameters, coefficients and formulas
 * in a typed, inspectable contract instead of coupling them to React components.
 * The current Studio config remains the source of truth; this module is an
 * adapter/validation boundary for the next Calculation Model migration.
 */

import { isFormulaKey, type FormulaDefinition } from "@/lib/formula-engine";
import type {
  CalculatorCoefficient,
  CalculatorFormula,
  CalculatorStudioConfig,
} from "@/studio/config/calculator";

export type CalculatorParameterType =
  | "number"
  | "currency"
  | "percentage"
  | "boolean"
  | "select"
  | "multiselect"
  | "text";

export type CalculatorParameterDefinition = {
  key: string;
  label: string;
  type: CalculatorParameterType;
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
  source: "input" | "derived";
};

export type CalculatorCoefficientDefinition = CalculatorCoefficient & { source: "config" };
export type CalculatorFormulaDefinition = CalculatorFormula & { source: "config" };

export type CalculatorSchema = {
  parameters: CalculatorParameterDefinition[];
  coefficients: CalculatorCoefficientDefinition[];
  formulas: CalculatorFormulaDefinition[];
};

const INPUT_PARAMETERS: CalculatorParameterDefinition[] = [
  {
    key: "area",
    label: "Площадь",
    type: "number",
    unit: "м²",
    required: true,
    description: "Площадь объекта, нормализованная в buildCalculatorVariables.",
    source: "input",
  },
  {
    key: "conditionCount",
    label: "Количество условий сложности",
    type: "number",
    min: 0,
    description: "Количество выбранных пользователем усложняющих условий.",
    source: "input",
  },
  {
    key: "basePrice",
    label: "Базовая цена",
    type: "currency",
    unit: "₸",
    description: "Базовая ставка выбранного типа работ.",
    source: "derived",
  },
  {
    key: "selectedFormatFactor",
    label: "Коэффициент формата",
    type: "number",
    min: 0,
    description: "Коэффициент, полученный из выбранного формата результата.",
    source: "derived",
  },
  {
    key: "selectedUrgencyFactor",
    label: "Коэффициент срочности",
    type: "number",
    min: 0,
    description: "Коэффициент, полученный из выбранного режима срочности.",
    source: "derived",
  },
];

function coefficientToDefinition(item: CalculatorCoefficient): CalculatorCoefficientDefinition {
  return { ...item, source: "config" };
}

function formulaToDefinition(item: CalculatorFormula): CalculatorFormulaDefinition {
  return { ...item, source: "config" };
}

/**
 * ARCHITECTURE: schema adapter. Converts today's Studio config into a stable
 * domain contract that can later be persisted as a versioned CalculationModel.
 */
export function buildCalculatorSchema(config: CalculatorStudioConfig): CalculatorSchema {
  const parameters = INPUT_PARAMETERS.map((parameter) => ({ ...parameter }));

  parameters.push(
    {
      key: "type",
      label: "Вид работ",
      type: "select",
      required: true,
      options: config.types.map((item) => item.name),
      description: "Определяет набор базовых тарифов.",
      source: "input",
    },
    {
      key: "output",
      label: "Формат результата",
      type: "select",
      required: true,
      options: [...config.outputs],
      source: "input",
    },
    {
      key: "urgency",
      label: "Срочность",
      type: "select",
      required: true,
      options: [...config.urgencies],
      source: "input",
    },
  );

  return {
    parameters,
    coefficients: config.pricing.coefficients.map(coefficientToDefinition),
    formulas: config.formulas.definitions.map(formulaToDefinition),
  };
}

/**
 * ARCHITECTURE: publish guard for the schema itself. It catches duplicate or
 * malformed identifiers before a model can be treated as a valid calculation configuration.
 */
export function validateCalculatorSchema(schema: CalculatorSchema): string[] {
  const errors: string[] = [];
  const parameterKeys = new Set<string>();
  const coefficientKeys = new Set<string>();
  const formulaKeys = new Set<string>();

  for (const parameter of schema.parameters) {
    if (!isFormulaKey(parameter.key)) errors.push(`Некорректный ключ параметра "${parameter.key}".`);
    if (parameterKeys.has(parameter.key)) errors.push(`Дублирующийся ключ параметра "${parameter.key}".`);
    parameterKeys.add(parameter.key);
    if (parameter.min !== undefined && parameter.max !== undefined && parameter.min > parameter.max) {
      errors.push(`Диапазон параметра "${parameter.key}" некорректен.`);
    }
  }

  for (const coefficient of schema.coefficients) {
    if (!isFormulaKey(coefficient.key)) errors.push(`Некорректный ключ коэффициента "${coefficient.key}".`);
    if (coefficientKeys.has(coefficient.key)) errors.push(`Дублирующийся ключ коэффициента "${coefficient.key}".`);
    coefficientKeys.add(coefficient.key);
  }

  for (const formula of schema.formulas) {
    if (!isFormulaKey(formula.key)) errors.push(`Некорректный ключ формулы "${formula.key}".`);
    if (formulaKeys.has(formula.key)) errors.push(`Дублирующийся ключ формулы "${formula.key}".`);
    formulaKeys.add(formula.key);
    if (!formula.expression.trim()) errors.push(`Формула "${formula.key}" пустая.`);
  }

  return Array.from(new Set(errors));
}

/**
 * ARCHITECTURE: Formula-engine compatibility adapter. Keeps the formula engine
 * independent from Studio-specific types while making the schema exportable.
 */
export function toFormulaDefinitions(schema: CalculatorSchema): FormulaDefinition[] {
  return schema.formulas.map((formula) => ({
    key: formula.key,
    expression: formula.expression,
    enabled: formula.enabled,
  }));
}
