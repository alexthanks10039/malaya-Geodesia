"use client";
/**
 * ARCHITECTURE: Global navigation shell.
 * Отвечает только за навигацию, тему и открытие Studio/mobile menu.
 * Он не владеет данными страниц и не должен содержать расчётную или CMS-логику.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudioDevModeButton } from "@/components/studio/dev-mode";

const nav = [["Услуги", "/services"], ["Калькулятор", "/calculator"], ["Calculator Lab", "/calculators-lab"], ["Кейсы", "/cases"], ["Справочник", "/knowledge"]] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className={"site-header" + (open ? " menu-open" : "")}>
        <div className="header-inner">
          <Link className="brand" href="/" onClick={close} aria-label="Малая геодезия">
            <span className="brand-mark">G</span>
            <span>МАЛАЯ<br />ГЕОДЕЗИЯ</span>
          </Link>

          <nav className="nav" aria-label="Основная навигация">
            {nav.map(([title, href]) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link className={active ? "active" : ""} href={href} key={href} onClick={close} aria-current={active ? "page" : undefined}>
                  {title}
                </Link>
              );
            })}
            <Link className="header-cta" href="/calculator" onClick={close}>Рассчитать</Link>
          </nav>

          <div className="header-tools">
            <ThemeToggle />
            <StudioDevModeButton />
          </div>

          <button
            className="mobile-menu"
            type="button"
            onClick={() => setOpen(value => !value)}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div
        className={"mobile-nav " + (open ? "is-open" : "")}
        id="mobile-navigation"
        aria-hidden={!open}
      >
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Закрыть меню"
          onClick={close}
          tabIndex={open ? 0 : -1}
          style={{ zIndex: 0 }}
        />
        <nav
          className="mobile-nav-panel"
          aria-label="Мобильная навигация"
          style={{
            zIndex: 1,
            transform: open ? "translateX(0)" : "translateX(100%)",
          }}
        >
          <div className="mobile-nav-head">
            <span className="eyebrow">NAV / 2026</span>
            <span className="mobile-nav-status"><i /> ONLINE</span>
          </div>

          <div className="mobile-nav-links">
            {nav.map(([title, href], index) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  className={"mobile-nav-link " + (active ? "active" : "")}
                  href={href}
                  key={href}
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="mobile-nav-index">0{index + 1}</span>
                  <strong>{title}</strong>
                  <ArrowUpRight size={20} />
                </Link>
              );
            })}
          </div>

          <div className="mobile-nav-bottom">
            <div>
              <span className="eyebrow">Следующий шаг</span>
              <p>Опишите задачу, а мы подберём метод и состав работ.</p>
            </div>
            <Link className="mobile-nav-cta" href="/calculator" onClick={close} tabIndex={open ? 0 : -1}>
              Рассчитать проект <ArrowUpRight size={17} />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
