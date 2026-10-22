"use client";

import { useMemo, useState } from "react";
import { Activity, ChevronDown, Crosshair, Waves } from "lucide-react";
import styles from "./terrain-inspector.module.css";

type Props = {
  activeIndex: number;
  onSelect: (index: number) => void;
  source: "loading" | "dem" | "synthetic";
};

const stations = [
  { id: "A-17", label: "A / 17", elevation: 842.12, x: 12, y: 67 },
  { id: "K-04", label: "K / 04", elevation: 618.44, x: 37, y: 38 },
  { id: "F-02", label: "F / 02", elevation: 910.07, x: 63, y: 53 },
  { id: "S-09", label: "S / 09", elevation: 756.31, x: 88, y: 22 },
];

const profile = [
  [0, 70], [5, 64], [10, 67], [15, 56], [20, 60], [25, 48],
  [30, 53], [35, 37], [40, 43], [45, 31], [50, 42], [55, 49],
  [60, 45], [65, 54], [70, 44], [75, 35], [80, 39], [85, 25],
  [90, 30], [95, 18], [100, 23],
];

export function TerrainInspector({ activeIndex, onSelect, source }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const focused = hoverIndex ?? activeIndex;
  const point = stations[focused] ?? stations[0];
  const path = useMemo(
    () => profile.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" "),
    []
  );
  const area = `${path} L 100 100 L 0 100 Z`;
  const sourceText = source === "dem" ? "OPEN DEM" : source === "synthetic" ? "SIMULATED" : "LOADING DEM";

  return (
    <section className={styles.console} aria-label="Интерактивный профиль рельефа">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.toggleIcon}><Waves size={14} /></span>
        <span className={styles.toggleText}>
          <strong>ПРОФИЛЬ РЕЛЬЕФА</strong>
          <small><i /> {sourceText} · 4 контрольные точки</small>
        </span>
        <ChevronDown className={expanded ? styles.chevronOpen : styles.chevron} size={15} />
      </button>

      {expanded && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span><Activity size={12} /> TRANSECT / DEMO</span>
            <b>0—100%</b>
          </div>
          <div className={styles.chartWrap}>
            <svg className={styles.chart} viewBox="0 0 100 100" role="img" aria-label="Схематичный профиль высот; выберите контрольную точку">
              <defs>
                <linearGradient id="terrainProfileFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9ff52" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#d9ff52" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className={styles.gridLine} />)}
              {[25, 50, 75].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="100" className={styles.gridLine} />)}
              <path d={area} fill="url(#terrainProfileFill)" />
              <path d={path} className={styles.profileLine} />
              <line x1={point.x} x2={point.x} y1="4" y2="100" className={styles.focusLine} />
              {stations.map((station, index) => (
                <g key={station.id} className={styles.station} onClick={() => onSelect(index)} onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(null)} onFocus={() => setHoverIndex(index)} onBlur={() => setHoverIndex(null)} tabIndex={0} role="button" aria-label={`Выбрать участок ${station.id}`}>
                  <circle cx={station.x} cy={station.y} r={index === focused ? 4 : 2.5} className={index === focused ? styles.activePoint : styles.point} />
                  <circle cx={station.x} cy={station.y} r="7" className={styles.hitArea} />
                </g>
              ))}
            </svg>
            <div className={styles.axisLabels}><span>0+000</span><span>0+500</span><span>1+000</span></div>
          </div>
          <div className={styles.readout}>
            <div className={styles.readoutMark}><Crosshair size={14} /></div>
            <div className={styles.readoutText}><small>АКТИВНАЯ СТАНЦИЯ / {point.id}</small><strong>{point.elevation.toFixed(2)} <em>м</em></strong></div>
            <button type="button" onClick={() => onSelect((activeIndex + 1) % stations.length)} aria-label="Следующая контрольная точка">NEXT ↗</button>
          </div>
          <div className={styles.stationList}>
            {stations.map((station, index) => (
              <button key={station.id} type="button" className={index === activeIndex ? styles.stationActive : ""} onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(null)} onFocus={() => setHoverIndex(index)} onBlur={() => setHoverIndex(null)} onClick={() => onSelect(index)} aria-pressed={index === activeIndex}>
                <span>{station.id}</span><b>{station.elevation.toFixed(0)} m</b>
              </button>
            ))}
          </div>
          <p className={styles.disclaimer}>Схематичный демонстрационный профиль. Отметки станций приведены как пример интерфейса.</p>
        </div>
      )}
    </section>
  );
}
