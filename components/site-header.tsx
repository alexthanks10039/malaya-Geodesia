"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudioDevModeButton } from "@/components/studio/dev-mode";

export function SiteHeader() {
  const pathname = usePathname();
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
          {nav.map(([title, href]) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                className={active ? "active" : ""}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
              >
                {title}
              </Link>
            );
          })}
          <Link className="header-cta" href="/calculator" onClick={() => setOpen(false)}>Рассчитать</Link>
        </nav>

        <div className="header-tools">
          <ThemeToggle />
          <StudioDevModeButton />
        </div>

        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
    </header>
  );
}
