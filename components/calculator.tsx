"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { calculateEstimate } from "@/lib/calculator";

const types = [
  "Топографическая съёмка",
  "Исполнительная съёмка",
  "Аэрофотосъёмка",
  "Лазерное сканирование",
  "3D-моделирование",
  "Расчёт объёмов",
];

const outputs = ["DWG", "PDF", "GeoTIFF", "LAS/LAZ", "E57", "OBJ", "Не знаю"];
const urgencies = ["Обычный срок", "Срочно", "Очень срочно"];
const conditions = ["Лес", "Сложный рельеф", "Плотная застройка", "ЛЭП", "Удалённость"];

export function Calculator() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(types[0]);
  const [area, setArea] = useState(10000);
  const [complexity, setComplexity] = useState<string[]>([]);
  const [output, setOutput] = useState(outputs[0]);
  const [urgency, setUrgency] = useState(urgencies[0]);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const estimate = useMemo(
    () => calculateEstimate({ type, area, complexity, output, urgency }),
    [type, area, complexity, output, urgency],
  );

  const toggle = (value: string) =>
    setComplexity((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const next = () => {
    setError("");
    setStep((current) => Math.min(4, current + 1));
  };

  const back = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  };

  async function submit() {
    const normalizedPhone = phone.replace(/[^+\d]/g, "");
    if (normalizedPhone.length < 10) {
      setError("Укажите номер телефона, чтобы мы могли связаться.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          type,
          area,
          complexity,
          output,
          urgency,
          estimate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось отправить заявку");
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось отправить заявку. Попробуйте ещё раз.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="calculator-success">
        <CheckCircle2 size={40} />
        <p className="eyebrow">ГОТОВО / 04</p>
        <h2>Расчёт отправлен</h2>
        <p>Мы получили параметры объекта и предварительную стоимость.</p>
      </div>
    );
  }

  return (
    <div className="calculator-shell">
      <div className="calculator-main">
        <div className="progress">
          <span>Шаг {step} из 4</span>
          <div aria-hidden="true"><i style={{ width: `${step * 25}%` }} /></div>
        </div>

        {step === 1 && (
          <div className="calc-step">
            <p className="eyebrow">01 / Работа</p>
            <h2>Что нужно сделать?</h2>
            <div className="choice-grid">
              {types.map((item) => (
                <button
                  type="button"
                  className={type === item ? "choice active" : "choice"}
                  onClick={() => setType(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="calc-step">
            <p className="eyebrow">02 / Размер</p>
            <h2>Какой масштаб объекта?</h2>
            <label className="field">
              <span>Площадь, м²</span>
              <input
                type="number"
                min={100}
                step={100}
                inputMode="numeric"
                value={area}
                onChange={(event) => setArea(Math.max(100, Number(event.target.value) || 100))}
              />
            </label>
            <p className="field-hint">Можно указать приблизительную площадь. Точный объём работ уточним после заявки.</p>
          </div>
        )}

        {step === 3 && (
          <div className="calc-step">
            <p className="eyebrow">03 / Условия</p>
            <h2>Что влияет на работу?</h2>
            <div className="choice-grid">
              {conditions.map((item) => (
                <button
                  type="button"
                  className={complexity.includes(item) ? "choice active" : "choice"}
                  onClick={() => toggle(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="choice-grid compact">
              {urgencies.map((item) => (
                <button
                  type="button"
                  className={urgency === item ? "choice active" : "choice"}
                  onClick={() => setUrgency(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Формат результата</span>
              <select value={output} onChange={(event) => setOutput(event.target.value)}>
                {outputs.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="calc-step">
            <p className="eyebrow">04 / Контакт</p>
            <h2>Куда отправить расчёт?</h2>
            <label className="field">
              <span>Телефон</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 7XX XXX XX XX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <div className="estimate-preview">
              <span>Предварительная оценка</span>
              <strong>{estimate.price.toLocaleString("ru-RU")} ₸</strong>
              <small>{estimate.days} рабочих дней · {output} · {urgency.toLowerCase()}</small>
            </div>
            {error && <div className="calc-error" role="alert">{error}</div>}
            <button type="button" className="button button-dark full" onClick={submit} disabled={loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Отправляем</> : <>Отправить заявку <ArrowRight size={18} /></>}
            </button>
          </div>
        )}

        {step < 4 && error && <div className="calc-error" role="alert">{error}</div>}

        <div className="calc-nav">
          <button type="button" className="button button-muted" disabled={step === 1 || loading} onClick={back}>
            <ArrowLeft size={17} /> Назад
          </button>
          {step < 4 && (
            <button type="button" className="button button-dark" onClick={next}>
              Далее <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>

      <aside className="calculator-summary">
        <p className="eyebrow">Предварительный расчёт</p>
        <strong>{estimate.price.toLocaleString("ru-RU")} ₸</strong>
        <span>{estimate.days} рабочих дней</span>
        <div className="summary-lines">
          <span>{type}</span>
          <span>{area.toLocaleString("ru-RU")} м²</span>
          <span>{output}</span>
          <span>{urgency}</span>
        </div>
      </aside>
    </div>
  );
}
