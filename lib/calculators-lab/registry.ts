/**
 * ARCHITECTURE: Calculator Registry.
 * Это каталог доступных технических calculators и точка их разрешения по key.
 * Registry знает «какой calculator существует», но не смешивает transport или persistence.
 */

import { calculatorDefinitions } from "@/lib/calculators-lab/definitions";
import type { CalculatorDefinition } from "@/lib/calculators-lab/types";

export const calculatorRegistry: CalculatorDefinition[] = calculatorDefinitions;

export function getCalculatorDefinition(id: string): CalculatorDefinition | null {
  return calculatorRegistry.find((item) => item.id === id) ?? null;
}
