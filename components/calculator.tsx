"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { calculateEstimate } from "@/lib/calculator";

const types = [
  { name: "Топографическая съёмка", hint: "Участок, рельеф, существующие объекты", tag: "TOP" },
  { name: "Исполнительная съёмка", hint: "Контроль фактического положения на стройке", tag: "BUILD" },
  { name: "Аэрофотосъёмка", hint: "Ортофото, поверхность и облако точек", tag: "UAV" },
  { name: "Лазерное сканирование", hint: "Плотное 3D-облако точек", tag: "LIDAR" },
  { name: "3D-моделирование", hint: "Цифровая модель объекта", tag: "3D" },
  { name: "Расчёт объёмов", hint: "Котлован, насыпь, карьер, склад", tag: "VOL" },
];

const outputs = ["DWG", "PDF", "GeoTIFF", "LAS/LAZ", "E57", "OBJ", "Не знаю"];
const urgencies = ["Обычный срок", "Срочно", "Очень срочно"];
const conditions = ["Лес", "Сложный рельеф", "Плотная застройка", "ЛЭП", "Удалённость"];
const areaPresets = [
  { label: "до 0,1 га", value: 1000 },
  { label: "0,1–0,5 га", value: 3000 },
  { label: "0,5–1 га", value: 7000 },
  { label: "1–5 га", value: 20000 },
  { label: "5+ га", value: 60000 },
];

export function Calculator() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(types[0].name);
  const [area, setArea] = useState(10000);
  const [complexity, setComplexity] = useState<string[]>([]);
  const [output, setOutput] = useState(outputs[0]);
  const [urgency, setUrgency] = useState(urgencies[0]);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const estimate = useMemo(
    () => calculateEstimate({ type, area, complexity, output, urgency }),
    [type, area, complexity, output, urgency],
  );

  const selectedType = types.find((item) => item.name === type) ?? types[0];

  const toggleCondition = (value: string) =>
    setComplexity((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const changeArea = (delta: number) => {
    setArea((current) => Math.max(100, Math.min(500000, current + delta)));
  };

  const next = () => {
    setError("");
    if (step === 2 && (!Number.isFinite(area) || area < 100)) {
      setError("Укажите площадь от 100 м².");
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  };

  const back = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  };

  function reset() {
    setStep(1);
    setType(types[0].name);
    setArea(10000);
    setComplexity([]);
    setOutput(outputs[0]);
    setUrgency(urgencies[0]);
    setPhone("");
    setSent(false);
    setLeadId("");
    setError("");
  }

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

      const data = (await response.json()) as {
        ok?: boolean;
        leadId?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Не удалось отправить заявку");
      }

      setLeadId(data.leadId ?? "");
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
      <div className="calculator-success calculator-success-rich">
        <div className="success-icon"><CheckCircle2 size={34} /></div>
        <p className="eyebrow">ГОТОВО / ЗАЯВКА ПРИНЯТА</p>
        <h2>Предварительный расчёт готов</h2>
        <p className="success-lead">
          Мы получили параметры объекта и можем уточнить финальную стоимость после проверки задачи.
        </p>

        <div className="success-estimate">
          <div>
            <span>Ориентир по стоимости</span>
            <strong>{estimate.price.toLocaleString("ru-RU")} ₸</strong>
          </div>
          <div>
            <span>Ориентир по сроку</span>
            <strong>{estimate.days} раб. дн.</strong>
          </div>
        </div>

        <div className="success-details">
          <span><b>Работа</b>{type}</span>
          <span><b>Площадь</b>{area.toLocaleString("ru-RU")} м²</span>
          <span><b>Результат</b>{output}</span>
          <span><b>Срок</b>{urgency}</span>
        </div>

        {leadId && <p className="success-id">Заявка {leadId}</p>}

        <button type="button" className="button button-ghost" onClick={reset}>
          <RotateCcw size={16} /> Новый расчёт
        </button>
      </div>
    );
  }

  return (
    <div className="calculator-shell">
      <div className="calculator-main">
        <div className="progress">
          <div className="progress-head">
            <span>Шаг {step} из 4</span>
            <span>
              {step === 1 ? "Метод" : step === 2 ? "Размер" : step === 3 ? "Условия" : "Контакт"}
            </span>
          </div>
          <div aria-hidden="true">
            <i style={{ width: (step * 25) + "%" }} />
          </div>
        </div>

        {step === 1 && (
          <div className="calc-step">
            <p className="eyebrow">01 / Работа</p>
            <h2>Какой результат нужен?</h2>
            <p className="calc-intro">
              Выберите ближайший вариант. После заявки специалист сможет скорректировать состав работ.
            </p>

            <div className="choice-grid calculator-services">
              {types.map((item) => {
                const active = type === item.name;
                return (
                  <button
                    type="button"
                    className={active ? "choice choice-service active" : "choice choice-service"}
                    onClick={() => setType(item.name)}
                    key={item.name}
                    aria-pressed={active}
                  >
                    <span className="choice-service-top">
                      <b>{item.tag}</b>
                      {active && <Check size={16} />}
                    </span>
                    <strong>{item.name}</strong>
                    <small>{item.hint}</small>
                  </button>
                );
              })}
            </div>

            <div className="selected-method">
              <span>Выбрано</span>
              <strong>{selectedType.name}</strong>
              <small>{selectedType.hint}</small>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="calc-step">
            <p className="eyebrow">02 / Размер</p>
            <h2>Какой масштаб объекта?</h2>
            <p className="calc-intro">
              Площадь может быть приблизительной. Для линейных объектов оставьте ближайший эквивалент и уточните задачу в заявке.
            </p>

            <div className="area-control">
              <button type="button" onClick={() => changeArea(-1000)} aria-label="Уменьшить площадь">
                <Minus size={18} />
              </button>
              <label>
                <span>Площадь, м²</span>
                <input
                  type="number"
                  min={100}
                  max={500000}
                  step={100}
                  inputMode="numeric"
                  value={area}
                  onChange={(event) =>
                    setArea(Math.max(100, Math.min(500000, Number(event.target.value) || 100)))
                  }
                />
              </label>
              <button type="button" onClick={() => changeArea(1000)} aria-label="Увеличить площадь">
                <Plus size={18} />
              </button>
            </div>

            <div className="area-presets">
              {areaPresets.map((preset) => (
                <button
                  type="button"
                  className={area === preset.value ? "area-preset active" : "area-preset"}
                  onClick={() => setArea(preset.value)}
                  key={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="calc-step">
            <p className="eyebrow">03 / Условия</p>
            <h2>Что может повлиять на работу?</h2>
            <p className="calc-intro">
              Отметьте всё, что известно. Если ничего особенного нет, оставьте пусто.
            </p>

            <div className="choice-grid conditions-grid">
              {conditions.map((item) => {
                const active = complexity.includes(item);
                return (
                  <button
                    type="button"
                    className={active ? "choice active" : "choice"}
                    onClick={() => toggleCondition(item)}
                    key={item}
                    aria-pressed={active}
                  >
                    {active ? <Check size={16} /> : <span className="choice-marker" />}
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="calc-subsection">
              <span className="calc-label">Срок выполнения</span>
              <div className="choice-grid compact">
                {urgencies.map((item) => (
                  <button
                    type="button"
                    className={urgency === item ? "choice active" : "choice"}
                    onClick={() => setUrgency(item)}
                    key={item}
                    aria-pressed={urgency === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="calc-subsection">
              <label className="field">
                <span>Формат результата</span>
                <select value={output} onChange={(event) => setOutput(event.target.value)}>
                  {outputs.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="calc-step">
            <p className="eyebrow">04 / Контакт</p>
            <h2>Куда отправить расчёт?</h2>
            <p className="calc-intro">
              Оставьте телефон. Предварительная оценка появится сразу, а финальный расчёт уточним после контакта.
            </p>

            <label className="field">
              <span>Телефон</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 7XX XXX XX XX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) void submit();
                }}
              />
            </label>

            <div className="estimate-preview">
              <div>
                <span>Ориентировочная стоимость</span>
                <strong>{estimate.price.toLocaleString("ru-RU")} ₸</strong>
              </div>
              <div>
                <span>Ориентировочный срок</span>
                <strong>{estimate.days} раб. дн.</strong>
              </div>
              <small>
                Оценка зависит от условий объекта и не заменяет финальное коммерческое предложение.
              </small>
            </div>

            {error && <div className="calc-error" role="alert">{error}</div>}

            <button type="button" className="button button-dark full" onClick={submit} disabled={loading}>
              {loading ? (
                <><Loader2 size={18} className="spin" /> Отправляем</>
              ) : (
                <>Отправить заявку <ArrowRight size={18} /></>
              )}
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
        <div className="summary-kicker">
          <p className="eyebrow">LIVE / ОЦЕНКА</p>
          <span className="live-dot" />
        </div>
        <strong>{estimate.price.toLocaleString("ru-RU")} ₸</strong>
        <span>{estimate.days} рабочих дней · ориентир</span>

        <div className="summary-progress">
          {[1, 2, 3, 4].map((item) => (
            <span className={item <= step ? "done" : ""} key={item}>
              {item <= step ? <Check size={11} /> : item}
            </span>
          ))}
        </div>

        <div className="summary-lines">
          <span><b>Работа</b>{type}</span>
          <span><b>Площадь</b>{area.toLocaleString("ru-RU")} м²</span>
          <span><b>Условия</b>{complexity.length ? complexity.length + " выбрано" : "Без осложнений"}</span>
          <span><b>Формат</b>{output}</span>
          <span><b>Срок</b>{urgency}</span>
        </div>

        <p className="summary-note">
          Цена считается автоматически по базовым параметрам и нужна для первичной оценки. Точный расчёт — после уточнения объекта.
        </p>
      </aside>
    </div>
  );
}
