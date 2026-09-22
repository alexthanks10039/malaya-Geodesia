"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "malaya-geodesia-theme";
type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved === "light" || saved === "dark" ? saved : systemDark ? "dark" : "light";
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
    setReady(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={ready ? `Включить ${theme === "dark" ? "светлую" : "тёмную"} тему` : "Переключить тему"}
      title={ready ? `Тема: ${theme === "dark" ? "тёмная" : "светлая"}. Нажмите для переключения` : "Переключить тему"}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="theme-toggle-label">Переключить тему</span>
    </button>
  );
}
