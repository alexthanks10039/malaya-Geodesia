"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Copy,
  RefreshCcw,
  Save,
  Trash2,
} from "lucide-react";
import { buildCalculatorVariables, calculateEstimate, getFormulaDiagnostics } from "@/lib/calculator";
import { FORMULA_FUNCTIONS, isFormulaKey } from "@/lib/formula-engine";
import {
  defaultCalculatorStudioConfig,
  normalizeCalculatorConfig,
  type CalculatorCoefficient,
  type CalculatorFormula,
  type CalculatorStudioConfig,
} from "@/studio/config/calculator";
import {
  readCalculatorConfig,
  writeCalculatorConfig,
} from "@/studio/runtime/storage";

type Props = {
  onChanged: () => void;
};

type ListKey = "outputs" | "urgencies" | "conditions";

const BASE_VARIABLES = [
  "area",
  "areaBase",
  "minAreaFactor",
  "maxAreaFactor",
  "basePrice",
  "conditionCount",
  "complexityFactorPerCondition",
  "selectedFormatFactor",
  "selectedUrgencyFactor",
  "dayBase",
  "dayAreaWeight",
  "dayComplexityWeight",
  "urgentDaysReduction",
  "veryUrgentDaysReduction",
  "urgencyDaysReduction",
  "urgencyMinDays",
  "roundingStep",
] as const;

function cloneDefaultConfig(): CalculatorStudioConfig {
  return JSON.parse(JSON.stringify(defaultCalculatorStudioConfig)) as CalculatorStudioConfig;
}

function uniqueKey(base: string, keys: string[]): string {
  if (!keys.includes(base)) return base;
  let index = 2;
  while (keys.includes(base + index)) index += 1;
  return base + index;
}

function replaceIdentifier(expression: string, from: string, to: string): string {
  if (!from || from === to) return expression;
  const escaped = from.replace(/[.*+?^\$\{\}()|[\]\\]/g, "\\$&");
  return expression.replace(new RegExp("\\b" + escaped + "\\b", "g"), to);
}

function transferFactor(
  record: Record<string, number>,
  oldKey: string,
  newKey: string,
): Record<string, number> {
  const next = { ...record };
  const value = next[oldKey];
  delete next[oldKey];
  if (value !== undefined) next[newKey] = value;
  return next;
}

export function CalculatorStudioEditor({ onChanged }: Props) {
  const [config, setConfig] = useState<CalculatorStudioConfig>(defaultCalculatorStudioConfig);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testType, setTestType] = useState(defaultCalculatorStudioConfig.types[0]?.name ?? "");
  const [testArea, setTestArea] = useState(defaultCalculatorStudioConfig.areaPresets[0]?.value ?? 1000);
  const [testOutput, setTestOutput] = useState(defaultCalculatorStudioConfig.outputs[0] ?? "DWG");
  const [testUrgency, setTestUrgency] = useState(defaultCalculatorStudioConfig.urgencies[0] ?? "Обычный срок");
  const [testConditions, setTestConditions] = useState<string[]>([]);

  useEffect(() => {
    const stored = readCalculatorConfig();
    setConfig(stored ? normalizeCalculatorConfig(stored) : cloneDefaultConfig());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => writeCalculatorConfig(config), 350);
    return () => window.clearTimeout(timer);
  }, [config, hydrated]);

  const diagnostics = useMemo(() => getFormulaDiagnostics(config), [config]);

  const sampleInput = useMemo(() => {
    const type = config.types.some((item) => item.name === testType)
      ? testType
      : config.types[0]?.name ?? "";
    const output = config.outputs.includes(testOutput)
      ? testOutput
      : config.outputs[0] ?? "DWG";
    const urgency = config.urgencies.includes(testUrgency)
      ? testUrgency
      : config.urgencies[0] ?? "Обычный срок";
    const area = Math.max(
      config.pricing.minArea,
      Math.min(config.pricing.maxArea, Number.isFinite(testArea) ? testArea : config.pricing.minArea),
    );
    const conditions = testConditions.filter((item) => config.conditions.includes(item));
    return { type, area, complexity: conditions, output, urgency };
  }, [config, testArea, testConditions, testOutput, testType, testUrgency]);

  const sampleEstimate = useMemo(
    () => calculateEstimate(sampleInput, config),
    [config, sampleInput],
  );

  const variables = useMemo(
    () => buildCalculatorVariables(sampleInput, config),
    [config, sampleInput],
  );

  const allVariables = useMemo(
    () => Array.from(new Set([
      ...BASE_VARIABLES,
      ...config.pricing.coefficients.map((item) => item.key),
      ...config.formulas.definitions.map((item) => item.key),
    ])),
    [config],
  );

  function update(next: CalculatorStudioConfig) {
    setConfig(next);
    setDirty(true);
  }

  function applyToPreview() {
    writeCalculatorConfig(config);
    setDirty(false);
    onChanged();
  }

  function reset() {
    const next = cloneDefaultConfig();
    writeCalculatorConfig(next);
    setConfig(next);
    setDirty(false);
    onChanged();
  }

  function updateType(index: number, key: "name" | "hint" | "tag", value: string) {
    const previousName = config.types[index]?.name;
    const types = config.types.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    );
    const pricing = key === "name" && previousName && previousName !== value
      ? {
          ...config.pricing,
          base: transferFactor(config.pricing.base, previousName, value),
        }
      : config.pricing;
    update({ ...config, types, pricing });
  }

  function updateBasePrice(name: string, value: string) {
    update({
      ...config,
      pricing: {
        ...config.pricing,
        base: { ...config.pricing.base, [name]: Number(value) || 0 },
      },
    });
  }

  function removeType(index: number) {
    if (config.types.length <= 1) return;
    const removed = config.types[index]?.name;
    const base = { ...config.pricing.base };
    if (removed) delete base[removed];
    update({
      ...config,
      types: config.types.filter((_, itemIndex) => itemIndex !== index),
      pricing: { ...config.pricing, base },
    });
  }

  function addType() {
    const name = uniqueKey("Новый метод", config.types.map((item) => item.name));
    update({
      ...config,
      types: [...config.types, { name, hint: "Описание результата", tag: "NEW" }],
      pricing: {
        ...config.pricing,
        base: { ...config.pricing.base, [name]: 120000 },
      },
    });
  }

  function renameListItem(key: ListKey, index: number, value: string) {
    const previous = config[key][index];
    const nextList = config[key].map((item, itemIndex) => itemIndex === index ? value : item);
    let pricing = config.pricing;

    if (previous && previous !== value && key === "outputs") {
      pricing = {
        ...pricing,
        formatFactor: transferFactor(pricing.formatFactor, previous, value),
      };
    }

    if (previous && previous !== value && key === "urgencies") {
      pricing = {
        ...pricing,
        urgencyFactor: transferFactor(pricing.urgencyFactor, previous, value),
      };
    }

    update({ ...config, [key]: nextList, pricing });
  }

  function addListItem(key: ListKey) {
    const base = key === "outputs"
      ? "Новый формат"
      : key === "urgencies"
        ? "Новый срок"
        : "Новое условие";
    const value = uniqueKey(base, config[key]);
    const next: CalculatorStudioConfig = { ...config, [key]: [...config[key], value] };

    if (key === "outputs") {
      next.pricing = {
        ...config.pricing,
        formatFactor: { ...config.pricing.formatFactor, [value]: 1 },
      };
    }

    if (key === "urgencies") {
      next.pricing = {
        ...config.pricing,
        urgencyFactor: { ...config.pricing.urgencyFactor, [value]: 1 },
      };
    }

    update(next);
  }

  function removeListItem(key: ListKey, index: number) {
    if (config[key].length <= 1) return;
    const removed = config[key][index];
    const next: CalculatorStudioConfig = {
      ...config,
      [key]: config[key].filter((_, itemIndex) => itemIndex !== index),
    };

    if (removed && key === "outputs") {
      const formatFactor = { ...config.pricing.formatFactor };
      delete formatFactor[removed];
      next.pricing = { ...config.pricing, formatFactor };
    }

    if (removed && key === "urgencies") {
      const urgencyFactor = { ...config.pricing.urgencyFactor };
      delete urgencyFactor[removed];
      next.pricing = { ...config.pricing, urgencyFactor };
    }

    update(next);
  }

  function updatePreset(index: number, key: "label" | "value", value: string) {
    update({
      ...config,
      areaPresets: config.areaPresets.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === "value" ? Number(value) || 0 : value }
          : item,
      ),
    });
  }

  function addPreset() {
    update({
      ...config,
      areaPresets: [
        ...config.areaPresets,
        { label: "Новый диапазон", value: config.pricing.minArea },
      ],
    });
  }

  function removePreset(index: number) {
    if (config.areaPresets.length <= 1) return;
    update({
      ...config,
      areaPresets: config.areaPresets.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function updatePricingField(
    key: keyof CalculatorStudioConfig["pricing"],
    value: string,
  ) {
    if (typeof config.pricing[key] !== "number") return;
    update({
      ...config,
      pricing: {
        ...config.pricing,
        [key]: Number(value) || 0,
      },
    });
  }

  function updateFactor(
    kind: "formatFactor" | "urgencyFactor",
    name: string,
    value: string,
  ) {
    update({
      ...config,
      pricing: {
        ...config.pricing,
        [kind]: {
          ...config.pricing[kind],
          [name]: Number(value) || 0,
        },
      },
    });
  }

  function addCoefficient() {
    const key = uniqueKey("newCoefficient", config.pricing.coefficients.map((item) => item.key));
    const coefficient: CalculatorCoefficient = {
      key,
      label: "Новый коэффициент",
      value: 1,
      unit: "×",
      description: "Используется в формулах.",
    };
    update({
      ...config,
      pricing: {
        ...config.pricing,
        coefficients: [...config.pricing.coefficients, coefficient],
      },
    });
  }

  function updateCoefficient(
    index: number,
    field: keyof CalculatorCoefficient,
    value: string,
  ) {
    const current = config.pricing.coefficients[index];
    if (!current) return;

    if (field === "value") {
      const coefficients = [...config.pricing.coefficients];
      coefficients[index] = { ...current, value: Number(value) || 0 };
      update({ ...config, pricing: { ...config.pricing, coefficients } });
      return;
    }

    if (field === "key") {
      const nextKey = value.trim();
      if (!isFormulaKey(nextKey) || nextKey === current.key) return;
      if (config.pricing.coefficients.some((item, itemIndex) => itemIndex !== index && item.key === nextKey)) return;

      const coefficients = [...config.pricing.coefficients];
      coefficients[index] = { ...current, key: nextKey };
      const definitions = config.formulas.definitions.map((item) => ({
        ...item,
        expression: replaceIdentifier(item.expression, current.key, nextKey),
      }));

      update({
        ...config,
        pricing: { ...config.pricing, coefficients },
        formulas: { ...config.formulas, definitions },
      });
      return;
    }

    const coefficients = [...config.pricing.coefficients];
    coefficients[index] = { ...current, [field]: value };
    update({ ...config, pricing: { ...config.pricing, coefficients } });
  }

  function removeCoefficient(index: number) {
    if (config.pricing.coefficients.length <= 1) return;
    update({
      ...config,
      pricing: {
        ...config.pricing,
        coefficients: config.pricing.coefficients.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  }

  function addFormula() {
    const key = uniqueKey("newFormula", config.formulas.definitions.map((item) => item.key));
    const formula: CalculatorFormula = {
      key,
      name: "Новая формула",
      expression: "1",
      enabled: true,
      description: "Пользовательская формула.",
    };
    update({
      ...config,
      formulas: {
        ...config.formulas,
        definitions: [...config.formulas.definitions, formula],
      },
    });
  }

  function updateFormula(
    index: number,
    field: keyof CalculatorFormula,
    value: string | boolean,
  ) {
    const current = config.formulas.definitions[index];
    if (!current) return;

    if (field === "key" && typeof value === "string") {
      const nextKey = value.trim();
      if (!isFormulaKey(nextKey) || nextKey === current.key) return;
      if (config.formulas.definitions.some((item, itemIndex) => itemIndex !== index && item.key === nextKey)) return;

      const definitions = config.formulas.definitions.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, key: nextKey }
          : { ...item, expression: replaceIdentifier(item.expression, current.key, nextKey) },
      );

      update({
        ...config,
        formulas: {
          definitions,
          priceFormulaKey: config.formulas.priceFormulaKey === current.key ? nextKey : config.formulas.priceFormulaKey,
          daysFormulaKey: config.formulas.daysFormulaKey === current.key ? nextKey : config.formulas.daysFormulaKey,
        },
      });
      return;
    }

    const definitions = [...config.formulas.definitions];
    definitions[index] = { ...current, [field]: value } as CalculatorFormula;
    update({ ...config, formulas: { ...config.formulas, definitions } });
  }

  function removeFormula(index: number) {
    if (config.formulas.definitions.length <= 1) return;
    const removed = config.formulas.definitions[index];
    const definitions = config.formulas.definitions.filter((_, itemIndex) => itemIndex !== index);
    const firstEnabled = definitions.find((item) => item.enabled)?.key ?? definitions[0]?.key ?? "";

    update({
      ...config,
      formulas: {
        definitions,
        priceFormulaKey: removed?.key === config.formulas.priceFormulaKey ? firstEnabled : config.formulas.priceFormulaKey,
        daysFormulaKey: removed?.key === config.formulas.daysFormulaKey ? firstEnabled : config.formulas.daysFormulaKey,
      },
    });
  }

  function copyVariable(value: string) {
    if (navigator.clipboard) void navigator.clipboard.writeText(value);
  }

  return (
    <div className="studio-calc-editor">
      <div className="studio-section-head">
        <div>
          <span className="studio-kicker">CALCULATOR / ENGINE</span>
          <h2>Динамический калькулятор</h2>
        </div>
        <div className="studio-calc-actions">
          <span className={dirty ? "studio-calc-dirty" : "studio-calc-clean"}>
            {dirty ? "DRAFT" : "APPLIED"}
          </span>
          <button type="button" className="studio-button studio-button-ghost" onClick={reset}>
            <RefreshCcw size={14} /> Сброс
          </button>
          <button
            type="button"
            className="studio-button studio-button-acid"
            onClick={applyToPreview}
            disabled={diagnostics.length > 0}
          >
            <Save size={14} /> Применить
          </button>
        </div>
      </div>

      <p className="studio-help">
        Поля редактируют локальный draft и автоматически сохраняются в браузере. «Применить» обновляет preview калькулятора.
        Формулы вычисляются безопасным математическим движком без eval.
      </p>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Сценарий проверки</b><span>меняй входы без изменения конфига</span></div>
        </div>
        <div className="studio-grid-fields">
          <label>
            <span>Метод</span>
            <select value={sampleInput.type} onChange={(e) => setTestType(e.target.value)}>
              {config.types.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Площадь, м²</span>
            <input type="number" min={config.pricing.minArea} max={config.pricing.maxArea} step={config.pricing.areaStep} value={sampleInput.area} onChange={(e) => setTestArea(Number(e.target.value))} />
          </label>
          <label>
            <span>Формат</span>
            <select value={sampleInput.output} onChange={(e) => setTestOutput(e.target.value)}>
              {config.outputs.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Срочность</span>
            <select value={sampleInput.urgency} onChange={(e) => setTestUrgency(e.target.value)}>
              {config.urgencies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="studio-test-conditions">
          <span>Условия</span>
          <div>
            {config.conditions.map((item) => {
              const active = sampleInput.complexity.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  className={active ? "active" : ""}
                  onClick={() => setTestConditions((current) => active ? current.filter((value) => value !== item) : [...current, item])}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="studio-card studio-calc-preview-card">
        <div className="studio-card-head">
          <div><b>Живой тест</b><span>первый метод · первый пресет</span></div>
          {diagnostics.length ? (
            <span className="studio-formula-status error"><CircleAlert size={13} /> {diagnostics.length} ошибок</span>
          ) : (
            <span className="studio-formula-status ok"><CheckCircle2 size={13} /> Формулы валидны</span>
          )}
        </div>
        <div className="studio-calc-preview-grid">
          <div><span>Цена</span><strong>{sampleEstimate.price.toLocaleString("ru-RU")} ₸</strong></div>
          <div><span>Срок</span><strong>{sampleEstimate.days} дн.</strong></div>
          <div><span>Площадь</span><strong>{sampleInput.area.toLocaleString("ru-RU")} м²</strong></div>
        </div>
        {diagnostics.length > 0 && (
          <div className="studio-formula-errors">
            {diagnostics.map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
      </section>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Методы / услуги</b><span>{config.types.length} элементов</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addType}>+ Метод</button>
        </div>
        <div className="studio-stack">
          {config.types.map((item, index) => (
            <div className="studio-repeater" key={index}>
              <div className="studio-repeater-title">METHOD {String(index + 1).padStart(2, "0")}</div>
              <label><span>Название</span><input value={item.name} onChange={(e) => updateType(index, "name", e.target.value)} /></label>
              <label><span>Подсказка</span><input value={item.hint} onChange={(e) => updateType(index, "hint", e.target.value)} /></label>
              <label><span>Тег</span><input value={item.tag} onChange={(e) => updateType(index, "tag", e.target.value)} /></label>
              <label><span>База, ₸</span><input type="number" min="0" step="5000" value={config.pricing.base[item.name] ?? 0} onChange={(e) => updateBasePrice(item.name, e.target.value)} /></label>
              <button type="button" className="studio-icon-button" onClick={() => removeType(index)} aria-label="Удалить метод"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="studio-editor-columns">
        <section className="studio-card">
          <div className="studio-card-head"><div><b>Форматы</b><span>{config.outputs.length}</span></div><button type="button" className="studio-small-button" onClick={() => addListItem("outputs")}>+ формат</button></div>
          <div className="studio-list-editor">
            {config.outputs.map((item, index) => (
              <div className="studio-list-row studio-factor-row" key={index}>
                <input value={item} onChange={(e) => renameListItem("outputs", index, e.target.value)} />
                <input className="studio-number-input" type="number" min="0" step="0.01" value={config.pricing.formatFactor[item] ?? 1} onChange={(e) => updateFactor("formatFactor", item, e.target.value)} aria-label="Коэффициент формата" />
                <button type="button" onClick={() => removeListItem("outputs", index)} aria-label="Удалить формат">×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="studio-card">
          <div className="studio-card-head"><div><b>Срочность</b><span>{config.urgencies.length}</span></div><button type="button" className="studio-small-button" onClick={() => addListItem("urgencies")}>+ срок</button></div>
          <div className="studio-list-editor">
            {config.urgencies.map((item, index) => (
              <div className="studio-list-row studio-factor-row" key={index}>
                <input value={item} onChange={(e) => renameListItem("urgencies", index, e.target.value)} />
                <input className="studio-number-input" type="number" min="0" step="0.01" value={config.pricing.urgencyFactor[item] ?? 1} onChange={(e) => updateFactor("urgencyFactor", item, e.target.value)} aria-label="Коэффициент срочности" />
                <button type="button" onClick={() => removeListItem("urgencies", index)} aria-label="Удалить срок">×</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="studio-card">
        <div className="studio-card-head"><div><b>Условия объекта</b><span>{config.conditions.length}</span></div><button type="button" className="studio-small-button" onClick={() => addListItem("conditions")}>+ условие</button></div>
        <div className="studio-chip-editor">
          {config.conditions.map((item, index) => (
            <div className="studio-chip-row" key={index}>
              <input value={item} onChange={(e) => renameListItem("conditions", index, e.target.value)} />
              <button type="button" onClick={() => removeListItem("conditions", index)} aria-label="Удалить условие">×</button>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Пресеты площади</b><span>{config.areaPresets.length}</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addPreset}>+ Пресет</button>
        </div>
        <div className="studio-stack">
          {config.areaPresets.map((item, index) => (
            <div className="studio-repeater studio-repeater-two" key={index}>
              <label><span>Подпись</span><input value={item.label} onChange={(e) => updatePreset(index, "label", e.target.value)} /></label>
              <label><span>Площадь, м²</span><input type="number" min="1" value={item.value} onChange={(e) => updatePreset(index, "value", e.target.value)} /></label>
              <button type="button" className="studio-icon-button" onClick={() => removePreset(index)} aria-label="Удалить пресет"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-card-head"><div><b>Системные коэффициенты</b><span>ядро цены и срока</span></div></div>
        <div className="studio-grid-fields">
          <NumberField label="Сложность / условие" value={config.pricing.complexityFactorPerCondition} step={0.01} onChange={(v) => updatePricingField("complexityFactorPerCondition", v)} />
          <NumberField label="Минимальная площадь" value={config.pricing.minArea} step={10} onChange={(v) => updatePricingField("minArea", v)} />
          <NumberField label="Максимальная площадь" value={config.pricing.maxArea} step={100} onChange={(v) => updatePricingField("maxArea", v)} />
          <NumberField label="Шаг площади" value={config.pricing.areaStep} step={10} onChange={(v) => updatePricingField("areaStep", v)} />
          <NumberField label="Базовая площадь" value={config.pricing.areaBase} step={100} onChange={(v) => updatePricingField("areaBase", v)} />
          <NumberField label="Мин. коэффициент площади" value={config.pricing.minAreaFactor} step={0.1} onChange={(v) => updatePricingField("minAreaFactor", v)} />
          <NumberField label="Макс. коэффициент площади" value={config.pricing.maxAreaFactor} step={0.1} onChange={(v) => updatePricingField("maxAreaFactor", v)} />
          <NumberField label="База дней" value={config.pricing.dayBase} step={1} onChange={(v) => updatePricingField("dayBase", v)} />
          <NumberField label="Вес площади в днях" value={config.pricing.dayAreaWeight} step={0.1} onChange={(v) => updatePricingField("dayAreaWeight", v)} />
          <NumberField label="Вес условий в днях" value={config.pricing.dayComplexityWeight} step={0.1} onChange={(v) => updatePricingField("dayComplexityWeight", v)} />
          <NumberField label="Срочно: минус дней" value={config.pricing.urgentDaysReduction} step={1} onChange={(v) => updatePricingField("urgentDaysReduction", v)} />
          <NumberField label="Очень срочно: минус дней" value={config.pricing.veryUrgentDaysReduction} step={1} onChange={(v) => updatePricingField("veryUrgentDaysReduction", v)} />
          <NumberField label="Округление цены" value={config.pricing.roundingStep} step={1000} onChange={(v) => updatePricingField("roundingStep", v)} />
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Пользовательские коэффициенты</b><span>{config.pricing.coefficients.length} переменных</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addCoefficient}>+ Коэффициент</button>
        </div>
        <p className="studio-help">Каждый коэффициент становится переменной с числовым значением. Например: <code>seasonFactor</code> или <code>siteVisitFee</code>.</p>
        <div className="studio-stack">
          {config.pricing.coefficients.map((item, index) => (
            <div className="studio-repeater studio-coefficient-row" key={index}>
              <label><span>Ключ</span><input value={item.key} onChange={(e) => updateCoefficient(index, "key", e.target.value)} /></label>
              <label><span>Название</span><input value={item.label} onChange={(e) => updateCoefficient(index, "label", e.target.value)} /></label>
              <label><span>Значение</span><input type="number" step="0.01" value={item.value} onChange={(e) => updateCoefficient(index, "value", e.target.value)} /></label>
              <label><span>Ед.</span><input value={item.unit ?? ""} onChange={(e) => updateCoefficient(index, "unit", e.target.value)} /></label>
              <label className="studio-coefficient-description"><span>Описание</span><input value={item.description ?? ""} onChange={(e) => updateCoefficient(index, "description", e.target.value)} /></label>
              <button type="button" className="studio-icon-button" onClick={() => removeCoefficient(index)} aria-label="Удалить коэффициент"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-card studio-formulas-card">
        <div className="studio-card-head">
          <div><b>Формулы</b><span>{config.formulas.definitions.length} правил</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addFormula}>+ Формула</button>
        </div>

        <div className="studio-formula-result-grid">
          <label><span>Формула цены</span><select value={config.formulas.priceFormulaKey} onChange={(e) => update({ ...config, formulas: { ...config.formulas, priceFormulaKey: e.target.value } })}>{config.formulas.definitions.map((item) => <option key={item.key} value={item.key}>{item.key} · {item.name}</option>)}</select></label>
          <label><span>Формула срока</span><select value={config.formulas.daysFormulaKey} onChange={(e) => update({ ...config, formulas: { ...config.formulas, daysFormulaKey: e.target.value } })}>{config.formulas.definitions.map((item) => <option key={item.key} value={item.key}>{item.key} · {item.name}</option>)}</select></label>
        </div>

        <div className="studio-variable-box">
          <div className="studio-variable-head"><span>Переменные</span><small>нажми для копирования</small></div>
          <div className="studio-variable-list">
            {allVariables.map((item) => (
              <button type="button" key={item} onClick={() => copyVariable(item)} title={"Скопировать " + item}>
                <code>{item}</code><Copy size={11} />
              </button>
            ))}
          </div>
          <p className="studio-note">Функции: {FORMULA_FUNCTIONS.join(", ")}. Операторы: + − × ÷ ^ и скобки.</p>
        </div>

        <div className="studio-stack">
          {config.formulas.definitions.map((formula, index) => {
            const hasError = diagnostics.some((error) => error.toLowerCase().includes(formula.key.toLowerCase()));
            return (
              <div className={hasError ? "studio-formula-row has-error" : "studio-formula-row"} key={index}>
                <div className="studio-formula-row-head">
                  <div><span>FORMULA {String(index + 1).padStart(2, "0")}</span>{formula.enabled ? <b>ACTIVE</b> : <i>OFF</i>}</div>
                  <button type="button" className="studio-icon-button" onClick={() => removeFormula(index)} aria-label="Удалить формулу"><Trash2 size={13} /></button>
                </div>
                <label><span>Ключ</span><input value={formula.key} onChange={(e) => updateFormula(index, "key", e.target.value)} /></label>
                <label><span>Название</span><input value={formula.name} onChange={(e) => updateFormula(index, "name", e.target.value)} /></label>
                <label><span>Формула</span><textarea rows={2} value={formula.expression} onChange={(e) => updateFormula(index, "expression", e.target.value)} spellCheck={false} /></label>
                <label><span>Описание</span><input value={formula.description ?? ""} onChange={(e) => updateFormula(index, "description", e.target.value)} /></label>
                <div className="studio-formula-controls">
                  <label className="studio-toggle"><span>Активна</span><input type="checkbox" checked={formula.enabled} onChange={(e) => updateFormula(index, "enabled", e.target.checked)} /></label>
                  <code>{formula.key} = {formula.expression || "…"}</code>
                </div>
              </div>
            );
          })}
        </div>

        <div className="studio-formula-context">
          <b>Контекст теста</b>
          <div>{Object.entries(variables).map(([key, value]) => <span key={key}><code>{key}</code> {Number.isInteger(value) ? value : value.toFixed(3)}</span>)}</div>
        </div>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" value={value} step={step} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
