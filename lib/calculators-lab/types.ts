export type CalculatorInputKind = "number" | "select" | "textarea";

export type CalculatorInputSpec = {
  key: string;
  label: string;
  kind: CalculatorInputKind;
  unit?: string;
  help?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

export type CalculatorMetric = {
  label: string;
  value: string;
  unit?: string;
};

export type CalculatorResult = {
  primary: CalculatorMetric;
  metrics: CalculatorMetric[];
  formula?: string;
  warnings?: string[];
  details?: string[];
};

export type CalculatorDefinition = {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  inputs: CalculatorInputSpec[];
  calculate: (values: Record<string, unknown>) => CalculatorResult;
};
