export type CalculatorType = {
  name: string;
  hint: string;
  tag: string;
};

export type CalculatorAreaPreset = {
  label: string;
  value: number;
};

export type CalculatorPricingConfig = {
  base: Record<string, number>;
  urgencyFactor: Record<string, number>;
  complexityFactorPerCondition: number;
  formatFactor: Record<string, number>;
  minArea: number;
  maxArea: number;
  areaStep: number;
  areaBase: number;
  minAreaFactor: number;
  maxAreaFactor: number;
  dayBase: number;
  dayAreaWeight: number;
  dayComplexityWeight: number;
  urgentDaysReduction: number;
  veryUrgentDaysReduction: number;
  roundingStep: number;
};

export type CalculatorStudioConfig = {
  types: CalculatorType[];
  outputs: string[];
  urgencies: string[];
  conditions: string[];
  areaPresets: CalculatorAreaPreset[];
  pricing: CalculatorPricingConfig;
};

export const defaultCalculatorStudioConfig: CalculatorStudioConfig = {
  types: [
    { name: "Топографическая съёмка", hint: "Участок, рельеф, существующие объекты", tag: "TOP" },
    { name: "Исполнительная съёмка", hint: "Контроль фактического положения на стройке", tag: "BUILD" },
    { name: "Аэрофотосъёмка", hint: "Ортофото, поверхность и облако точек", tag: "UAV" },
    { name: "Лазерное сканирование", hint: "Плотное 3D-облако точек", tag: "LIDAR" },
    { name: "3D-моделирование", hint: "Цифровая модель объекта", tag: "3D" },
    { name: "Расчёт объёмов", hint: "Котлован, насыпь, карьер, склад", tag: "VOL" },
  ],
  outputs: ["DWG", "PDF", "GeoTIFF", "LAS/LAZ", "E57", "OBJ", "Не знаю"],
  urgencies: ["Обычный срок", "Срочно", "Очень срочно"],
  conditions: ["Лес", "Сложный рельеф", "Плотная застройка", "ЛЭП", "Удалённость"],
  areaPresets: [
    { label: "до 0,1 га", value: 1000 },
    { label: "0,1–0,5 га", value: 3000 },
    { label: "0,5–1 га", value: 7000 },
    { label: "1–5 га", value: 20000 },
    { label: "5+ га", value: 60000 },
  ],
  pricing: {
    base: {
      "Топографическая съёмка": 120000,
      "Исполнительная съёмка": 150000,
      "Аэрофотосъёмка": 180000,
      "Лазерное сканирование": 260000,
      "3D-моделирование": 220000,
      "Расчёт объёмов": 140000,
    },
    urgencyFactor: {
      "Обычный срок": 1,
      "Срочно": 1.18,
      "Очень срочно": 1.35,
    },
    complexityFactorPerCondition: 0.12,
    formatFactor: {
      "LAS/LAZ": 1.08,
      E57: 1.08,
    },
    minArea: 100,
    maxArea: 500000,
    areaStep: 100,
    areaBase: 10000,
    minAreaFactor: 1,
    maxAreaFactor: 3.5,
    dayBase: 2,
    dayAreaWeight: 1,
    dayComplexityWeight: 0.5,
    urgentDaysReduction: 1,
    veryUrgentDaysReduction: 2,
    roundingStep: 5000,
  },
};

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return normalized.length ? normalized : fallback;
}

function asNumberRecord(input: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!input || typeof input !== "object") return fallback;
  const result: Record<string, number> = { ...fallback };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number" && Number.isFinite(value) && key.trim()) {
      result[key] = value;
    }
  }
  return result;
}

export function normalizeCalculatorConfig(input: unknown): CalculatorStudioConfig {
  if (!input || typeof input !== "object") return defaultCalculatorStudioConfig;

  const raw = input as Partial<CalculatorStudioConfig>;
  const rawPricing = raw.pricing && typeof raw.pricing === "object"
    ? raw.pricing as Partial<CalculatorPricingConfig>
    : {};

  const types = Array.isArray(raw.types)
    ? raw.types.filter((item): item is CalculatorType => (
        !!item &&
        typeof item === "object" &&
        typeof (item as CalculatorType).name === "string" &&
        typeof (item as CalculatorType).hint === "string" &&
        typeof (item as CalculatorType).tag === "string"
      ))
    : defaultCalculatorStudioConfig.types;

  const areaPresets = Array.isArray(raw.areaPresets)
    ? raw.areaPresets.filter((item): item is CalculatorAreaPreset => (
        !!item &&
        typeof item === "object" &&
        typeof (item as CalculatorAreaPreset).label === "string" &&
        typeof (item as CalculatorAreaPreset).value === "number" &&
        Number.isFinite((item as CalculatorAreaPreset).value)
      ))
    : defaultCalculatorStudioConfig.areaPresets;

  return {
    types: types.length ? types : defaultCalculatorStudioConfig.types,
    outputs: asStringArray(raw.outputs, defaultCalculatorStudioConfig.outputs),
    urgencies: asStringArray(raw.urgencies, defaultCalculatorStudioConfig.urgencies),
    conditions: asStringArray(raw.conditions, defaultCalculatorStudioConfig.conditions),
    areaPresets: areaPresets.length ? areaPresets : defaultCalculatorStudioConfig.areaPresets,
    pricing: {
      base: asNumberRecord(rawPricing.base, defaultCalculatorStudioConfig.pricing.base),
      urgencyFactor: asNumberRecord(rawPricing.urgencyFactor, defaultCalculatorStudioConfig.pricing.urgencyFactor),
      complexityFactorPerCondition: asFiniteNumber(rawPricing.complexityFactorPerCondition, 0.12),
      formatFactor: asNumberRecord(rawPricing.formatFactor, defaultCalculatorStudioConfig.pricing.formatFactor),
      minArea: Math.max(1, asFiniteNumber(rawPricing.minArea, 100)),
      maxArea: Math.max(100, asFiniteNumber(rawPricing.maxArea, 500000)),
      areaStep: Math.max(1, asFiniteNumber(rawPricing.areaStep, 100)),
      areaBase: Math.max(1, asFiniteNumber(rawPricing.areaBase, 10000)),
      minAreaFactor: Math.max(0, asFiniteNumber(rawPricing.minAreaFactor, 1)),
      maxAreaFactor: Math.max(0, asFiniteNumber(rawPricing.maxAreaFactor, 3.5)),
      dayBase: Math.max(0, asFiniteNumber(rawPricing.dayBase, 2)),
      dayAreaWeight: asFiniteNumber(rawPricing.dayAreaWeight, 1),
      dayComplexityWeight: asFiniteNumber(rawPricing.dayComplexityWeight, 0.5),
      urgentDaysReduction: Math.max(0, asFiniteNumber(rawPricing.urgentDaysReduction, 1)),
      veryUrgentDaysReduction: Math.max(0, asFiniteNumber(rawPricing.veryUrgentDaysReduction, 2)),
      roundingStep: Math.max(1, asFiniteNumber(rawPricing.roundingStep, 5000)),
    },
  };
}
