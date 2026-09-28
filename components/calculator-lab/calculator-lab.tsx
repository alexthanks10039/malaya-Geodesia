"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronRight, CircleAlert, Copy, Database, FlaskConical, GitBranch, Info, RotateCcw } from "lucide-react";
import { calculatorRegistry } from "@/lib/calculators-lab/registry";
import { runCalculator } from "@/lib/calculators-lab/engine";
import type { CalculatorInputSpec, CalculatorResult } from "@/lib/calculators-lab/types";
import styles from "./calculator-lab.module.css";

function initialValues(specs: CalculatorInputSpec[]): Record<string, string | number> {
  return Object.fromEntries(
    specs.map((spec) => [spec.key, spec.defaultValue ?? ""]),
  );
}

export function CalculatorLab() {
  const [selectedId, setSelectedId] = useState(calculatorRegistry[0]?.id ?? "");
  const selected = calculatorRegistry.find((item) => item.id === selectedId) ?? calculatorRegistry[0];
  const [values, setValues] = useState<Record<string, string | number>>(
    selected ? initialValues(selected.inputs) : {},
  );

  const result = useMemo(
    () => selected ? runCalculator(selected.id, values) : { ok: false as const, error: "Нет калькуляторов." },
    [selected, values],
  );

  function selectCalculator(id: string) {
    const next = calculatorRegistry.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(id);
    setValues(initialValues(next.inputs));
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    if (selected) setValues(initialValues(selected.inputs));
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <span className={styles.kicker}>CALCULATOR LAB / ISOLATED</span>
          <h1>Лаборатория геодезических калькуляторов</h1>
          <p>Отдельный контур для расчётов, архитектуры и UX. В основной проект не подключён.</p>
        </div>
        <div className={styles.status}>
          <FlaskConical size={16} />
          <span>branch: feature/calculators-lab</span>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sideTitle}>
            <Calculator size={16} />
            <span>Каталог</span>
          </div>
          {calculatorRegistry.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => selectCalculator(item.id)}
              className={item.id === selected?.id ? styles.navActive : styles.navItem}
            >
              <span>
                <small>{item.category}</small>
                <strong>{item.title}</strong>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
          <div className={styles.sideFooter}>
            <div><Database size={14} /> Schema-driven registry</div>
            <div><GitBranch size={14} /> No production wiring</div>
          </div>
        </aside>

        <main className={styles.main}>
          {selected ? (
            <>
              <section className={styles.heroCard}>
                <div>
                  <span className={styles.eyebrow}>{selected.category}</span>
                  <h2>{selected.title}</h2>
                  <p>{selected.description}</p>
                </div>
                <div className={styles.sourceBadge}>
                  <Info size={14} />
                  <span>{selected.source}</span>
                </div>
              </section>

              <div className={styles.workgrid}>
                <section className={styles.card}>
                  <div className={styles.cardHead}>
                    <div>
                      <span className={styles.eyebrow}>INPUT</span>
                      <h3>Параметры</h3>
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={reset}>
                      <RotateCcw size={14} />
                      Сбросить
                    </button>
                  </div>
                  <div className={styles.form}>
                    {selected.inputs.map((spec) => (
                      <Field key={spec.key} spec={spec} value={values[spec.key] ?? ""} onChange={(value) => updateValue(spec.key, value)} />
                    ))}
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardHead}>
                    <div>
                      <span className={styles.eyebrow}>OUTPUT</span>
                      <h3>Результат</h3>
                    </div>
                    <span className={styles.live}>LIVE</span>
                  </div>
                  {!result.ok ? (
                    <div className={styles.error}>
                      <CircleAlert size={18} />
                      <span>{result.error}</span>
                    </div>
                  ) : (
                    <ResultView result={result.result} />
                  )}
                </section>
              </div>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.eyebrow}>ARCHITECTURE</span>
                    <h3>Контракт калькулятора</h3>
                  </div>
                </div>
                <div className={styles.contract}>
                  <div><span>id</span><code>{selected.id}</code></div>
                  <div><span>inputs</span><code>{selected.inputs.length} schema fields</code></div>
                  <div><span>engine</span><code>runCalculator(id, values)</code></div>
                  <div><span>production</span><code>not connected</code></div>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Field({
  spec,
  value,
  onChange,
}: {
  spec: CalculatorInputSpec;
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>
        <b>{spec.label}</b>
        {spec.unit ? <em>{spec.unit}</em> : null}
      </span>
      {spec.kind === "textarea" ? (
        <textarea
          rows={7}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={spec.placeholder}
          spellCheck={false}
        />
      ) : spec.kind === "select" ? (
        <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {(spec.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input
          type="number"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          min={spec.min}
          max={spec.max}
          step={spec.step}
        />
      )}
      {spec.help ? <small>{spec.help}</small> : null}
    </label>
  );
}

function ResultView({ result }: { result: CalculatorResult }) {
  return (
    <div className={styles.result}>
      <div className={styles.primary}>
        <span>{result.primary.label}</span>
        <strong>{result.primary.value}</strong>
        {result.primary.unit ? <em>{result.primary.unit}</em> : null}
      </div>
      <div className={styles.metrics}>
        {result.metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value} {metric.unit ?? ""}</strong>
          </div>
        ))}
      </div>
      {result.formula ? (
        <div className={styles.formula}>
          <span>FORMULA</span>
          <code>{result.formula}</code>
          <button type="button" aria-label="Скопировать формулу" onClick={() => void navigator.clipboard?.writeText(result.formula ?? "")}>
            <Copy size={13} />
          </button>
        </div>
      ) : null}
      {result.warnings?.map((warning) => (
        <div className={styles.warning} key={warning}>
          <CircleAlert size={14} />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
