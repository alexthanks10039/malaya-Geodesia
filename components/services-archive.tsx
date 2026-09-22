
"use client";

import {useMemo,useState} from"react";
import Link from"next/link";
import {ArrowRight,ArrowUpRight,Building2,Box,Mountain,Plane,Scan,ScanLine} from"lucide-react";
import type {Service} from"@/lib/data";

const icons={
  "Топография":Mountain,
  "БПЛА":Plane,
  "LiDAR":Scan,
  "Строительство":Building2,
  "3D / BIM":Box,
  "Аналитика":ScanLine,
} as const;

function ServiceCover({service,index}:{service:Service;index:number}){
  const Icon=icons[service.category as keyof typeof icons]??ScanLine;
  return <div className={"services-cover service-cover-"+index}>
    <div className="services-cover-grid"/>
    <div className="services-cover-rings"/>
    <div className="services-cover-scan"/>
    <div className="services-cover-icon"><Icon size={22}/></div>
    <div className="services-cover-code">
      <span>DATASET / 0{index+1}</span>
      <b>{service.category}</b>
    </div>
  </div>;
}

function ServiceArchiveCard({service,index,featured}:{service:Service;index:number;featured?:boolean}){
  return <Link href={"/services/"+service.slug} className={"service-archive-card "+(featured?"service-archive-card-featured":"")}>
    <ServiceCover service={service} index={index}/>
    <div className="service-archive-body">
      <div className="service-archive-top"><span className="eyebrow">0{index+1} / {service.category}</span><ArrowUpRight size={19}/></div>
      <h2>{service.name}</h2>
      <p>{service.short}</p>
      <div className="service-archive-meta">
        <span><b>Выдача</b>{service.deliverable}</span>
        <span><b>Метод</b>{service.technologies.slice(0,2).join(" · ")}</span>
        <span><b>Формат</b>{service.formats.slice(0,2).join(" · ")}</span>
      </div>
      <div className="service-archive-foot"><span>Открыть описание</span><ArrowRight size={15}/></div>
    </div>
  </Link>;
}

export function ServicesArchive({services}:{services:Service[]}){
  const [category,setCategory]=useState("Все");
  const categories=useMemo(()=>["Все",...Array.from(new Set(services.map(item=>item.category)))],[services]);
  const filtered=useMemo(()=>category==="Все"?services:services.filter(item=>item.category===category),[category,services]);

  return <section className="services-archive">
    <div className="services-hero">
      <div className="page-title">
        <p className="eyebrow">Service archive / 2026</p>
        <h1>Геодезия под задачу, а не наоборот.</h1>
        <p>Выбирайте по результату, методу и объекту. Внутри каждой услуги дальше разберём точность, процесс, ограничения и состав выдачи.</p>
      </div>
      <aside className="services-hero-aside">
        <div><strong>{String(services.length).padStart(2,"0")}</strong><span>направлений</span></div>
        <div><strong>{String(new Set(services.flatMap(service=>service.formats)).size).padStart(2,"0")}</strong><span>ключевых форматов</span></div>
      </aside>
    </div>

    <div className="services-choice-strip">
      <div><span>HOW TO CHOOSE</span><b>Объект → масштаб → точность → формат результата</b></div>
      <Link href="/calculator">Не знаете метод? <ArrowRight size={15}/></Link>
    </div>

    <div className="services-filterbar">
      <span>CATALOG / {String(filtered.length).padStart(2,"0")}</span>
      <div className="services-filters">
        {categories.map(item=><button key={item} className={category===item?"active":""} onClick={()=>setCategory(item)}>{item}</button>)}
      </div>
    </div>

    <div className="services-archive-grid">
      {filtered.map((service,index)=><ServiceArchiveCard key={service.slug} service={service} index={services.indexOf(service)} featured={category==="Все"&&index===0}/>)}
    </div>

    <div className="services-bottom">
      <div><p className="eyebrow">Следующий шаг</p><h2>Не нашли точное соответствие?</h2><p>Опишите объект в калькуляторе. Подберём состав работ и предварительный расчёт.</p></div>
      <Link className="button button-dark" href="/calculator">Открыть калькулятор <ArrowRight size={17}/></Link>
    </div>
  </section>;
}
