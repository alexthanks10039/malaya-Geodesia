import type { CalculatorStudioConfig } from "@/studio/config/calculator";
import { defaultCalculatorStudioConfig } from "@/studio/config/calculator";

export function calculateEstimate(
  input: {
    type: string;
    area: number;
    complexity: string[];
    output: string;
    urgency?: string;
  },
  config: CalculatorStudioConfig = defaultCalculatorStudioConfig,
) {
  const pricing = config.pricing;
  const area = Math.max(pricing.minArea, Math.min(pricing.maxArea, input.area || pricing.minArea));
  const areaFactor = Math.max(
    pricing.minAreaFactor,
    Math.min(pricing.maxAreaFactor, area / pricing.areaBase),
  );
  const complexityFactor = 1 + input.complexity.length * pricing.complexityFactorPerCondition;
  const formatFactor = pricing.formatFactor[input.output] ?? 1;
  const deadlineFactor = pricing.urgencyFactor[input.urgency ?? config.urgencies[0]] ?? 1;
  const basePrice = pricing.base[input.type] ?? 120000;
  const raw = basePrice * areaFactor * complexityFactor * formatFactor * deadlineFactor;
  const price = Math.round(raw / pricing.roundingStep) * pricing.roundingStep;

  const days = Math.max(
    2,
    Math.round(
      pricing.dayBase +
      areaFactor * pricing.dayAreaWeight +
      input.complexity.length * pricing.dayComplexityWeight,
    ),
  );

  const adjustedDays =
    input.urgency === "Очень срочно"
      ? Math.max(1, days - pricing.veryUrgentDaysReduction)
      : input.urgency === "Срочно"
        ? Math.max(2, days - pricing.urgentDaysReduction)
        : days;

  return { price, days };
}
