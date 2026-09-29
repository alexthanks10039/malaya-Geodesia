"use client";
/**
 * ARCHITECTURE: Studio editor UI.
 * Отвечает за UX изменения конкретного доменного объекта.
 * Сохранение, версии и публикация принадлежат backend/CMS слоям, а не React state этого компонента.
 */


import {useEffect, useMemo, useState} from "react";
import {GripVertical, ImagePlus, Film, Plus, Save, Trash2, Upload, X} from "lucide-react";
import {cases as seedCases} from "@/lib/data";
import type {Case, CaseMedia} from "@/lib/data";

const KEY="malaya-studio-cases-v1";
type DraftCase=Case;
const clone=(value:DraftCase[])=>JSON.parse(JSON.stringify(value)) as DraftCase[];

export function CaseStudioEditor({onChanged}:{onChanged?:()=>void}) {
  const [items,setItems]=useState<DraftCase[]>(()=>clone(seedCases));
  const [active,setActive]=useState(seedCases[0]?.slug??"");
  const [saved,setSaved]=useState(false);
  const [filter,setFilter]=useState("");

  useEffect(()=>{
    try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed)&&parsed.length)setItems(parsed)}}catch{}
  },[]);

  const current=items.find(x=>x.slug===active)??items[0];
  const visible=useMemo(()=>items.filter(x=>(x.title+" "+x.category+" "+x.location).toLowerCase().includes(filter.toLowerCase())),[items,filter]);

  function update(patch:Partial<DraftCase>){
    if(!current)return;
    setItems(prev=>prev.map(x=>x.slug===current.slug?{...x,...patch}:x));
    setSaved(false);onChanged?.();
  }
  function save(){
    localStorage.setItem(KEY,JSON.stringify(items));
    setSaved(true);onChanged?.();
  }
  function addCase(){
    const slug=`new-case-${Date.now()}`;
    const next:DraftCase={slug,category:"Новый проект",title:"Новый кейс",location:"Алматы",area:"—",technology:"GNSS / RTK",task:"Опишите задачу проекта.",result:"Опишите результат.",deliverables:"DWG + PDF",duration:"—",media:[]};
    setItems(prev=>[...prev,next]);setActive(slug);setSaved(false);
  }
  function removeCase(){
    if(!current)return;
    const next=items.filter(x=>x.slug!==current.slug);
    setItems(next);setActive(next[0]?.slug??"");setSaved(false);
  }
  function addMedia(file:File){
    if(!current)return;
    const media:CaseMedia={id:`local-${Date.now()}`,type:file.type.startsWith("video/")?"video":"image",src:URL.createObjectURL(file),alt:file.name};
    update({media:[...current.media,media]});
  }
  function addUrl(type:"image"|"video"){
    if(!current)return;
    const src=window.prompt(type==="image"?"URL изображения":"URL видео");
    if(!src?.trim())return;
    update({media:[...current.media,{id:`custom-${Date.now()}`,type,src:src.trim(),alt:"Материал кейса"}]});
  }
  function removeMedia(id:string){if(current)update({media:current.media.filter(m=>m.id!==id)})}
  function moveMedia(index:number,direction:-1|1){
    if(!current)return;
    const media=[...current.media],to=index+direction;if(to<0||to>=media.length)return;
    [media[index],media[to]]=[media[to],media[index]];update({media});
  }

  if(!current)return <div className="studio-empty-inspector">Нет кейсов</div>;

  return <div className="case-studio">
    <div className="case-studio-head">
      <div><span className="studio-kicker">CONTENT / CASES</span><h2>Студия кейсов</h2></div>
      <button className="studio-small-button" onClick={addCase}><Plus size={14}/> Новый</button>
    </div>
    <div className="case-studio-search"><input placeholder="Найти проект..." value={filter} onChange={e=>setFilter(e.target.value)}/></div>
    <div className="case-studio-layout">
      <div className="case-studio-list">
        {visible.map(c=><button key={c.slug} className={c.slug===current.slug?"active":""} onClick={()=>setActive(c.slug)}>
          <span>{c.category}</span><b>{c.title}</b><small>{c.media.length} media · {c.location}</small>
        </button>)}
      </div>
      <div className="case-studio-form">
        <div className="case-studio-cover">
          {current.media[0]?.type==="image"?<img src={current.media[0].src} alt=""/>:<div className="case-studio-cover-empty"><ImagePlus/></div>}
          <div><span>CASE 0{Math.max(1,items.findIndex(x=>x.slug===current.slug)+1)}</span><b>{current.media.length} материалов</b></div>
        </div>
        <div className="studio-editor-columns">
          <Field label="Название" value={current.title} onChange={v=>update({title:v})}/>
          <Field label="Категория" value={current.category} onChange={v=>update({category:v})}/>
          <Field label="Локация" value={current.location} onChange={v=>update({location:v})}/>
          <Field label="Площадь" value={current.area} onChange={v=>update({area:v})}/>
          <Field label="Технология" value={current.technology} onChange={v=>update({technology:v})}/>
          <Field label="Срок" value={current.duration} onChange={v=>update({duration:v})}/>
        </div>
        <label className="case-studio-text"><span>Задача</span><textarea rows={3} value={current.task} onChange={e=>update({task:e.target.value})}/></label>
        <label className="case-studio-text"><span>Результат</span><textarea rows={3} value={current.result} onChange={e=>update({result:e.target.value})}/></label>
        <Field label="Выдача" value={current.deliverables} onChange={v=>update({deliverables:v})}/>

        <div className="case-media-manager">
          <div className="case-media-manager-head"><div><span className="studio-kicker">MEDIA</span><b>Фото и видео</b></div><span>{current.media.length}</span></div>
          <div className="case-media-actions">
            <label className="studio-small-button"><Upload size={14}/> Файл<input type="file" accept="image/*,video/*" multiple onChange={e=>Array.from(e.target.files??[]).forEach(addMedia)}/></label>
            <button className="studio-small-button" onClick={()=>addUrl("image")}><ImagePlus size={14}/> URL фото</button>
            <button className="studio-small-button" onClick={()=>addUrl("video")}><Film size={14}/> URL видео</button>
          </div>
          <div className="case-media-manager-list">
            {current.media.map((m,i)=><div className="case-media-manager-item" key={m.id}>
              <GripVertical size={13}/>
              <div className="case-media-manager-preview">{m.type==="image"?<img src={m.src} alt=""/>:<video src={m.src} muted preload="metadata"/>}</div>
              <div><b>{m.type==="video"?"VIDEO":"PHOTO"} {String(i+1).padStart(2,"0")}</b><small>{m.alt||m.src}</small></div>
              <button onClick={()=>moveMedia(i,-1)} disabled={i===0}>↑</button><button onClick={()=>moveMedia(i,1)} disabled={i===current.media.length-1}>↓</button><button onClick={()=>removeMedia(m.id)}><X size={13}/></button>
            </div>)}
          </div>
        </div>
        <div className="case-studio-footer">
          <button className="studio-danger" onClick={removeCase}><Trash2 size={14}/> Удалить кейс</button>
          <button className="studio-button studio-button-acid" onClick={save}><Save size={14}/> {saved?"Сохранено":"Сохранить черновик"}</button>
        </div>
      </div>
    </div>
  </div>;
}

function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 return <label className="case-studio-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label>
}
