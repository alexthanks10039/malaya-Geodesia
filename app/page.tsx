import Link from "next/link";
import { ArrowRight, Boxes, Crosshair, Database, Ruler, ScanLine } from "lucide-react";
import { Hero } from "@/components/hero";
import { Reveal, Stagger, StaggerItem } from "@/components/scroll-reveal";
import { ServiceCard } from "@/components/service-card";
import { GeoScanScene } from "@/components/geo-scan-scene";
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
        <div className="map-card photogrammetry-card">
          <div className="photogrammetry-copy">
            <p className="eyebrow">AERIAL PHOTOGRAMMETRY / POINT CLOUD</p>
            <h2>Местность превращается в облако точек.</h2>
            <p>БПЛА снимает участок с воздуха, а фотограмметрия собирает из снимков плотную 3D-модель рельефа и объектов.</p>
            <div className="scan-specs">
              <span><b>3D</b> рельеф</span><span><b>RGB</b> фототекстура</span><span><b>XYZ</b> координаты</span>
            </div>
            <Link className="button button-light" href="/knowledge">Открыть справочник <ArrowRight size={16} /></Link>
          </div>
          <div className="photogrammetry-visual" aria-hidden="true">
            <GeoScanScene />
            <div className="photo-hud photo-hud-top"><i /> AERIAL SCAN / GRID 04 <b>LIVE</b></div>
            <div className="photo-hud photo-hud-bottom"><span>POINT CLOUD</span><strong>2.4M pts</strong><small>GROUND + OBJECTS</small></div>
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
