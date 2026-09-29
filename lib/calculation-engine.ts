/**
 * ARCHITECTURE: Calculation Engine — domain-level execution boundary.
 *
 * Ответственность:
 * - принимает version-independent calculation model + input variables;
 * - валидирует модель до выполнения;
 * - вычисляет формулы через безопасный formula-engine;
 * - возвращает итоговые значения + execution trace;
 * - не знает ничего о React, Studio, HTTP, БД или конкретной геодезической услуге.
 *
 * Это фундамент «Супер-калькулятора». Следующие этапы смогут подключить к нему
 * параметры, коэффициенты, тарифы и Unit Economics, не смешивая бизнес-логику с UI.
 */

import {
  evaluateFormulas,
  validateFormulaDefinitions,
  type FormulaDefinition,
} from "@/lib/formula-engine";

export type CalculationModel = {
  /** Уникальный идентификатор модели. Не должен зависеть от UI-route. */
  id: string;
  /** Версия модели фиксирует набор формул и правила расчёта. */
  version: string;
  /** Активные/неактивные формулы модели. */
  formulas: FormulaDefinition[];
  /** Ключи значений, которые считаются публичным результатом модели. */
  outputs: string[];
};

export type CalculationTraceItem = {
  /** Ключ вычисленного узла. */
  key: string;
  /** Полученное числовое значение. */
  value: number;
};

export type CalculationResult = {
  modelId: string;
  modelVersion: string;
  /** Все вычисленные формулы. Нужны для explainability и будущего аудита. */
  values: Record<string, number>;
  /** Порядок вычисления формул. Нужен для диагностики зависимостей. */
  trace: CalculationTraceItem[];
  /** Только значения, объявленные моделью как outputs. */
  outputs: Record<string, number>;
};

export type CalculationRun =
  | { ok: true; result: CalculationResult }
  | { ok: false; error: string; diagnostics: string[] };

function normalizeModel(model: CalculationModel): CalculationModel {
  if (!model.id.trim()) throw new Error("Calculation model id обязателен.");
  if (!model.version.trim()) throw new Error("Calculation model version обязателен.");
  if (!model.formulas.length) throw new Error("Calculation model должен содержать формулы.");

  const outputs = Array.from(new Set(model.outputs.filter((key) => key.trim())));
  if (!outputs.length) throw new Error("Calculation model должен иметь хотя бы один output.");

  return { ...model, outputs };
}

/**
 * ARCHITECTURE: Pure calculation entry point.
 * Один и тот же вызов может использоваться публичным калькулятором,
 * внутренним режимом, Studio preview, API и будущим standalone app.
 */
export function runCalculation(
  model: CalculationModel,
  variables: Record<string, number>,
): CalculationRun {
  try {
    const normalized = normalizeModel(model);
    const diagnostics = validateFormulaDefinitions(normalized.formulas, variables);
    if (diagnostics.length) {
      return { ok: false, error: "Модель расчёта не прошла валидацию.", diagnostics };
    }

    const evaluation = evaluateFormulas(normalized.formulas, variables);
    const outputs: Record<string, number> = {};

    for (const key of normalized.outputs) {
      const value = evaluation.values[key];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return {
          ok: false,
          error: `Output "${key}" не был рассчитан.`,
          diagnostics: [`Модель ${normalized.id}@${normalized.version} не вернула output "${key}".`],
        };
      }
      outputs[key] = value;
    }

    return {
      ok: true,
      result: {
        modelId: normalized.id,
        modelVersion: normalized.version,
        values: evaluation.values,
        trace: evaluation.order.map((key) => ({
          key,
          value: evaluation.values[key],
        })),
        outputs,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка расчёта.";
    return {
      ok: false,
      error: message,
      diagnostics: [message],
    };
  }
}
