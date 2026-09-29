/**
 * ARCHITECTURE: Calculator Lab execution engine.
 * Выбирает зарегистрированный calculator и детерминированно выполняет его domain function.
 * Этот слой сознательно отделён от UI и HTTP, чтобы расчёты можно было тестировать и переиспользовать.
 */

import { getCalculatorDefinition } from "@/lib/calculators-lab/registry";
import type { CalculatorResult } from "@/lib/calculators-lab/types";

export type CalculatorRun = {
  ok: true;
  result: CalculatorResult;
} | {
  ok: false;
  error: string;
};

export function runCalculator(
  id: string,
  values: Record<string, unknown>,
): CalculatorRun {
  const definition = getCalculatorDefinition(id);
  if (!definition) {
    return { ok: false, error: "Калькулятор не найден." };
  }

  try {
    return { ok: true, result: definition.calculate(values) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Ошибка расчёта.",
    };
  }
}
