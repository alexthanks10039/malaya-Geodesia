/**
 * ARCHITECTURE: Reusable presentation component.
 * Отвечает за конкретный UI-блок и пользовательское взаимодействие.
 * Не хранит persistence и не дублирует доменные правила; данные приходят из props/lib.
 */

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <div className="brand footer-brand"><span className="brand-mark">G</span><span>МАЛАЯ<br />ГЕОДЕЗИЯ</span></div>
        <p>Геодезия как цифровой продукт: задача → данные → результат.</p>
      </div>
      <div className="footer-links">
        <Link href="/services">Услуги</Link>
        <Link href="/calculator">Калькулятор</Link>
        <Link href="/cases">Кейсы</Link>
        <Link href="/knowledge">Справочник</Link>
      </div>
      <div className="footer-note">GEOSPATIAL / ALMATY / 2026</div>
    </footer>
  );
}
