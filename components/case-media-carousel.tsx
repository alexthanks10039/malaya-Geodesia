"use client";
/**
 * ARCHITECTURE: Reusable presentation component.
 * Отвечает за визуальный блок и локальное взаимодействие.
 * Данные и доменные правила должны приходить через props/hooks/lib, а не через прямую БД-зависимость.
 */


import {useEffect, useMemo, useState} from "react";
import {ChevronLeft, ChevronRight, Film, ImagePlus, Play, Plus, X} from "lucide-react";

export type CaseMedia = {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  alt?: string;
};

type Props = {
  slug: string;
  items: CaseMedia[];
};

export function CaseMediaCarousel({slug, items}: Props) {
  const storageKey = `case-media:${slug}`;
  const [media, setMedia] = useState<CaseMedia[]>(items);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<CaseMedia["type"]>("image");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as CaseMedia[];
        if (Array.isArray(parsed)) setMedia([...items, ...parsed]);
      }
    } catch {}
  }, [storageKey]);

  const safeActive = Math.min(active, Math.max(media.length - 1, 0));
  const current = media[safeActive];
  const total = media.length;

  const positions = useMemo(() => {
    if (!total) return [];
    return media.map((_, index) => {
      let delta = index - safeActive;
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      return delta;
    });
  }, [media, safeActive, total]);

  function persistCustom(next: CaseMedia[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function addUrl() {
    const src = url.trim();
    if (!src) return;
    const custom = {
      id: `custom-${Date.now()}`,
      type: kind,
      src,
      alt: "Материал кейса",
    } satisfies CaseMedia;
    const next = [...media, custom];
    setMedia(next);
    persistCustom(next.filter(item => item.id.startsWith("custom-")));
    setActive(next.length - 1);
    setUrl("");
    setAdding(false);
  }

  function addFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const custom = {
      id: `local-${Date.now()}`,
      type: isVideo ? "video" : "image",
      src: objectUrl,
      alt: file.name,
    } satisfies CaseMedia;
    setMedia(current => {
      const next = [...current, custom];
      setActive(next.length - 1);
      return next;
    });
    setAdding(false);
  }

  function removeCurrent() {
    if (!current?.id.startsWith("custom-") && !current?.id.startsWith("local-")) return;
    const next = media.filter(item => item.id !== current.id);
    setMedia(next);
    persistCustom(next.filter(item => item.id.startsWith("custom-")));
    setActive(Math.max(0, safeActive - 1));
  }

  if (!media.length) {
    return (
      <div className="case-media-empty">
        <div><ImagePlus size={24}/><strong>Добавьте материалы проекта</strong><span>Фото, видео или ссылку на медиа.</span></div>
        <button className="button button-dark" onClick={() => setAdding(true)}><Plus size={17}/> Добавить медиа</button>
        {adding && <MediaDialog kind={kind} setKind={setKind} url={url} setUrl={setUrl} onUrl={addUrl} onFile={addFile} onClose={() => setAdding(false)}/>}
      </div>
    );
  }

  return (
    <section className="case-media" aria-label="Материалы кейса">
      <div className="case-media-head">
        <div>
          <p className="eyebrow">Project media</p>
          <h2>Объект в деталях</h2>
        </div>
        <div className="case-media-tools">
          <span>{String(safeActive + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <button className="case-media-add" onClick={() => setAdding(true)}><Plus size={15}/> Добавить</button>
        </div>
      </div>

      <div className="case-carousel">
        <div className="case-carousel-stage">
          {media.map((item, index) => {
            const delta = positions[index];
            if (Math.abs(delta) > 2) return null;
            const style = {
              "--case-x": `${delta * 47}%`,
              "--case-z": `${Math.max(0, 100 - Math.abs(delta) * 22)}px`,
              "--case-rotate": `${delta * -9}deg`,
              "--case-scale": delta === 0 ? "1" : "0.88",
              "--case-opacity": delta === 0 ? "1" : "0.58",
            } as React.CSSProperties;
            return (
              <button
                className={`case-slide ${delta === 0 ? "is-active" : ""}`}
                key={item.id}
                style={style}
                onClick={() => setActive(index)}
                aria-label={`Открыть материал ${index + 1}`}
              >
                {item.type === "video" ? (
                  <video src={item.src} poster={item.poster} muted playsInline preload="metadata"/>
                ) : (
                  <img src={item.src} alt={item.alt || "Фото проекта"} draggable={false}/>
                )}
                <span className="case-slide-shade"/>
                <span className="case-slide-label">{item.type === "video" ? <><Film size={13}/> VIDEO</> : <><ImagePlus size={13}/> PHOTO</>}</span>
                {item.type === "video" && <span className="case-slide-play"><Play size={22} fill="currentColor"/></span>}
              </button>
            );
          })}
        </div>
        <button className="case-arrow case-arrow-left" onClick={() => setActive((safeActive - 1 + total) % total)} aria-label="Предыдущий материал"><ChevronLeft/></button>
        <button className="case-arrow case-arrow-right" onClick={() => setActive((safeActive + 1) % total)} aria-label="Следующий материал"><ChevronRight/></button>
      </div>

      <div className="case-thumbs" role="tablist">
        {media.map((item, index) => (
          <button className={index === safeActive ? "active" : ""} key={item.id} onClick={() => setActive(index)} role="tab" aria-selected={index === safeActive}>
            {item.type === "video" ? <span className="case-thumb-video"><Film size={14}/></span> : <img src={item.src} alt="" />}
          </button>
        ))}
      </div>

      <div className="case-media-foot">
        <span>← / → для навигации · свайп на телефоне</span>
        {current?.id.startsWith("custom-") || current?.id.startsWith("local-") ? (
          <button className="case-remove" onClick={removeCurrent}><X size={13}/> Удалить добавленный материал</button>
        ) : null}
      </div>

      {adding && <MediaDialog kind={kind} setKind={setKind} url={url} setUrl={setUrl} onUrl={addUrl} onFile={addFile} onClose={() => setAdding(false)}/>}
    </section>
  );
}

function MediaDialog({kind,setKind,url,setUrl,onUrl,onFile,onClose}:{kind:CaseMedia["type"];setKind:(v:CaseMedia["type"])=>void;url:string;setUrl:(v:string)=>void;onUrl:()=>void;onFile:(f:File)=>void;onClose:()=>void}) {
  return (
    <div className="case-media-dialog" role="dialog" aria-modal="true">
      <div className="case-media-dialog-card">
        <div className="case-media-dialog-head"><div><p className="eyebrow">Media studio</p><h3>Добавить материал</h3></div><button onClick={onClose} aria-label="Закрыть"><X/></button></div>
        <div className="case-media-kind">
          <button className={kind === "image" ? "active" : ""} onClick={() => setKind("image")}><ImagePlus size={16}/> Фото</button>
          <button className={kind === "video" ? "active" : ""} onClick={() => setKind("video")}><Film size={16}/> Видео</button>
        </div>
        <label className="case-media-url"><span>URL материала</span><input value={url} onChange={e => setUrl(e.target.value)} placeholder={kind === "image" ? "https://.../photo.jpg" : "https://.../video.mp4"} onKeyDown={e => e.key === "Enter" && onUrl()}/></label>
        <button className="button button-dark full" onClick={onUrl}>Добавить по URL</button>
        <div className="case-media-or"><span>или</span></div>
        <label className="case-file-button"><input type="file" accept={kind === "image" ? "image/*" : "video/*"} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}/><ImagePlus size={17}/><span>Выбрать файл с устройства</span></label>
        <p className="case-media-note">Файл доступен в текущем браузере. Для постоянного хранения на сайте материалы нужно загрузить в хранилище проекта.</p>
      </div>
    </div>
  );
}
