import {notFound} from "next/navigation";
import Link from "next/link";
import {ArrowLeft, ArrowRight, Check, Clock3, Download, MapPinned, Ruler, ScanLine} from "lucide-react";
import {cases} from "@/lib/data";
import {CaseMediaCarousel} from "@/components/case-media-carousel";

export function generateStaticParams(){return cases.map(c=>({slug:c.slug}))}

export default async function Case({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const c=cases.find(x=>x.slug===slug);
  if(!c)notFound();
  const index=cases.findIndex(x=>x.slug===slug);
  const next=cases[(index+1)%cases.length];

  return (
    <article className="section page-content case-detail">
      <Link className="case-back" href="/cases"><ArrowLeft size={15}/> Все кейсы</Link>

      <div className="case-detail-hero">
        <div className="case-detail-copy">
          <p className="eyebrow">{c.category} / case 0{index+1}</p>
          <h1>{c.title}</h1>
          <p className="case-detail-result">{c.result}</p>
          <div className="case-detail-tags">
            <span><MapPinned size={14}/> {c.location}</span>
            <span><Ruler size={14}/> {c.area}</span>
            <span><ScanLine size={14}/> {c.technology}</span>
          </div>
        </div>
        <div className="case-detail-stat">
          <span><Clock3 size={14}/> Срок</span>
          <strong>{c.duration}</strong>
          <small>от постановки задачи<br/>до выдачи данных</small>
        </div>
      </div>

      <CaseMediaCarousel slug={c.slug} items={c.media}/>

      <div className="case-detail-grid">
        <section className="case-story">
          <div className="case-story-block">
            <p className="eyebrow">01 / Задача</p>
            <h2>{c.task}</h2>
          </div>
          <div className="case-story-block">
            <p className="eyebrow">02 / Метод</p>
            <h2>{c.technology}</h2>
            <p>Съёмка строится вокруг требуемой точности, площади и формата результата. Полевой этап, контроль привязки и камеральная обработка собираются в один рабочий контур.</p>
          </div>
          <div className="case-story-block">
            <p className="eyebrow">03 / Результат</p>
            <h2>{c.result}</h2>
          </div>
        </section>

        <aside className="case-result-panel">
          <p className="eyebrow">Delivery</p>
          <strong>{c.deliverables}</strong>
          <div className="case-result-line"><Check size={15}/> Контроль геометрии</div>
          <div className="case-result-line"><Check size={15}/> Структурированные данные</div>
          <div className="case-result-line"><Check size={15}/> Материалы для следующего этапа</div>
          <button className="case-download"><Download size={15}/> Запросить состав выдачи</button>
        </aside>
      </div>

      <div className="case-next">
        <div><p className="eyebrow">Следующий кейс</p><h2>{next.title}</h2></div>
        <Link className="button button-dark" href={`/cases/${next.slug}`}>Открыть кейс <ArrowRight size={17}/></Link>
      </div>

      <div className="detail-cta">
        <div><h2>Нужна похожая работа?</h2><p>Опишите объект, и система соберёт предварительный расчёт.</p></div>
        <Link className="button button-dark" href="/calculator">Перейти к расчёту <ArrowRight size={18}/></Link>
      </div>
    </article>
  );
}