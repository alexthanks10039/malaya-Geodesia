"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowDownRight, Crosshair, ScanLine } from "lucide-react";
import { GeoScanScene, type TerrainViewMode } from "@/components/geo-scan-scene";

export type HeroProps = {
  eyebrow?: string;
  title?: string;
  accentTitle?: string;
  lead?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

type TerrainSource = "loading" | "dem" | "synthetic";

export function Hero({
  eyebrow = "GEOSPATIAL / ENGINEERING / 2026",
  title = "Точная геодезия",
  accentTitle = "для реальных задач.",
  lead = "Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.",
  primaryLabel = "Рассчитать стоимость",
  primaryHref = "/calculator",
  secondaryLabel = "Все услуги",
  secondaryHref = "/services",
}: HeroProps = {}) {
  const [terrainSource, setTerrainSource] = useState<TerrainSource>("loading");
  const [viewMode, setViewMode] = useState<TerrainViewMode>("hybrid");
  const onTerrainSourceChange = useCallback((source: "dem" | "synthetic") => {
    setTerrainSource(source);
  }, []);

  const sourceLabel = terrainSource === "dem"
    ? "OPEN ELEVATION / DTM"
    : terrainSource === "synthetic"
      ? "PROCEDURAL SIMULATION"
      : "LOADING ELEVATION DATA";

  return (
    <section className="hero">
      <div className="hero-copy">
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: .72, ease: [0.22, 1, .36, 1], delay: .05 }}
        >
          {title}<br /><span>{accentTitle}</span>
        </motion.h1>
        <motion.p className="hero-lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .58, delay: .15 }}>
          {lead}
        </motion.p>
        <motion.div className="hero-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .52, delay: .24 }}>
          <Link className="button button-dark" href={primaryHref}>{primaryLabel} <ArrowRight size={18} /></Link>
          <Link className="button button-ghost" href={secondaryHref}>{secondaryLabel} <ArrowDownRight size={18} /></Link>
        </motion.div>
        <motion.div className="hero-meta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .58, delay: .34 }} aria-label="Ключевые характеристики">
          <div><strong>GNSS · RTK</strong><span>Координаты и высотная привязка</span></div>
          <div><strong>LiDAR · 3D</strong><span>Объекты, рельеф и point cloud</span></div>
          <div><strong>DWG · E57</strong><span>Данные в рабочем формате</span></div>
        </motion.div>
      </div>

      <div className="hero-visual">
        <div className="geo-scene-frame">
          <GeoScanScene onSourceChange={onTerrainSourceChange} onViewModeChange={setViewMode} />
          <div className="geo-vignette" />
          <div className="geo-crosshair"><span /><span /></div>

          <motion.div className="geo-hud hud-top" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55 }}>
            <span><i className="status-dot" /> TIAN SHAN / ALMATY REGION</span>
            <b>{terrainSource === "dem" ? "OPEN DEM" : terrainSource === "synthetic" ? "SIMULATION" : "LOADING DEM"}</b>
          </motion.div>

          <motion.div className="geo-hud hud-left" initial={{ opacity: 0, x: -7 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .68 }}>
            <span>TERRAIN MODEL</span>
            <strong>DTM / 3D</strong>
            <small>{terrainSource === "dem" ? "OPEN ELEVATION GRID" : "SHADED RELIEF PREVIEW"}</small>
          </motion.div>

          <motion.div className="geo-hud hud-right" initial={{ opacity: 0, x: 7 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .76 }}>
            <span>RENDER MODE</span>
            <strong>{viewMode === "surface" ? "HILLSHADE" : viewMode === "cloud" ? "POINT CLOUD" : "HYBRID DTM"}</strong>
            <small>{viewMode === "surface" ? "HEIGHT + SURFACE NORMALS" : viewMode === "cloud" ? "ELEVATION SAMPLE CLOUD" : "SURFACE + POINT RETURNS"}</small>
          </motion.div>

          <motion.div className="geo-chip chip-bottom-left" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .84 }}>
            <Crosshair size={13} />
            <span>43.10° N / 77.00° E</span>
          </motion.div>

          <motion.div className="geo-chip chip-bottom-right" title={sourceLabel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .9 }}>
            <ScanLine size={13} />
            <span>{terrainSource === "dem" ? "OPEN DEM / Z13" : terrainSource === "synthetic" ? "FALLBACK / SIM" : "DETECTING SOURCE"}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
