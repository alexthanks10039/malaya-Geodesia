"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const nav = [["Услуги", "/services"], ["Калькулятор", "/calculator"], ["Кейсы", "/cases"], ["Справочник", "/knowledge"]];
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" onClick={() => setOpen(false)} aria-label="Малая геодезия">
          <span className="brand-mark">G</span>
          <span>МАЛАЯ<br />ГЕОДЕЗИЯ</span>
        </Link>
        <nav className={open ? "nav open" : "nav"} aria-label="Основная навигация">
          {nav.map(([title, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{title}</Link>)}
          <Link className="header-cta" href="/calculator" onClick={() => setOpen(false)}>Рассчитать</Link>
        </nav>
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? "Закрыть меню" : "Открыть меню"}>{open ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
    </header>
  );
}
