import Link from "next/link";
import { ArrowRight, ArrowDownRight, Boxes, Crosshair, Database, Ruler, ScanLine, CircleDot } from "lucide-react";
import { ServiceCard } from "@/components/service-card";
import { services, cases, technologies } from "@/lib/data";

const scenarios = [
  ["Построить дом", "Топография + высоты + данные для проекта"],
  ["Подготовить участок", "Рельеф, существующие объекты и данные для проекта"],
  ["Получить 3D", "Фотограмметрия, point cloud или лазерное сканирование"],
  ["Посчитать объём", "Карьер, котлован, насыпь или стройплощадка"],
] as const;

export default function Home() {
  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">GEOSPATIAL / ENGINEERING / 2026</p>
          <h1>Точная геодезия<br /><span>для реальных задач.</span></h1>
          <p className="hero-lead">
            Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/calculator">Рассчитать стоимость <ArrowRight size={18} /></Link>
            <Link className="button button-ghost" href="/services">Все услуги <ArrowDownRight size={18} /></Link>
          </div>
          <div className="hero-meta" aria-label="Ключевые характеристики">
            <div><strong>GNSS · RTK</strong><span>Координаты и высотная привязка</span></div>
            <div><strong>LiDAR · 3D</strong><span>Объекты, рельеф и point cloud</span></div>
            <div><strong>DWG · E57</strong><span>Данные в рабочем формате</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="survey-console">
            <div className="console-top"><span>FIELD / ALMATY / LIVE</span><strong>SCAN 04</strong></div>
            <div className="console-map">
              <i className="console-line one" /><i className="console-line two" />
              <i className="console-point a" /><i className="console-point b" /><i className="console-point c" />
              <span className="console-readout">POINT CLOUD<strong>1.84M pts</strong>RMSE 0.018 m</span>
              <span className="console-scan" />
            </div>
            <div className="console-bottom"><span>43°14′17″ N · 76°56′44″ E</span><span>09:42:18</span></div>
          </div>
          <span className="coord c1">ELEV 861.42</span>
          <span className="coord c2">GRID 1000 / 1000</span>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Под задачу</p><h2>Не знаете, какая геодезия нужна?</h2></div>
          <Link className="text-link" href="/calculator">Открыть калькулятор <ArrowRight size={16} /></Link>
        </div>
        <div className="scenario-grid">
          {scenarios.map(([title, text], i) => (
            <Link className="scenario-card" href="/calculator" key={title}>
              <span className="scenario-index">0{i + 1}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
              <ArrowRight size={19} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="section-heading">
          <div><p className="eyebrow">Pipeline / 01—04</p><h2>От поля до готовых данных</h2></div>
        </div>
        <div className="pipeline">
          {[
            [Crosshair, "Задача", "Фиксируем объект и нужный результат."],
            [ScanLine, "Съёмка", "GNSS, RTK, тахеометр, БПЛА или LiDAR."],
            [Boxes, "Обработка", "Собираем цифровую модель и проверяем качество."],
            [Database, "Результат", "DWG, PDF, GeoTIFF, LAS/LAZ, E57, 3D."],
          ].map(([Icon, title, text], i) => {
            const Component = Icon as typeof Crosshair;
            return <div className="pipeline-item" key={String(title)}><span>0{i + 1}</span><Component size={27} /><h3>{title}</h3><p>{text}</p></div>;
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Услуги / 06</p><h2>Геодезические работы под конкретный результат</h2></div>
          <Link className="text-link" href="/services">Все услуги <ArrowRight size={16} /></Link>
        </div>
        <div className="service-grid">{services.map(service => <ServiceCard key={service.slug} service={service} />)}</div>
      </section>

      <section className="section">
        <div className="map-card">
          <div>
            <p className="eyebrow">GEOSPATIAL DATA / INDEX</p>
            <h2>База геодезии, где термины связаны с технологиями и форматами.</h2>
            <p>Справочник строится как связанная база знаний, чтобы быстро разобраться, что измерять и какой результат нужен.</p>
            <Link className="button button-light" href="/knowledge">Открыть справочник <ArrowRight size={16} /></Link>
          </div>
          <div className="map-visual" aria-hidden="true">
            <span className="point p1">43.2382 / 76.9456</span>
            <span className="point p2">43.2196 / 76.8897</span>
            <span className="route r1" /><span className="route r2" />
            <CircleDot className="point" size={22} style={{ left: "24%", top: "43%" }} />
            <CircleDot className="point" size={22} style={{ right: "22%", bottom: "28%" }} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Технологии / Toolkit</p><h2>Данные начинаются с правильного метода</h2></div>
        </div>
        <div className="tech-grid">{technologies.map(t => <div className="tech-card" key={t.name}><Ruler size={19} /><div><h3>{t.name}</h3><p>{t.short}</p></div></div>)}</div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Кейсы / 03</p><h2>Задача → метод → данные → результат</h2></div>
          <Link className="text-link" href="/cases">Все кейсы <ArrowRight size={16} /></Link>
        </div>
        <div className="case-grid">{cases.map(c => <Link className="case-card" href={`/cases/${c.slug}`} key={c.slug}><div className="case-art"><span>{c.category}</span><strong>{c.title}</strong></div><div className="case-meta"><span>{c.location}</span><span>{c.area}</span><span>{c.technology}</span></div></Link>)}</div>
      </section>

      <section className="section section-accent">
        <div><p className="eyebrow">Следующий шаг</p><h2>Опишите задачу. Остальное соберём в расчёт.</h2></div>
        <Link className="button button-dark" href="/calculator">Рассчитать <ArrowRight size={18} /></Link>
      </section>
    </div>
  );
}
