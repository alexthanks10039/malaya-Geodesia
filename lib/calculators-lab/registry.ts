import { calculatorDefinitions } from "@/lib/calculators-lab/definitions";
import type { CalculatorDefinition } from "@/lib/calculators-lab/types";

export const calculatorRegistry: CalculatorDefinition[] = calculatorDefinitions;

export function getCalculatorDefinition(id: string): CalculatorDefinition | null {
  return calculatorRegistry.find((item) => item.id === id) ?? null;
}
