"use client";
/**
 * ARCHITECTURE: Reusable presentation component.
 * Отвечает за визуальный блок и локальное взаимодействие.
 * Данные и доменные правила должны приходить через props/hooks/lib, а не через прямую БД-зависимость.
 */


import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, ImagePlus, Link2, Maximize2, Play, Trash2, UploadCloud, X } from "lucide-react";

type MediaItem = { id: string; type: "image" | "video"; src: string; title: string; source: "local" | "url" };
const storageKey = (slug: string) => "geodesia:case-media:" + slug;

function isVideoUrl(src: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src) || /youtube\.com|youtu\.be|vimeo\.com/i.test(src);
}

export function CaseMediaGallery({ slug, title, category }: { slug: string; title: string; category: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(slug));
      if (saved) setItems(JSON.parse(saved));
    } catch { setItems([]); }
  }, [slug]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(slug), JSON.stringify(items)); } catch {}
  }, [items, slug]);

  function addFiles(files: FileList | File[]) {
    const next: MediaItem[] = [];
    for (const file of Array.from(files)) {
      if ((!file.type.startsWith("image/") && !file.type.startsWith("video/")) || file.size > 12 * 1024 * 1024) continue;
      next.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith("video/") ? "video" : "image",
        src: URL.createObjectURL(file),
        title: file.name,
        source: "local",
      });
    }
    setItems((prev) => [...prev, ...next]);
    if (next.length) setActive(items.length);
  }

  function addUrl() {
    const value = url.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) { setUrlError("Нужна ссылка, начинающаяся с https://"); return; }
    setItems((prev) => [...prev, { id: crypto.randomUUID(), type: isVideoUrl(value) ? "video" : "image", src: value, title: "Медиа по ссылке", source: "url" }]);
    setActive(items.length);
    setUrl("");
    setUrlError("");
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setActive((prev) => Math.max(0, Math.min(prev, items.length - 2)));
    setLightbox(null);
  }

  return (
    <section className="case-media" aria-label="Фото и видео кейса">
      <div className="case-media-head">
        <div>
          <p className="eyebrow">Visual archive / {category}</p>
          <h2>Фото и видео</h2>
          <p>Добавляйте материалы объекта с устройства или по ссылке.</p>
        </div>
        <div className="case-media-count"><strong>{items.length}</strong><span>медиа</span></div>
      </div>

      <div className="case-media-workspace">
        <div className="case-media-stage">
          {items[active] ? (
            items[active].type === "video" ? (
              <video className="case-media-main" src={items[active].src} controls playsInline />
            ) : (
              <button className="case-media-main-button" onClick={() => setLightbox(active)} aria-label="Открыть фото">
                <img className="case-media-main" src={items[active].src} alt={items[active].title || title} />
                <span className="case-media-expand"><Maximize2 size={16} /></span>
              </button>
            )
          ) : (
            <div className="case-media-empty">
              <div className="case-media-empty-icon"><ImagePlus size={24} /></div>
              <strong>Архив объекта пока пуст</strong>
              <span>Загрузите фото или видео, чтобы превратить кейс в визуальный отчёт.</span>
              <button className="button button-light" onClick={() => inputRef.current?.click()}><UploadCloud size={17} /> Добавить материалы</button>
            </div>
          )}
          <div className="case-media-overlay">
            <span>{items.length ? (active + 1) + " / " + items.length : "NO MEDIA"}</span>
            {items[active] && <button onClick={() => remove(active)} aria-label="Удалить медиа"><Trash2 size={15} /></button>}
          </div>
        </div>

        <aside className="case-media-sidebar">
          <div className="case-media-sidebar-title"><span>Материалы</span><span>{items.length}</span></div>
          <div className="case-media-thumbs">
            {items.map((item, index) => (
              <button className={"case-media-thumb " + (index === active ? "active" : "")} key={item.id} onClick={() => setActive(index)} title={item.title}>
                {item.type === "video" ? <span className="case-media-thumb-video"><Play size={14} fill="currentColor" /></span> : <img src={item.src} alt="" />}
                <span>{index + 1}</span>
              </button>
            ))}
          </div>

          <div className="case-media-actions">
            <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
            <button className="media-action" onClick={() => inputRef.current?.click()}><UploadCloud size={16} /><span><strong>Загрузить</strong><small>Фото / видео до 12 МБ</small></span></button>
            <div className="media-url"><Link2 size={16} /><input value={url} onChange={(event) => { setUrl(event.target.value); setUrlError(""); }} onKeyDown={(event) => event.key === "Enter" && addUrl()} placeholder="https://..." aria-label="Ссылка на фото или видео" /><button onClick={addUrl} aria-label="Добавить ссылку"><ChevronRight size={16} /></button></div>
            {urlError && <small className="media-url-error">{urlError}</small>}
          </div>
        </aside>
      </div>

      <div className="case-media-note"><Film size={15} /><span>Локальные файлы сохраняются в браузере. Для постоянного публичного архива используйте URL или подключите файловое хранилище.</span></div>

      {lightbox !== null && items[lightbox]?.type === "image" && (
        <div className="case-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button className="case-lightbox-close" onClick={() => setLightbox(null)} aria-label="Закрыть"><X size={20} /></button>
          <button className="case-lightbox-nav left" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + items.length) % items.length); }} aria-label="Предыдущее"><ChevronLeft /></button>
          <img src={items[lightbox].src} alt={items[lightbox].title || title} onClick={(e) => e.stopPropagation()} />
          <button className="case-lightbox-nav right" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % items.length); }} aria-label="Следующее"><ChevronRight /></button>
        </div>
      )}
    </section>
  );
}
