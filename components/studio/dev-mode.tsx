"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Code2, Download, Eye, EyeOff, RotateCcw, Settings2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { mergePageOverride, readStudioState, writeStudioState } from "@/studio/runtime/storage";
import type { StudioCssOverrides, StudioState } from "@/studio/types";

const DEV_ENABLED_KEY = "malaya-studio-dev-enabled";
export const STUDIO_TOGGLE_EVENT = "malaya-studio-toggle";

const STYLE_MAP: Record<keyof StudioCssOverrides, string> = {
  fontSize: "font-size", lineHeight: "line-height", color: "color", background: "background",
  padding: "padding", margin: "margin", borderRadius: "border-radius", width: "width",
  maxWidth: "max-width", gap: "gap", letterSpacing: "letter-spacing", opacity: "opacity", display: "display",
};

type PreviewMode = "select" | "interact";
type NodeSummary = { id: string; tag: string; label: string; className: string };
type Selected = NodeSummary & { textEditable: boolean; css: StudioCssOverrides };

const STYLE_LABELS: Record<keyof StudioCssOverrides, string> = { fontSize: "Размер", lineHeight: "Интерлиньяж", color: "Цвет", background: "Фон", padding: "Внутренний отступ", margin: "Внешний отступ", borderRadius: "Скругление", width: "Ширина", maxWidth: "Макс. ширина", gap: "Gap", letterSpacing: "Трекинг", opacity: "Прозрачность", display: "Display" };

function getNodeId(element: Element) { return element.getAttribute("data-studio-node-id") ?? ""; }

const EDITABLE_TAGS = new Set(["a", "button", "input", "select", "textarea", "img", "video", "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "label", "span"]);
const SKIP_TAGS = new Set(["html", "head", "script", "style", "noscript", "svg", "path", "option"]);

function elementPath(element: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child) => child.tagName === current!.tagName);
    const index = Math.max(0, siblings.indexOf(current));
    parts.unshift(`${current.tagName.toLowerCase()}-${index}`);
    current = parent;
  }
  return `dev-${parts.join("-")}`;
}

function directText(element: Element) {
  return Array.from(element.childNodes)
    .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\\s+/g, " ")
    .trim();
}

function readableLabel(element: Element) {
  const direct = directText(element);
  const aria = element.getAttribute("aria-label") ?? "";
  const alt = element.getAttribute("alt") ?? "";
  const title = element.getAttribute("title") ?? "";
  return (direct || aria || alt || title || element.tagName.toLowerCase())
    .replace(/\\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function collectNodes(): NodeSummary[] {
  const elements = Array.from(document.body?.querySelectorAll("*") ?? []);
  return elements
    .filter((element) => {
      const tag = element.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag) || element.closest("[data-studio-dev-ui]")) return false;
      const text = directText(element);
      const isLeaf = element.children.length === 0;
      const isEditable = EDITABLE_TAGS.has(tag);
      const isSemanticBlock = ["header", "nav", "main", "section", "article", "footer", "form"].includes(tag) && Boolean(text);
      return (isLeaf && (text || isEditable)) || isSemanticBlock;
    })
    .map((element) => {
      const existing = element.getAttribute("data-studio-node-id");
      const id = existing || elementPath(element);
      element.setAttribute("data-studio-node-id", id);
      return {
        id,
        tag: element.tagName.toLowerCase(),
        label: readableLabel(element),
        className: typeof element.className === "string" ? element.className : "",
      };
    });
}
function readElementCss(element: Element): StudioCssOverrides {
  const style = window.getComputedStyle(element);
  return {
    fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color, background: style.backgroundColor,
    padding: style.padding, margin: style.margin, borderRadius: style.borderRadius, width: style.width,
    maxWidth: style.maxWidth, gap: style.gap, letterSpacing: style.letterSpacing, opacity: style.opacity, display: style.display,
  };
}

function applyDrafts(state: StudioState, pathname: string): NodeSummary[] {
  const nodes = collectNodes();
  const page = state.pages[pathname] ?? {};
  for (const [nodeId, override] of Object.entries(page)) {
    const element = document.querySelector(`[data-studio-node-id="${CSS.escape(nodeId)}"]`);
    if (!(element instanceof HTMLElement)) continue;
    if (override.text !== undefined && element.children.length === 0) element.textContent = override.text;
    for (const [property, value] of Object.entries(override.css ?? {})) {
      const cssName = STYLE_MAP[property as keyof StudioCssOverrides];
      if (cssName && value !== undefined) element.style.setProperty(cssName, value);
    }
  }
  return nodes;
}

function findElement(id: string) {
  const element = document.querySelector(`[data-studio-node-id="${CSS.escape(id)}"]`);
  return element instanceof HTMLElement ? element : null;
}

export function StudioDevModeButton() {
  return (
    <button type="button" className="studio-header-dev-button" onClick={() => window.dispatchEvent(new Event(STUDIO_TOGGLE_EVENT))}
      aria-label="Открыть Dev Mode редактора" title="Dev Mode редактора · Ctrl/⌘ + Shift + E">
      <Code2 size={16} /><span>DEV</span>
    </button>
  );
}

export function StudioDevMode() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<PreviewMode>("select");
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<StudioState>(() => readStudioState());
  const [lastSaved, setLastSaved] = useState("LOCAL");

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return nodes;
    return nodes.filter((node) => node.label.toLowerCase().includes(query) || node.tag.includes(query) || node.className.toLowerCase().includes(query));
  }, [nodes, search]);

  function setActive(next: boolean) {
    setEnabled(next);
    window.localStorage.setItem(DEV_ENABLED_KEY, next ? "1" : "0");
    if (!next) {
      setSelected(null);
      document.querySelectorAll(".studio-dev-selected").forEach((node) => node.classList.remove("studio-dev-selected"));
      document.getElementById("malaya-studio-dev-outline")?.remove();
      setMode("select");
    }
  }

  function persist(next: StudioState) {
    writeStudioState(next);
    setState(next);
    setLastSaved("SAVED");
    window.setTimeout(() => setLastSaved("LOCAL"), 900);
  }

  function selectElement(element: HTMLElement) {
    document.querySelectorAll(".studio-dev-selected").forEach((node) => node.classList.remove("studio-dev-selected"));
    element.classList.add("studio-dev-selected");
    const directText = Array.from(element.childNodes)
      .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
    setSelected({
      id: getNodeId(element),
      tag: element.tagName.toLowerCase(),
      label: directText || element.textContent?.replace(/\s+/g, " ").trim().slice(0, 72) || element.tagName.toLowerCase(),
      className: element.className,
      textEditable: element.children.length === 0,
      css: readElementCss(element),
    });
  }

  function refresh() {
    if (!enabled) return;
    window.requestAnimationFrame(() => setNodes(applyDrafts(state, pathname)));
  }

  function updateText(value: string) {
    if (!selected?.textEditable) return;
    const element = findElement(selected.id);
    if (!element) return;
    element.textContent = value;
    persist(mergePageOverride(state, pathname, selected.id, { text: value }));
    setSelected((current) => current ? { ...current, label: value } : current);
  }

  function updateStyle(property: keyof StudioCssOverrides, value: string) {
    const element = findElement(selected?.id ?? "");
    if (!element) return;
    element.style.setProperty(STYLE_MAP[property], value);
    persist(mergePageOverride(state, pathname, selected?.id ?? "", { css: { [property]: value } }));
    setSelected((current) => current ? { ...current, css: { ...current.css, [property]: value } } : current);
  }

  function resetSelected() {
    if (!selected) return;
    const page = { ...(state.pages[pathname] ?? {}) };
    delete page[selected.id];
    const next = { ...state, pages: { ...state.pages, [pathname]: page } };
    writeStudioState(next);
    setState(next);
    setSelected(null);
    window.location.reload();
  }

  function resetPage() {
    const next = { ...state, pages: { ...state.pages } };
    delete next.pages[pathname];
    writeStudioState(next);
    setState(next);
    setSelected(null);
    window.location.reload();
  }

  function exportDraft() {
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), pages: state.pages, globalTokens: state.globalTokens }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "malaya-studio-dev-draft.json"; link.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(DEV_ENABLED_KEY) === "1";
    const queryEnabled = new URLSearchParams(window.location.search).get("dev") === "1";
    setEnabled(saved || queryEnabled);
    const toggleHandler = () => setActive(window.localStorage.getItem(DEV_ENABLED_KEY) !== "1");
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setActive(window.localStorage.getItem(DEV_ENABLED_KEY) !== "1");
      }
    };
    window.addEventListener(STUDIO_TOGGLE_EVENT, toggleHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener(STUDIO_TOGGLE_EVENT, toggleHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const raf = window.requestAnimationFrame(() => setNodes(applyDrafts(state, pathname)));
    let refreshFrame = 0;
    const observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target instanceof Element && Boolean(mutation.target.closest("[data-studio-dev-ui]")))) return;
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(() => setNodes(applyDrafts(state, pathname)));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const clickHandler = (event: MouseEvent) => {
      if (mode !== "select") return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-studio-dev-ui]")) return;
      const element = target.closest("[data-studio-node-id]");
      if (!(element instanceof HTMLElement)) return;
      event.preventDefault(); event.stopPropagation(); selectElement(element);
    };
    document.addEventListener("click", clickHandler, true);
    return () => {
      window.cancelAnimationFrame(raf);\n      window.cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      document.removeEventListener("click", clickHandler, true);
    };
  }, [enabled, pathname, state, mode]);

  useEffect(() => {
    if (!enabled) return;
    const styleId = "malaya-studio-dev-outline";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = [
      "[data-studio-node-id]:hover { outline: 1px dashed rgba(217,255,82,.92) !important; outline-offset: 2px; cursor: crosshair !important; }",
      "[data-studio-node-id].studio-dev-selected { outline: 2px solid #d9ff52 !important; outline-offset: 3px; box-shadow: 0 0 0 4px rgba(217,255,82,.16) !important; }",
    ].join("\n");
    document.head.appendChild(style);
    return () => document.getElementById(styleId)?.remove();
  }, [enabled]);

  return (
    <>
      <div className="studio-dev-fab-wrap" data-studio-dev-ui>
        <button type="button" className={enabled ? "studio-dev-fab studio-dev-fab-active" : "studio-dev-fab"} onClick={() => setActive(!enabled)}>
          {enabled ? <Settings2 size={17} /> : <Code2 size={17} />}<span>{enabled ? "DEV ON" : "EDIT"}</span>
        </button>
      </div>

      {enabled && (
        <aside className="studio-dev-panel" data-studio-dev-ui>
          <div className="studio-dev-head">
            <div><div className="studio-dev-eyebrow"><span className="studio-dev-dot" /> DEV MODE <span className="studio-dev-live">LIVE</span></div><strong>Редактор страницы</strong><small>{pathname} · изменения только у тебя</small></div>
            <button type="button" className="studio-dev-close" onClick={() => setActive(false)} aria-label="Закрыть"><X size={15} /></button>
          </div>

          <div className="studio-dev-actions">
            <button className={mode === "select" ? "active" : ""} onClick={() => setMode("select")} type="button"><Eye size={13} /> EDIT</button>
            <button className={mode === "interact" ? "active" : ""} onClick={() => setMode("interact")} type="button"><EyeOff size={13} /> TEST</button>
            <Link href="/studio" target="_blank" rel="noreferrer"><Settings2 size={13} /> FULL STUDIO</Link>
          </div>

          <div className="studio-dev-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти текст, класс или тег" /><span>{filteredNodes.length}</span></div>

          <div className="studio-dev-list">
            {!filteredNodes.length && <p className="studio-dev-empty">На странице пока нечего выбрать.</p>}
            {filteredNodes.map((node) => (
              <button type="button" key={node.id} className={selected?.id === node.id ? "active" : ""} onClick={() => { const element = findElement(node.id); if (element) selectElement(element); }}>
                <span>{node.tag}</span><b>{node.label || "(без текста)"}</b>{node.className && <small>.{node.className.split(" ")[0]}</small>}
              </button>
            ))}
          </div>

          <div className="studio-dev-inspector">
            {selected ? (
              <>
                <div className="studio-dev-selected"><span>{selected.tag}</span><b>{selected.label || "(без текста)"}</b><small>{selected.className || "без класса"}</small></div>
                <label><span>Текст</span><textarea rows={3} disabled={!selected.textEditable} value={selected.textEditable ? selected.label : "Выбери текстовый дочерний элемент"} onChange={(event) => updateText(event.target.value)} /></label>
                <div className="studio-dev-grid">
                  {(["fontSize", "lineHeight", "letterSpacing", "padding", "margin", "borderRadius", "color", "background"] as const).map((key) => (
                    <label key={key}><span>{key}</span><input value={selected.css[key] ?? ""} onChange={(event) => updateStyle(key, event.target.value)} /></label>
                  ))}
                </div>
                <div className="studio-dev-footer"><span>{lastSaved} · browser draft</span><button type="button" onClick={resetSelected}><RotateCcw size={13} /> Сбросить</button></div>
              </>
            ) : (
              <div className="studio-dev-placeholder"><span>INSPECTOR</span><strong>Кликни по блоку</strong><p>В EDIT наведи курсор на любой блок страницы. Меняй текст и CSS справа, результат видно сразу.</p></div>
            )}
          </div>

          <div className="studio-dev-bottom">
            <button type="button" onClick={exportDraft}><Download size={13} /> Экспорт</button>
            <button type="button" onClick={resetPage}><RotateCcw size={13} /> Сбросить страницу</button>
          </div>
        </aside>
      )}
    </>
  );
}
