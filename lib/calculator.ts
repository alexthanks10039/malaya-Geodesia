const base: Record<string, number> = {
  "Топографическая съёмка": 120000,
  "Исполнительная съёмка": 150000,
  "Аэрофотосъёмка": 180000,
  "Лазерное сканирование": 260000,
  "3D-моделирование": 220000,
  "Расчёт объёмов": 140000,
};

const urgencyFactor: Record<string, number> = {
  "Обычный срок": 1,
  "Срочно": 1.18,
  "Очень срочно": 1.35,
};

export function calculateEstimate(input: {
  type: string;
  area: number;
  complexity: string[];
  output: string;
  urgency?: string;
}) {
  const area = Math.max(100, input.area || 100);
  const areaFactor = Math.max(1, Math.min(3.5, area / 10000));
  const complexityFactor = 1 + input.complexity.length * 0.12;
  const formatFactor = ["LAS/LAZ", "E57"].includes(input.output) ? 1.08 : 1;
  const deadlineFactor = urgencyFactor[input.urgency ?? "Обычный срок"] ?? 1;
  const raw = (base[input.type] ?? 120000) * areaFactor * complexityFactor * formatFactor * deadlineFactor;
  const price = Math.round(raw / 5000) * 5000;
  const days = Math.max(
    2,
    Math.round(2 + areaFactor + input.complexity.length * 0.5),
  );
  const adjustedDays =
    input.urgency === "Очень срочно" ? Math.max(1, days - 2) :
    input.urgency === "Срочно" ? Math.max(2, days - 1) : days;

  return { price, days: adjustedDays };
}
