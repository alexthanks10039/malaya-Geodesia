/**
 * ARCHITECTURE: Calculator Lab domain definitions.
 * Описывает технические калькуляторы, их inputs/outputs и метаданные для Registry/Engine.
 * Определения не должны зависеть от React, API или БД.
 */

import type { CalculatorDefinition } from "@/lib/calculators-lab/types";
import {
  normalizeAzimuth,
  planarAzimuth,
  planarDistance,
  polygonArea,
  round,
  sphericalDistanceMeters,
  sphericalInitialBearing,
} from "@/lib/calculators-lab/math";
import { formatAngle, numberValue, parseCutFillRows, parseXYPoints } from "@/lib/calculators-lab/parsers";

const AREA_SOURCE = "Функциональный референс: surveyingcalculator";
const GEODESY_SOURCE = "Алгоритмический референс: chrisveness/geodesy";
const ORIGINAL_SOURCE = "Оригинальная реализация лаборатории";

export const calculatorDefinitions: CalculatorDefinition[] = [
  {
    id: "area-xy",
    category: "Геометрия",
    title: "Площадь по координатам XY",
    description: "Площадь полигона по плоским координатам методом Гаусса.",
    source: AREA_SOURCE,
    inputs: [
      {
        key: "points",
        label: "Точки X Y",
        kind: "textarea",
        defaultValue: "0 0\n100 0\n120 80\n20 100",
        help: "Одна точка на строку. Разделитель: пробел, ; или ,.",
        placeholder: "X Y",
      },
    ],
    calculate: (values) => {
      const points = parseXYPoints(String(values.points ?? ""));
      const area = polygonArea(points);
      return {
        primary: { label: "Площадь", value: area.toLocaleString("ru-RU", { maximumFractionDigits: 2 }), unit: "м²" },
        metrics: [
          { label: "Точек", value: String(points.length), unit: "шт." },
        ],
        formula: "S = ½ |Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)|",
      };
    },
  },
  {
    id: "inverse-geodesic",
    category: "Геодезия",
    title: "Расстояние + азимут",
    description: "Обратная геодезическая задача для двух широт/долгот.",
    source: GEODESY_SOURCE,
    inputs: [
      { key: "lat1", label: "Широта точки 1", kind: "number", unit: "°", defaultValue: 43.238, min: -90, max: 90, step: 0.000001 },
      { key: "lon1", label: "Долгота точки 1", kind: "number", unit: "°", defaultValue: 76.945, min: -180, max: 180, step: 0.000001 },
      { key: "lat2", label: "Широта точки 2", kind: "number", unit: "°", defaultValue: 43.245, min: -90, max: 90, step: 0.000001 },
      { key: "lon2", label: "Долгота точки 2", kind: "number", unit: "°", defaultValue: 76.958, min: -180, max: 180, step: 0.000001 },
    ],
    calculate: (values) => {
      const lat1 = numberValue(values, "lat1");
      const lon1 = numberValue(values, "lon1");
      const lat2 = numberValue(values, "lat2");
      const lon2 = numberValue(values, "lon2");
      const distance = sphericalDistanceMeters(lat1, lon1, lat2, lon2);
      const azimuth = sphericalInitialBearing(lat1, lon1, lat2, lon2);
      return {
        primary: { label: "Расстояние", value: round(distance, 3).toLocaleString("ru-RU"), unit: "м" },
        metrics: [
          { label: "Начальный азимут", value: formatAngle(azimuth) },
          { label: "Обратный азимут", value: formatAngle(azimuth + 180) },
        ],
        formula: "Сферическая модель Haversine + initial bearing",
        warnings: ["Для исполнительных работ и нормативной геодезии точность модели должна быть подтверждена выбранной системой координат и геодезической библиотекой."],
      };
    },
  },
  {
    id: "stakeout",
    category: "Разбивка",
    title: "Разбивка точки",
    description: "Переход от станции к проектной точке: расстояние, азимут и приращения.",
    source: AREA_SOURCE,
    inputs: [
      { key: "stationX", label: "Станция X", kind: "number", defaultValue: 0, step: 0.001 },
      { key: "stationY", label: "Станция Y", kind: "number", defaultValue: 0, step: 0.001 },
      { key: "targetX", label: "Точка X", kind: "number", defaultValue: 25, step: 0.001 },
      { key: "targetY", label: "Точка Y", kind: "number", defaultValue: 40, step: 0.001 },
    ],
    calculate: (values) => {
      const dx = numberValue(values, "targetX") - numberValue(values, "stationX");
      const dy = numberValue(values, "targetY") - numberValue(values, "stationY");
      const distance = planarDistance(dx, dy);
      const azimuth = planarAzimuth(dx, dy);
      return {
        primary: { label: "Горизонтальное проложение", value: round(distance, 3).toLocaleString("ru-RU"), unit: "м" },
        metrics: [
          { label: "Азимут", value: formatAngle(azimuth) },
          { label: "ΔX", value: round(dx, 3).toLocaleString("ru-RU"), unit: "м" },
          { label: "ΔY", value: round(dy, 3).toLocaleString("ru-RU"), unit: "м" },
        ],
        formula: "D = √(ΔX² + ΔY²), A = atan2(ΔX, ΔY)",
      };
    },
  },
  {
    id: "slope",
    category: "Рельеф",
    title: "Уклон",
    description: "Расчёт уклона по горизонтальному проложению и превышению.",
    source: ORIGINAL_SOURCE,
    inputs: [
      { key: "horizontal", label: "Горизонтальное проложение", kind: "number", unit: "м", defaultValue: 100, min: 0.001, step: 0.01 },
      { key: "elevation", label: "Превышение", kind: "number", unit: "м", defaultValue: 3.5, step: 0.01 },
    ],
    calculate: (values) => {
      const horizontal = numberValue(values, "horizontal");
      const elevation = numberValue(values, "elevation");
      if (horizontal <= 0) throw new Error("Проложение должно быть больше нуля.");
      const ratio = elevation / horizontal;
      const percent = ratio * 100;
      const angle = Math.atan(ratio) * (180 / Math.PI);
      return {
        primary: { label: "Уклон", value: round(percent, 4).toLocaleString("ru-RU"), unit: "%" },
        metrics: [
          { label: "Отношение", value: "1:" + (Math.abs(ratio) > 0 ? round(Math.abs(1 / ratio), 2) : "∞") },
          { label: "Угол", value: round(angle, 4).toLocaleString("ru-RU"), unit: "°" },
          { label: "Превышение", value: round(elevation, 3).toLocaleString("ru-RU"), unit: "м" },
        ],
        formula: "i = ΔH / L; i% = i × 100",
      };
    },
  },
  {
    id: "cut-fill-grid",
    category: "Земляные работы",
    title: "Cut / Fill по сетке",
    description: "Быстрый расчёт выемки и насыпи по точкам сетки и площади ячейки.",
    source: ORIGINAL_SOURCE,
    inputs: [
      { key: "cellArea", label: "Площадь одной ячейки", kind: "number", unit: "м²", defaultValue: 25, min: 0.0001, step: 0.1 },
      {
        key: "rows",
        label: "Сетка X Y Existing Design",
        kind: "textarea",
        defaultValue: "0 0 100.20 99.80\n5 0 100.40 100.00\n0 5 100.10 100.30\n5 5 100.30 100.10",
        help: "Одна точка на строку. Existing > Design = cut; Design > Existing = fill.",
        placeholder: "X Y существующая проектная",
      },
      {
        key: "swell",
        label: "Коэффициент разрыхления",
        kind: "number",
        defaultValue: 1.12,
        min: 0.01,
        step: 0.01,
      },
    ],
    calculate: (values) => {
      const cellArea = numberValue(values, "cellArea");
      if (cellArea <= 0) throw new Error("Площадь ячейки должна быть больше нуля.");
      const swell = numberValue(values, "swell");
      if (swell <= 0) throw new Error("Коэффициент разрыхления должен быть больше нуля.");
      const rows = parseCutFillRows(String(values.rows ?? ""));
      let cut = 0;
      let fill = 0;
      for (const row of rows) {
        const diff = row.existing - row.design;
        if (diff > 0) cut += diff * cellArea;
        if (diff < 0) fill += -diff * cellArea;
      }
      const balanced = cut - fill;
      return {
        primary: { label: "Итого объём", value: round(Math.abs(balanced), 3).toLocaleString("ru-RU"), unit: "м³ net" },
        metrics: [
          { label: "Cut", value: round(cut, 3).toLocaleString("ru-RU"), unit: "м³" },
          { label: "Fill", value: round(fill, 3).toLocaleString("ru-RU"), unit: "м³" },
          { label: "Cut × swell", value: round(cut * swell, 3).toLocaleString("ru-RU"), unit: "м³" },
          { label: "Баланс", value: round(balanced, 3).toLocaleString("ru-RU"), unit: "м³" },
          { label: "Точек", value: String(rows.length), unit: "шт." },
        ],
        formula: "Vcut = Σ max(Existing − Design, 0) × S; Vfill = Σ max(Design − Existing, 0) × S",
        warnings: ["Лабораторный режим: площадь ячейки применяется к каждой строке. Для production-версии нужны полноценные grid/cross-section поверхности и обработка границ."],
      };
    },
  },
  {
    id: "trench-volume",
    category: "Земляные работы",
    title: "Объём траншеи",
    description: "Быстрый объём призматической траншеи с возможностью задать откос.",
    source: "Функциональный референс: civil/earthwork calculator patterns",
    inputs: [
      { key: "length", label: "Длина", kind: "number", unit: "м", defaultValue: 30, min: 0.001, step: 0.1 },
      { key: "bottomWidth", label: "Ширина по дну", kind: "number", unit: "м", defaultValue: 0.8, min: 0.001, step: 0.01 },
      { key: "depth", label: "Глубина", kind: "number", unit: "м", defaultValue: 1.5, min: 0.001, step: 0.01 },
      { key: "slope", label: "Откос, H:V", kind: "number", unit: ":1", defaultValue: 0.5, min: 0, step: 0.01 },
    ],
    calculate: (values) => {
      const length = numberValue(values, "length");
      const bottomWidth = numberValue(values, "bottomWidth");
      const depth = numberValue(values, "depth");
      const slope = numberValue(values, "slope");
      if (length <= 0 || bottomWidth <= 0 || depth <= 0) throw new Error("Размеры должны быть больше нуля.");
      const topWidth = bottomWidth + 2 * depth * slope;
      const sectionArea = ((bottomWidth + topWidth) / 2) * depth;
      const volume = sectionArea * length;
      return {
        primary: { label: "Объём выемки", value: round(volume, 3).toLocaleString("ru-RU"), unit: "м³" },
        metrics: [
          { label: "Площадь сечения", value: round(sectionArea, 3).toLocaleString("ru-RU"), unit: "м²" },
          { label: "Ширина по верху", value: round(topWidth, 3).toLocaleString("ru-RU"), unit: "м" },
        ],
        formula: "A = (Bbottom + Btop)/2 × H; V = A × L",
      };
    },
  },
  {
    id: "topo-cost",
    category: "Стоимость",
    title: "Стоимость топосъёмки",
    description: "Изолированный конфигурируемый пример коммерческого калькулятора.",
    source: "Архитектурный референс: current Calculator Studio",
    inputs: [
      { key: "base", label: "Базовая цена", kind: "number", unit: "₸", defaultValue: 120000, min: 0, step: 1000 },
      { key: "area", label: "Площадь", kind: "number", unit: "м²", defaultValue: 1000, min: 1, step: 10 },
      { key: "areaFactor", label: "Коэффициент площади", kind: "number", defaultValue: 1.2, min: 0, step: 0.01 },
      { key: "terrainFactor", label: "Коэффициент рельефа", kind: "number", defaultValue: 1.1, min: 0, step: 0.01 },
      { key: "urgencyFactor", label: "Коэффициент срочности", kind: "number", defaultValue: 1, min: 0, step: 0.01 },
      { key: "rounding", label: "Шаг округления", kind: "number", unit: "₸", defaultValue: 5000, min: 1, step: 1000 },
    ],
    calculate: (values) => {
      const base = numberValue(values, "base");
      const area = numberValue(values, "area");
      const areaFactor = numberValue(values, "areaFactor");
      const terrainFactor = numberValue(values, "terrainFactor");
      const urgencyFactor = numberValue(values, "urgencyFactor");
      const rounding = numberValue(values, "rounding");
      if (area <= 0 || rounding <= 0) throw new Error("Площадь и шаг округления должны быть больше нуля.");
      const raw = base * Math.max(1, area / 1000) * areaFactor * terrainFactor * urgencyFactor;
      const price = Math.round(raw / rounding) * rounding;
      return {
        primary: { label: "Предварительная стоимость", value: price.toLocaleString("ru-RU"), unit: "₸" },
        metrics: [
          { label: "До округления", value: round(raw, 2).toLocaleString("ru-RU"), unit: "₸" },
          { label: "Площадь", value: area.toLocaleString("ru-RU"), unit: "м²" },
          { label: "Множитель", value: round(Math.max(1, area / 1000) * areaFactor * terrainFactor * urgencyFactor, 4).toLocaleString("ru-RU") },
        ],
        formula: "price = roundTo(base × max(1, area / 1000) × areaFactor × terrainFactor × urgencyFactor, rounding)",
        warnings: ["Цены здесь являются тестовыми параметрами изолированной среды и не являются утверждённым прайсом."],
      };
    },
  },
];

