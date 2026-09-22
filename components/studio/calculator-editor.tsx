"use client";

import { useEffect, useState } from "react";
import {
  defaultCalculatorStudioConfig,
  type CalculatorStudioConfig,
} from "@/studio/config/calculator";
import {
  readCalculatorConfig,
  writeCalculatorConfig,
} from "@/studio/runtime/storage";

type Props = {
  onChanged: () => void;
};

function updateArrayItem(items: string[], index: number, value: string): string[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

export function CalculatorStudioEditor({ onChanged }: Props) {
  const [config, setConfig] = useState<CalculatorStudioConfig>(defaultCalculatorStudioConfig);

  useEffect(() => {
    const stored = readCalculatorConfig();
    if (stored) setConfig(stored);
  }, []);

  function save(next: CalculatorStudioConfig) {
    setConfig(next);
    writeCalculatorConfig(next);
    onChanged();
  }

  function updateType(index: number, key: "name" | "hint" | "tag", value: string) {
    const types = config.types.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    );
    const previousName = config.types[index]?.name;
    const base = { ...config.pricing.base };
    if (previousName && previousName !== value && key === "name" && base[previousName] !== undefined) {
      base[value] = base[previousName];
      delete base[previousName];
    }
    save({ ...config, types, pricing: { ...config.pricing, base } });
  }

  function removeType(index: number) {
    if (config.types.length <= 1) return;
    const removedName = config.types[index]?.name;
    const types = config.types.filter((_, itemIndex) => itemIndex !== index);
    const base = { ...config.pricing.base };
    if (removedName) delete base[removedName];
    save({ ...config, types, pricing: { ...config.pricing, base } });
  }

  function addType() {
    const name = "Новый метод";
    save({
      ...config,
      types: [...config.types, { name, hint: "Описание результата", tag: "NEW" }],
      pricing: {
        ...config.pricing,
        base: { ...config.pricing.base, [name]: 120000 },
      },
    });
  }

  function updateList(
    key: "outputs" | "urgencies" | "conditions",
    index: number,
    value: string,
  ) {
    save({ ...config, [key]: updateArrayItem(config[key], index, value) });
  }

  function addListItem(key: "outputs" | "urgencies" | "conditions", value: string) {
    if (!value.trim()) return;
    save({ ...config, [key]: [...config[key], value.trim()] });
  }

  function removeListItem(key: "outputs" | "urgencies" | "conditions", index: number) {
    if (config[key].length <= 1) return;
    save({ ...config, [key]: config[key].filter((_, itemIndex) => itemIndex !== index) });
  }

  function updatePreset(index: number, key: "label" | "value", value: string) {
    const areaPresets = config.areaPresets.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, [key]: key === "value" ? Number(value) || 0 : value }
        : item,
    );
    save({ ...config, areaPresets });
  }

  function removePreset(index: number) {
    if (config.areaPresets.length <= 1) return;
    save({
      ...config,
      areaPresets: config.areaPresets.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function addPreset() {
    save({
      ...config,
      areaPresets: [...config.areaPresets, { label: "Новый диапазон", value: config.pricing.minArea }],
    });
  }

  function updateBasePrice(name: string, value: string) {
    save({
      ...config,
      pricing: {
        ...config.pricing,
        base: { ...config.pricing.base, [name]: Number(value) || 0 },
      },
    });
  }

  function updateUrgencyFactor(name: string, value: string) {
    save({
      ...config,
      pricing: {
        ...config.pricing,
        urgencyFactor: { ...config.pricing.urgencyFactor, [name]: Number(value) || 0 },
      },
    });
  }

  function updatePricingField(
    key: keyof CalculatorStudioConfig["pricing"],
    value: string,
  ) {
    const previous = config.pricing[key];
    if (typeof previous !== "number") return;
    save({
      ...config,
      pricing: {
        ...config.pricing,
        [key]: Number(value) || 0,
      },
    });
  }

  function reset() {
    save(defaultCalculatorStudioConfig);
  }

  return (
    <div className="studio-calc-editor">
      <div className="studio-section-head">
        <div>
          <span className="studio-kicker">CALCULATOR / CONFIG</span>
          <h2>Редактор калькулятора</h2>
        </div>
        <button type="button" className="studio-button studio-button-ghost" onClick={reset}>
          Сбросить конфиг
        </button>
      </div>

      <p className="studio-help">
        Все изменения сохраняются как черновик и применяются только в preview калькулятора, когда Studio включён.
      </p>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Методы / услуги</b><span>{config.types.length} элементов</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addType}>+ Добавить</button>
        </div>
        <div className="studio-stack">
          {config.types.map((item, index) => (
            <div className="studio-repeater" key={index}>
              <div className="studio-repeater-title">METHOD {String(index + 1).padStart(2, "0")}</div>
              <label><span>Название</span><input value={item.name} onChange={(e) => updateType(index, "name", e.target.value)} /></label>
              <label><span>Подсказка</span><input value={item.hint} onChange={(e) => updateType(index, "hint", e.target.value)} /></label>
              <label><span>Тег</span><input value={item.tag} onChange={(e) => updateType(index, "tag", e.target.value)} /></label>
              <label><span>База, ₸</span><input type="number" min="0" step="5000" value={config.pricing.base[item.name] ?? 0} onChange={(e) => updateBasePrice(item.name, e.target.value)} /></label>
              <button type="button" className="studio-icon-button" onClick={() => removeType(index)} aria-label="Удалить метод">×</button>
            </div>
          ))}
        </div>
      </section>

      <div className="studio-editor-columns">
        <section className="studio-card">
          <div className="studio-card-head"><div><b>Форматы результата</b><span>{config.outputs.length}</span></div></div>
          <div className="studio-list-editor">
            {config.outputs.map((item, index) => (
              <div className="studio-list-row" key={index}>
                <input value={item} onChange={(e) => updateList("outputs", index, e.target.value)} />
                <button type="button" onClick={() => removeListItem("outputs", index)}>×</button>
              </div>
            ))}
            <button type="button" className="studio-small-button" onClick={() => addListItem("outputs", "Новый формат")}>+ формат</button>
          </div>
        </section>

        <section className="studio-card">
          <div className="studio-card-head"><div><b>Сроки</b><span>{config.urgencies.length}</span></div></div>
          <div className="studio-list-editor">
            {config.urgencies.map((item, index) => (
              <div className="studio-list-row" key={index}>
                <input value={item} onChange={(e) => updateList("urgencies", index, e.target.value)} />
                <input className="studio-number-input" type="number" min="0" step="0.01" value={config.pricing.urgencyFactor[item] ?? 1} onChange={(e) => updateUrgencyFactor(item, e.target.value)} />
                <button type="button" onClick={() => removeListItem("urgencies", index)}>×</button>
              </div>
            ))}
            <button type="button" className="studio-small-button" onClick={() => addListItem("urgencies", "Новый срок")}>+ срок</button>
          </div>
        </section>
      </div>

      <section className="studio-card">
        <div className="studio-card-head"><div><b>Условия объекта</b><span>{config.conditions.length}</span></div></div>
        <div className="studio-chip-editor">
          {config.conditions.map((item, index) => (
            <div className="studio-chip-row" key={index}>
              <input value={item} onChange={(e) => updateList("conditions", index, e.target.value)} />
              <button type="button" onClick={() => removeListItem("conditions", index)}>×</button>
            </div>
          ))}
          <button type="button" className="studio-small-button" onClick={() => addListItem("conditions", "Новое условие")}>+ условие</button>
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-card-head">
          <div><b>Пресеты площади</b><span>{config.areaPresets.length}</span></div>
          <button type="button" className="studio-button studio-button-acid" onClick={addPreset}>+ Добавить</button>
        </div>
        <div className="studio-stack">
          {config.areaPresets.map((item, index) => (
            <div className="studio-repeater studio-repeater-two" key={index}>
              <label><span>Label</span><input value={item.label} onChange={(e) => updatePreset(index, "label", e.target.value)} /></label>
              <label><span>Площадь, м²</span><input type="number" min="1" value={item.value} onChange={(e) => updatePreset(index, "value", e.target.value)} /></label>
              <button type="button" className="studio-icon-button" onClick={() => removePreset(index)} aria-label="Удалить пресет">×</button>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-card-head"><div><b>Математика расчёта</b><span>живые параметры</span></div></div>
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
        <div className="studio-card-head"><div><b>Коэффициенты форматов</b><span>1 = без надбавки</span></div></div>
        <div className="studio-list-editor">
          {Object.entries(config.pricing.formatFactor).map(([name, factor]) => (
            <div className="studio-list-row" key={name}>
              <input value={name} readOnly aria-label="Формат" />
              <input className="studio-number-input" type="number" min="0" step="0.01" value={factor} onChange={(e) => save({
                ...config,
                pricing: {
                  ...config.pricing,
                  formatFactor: { ...config.pricing.formatFactor, [name]: Number(e.target.value) || 0 },
                },
              })} />
              <button
                type="button"
                onClick={() => {
                  const next = { ...config.pricing.formatFactor };
                  delete next[name];
                  save({ ...config, pricing: { ...config.pricing, formatFactor: next } });
                }}
              >×</button>
            </div>
          ))}
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
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
