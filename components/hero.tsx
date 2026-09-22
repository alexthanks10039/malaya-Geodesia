"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowDownRight } from "lucide-react";

export function Hero() {
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
          Точная геодезия<br /><span>для реальных задач.</span>
        </motion.h1>
        <motion.p
          className="hero-lead"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .65, delay: .18 }}
        >
          Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.
        </motion.p>
        <motion.div className="hero-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .28 }}>
          <Link className="button button-dark" href="/calculator">Рассчитать стоимость <ArrowRight size={18} /></Link>
          <Link className="button button-ghost" href="/services">Все услуги <ArrowDownRight size={18} /></Link>
        </motion.div>
        <div className="hero-meta" aria-label="Ключевые характеристики">
          <div><strong>GNSS · RTK</strong><span>Координаты и высотная привязка</span></div>
          <div><strong>LiDAR · 3D</strong><span>Объекты, рельеф и point cloud</span></div>
          <div><strong>DWG · E57</strong><span>Данные в рабочем формате</span></div>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <motion.div
          className="survey-console"
          initial={{ opacity: 0, scale: .88, rotateX: 12, rotateZ: 2 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, rotateZ: 0 }}
          transition={{ duration: 1.05, delay: .18, ease: [0.16, 1, .3, 1] }}
          whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
        >
          <div className="console-top"><span>FIELD / ALMATY / LIVE</span><strong>SCAN 04</strong></div>
          <div className="console-map">
            <i className="console-line one" /><i className="console-line two" />
            <i className="console-point a" /><i className="console-point b" /><i className="console-point c" />
            <span className="console-readout">POINT CLOUD<strong>1.84M pts</strong>RMSE 0.018 m</span>
            <span className="console-scan" />
          </div>
          <div className="console-bottom"><span>43°14′17″ N · 76°56′44″ E</span><span>09:42:18</span></div>
        </motion.div>
        <motion.span className="coord c1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .8 }}>ELEV 861.42</motion.span>
        <motion.span className="coord c2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .9 }}>GRID 1000 / 1000</motion.span>
      </div>
    </section>
  );
}
