"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, Database, Grid3X3, Layers3, Search, ScanLine, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GeoScanScene } from "@/components/geo-scan-scene";

type GeoRecord = {
  id: string;
  name: string;
  type: string;
  points: string;
  coverage: string;
  coordinates: string;
  note: string;
  elevation: string;
};

const records: GeoRecord[] = [
  { id: "A-17", name: "Участок A-17", type: "TOPO", points: "1.24M", coverage: "96%", coordinates: "43.2382° N / 76.9456° E", elevation: "+842.12 m", note: "Рельеф, отметки и существующие объекты" },
  { id: "K-04", name: "Карьер K-04", type: "UAV", points: "2.40M", coverage: "99%", coordinates: "43.6154° N / 76.8921° E", elevation: "+618.44 m", note: "Ортофото, поверхность и облако точек" },
  { id: "F-02", name: "Фасад F-02", type: "LIDAR", points: "680K", coverage: "94%", coordinates: "43.2561° N / 76.9378° E", elevation: "+910.07 m", note: "Геометрия фасада для CAD / BIM" },
  { id: "S-09", name: "Площадка S-09", type: "GNSS", points: "840K", coverage: "97%", coordinates: "43.2927° N / 76.8814° E", elevation: "+756.31 m", note: "Контрольные точки и исполнительная съёмка" },
];

const filters = [
  { key: "points", label: "POINTS", icon: Database },
  { key: "grid", label: "GRID", icon: Grid3X3 },
  { key: "scan", label: "SCAN", icon: ScanLine },
] as const;

export function GeospatialIndex() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(records[0].id);
  const [layers, setLayers] = useState({ points: true, grid: true, scan: true });

  const result = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((item) => (item.id + " " + item.name + " " + item.type + " " + item.note + " " + item.coordinates).toLowerCase().includes(q));
  }, [query]);

  const selected = records.find((item) => item.id === selectedId) ?? records[0];

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  };

  const selectRecord = (item: GeoRecord) => {
    setSelectedId(item.id);
    setQuery("");
  };

  return (
    <div className="geo-index">
      <div className="geo-index-copy">
        <div className="geo-index-kicker">
          <p className="eyebrow">GEOSPATIAL DATA / INDEX</p>
          <span className="geo-index-status"><i /> DEMO INDEX</span>
        </div>

        <h2>Участок читается как массив пространственных данных.</h2>
        <p className="geo-index-lead">
          Здесь можно быстро переключать слои, искать набор данных и выбирать объект. Архитектура блока уже готова к подключению реального каталога PostGIS.
        </p>

        <div className="geo-index-controls">
          <label className="geo-index-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти участок, тип или координаты..."
              aria-label="Поиск геоданных"
            />
            {query && (
              <button type="button" aria-label="Очистить поиск" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>

          <div className="geo-index-filters" aria-label="Слои визуализации">
            {filters.map(({ key, label, icon: Icon }) => {
              const active = layers[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? "geo-filter active" : "geo-filter"}
                  aria-pressed={active}
                  onClick={() => toggleLayer(key)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="geo-records">
          <div className="geo-records-head">
            <span><Layers3 size={14} /> DATASETS</span>
            <b>{result.length.toString().padStart(2, "0")}</b>
          </div>

          {result.length ? (
            <div className="geo-record-list">
              {result.map((item) => {
                const active = item.id === selected.id;
                return (
                  <button
                    type="button"
                    className={active ? "geo-record active" : "geo-record"}
                    key={item.id}
                    onClick={() => selectRecord(item)}
                  >
                    <span className="geo-record-id">{item.id}</span>
                    <span className="geo-record-main">
                      <strong>{item.name}</strong>
                      <small>{item.type} · {item.points} pts</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="geo-empty">Ничего не найдено. Попробуйте другой запрос.</div>
          )}
        </div>

        <div className="geo-selected">
          <div className="geo-selected-top">
            <span>SELECTED / {selected.id}</span>
            <span className="geo-quality"><i /> QA {selected.coverage}</span>
          </div>
          <strong>{selected.name}</strong>
          <p>{selected.note}</p>
          <div className="geo-selected-meta">
            <span><Crosshair size={13} /> {selected.coordinates}</span>
            <span><Database size={13} /> {selected.points} POINTS</span>
          </div>
        </div>

        <div className="geo-index-actions">
          <Link className="button button-light" href="/calculator">Рассчитать по объекту <ArrowRight size={16} /></Link>
          <Link className="text-link" href="/knowledge">Как читаются геоданные <ArrowRight size={15} /></Link>
        </div>
      </div>

      <div className="geo-index-visual">
        <GeoScanScene variant="index" layers={layers} />
        <div className="photo-hud photo-hud-top">
          <span><i /> DATA INDEX / {selected.type}</span>
          <b>LIVE</b>
        </div>
        <div className="geo-index-axis">{selected.coordinates} · Z {selected.elevation}</div>
        <div className="photo-hud photo-hud-bottom">
          <span>SPATIAL INDEX</span>
          <strong>{selected.points}</strong>
          <small>XYZ / {selected.coverage} COVERAGE</small>
        </div>
      </div>
    </div>
  );
}
