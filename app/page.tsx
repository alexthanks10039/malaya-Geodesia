import Link from "next/link";
import { ArrowRight, Boxes, Crosshair, Database, Ruler, ScanLine, CircleDot } from "lucide-react";
import { Hero } from "@/components/hero";
import { Reveal, Stagger, StaggerItem } from "@/components/scroll-reveal";
import { ServiceCard } from "@/components/service-card";
import { services, cases, technologies } from "@/lib/data";

const scenarios = [
  ["Построить дом", "Топография + высоты + данные для проекта"],
  ["Подготовить участок", "Рельеф, существующие объекты и данные для проекта"],
  ["Получить 3D", "Фотограмметрия, point cloud или лазерное сканирование"],
  ["Посчитать объём", "Карьер, котлован, насыпь или стройплощадка"],
] as const;

const pipeline = [
  { Icon: Crosshair, title: "Задача", text: "Фиксируем объект и нужный результат." },
  { Icon: ScanLine, title: "Съёмка", text: "GNSS, RTK, тахеометр, БПЛА или LiDAR." },
  { Icon: Boxes, title: "Обработка", text: "Собираем цифровую модель и проверяем качество." },
  { Icon: Database, title: "Результат", text: "DWG, PDF, GeoTIFF, LAS/LAZ, E57, 3D." },
];

export default function Home() {
  return (
    <div>
      <Hero />

      <Reveal className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Под задачу</p><h2>Не знаете, какая геодезия нужна?</h2></div>
          <Link className="text-link" href="/calculator">Открыть калькулятор <ArrowRight size={16} /></Link>
        </div>
        <Stagger className="scenario-grid">
          {scenarios.map(([title, text], i) => (
            <StaggerItem key={title}>
              <Link className="scenario-card" href="/calculator">
                <span className="scenario-index">0{i + 1}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
                <ArrowRight size={19} />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>

      <Reveal className="section section-dark">
        <div className="section-heading">
          <div><p className="eyebrow">Pipeline / 01—04</p><h2>От поля до готовых данных</h2></div>
        </div>
        <Stagger className="pipeline">
          {pipeline.map(({ Icon, title, text }, i) => (
            <StaggerItem key={title}>
              <div className="pipeline-item">
                <span>0{i + 1}</span>
                <Icon size={27} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>

      <Reveal className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Услуги / 06</p><h2>Геодезические работы под конкретный результат</h2></div>
          <Link className="text-link" href="/services">Все услуги <ArrowRight size={16} /></Link>
        </div>
        <Stagger className="service-grid">{services.map(service => <StaggerItem key={service.slug}><ServiceCard service={service} /></StaggerItem>)}</Stagger>
      </Reveal>

      <Reveal className="section">
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
            <CircleDot className="point map-dot" size={22} style={{ left: "24%", top: "43%" }} />
            <CircleDot className="point map-dot" size={22} style={{ right: "22%", bottom: "28%" }} />
            <span className="map-pulse pulse-a" /><span className="map-pulse pulse-b" />
          </div>
        </div>
      </Reveal>

      <Reveal className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Технологии / Toolkit</p><h2>Данные начинаются с правильного метода</h2></div>
        </div>
        <Stagger className="tech-grid">{technologies.map(t => <StaggerItem key={t.name}><div className="tech-card"><Ruler size={19} /><div><h3>{t.name}</h3><p>{t.short}</p></div></div></StaggerItem>)}</Stagger>
      </Reveal>

      <Reveal className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Кейсы / 03</p><h2>Задача → метод → данные → результат</h2></div>
          <Link className="text-link" href="/cases">Все кейсы <ArrowRight size={16} /></Link>
        </div>
        <Stagger className="case-grid">{cases.map(c => <StaggerItem key={c.slug}><Link className="case-card" href={`/cases/${c.slug}`}><div className="case-art"><span>{c.category}</span><strong>{c.title}</strong></div><div className="case-meta"><span>{c.location}</span><span>{c.area}</span><span>{c.technology}</span></div></Link></StaggerItem>)}</Stagger>
      </Reveal>

      <Reveal className="section section-accent">
        <div><p className="eyebrow">Следующий шаг</p><h2>Опишите задачу. Остальное соберём в расчёт.</h2></div>
        <Link className="button button-dark" href="/calculator">Рассчитать <ArrowRight size={18} /></Link>
      </Reveal>
    </div>
  );
}
