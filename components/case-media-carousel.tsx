"use client";

import {useMemo, useState} from "react";
import {ChevronLeft, ChevronRight, Film, ImagePlus, Play} from "lucide-react";

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
  const [media] = useState<CaseMedia[]>(items);
  const [active, setActive] = useState(0);

  const safeActive = Math.min(active, Math.max(media.length - 1, 0));
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

  if (!media.length) {
    return (
      <div className="case-media-empty" aria-label="Материалы кейса">
        <div><ImagePlus size={24}/><strong>Материалы этого проекта пока не опубликованы</strong><span>Галерея появится здесь после публикации фотографий или видео проекта.</span></div>
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
        <span>← / → для навигации</span>
      </div>
    </section>
  );
}

