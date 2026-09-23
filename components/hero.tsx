"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowDownRight, Crosshair, ScanLine } from "lucide-react";
import { GeoScanScene } from "@/components/geo-scan-scene";

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

export function Hero({
  eyebrow = "{eyebrow}",
  title = "Точная геодезия",
  accentTitle = "для реальных задач.",
  lead = "{lead}",
  primaryLabel = "Рассчитать стоимость",
  primaryHref = "/calculator",
  secondaryLabel = "Все услуги",
  secondaryHref = "/services",
}: HeroProps = {}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
          GEOSPATIAL / ENGINEERING / 2026
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 34, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: .85, ease: [0.22, 1, .36, 1], delay: .06 }}
        >
          {title}<br /><span>{accentTitle}</span>
        </motion.h1>
        <motion.p className="hero-lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .18 }}>
          Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.
        </motion.p>
        <motion.div className="hero-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .28 }}>
          <Link className="button button-dark" href={primaryHref}>{primaryLabel} <ArrowRight size={18} /></Link>
          <Link className="button button-ghost" href={secondaryHref}>{secondaryLabel} <ArrowDownRight size={18} /></Link>
        </motion.div>
        <motion.div className="hero-meta" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .4 }} aria-label="Ключевые характеристики">
          <div><strong>GNSS · RTK</strong><span>Координаты и высотная привязка</span></div>
          <div><strong>LiDAR · 3D</strong><span>Объекты, рельеф и point cloud</span></div>
          <div><strong>DWG · E57</strong><span>Данные в рабочем формате</span></div>
        </motion.div>
      </div>

      <div className="hero-visual">
        <div className="geo-scene-frame">
          <GeoScanScene />
          <div className="geo-vignette" />
          <div className="geo-grid-overlay" />
          <div className="geo-crosshair"><span /><span /></div>

          <motion.div className="geo-hud hud-top" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7 }}>
            <span><i className="status-dot" /> FIELD / ALMATY</span>
            <b>SIMULATION 04</b>
          </motion.div>

          <motion.div className="geo-hud hud-left" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .82 }}>
            <span>POINT CLOUD</span>
            <strong>1.84M</strong>
            <small>POINTS</small>
          </motion.div>

          <motion.div className="geo-hud hud-right" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .92 }}>
            <span>RMSE</span>
            <strong>0.018 m</strong>
            <small>QUALITY CHECK</small>
          </motion.div>

          <motion.div className="geo-chip chip-bottom-left" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
            <Crosshair size={13} />
            <span>43.2382° N / 76.9456° E</span>
          </motion.div>

          <motion.div className="geo-chip chip-bottom-right" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.08 }}>
            <ScanLine size={13} />
            <span>SCAN 09:42:18</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
