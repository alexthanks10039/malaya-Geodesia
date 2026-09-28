import { calculatorRegistry } from "@/lib/calculators-lab/registry";

export type CalculatorManifestItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  inputs: Array<{
    key: string;
    label: string;
    kind: string;
    unit?: string;
    defaultValue?: string | number;
    min?: number;
    max?: number;
    step?: number;
  }>;
};

export function getCalculatorManifest(): CalculatorManifestItem[] {
  return calculatorRegistry.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    description: item.description,
    source: item.source,
    inputs: item.inputs.map(({ key, label, kind, unit, defaultValue, min, max, step }) => ({
      key,
      label,
      kind,
      unit,
      defaultValue,
      min,
      max,
      step,
    })),
  }));
}
