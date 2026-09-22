import Link from "next/link";
import {ArrowUpRight, Layers3, MapPinned, ScanLine} from "lucide-react";
import {cases} from "@/lib/data";

export default function Cases() {
  return (
    <section className="section page-content cases-page">
      <div className="cases-hero">
        <div className="page-title">
          <p className="eyebrow">Project archive / 2026</p>
          <h1>Кейсы, где данные становятся результатом.</h1>
          <p>Показываем не только финальный кадр: объект, метод съёмки, пространственные данные и то, что получает заказчик.</p>
        </div>
        <div className="cases-hero-aside">
          <div><strong>{String(cases.length).padStart(2, "0")}</strong><span>проектов в архиве</span></div>
          <div><strong>01</strong><span>клик → полный разбор</span></div>
        </div>
      </div>

      <div className="cases-filterbar">
        <span>CASE INDEX</span>
        <div><i/><span>MEDIA READY</span></div>
      </div>

      <div className="case-grid cases-grid">
        {cases.map((c, index) => (
          <Link className={`case-card case-card-large case-${c.slug}`} href={`/cases/${c.slug}`} key={c.slug}>
            <div className="case-card-index">0{index + 1}</div>
            <div className="case-art">
              <span>{c.category}</span>
              <strong>{c.title}</strong>
              <em><MapPinned size={13}/> {c.location}</em>
              <div className="case-art-grid"/>
              <div className="case-art-orbit"/>
            </div>
            <div className="case-card-body">
              <div className="case-card-title"><h2>{c.title}</h2><ArrowUpRight size={19}/></div>
              <p>{c.result}</p>
              <div className="case-meta">
                <span><Layers3 size={13}/> {c.area}</span>
                <span><ScanLine size={13}/> {c.technology}</span>
                <span>{c.duration}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="cases-bottom">
        <div><p className="eyebrow">Need a project like this?</p><h2>Дадим объекту цифровую форму.</h2></div>
        <Link className="button button-dark" href="/calculator">Запустить расчёт <ArrowUpRight size={17}/></Link>
      </div>
    </section>
  );
}