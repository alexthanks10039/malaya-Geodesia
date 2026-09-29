import { normalizeAzimuth } from "@/lib/calculators-lab/math";

export function numberValue(
  values: Record<string, unknown>,
  key: string,
): number {
  const raw = values[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error("Поле «" + key + "» должно содержать число.");
  }
  return value;
}

export function parseXYPoints(text: string): Array<{ x: number; y: number }> {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 3) {
    throw new Error("Нужно минимум 3 точки.");
  }

  return rows.map((row, index) => {
    const parts = row.split(/[;,\s]+/).filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Строка " + (index + 1) + ": нужны X и Y.");
    }
    const x = Number(parts[0].replace(",", "."));
    const y = Number(parts[1].replace(",", "."));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Строка " + (index + 1) + ": некорректные координаты.");
    }
    return { x, y };
  });
}

export function parseCutFillRows(text: string): Array<{
  x: number;
  y: number;
  existing: number;
  design: number;
}> {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    throw new Error("Добавьте хотя бы одну точку сетки.");
  }

  return rows.map((row, index) => {
    const parts = row.split(/[;,\s]+/).filter(Boolean);
    if (parts.length < 4) {
      throw new Error("Строка " + (index + 1) + ": нужны X, Y, существующая и проектная отметки.");
    }
    const [x, y, existing, design] = parts.map((item) => Number(item.replace(",", ".")));
    if (![x, y, existing, design].every(Number.isFinite)) {
      throw new Error("Строка " + (index + 1) + ": найдены нечисловые значения.");
    }
    return { x, y, existing, design };
  });
}

export function formatAngle(degrees: number): string {
  return normalizeAzimuth(degrees).toFixed(4) + "°";
}
