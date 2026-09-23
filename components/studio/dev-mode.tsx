"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  MousePointer2,
  RotateCcw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { mergePageOverride, readStudioState, writeStudioState } from "@/studio/runtime/storage";
import type { StudioCssOverrides, StudioState } from "@/studio/types";

const DEV_ENABLED_KEY = "malaya-studio-dev-enabled";
export const STUDIO_TOGGLE_EVENT = "malaya-studio-toggle";

const STYLE_MAP: Partial<Record<keyof StudioCssOverrides, string>> = {
  fontSize: "font-size",
  lineHeight: "line-height",
  color: "color",
  background: "background",
  padding: "padding",
  margin: "margin",
  borderRadius: "border-radius",
  width: "width",
  maxWidth: "max-width",
  gap: "gap",
  letterSpacing: "letter-spacing",
  opacity: "opacity",
  display: "display",
};

const STYLE_LABELS: Partial<Record<keyof StudioCssOverrides, string>> = {
  fontSize: "Размер",
  lineHeight: "Интерлиньяж",
  color: "Цвет",
  background: "Фон",
  padding: "Padding",
  margin: "Margin",
  borderRadius: "Скругление",
  width: "Ширина",
  maxWidth: "Макс. ширина",
  gap: "Gap",
  letterSpacing: "Трекинг",
  opacity: "Прозрачность",
  display: "Display",
};

const TYPE_TAGS = new Set([
  "a","button","input","select","textarea","img","video",
  "h1","h2","h3","h4","h5","h6","p","li","label","span",
]);
const SKIP_TAGS = new Set(["html","head","script","style","noscript","svg","path","option"]);

type PreviewMode = "select" | "interact";
type NodeSummary = { id:string; tag:string; label:string; className:string; depth:number; children:NodeSummary[] };
type Selected = NodeSummary & { textEditable:boolean; css:StudioCssOverrides };

function getNodeId(element:Element){return element.getAttribute("data-studio-node-id")??""}
function directText(element:Element){return Array.from(element.childNodes).filter((node):node is Text=>node.nodeType===Node.TEXT_NODE).map((node)=>node.textContent??"").join(" ").replace(/\s+/g," ").trim()}
function readableLabel(element:Element){return (directText(element)||element.getAttribute("aria-label")||element.getAttribute("alt")||element.getAttribute("title")||element.tagName.toLowerCase()).replace(/\s+/g," ").trim().slice(0,72)}
function elementPath(element:Element){
  const path:string[]=[];
  let current:Element|null=element;
  while(current!==null&&current!==document.body){
    const parent:Element|null=current.parentElement;
    if(parent===null)break;
    const siblings=Array.from(parent.children) as Element[];
    const currentTag=current.tagName;
    const sameTag=siblings.filter((sibling:Element)=>sibling.tagName===currentTag);
    path.unshift(currentTag.toLowerCase()+"-"+Math.max(0,sameTag.indexOf(current)));
    current=parent;
  }
  return "dev-"+path.join("-");
}
function collectNodes():NodeSummary[]{
  const walk=(element:Element,depth:number):NodeSummary[]=>{
    const tag=element.tagName.toLowerCase();
    if(SKIP_TAGS.has(tag)||element.closest("[data-studio-dev-ui]"))return[];
    const id=element.getAttribute("data-studio-node-id")||elementPath(element);
    element.setAttribute("data-studio-node-id",id);
    const children=Array.from(element.children).flatMap((child)=>walk(child,depth+1));
    const useful=Boolean(directText(element)||element.getAttribute("aria-label")||element.getAttribute("alt")||TYPE_TAGS.has(tag)||children.length);
    return useful?[{id,tag,label:readableLabel(element),className:typeof element.className==="string"?element.className:"",depth,children}]:children;
  };
  return Array.from(document.body?.children??[]).flatMap((child)=>walk(child,0));
}
function readElementCss(element:Element):StudioCssOverrides{
  const style=getComputedStyle(element);
  return {fontSize:style.fontSize,lineHeight:style.lineHeight,color:style.color,background:style.backgroundColor,padding:style.padding,margin:style.margin,borderRadius:style.borderRadius,width:style.width,maxWidth:style.maxWidth,gap:style.gap,letterSpacing:style.letterSpacing,opacity:style.opacity,display:style.display};
}
function findElement(id:string){
  const element=document.querySelector("[data-studio-node-id=\""+CSS.escape(id)+"\"]");
  return element instanceof HTMLElement?element:null;
}
function applyDrafts(state:StudioState,path:string){
  const nodes=collectNodes();const page=state.pages[path]??{};
  for(const[id,override]of Object.entries(page)){
    const element=findElement(id);if(!element)continue;
    if(override.text!==undefined&&element.children.length===0)element.textContent=override.text;
    for(const[property,value]of Object.entries(override.css??{})){
      const cssName=STYLE_MAP[property as keyof StudioCssOverrides];
      if(cssName&&value!==undefined)element.style.setProperty(cssName,value);
    }
  }
  return nodes;
}
function flatten(nodes:NodeSummary[]){
  const list:NodeSummary[]=[];
  const walk=(items:NodeSummary[])=>{for(const node of items){list.push(node);walk(node.children)}};
  walk(nodes);return list;
}
function filterTree(nodes:NodeSummary[],query:string):NodeSummary[]{
  if(!query)return nodes;
  const normalized=query.trim().toLowerCase();
  return nodes.flatMap((node)=>{
    const children=filterTree(node.children,normalized);
    const selfMatches=node.label.toLowerCase().includes(normalized)||node.tag.includes(normalized)||node.className.toLowerCase().includes(normalized);
    if(!selfMatches&&!children.length)return[];
    return [{...node,children}];
  });
}
function selectorFor(element:Element){
  const id=element.getAttribute("data-studio-node-id");
  if(id)return "[data-studio-node-id=\""+id+"\"]";
  return element.tagName.toLowerCase();
}

export function StudioDevModeButton(){
  return <button type="button" className="studio-header-dev-button" onClick={()=>window.dispatchEvent(new Event(STUDIO_TOGGLE_EVENT))} aria-label="Открыть Dev Mode редактора" title="Dev Mode · Ctrl/⌘ + Shift + E"><Code2 size={16}/><span>DEV</span></button>;
}

export function StudioDevMode(){
  const pathname=usePathname();
  const searchRef=useRef<HTMLInputElement>(null);
  const applyingRef=useRef(false);
  const [enabled,setEnabled]=useState(false);
  const [mode,setMode]=useState<PreviewMode>("select");
  const [nodes,setNodes]=useState<NodeSummary[]>([]);
  const [selected,setSelected]=useState<Selected|null>(null);
  const [hovered,setHovered]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [state,setState]=useState<StudioState>(()=>readStudioState());
  const [lastSaved,setLastSaved]=useState("LOCAL");
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const flat=useMemo(()=>flatten(nodes),[nodes]);
  const filteredTree=useMemo(()=>filterTree(nodes,search),[nodes,search]);
  const override=selected?state.pages[pathname]?.[selected.id]??null:null;

  const persist=(next:StudioState)=>{
    writeStudioState(next);setState(next);setLastSaved("SAVED");
    window.setTimeout(()=>setLastSaved("LOCAL"),900);
  };
  const setActive=(next:boolean)=>{
    setEnabled(next);localStorage.setItem(DEV_ENABLED_KEY,next?"1":"0");
    if(!next){
      setSelected(null);setHovered(null);
      document.querySelectorAll(".studio-dev-selected").forEach((node)=>node.classList.remove("studio-dev-selected"));
      document.getElementById("malaya-studio-dev-outline")?.remove();
    }
  };
  const selectElement=(element:HTMLElement)=>{
    document.querySelectorAll(".studio-dev-selected").forEach((node)=>node.classList.remove("studio-dev-selected"));
    element.classList.add("studio-dev-selected");
    setSelected({
      id:getNodeId(element),
      tag:element.tagName.toLowerCase(),
      label:directText(element)||element.textContent?.replace(/\s+/g," ").trim().slice(0,72)||element.tagName.toLowerCase(),
      className:typeof element.className==="string"?element.className:"",
      textEditable:element.children.length===0,
      css:readElementCss(element),
      depth:0,
      children:[],
    });
    requestAnimationFrame(()=>element.scrollIntoView({block:"center",inline:"nearest",behavior:"smooth"}));
  };
  const selectById=(id:string)=>{const element=findElement(id);if(element)selectElement(element)};
  const updateText=(value:string)=>{
    if(!selected?.textEditable)return;const element=findElement(selected.id);if(!element)return;
    element.textContent=value;
    persist(mergePageOverride(state,pathname,selected.id,{text:value}));
    setSelected((current)=>current?{...current,label:value,css:readElementCss(element)}:current);
  };
  const updateStyle=(property:keyof StudioCssOverrides,value:string)=>{
    const element=findElement(selected?.id??"");if(!element||!selected)return;
    const cssName=STYLE_MAP[property];
    if(!cssName)return;
    element.style.setProperty(cssName,value);
    persist(mergePageOverride(state,pathname,selected.id,{css:{[property]:value}}));
    setSelected((current)=>current?{...current,css:{...current.css,[property]:value}}:current);
  };
  const resetSelected=()=>{
    if(!selected)return;
    const page={...(state.pages[pathname]??{})};delete page[selected.id];
    persist({...state,pages:{...state.pages,[pathname]:page}});
    setSelected(null);window.location.reload();
  };
  const resetPage=()=>{
    const next={...state,pages:{...state.pages}};delete next.pages[pathname];
    persist(next);setSelected(null);window.location.reload();
  };
  const exportDraft=()=>{
    const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),pages:state.pages,globalTokens:state.globalTokens},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="malaya-studio-dev-draft.json";anchor.click();URL.revokeObjectURL(url);
  };
  const copySelector=async()=>{
    if(!selected)return;const element=findElement(selected.id);if(!element)return;
    try{await navigator.clipboard.writeText(selectorFor(element));setLastSaved("COPIED");window.setTimeout(()=>setLastSaved("LOCAL"),900);}catch{}
  };

  useEffect(()=>{
    const studioPreview=new URLSearchParams(window.location.search).get("studioPreview")==="1";
    if(studioPreview){
      setEnabled(false);
      return;
    }
    const saved=localStorage.getItem(DEV_ENABLED_KEY)==="1";
    const queryEnabled=new URLSearchParams(window.location.search).get("dev")==="1";
    setEnabled(saved||queryEnabled);
    const toggle=()=>setActive(localStorage.getItem(DEV_ENABLED_KEY)!=="1");
    const keydown=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="e"){event.preventDefault();toggle();return;}
      if(!enabled)return;
      if(event.key==="Escape")setActive(false);
      if(event.key==="/"&&document.activeElement?.tagName!=="INPUT"&&document.activeElement?.tagName!=="TEXTAREA"){event.preventDefault();searchRef.current?.focus();}
    };
    window.addEventListener(STUDIO_TOGGLE_EVENT,toggle);window.addEventListener("keydown",keydown);
    return()=>{window.removeEventListener(STUDIO_TOGGLE_EVENT,toggle);window.removeEventListener("keydown",keydown)};
  },[enabled]);

  useEffect(()=>{
    if(!enabled)return;
    const refresh=()=>{
      if(applyingRef.current)return;
      applyingRef.current=true;
      requestAnimationFrame(()=>{
        try{setNodes(applyDrafts(state,pathname));}finally{applyingRef.current=false;}
      });
    };
    refresh();
    let frame=0;
    const observer=new MutationObserver((mutations)=>{
      if(mutations.every((mutation)=>mutation.target instanceof Element&&Boolean(mutation.target.closest("[data-studio-dev-ui]"))))return;
      cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    const mouseover=(event:MouseEvent)=>{
      if(mode!=="select")return;const target=event.target;
      if(!(target instanceof Element)||target.closest("[data-studio-dev-ui]"))return;
      const element=target.closest("[data-studio-node-id]");
      if(element instanceof HTMLElement)setHovered(getNodeId(element));
    };
    const mouseout=(event:MouseEvent)=>{
      const target=event.target;if(!(target instanceof Element))return;
      if(target.closest("[data-studio-node-id]"))setHovered(null);
    };
    const click=(event:MouseEvent)=>{
      if(mode!=="select")return;const target=event.target;
      if(!(target instanceof Element)||target.closest("[data-studio-dev-ui]"))return;
      const element=target.closest("[data-studio-node-id]");
      if(!(element instanceof HTMLElement))return;
      event.preventDefault();event.stopPropagation();selectElement(element);
    };
    document.addEventListener("click",click,true);document.addEventListener("mouseover",mouseover,true);document.addEventListener("mouseout",mouseout,true);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener("click",click,true);document.removeEventListener("mouseover",mouseover,true);document.removeEventListener("mouseout",mouseout,true)};
  },[enabled,mode,pathname,state]);

  useEffect(()=>{
    if(!enabled)return;
    const styleId="malaya-studio-dev-outline";document.getElementById(styleId)?.remove();
    const style=document.createElement("style");style.id=styleId;
    style.textContent=[
      "[data-studio-node-id]{transition:outline-color .12s ease,box-shadow .12s ease,opacity .12s ease}",
      "[data-studio-node-id]:hover{outline:1px dashed rgba(217,255,82,.92)!important;outline-offset:2px;cursor:crosshair!important}",
      "[data-studio-node-id].studio-dev-selected{outline:2px solid #d9ff52!important;outline-offset:3px;box-shadow:0 0 0 4px rgba(217,255,82,.16)!important}"
    ].join("");
    document.head.appendChild(style);
    return()=>document.getElementById(styleId)?.remove();
  },[enabled]);

  const renderTree=(items:NodeSummary[])=>
    items.map((node)=>{
      const open=search.trim()!==""?true:expanded[node.id]??node.depth<1;
      return <div key={node.id} className="studio-dev-tree-node">
        <div className={selected?.id===node.id?"studio-dev-tree-row active":hovered===node.id?"studio-dev-tree-row hover":"studio-dev-tree-row"} style={{paddingLeft:4+Math.min(node.depth,7)*12}}>
          <button type="button" className="studio-dev-chevron" disabled={!node.children.length} onClick={()=>setExpanded((current)=>({...current,[node.id]:!open}))} aria-label={open?"Свернуть":"Развернуть"}>
            {node.children.length?(open?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span className="studio-dev-tree-dot"/>}
          </button>
          <button type="button" className="studio-dev-tree-select" onClick={()=>selectById(node.id)}>
            <span className="studio-dev-tag">{node.tag}</span>
            <span className="studio-dev-tree-label"><b>{node.label||"(без текста)"}</b>{node.className&&<small>.{node.className.split(" ")[0]}</small>}</span>
          </button>
        </div>
        {open&&node.children.length?<div className="studio-dev-tree-children">{renderTree(node.children)}</div>:null}
      </div>;
    });

  return <>
    <div className="studio-dev-fab-wrap" data-studio-dev-ui>
      <button type="button" className={enabled?"studio-dev-fab studio-dev-fab-active":"studio-dev-fab"} onClick={()=>setActive(!enabled)}>
        {enabled?<Settings2 size={17}/>:<Code2 size={17}/>}<span>{enabled?"DEV ON":"EDIT"}</span>
      </button>
    </div>

    {enabled&&<aside className="studio-dev-panel" data-studio-dev-ui>
      <div className="studio-dev-head">
        <div className="studio-dev-head-copy">
          <div className="studio-dev-eyebrow"><span className="studio-dev-dot"/>DEV MODE<span className="studio-dev-live">LIVE</span></div>
          <strong>Редактор страницы</strong>
          <small><span>{pathname}</span>{selected&&<><span className="studio-dev-path-sep">/</span><b>{selected.tag}</b><span>{selected.label||"(без текста)"}</span></>}</small>
        </div>
        <div className="studio-dev-head-actions">
          {selected&&<button type="button" className="studio-dev-head-icon" onClick={copySelector} title="Скопировать селектор" aria-label="Скопировать селектор"><Copy size={14}/></button>}
          <button type="button" className="studio-dev-head-icon" onClick={()=>setActive(false)} aria-label="Закрыть Dev Mode" title="Закрыть · Esc"><X size={15}/></button>
        </div>
      </div>

      <div className="studio-dev-actions">
        <button className={mode==="select"?"active":""} onClick={()=>setMode("select")} type="button" title="Выбор элемента в preview"><MousePointer2 size={13}/>SELECT</button>
        <button className={mode==="interact"?"active":""} onClick={()=>setMode("interact")} type="button" title="Обычное взаимодействие со страницей"><EyeOff size={13}/>TEST</button>
        <Link href="/studio" target="_blank" rel="noreferrer" title="Полный Studio"><Settings2 size={13}/>FULL STUDIO</Link>
      </div>

      <div className="studio-dev-search">
        <div className="studio-dev-search-input">
          <Search size={13}/>
          <input ref={searchRef} value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Найти блок, текст или класс" aria-label="Поиск по дереву страницы"/>
          {search?<button type="button" onClick={()=>setSearch("")} aria-label="Очистить поиск" title="Очистить"><X size={12}/></button>:<kbd>/</kbd>}
        </div>
        <span className="studio-dev-count">{search?filterTree(nodes,search).length:flat.length}</span>
      </div>

      <div className="studio-dev-tree-head">
        <span>PAGE TREE</span>
        <div>
          <button type="button" onClick={()=>setExpanded(Object.fromEntries(flat.map((node)=>[node.id,true])))}><Maximize2 size={11}/>Раскрыть</button>
          <button type="button" onClick={()=>setExpanded({})}>Свернуть</button>
        </div>
      </div>

      <div className="studio-dev-tree">
        {filteredTree.length?renderTree(filteredTree):<div className="studio-dev-tree-empty"><Search size={18}/><b>Ничего не найдено</b><span>Попробуй другой текст или класс.</span></div>}
      </div>

      <div className="studio-dev-inspector">
        {selected?<>
          <div className="studio-dev-inspector-head">
            <div className="studio-dev-selected">
              <div className="studio-dev-selected-topline">
                <span className="studio-dev-tag">{selected.tag}</span>
                {override?<span className="studio-dev-changed"><Check size={10}/>CHANGED</span>:<span className="studio-dev-default">DEFAULT</span>}
              </div>
              <b>{selected.label||"(без текста)"}</b>
              <small>{selected.className||"без класса"}</small>
            </div>
            <button type="button" className="studio-dev-reset-inline" onClick={resetSelected} title="Сбросить override элемента"><RotateCcw size={13}/>Сбросить</button>
          </div>

          <section className="studio-dev-block">
            <div className="studio-dev-block-title"><h4>Контент</h4><span>{selected.textEditable?"editable":"nested"}</span></div>
            <label className="studio-dev-text-field">
              <span>Текст</span>
              <textarea rows={3} disabled={!selected.textEditable} value={selected.textEditable?selected.label:"Элемент содержит вложенные узлы. Выбери дочерний элемент."} onChange={(event)=>updateText(event.target.value)}/>
              {selected.textEditable?<small>{selected.label.length} символов</small>:null}
            </label>
          </section>

          <section className="studio-dev-block">
            <div className="studio-dev-block-title"><h4>Размер</h4><span>layout</span></div>
            <div className="studio-dev-grid">
              {(["fontSize","lineHeight","padding","margin","width","maxWidth"] as const).map((key)=><InspectorField key={key} label={STYLE_LABELS[key]??key} value={selected.css[key]??""} onChange={(value)=>updateStyle(key,value)}/>)}
            </div>
          </section>

          <section className="studio-dev-block">
            <div className="studio-dev-block-title"><h4>Внешний вид</h4><span>style</span></div>
            <div className="studio-dev-grid">
              {(["color","background","borderRadius","letterSpacing","gap","opacity","display"] as const).map((key)=><InspectorField key={key} label={STYLE_LABELS[key]??key} value={selected.css[key]??""} onChange={(value)=>updateStyle(key,value)}/>)}
            </div>
          </section>

          <div className="studio-dev-meta-row">
            <span>{lastSaved} · browser draft</span>
            <button type="button" onClick={copySelector}><Copy size={11}/>selector</button>
          </div>
        </>:<div className="studio-dev-placeholder"><span className="studio-kicker">INSPECTOR</span><strong>Выбери элемент</strong><p>Нажми на любой объект в preview или раскрой дерево. Изменения применяются сразу и сохраняются в локальный draft.</p></div>}
      </div>

      <div className="studio-dev-bottom">
        <button type="button" onClick={exportDraft}><Download size={13}/>Экспорт</button>
        <button type="button" onClick={resetPage}><RotateCcw size={13}/>Сброс страницы</button>
      </div>
    </aside>}
  </>;
}

function InspectorField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  return <label className="studio-dev-field"><span>{label}</span><input value={value} onChange={(event)=>onChange(event.target.value)} spellCheck={false}/></label>;
}
