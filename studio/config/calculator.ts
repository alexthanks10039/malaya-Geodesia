import { isFormulaKey } from "@/lib/formula-engine";

export type CalculatorType = {
  name: string;
  hint: string;
  tag: string;
};

export type CalculatorAreaPreset = {
  label: string;
  value: number;
};

export type CalculatorCoefficient = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  description?: string;
};

export type CalculatorFormula = {
  key: string;
  name: string;
  expression: string;
  enabled: boolean;
  description?: string;
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
  coefficients: CalculatorCoefficient[];
};

export type CalculatorFormulaConfig = {
  definitions: CalculatorFormula[];
  priceFormulaKey: string;
  daysFormulaKey: string;
};

export type CalculatorStudioConfig = {
  types: CalculatorType[];
  outputs: string[];
  urgencies: string[];
  conditions: string[];
  areaPresets: CalculatorAreaPreset[];
  pricing: CalculatorPricingConfig;
  formulas: CalculatorFormulaConfig;
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
    coefficients: [
      {
        key: "siteVisitFee",
        label: "Выезд",
        value: 0,
        unit: "₸",
        description: "Фиксированная добавка за выезд. Используется в пользовательских формулах.",
      },
      {
        key: "seasonFactor",
        label: "Сезонный коэффициент",
        value: 1,
        unit: "×",
        description: "Универсальный коэффициент для сезонных изменений.",
      },
    ],
  },
  formulas: {
    priceFormulaKey: "price",
    daysFormulaKey: "days",
    definitions: [
      {
        key: "areaFactor",
        name: "Коэффициент площади",
        expression: "clamp(area / areaBase, minAreaFactor, maxAreaFactor)",
        enabled: true,
        description: "Масштабирует цену по площади и удерживает её в заданном диапазоне.",
      },
      {
        key: "complexityFactor",
        name: "Коэффициент сложности",
        expression: "1 + conditionCount * complexityFactorPerCondition",
        enabled: true,
        description: "Добавляет надбавку за количество отмеченных условий.",
      },
      {
        key: "formatFactor",
        name: "Коэффициент формата",
        expression: "selectedFormatFactor",
        enabled: true,
        description: "Берёт коэффициент выбранного формата результата.",
      },
      {
        key: "urgencyFactor",
        name: "Коэффициент срочности",
        expression: "selectedUrgencyFactor",
        enabled: true,
        description: "Берёт коэффициент выбранного срока.",
      },
      {
        key: "rawPrice",
        name: "Цена до округления",
        expression: "basePrice * areaFactor * complexityFactor * formatFactor * urgencyFactor * seasonFactor + siteVisitFee",
        enabled: true,
        description: "Собирает стоимость до финального округления.",
      },
      {
        key: "price",
        name: "Итоговая цена",
        expression: "roundTo(rawPrice, roundingStep)",
        enabled: true,
        description: "Округляет итоговую стоимость до заданного шага.",
      },
      {
        key: "baseDays",
        name: "Базовый срок",
        expression: "max(2, round(dayBase + areaFactor * dayAreaWeight + conditionCount * dayComplexityWeight))",
        enabled: true,
        description: "Рассчитывает срок без учёта срочности.",
      },
      {
        key: "days",
        name: "Итоговый срок",
        expression: "max(urgencyMinDays, baseDays - urgencyDaysReduction)",
        enabled: true,
        description: "Корректирует базовый срок выбранной срочностью.",
      },
    ],
  },
};

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  return normalized.length ? Array.from(new Set(normalized)) : [...fallback];
}

function asNumberRecord(input: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!input || typeof input !== "object") return { ...fallback };
  const result: Record<string, number> = { ...fallback };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number" && Number.isFinite(value) && key.trim()) {
      result[key] = value;
    }
  }
  return result;
}

function asTypes(value: unknown, fallback: CalculatorType[]): CalculatorType[] {
  if (!Array.isArray(value)) return [...fallback];
  const result = value
    .filter((item): item is CalculatorType => (
      !!item &&
      typeof item === "object" &&
      typeof (item as CalculatorType).name === "string" &&
      typeof (item as CalculatorType).hint === "string" &&
      typeof (item as CalculatorType).tag === "string"
    ))
    .map((item) => ({
      name: item.name.trim(),
      hint: item.hint.trim(),
      tag: item.tag.trim(),
    }))
    .filter((item) => item.name.length > 0);

  return result.length ? result : [...fallback];
}

function asAreaPresets(value: unknown, fallback: CalculatorAreaPreset[]): CalculatorAreaPreset[] {
  if (!Array.isArray(value)) return [...fallback];
  const result = value
    .filter((item): item is CalculatorAreaPreset => (
      !!item &&
      typeof item === "object" &&
      typeof (item as CalculatorAreaPreset).label === "string" &&
      typeof (item as CalculatorAreaPreset).value === "number" &&
      Number.isFinite((item as CalculatorAreaPreset).value)
    ))
    .map((item) => ({
      label: item.label.trim(),
      value: item.value,
    }))
    .filter((item) => item.label.length > 0 && item.value > 0);

  return result.length ? result : [...fallback];
}

function asCoefficients(value: unknown, fallback: CalculatorCoefficient[]): CalculatorCoefficient[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const keys = new Set<string>();
  const result: CalculatorCoefficient[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<CalculatorCoefficient>;
    const key = typeof raw.key === "string" ? raw.key.trim() : "";
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!key || !label || !isFormulaKey(key) || keys.has(key)) continue;
    keys.add(key);
    result.push({
      key,
      label,
      value: asFiniteNumber(raw.value, 0),
      unit: typeof raw.unit === "string" ? raw.unit.trim() : undefined,
      description: typeof raw.description === "string" ? raw.description.trim() : undefined,
    });
  }

  return result.length ? result : fallback.map((item) => ({ ...item }));
}

function asFormulas(value: unknown, fallback: CalculatorFormula[]): CalculatorFormula[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const keys = new Set<string>();
  const result: CalculatorFormula[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<CalculatorFormula>;
    const key = typeof raw.key === "string" ? raw.key.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const expression = typeof raw.expression === "string" ? raw.expression.trim() : "";
    if (!key || !isFormulaKey(key) || !name || !expression || keys.has(key)) continue;
    keys.add(key);
    result.push({
      key,
      name,
      expression,
      enabled: raw.enabled !== false,
      description: typeof raw.description === "string" ? raw.description.trim() : undefined,
    });
  }

  return result.length ? result : fallback.map((item) => ({ ...item }));
}

function ensureFormulaKey(
  requested: unknown,
  definitions: CalculatorFormula[],
  fallback: string,
): string {
  return typeof requested === "string" && definitions.some((item) => item.key === requested && item.enabled !== false)
    ? requested
    : fallback;
}

export function normalizeCalculatorConfig(input: unknown): CalculatorStudioConfig {
  if (!input || typeof input !== "object") return defaultCalculatorStudioConfig;

  const raw = input as Partial<CalculatorStudioConfig>;
  const rawPricing = raw.pricing && typeof raw.pricing === "object"
    ? raw.pricing as Partial<CalculatorPricingConfig>
    : {};
  const rawFormulas = raw.formulas && typeof raw.formulas === "object"
    ? raw.formulas as Partial<CalculatorFormulaConfig>
    : {};

  const types = asTypes(raw.types, defaultCalculatorStudioConfig.types);
  const outputs = asStringArray(raw.outputs, defaultCalculatorStudioConfig.outputs);
  const urgencies = asStringArray(raw.urgencies, defaultCalculatorStudioConfig.urgencies);
  const conditions = asStringArray(raw.conditions, defaultCalculatorStudioConfig.conditions);
  const areaPresets = asAreaPresets(raw.areaPresets, defaultCalculatorStudioConfig.areaPresets);
  const definitions = asFormulas(
    rawFormulas.definitions,
    defaultCalculatorStudioConfig.formulas.definitions,
  );

  return {
    types,
    outputs,
    urgencies,
    conditions,
    areaPresets,
    pricing: {
      base: asNumberRecord(rawPricing.base, defaultCalculatorStudioConfig.pricing.base),
      urgencyFactor: asNumberRecord(rawPricing.urgencyFactor, defaultCalculatorStudioConfig.pricing.urgencyFactor),
      complexityFactorPerCondition: asFiniteNumber(
        rawPricing.complexityFactorPerCondition,
        defaultCalculatorStudioConfig.pricing.complexityFactorPerCondition,
      ),
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
      coefficients: asCoefficients(rawPricing.coefficients, defaultCalculatorStudioConfig.pricing.coefficients),
    },
    formulas: {
      definitions,
      priceFormulaKey: ensureFormulaKey(
        rawFormulas.priceFormulaKey,
        definitions,
        defaultCalculatorStudioConfig.formulas.priceFormulaKey,
      ),
      daysFormulaKey: ensureFormulaKey(
        rawFormulas.daysFormulaKey,
        definitions,
        defaultCalculatorStudioConfig.formulas.daysFormulaKey,
      ),
    },
  };
}
