"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import { CalculatorStudioEditor } from "@/components/studio/calculator-editor";
import { CaseStudioEditor } from "@/components/studio/case-editor";
import { studioPages } from "@/studio/config/pages";
import { defaultCalculatorStudioConfig } from "@/studio/config/calculator";
import {
  STUDIO_CALCULATOR_KEY,
  STUDIO_MODE_KEY,
  clearStudioDrafts,
  mergePageOverride,
  readCalculatorConfig,
  readStudioState,
  setGlobalToken,
  writeStudioState,
} from "@/studio/runtime/storage";
import type { StudioCssOverrides, StudioState } from "@/studio/types";

const STYLE_MAP: Record<keyof StudioCssOverrides, string> = {
  fontSize: "font-size",
  lineHeight: "line-height",
  color: "color",
  background: "background",
  padding: "padding",
  margin: "margin",
  borderRadius: "border-radius",
  width: "width",
  maxWidth: "max-width",
  gap: "gap",
  letterSpacing: "letter-spacing",
  opacity: "opacity",
  display: "display",
};

const TOKEN_NAMES = [
  "--bg",
  "--paper",
  "--ink",
  "--muted",
  "--acid",
  "--line",
  "--acid-soft",
] as const;

type NodeSummary = {
  id: string;
  tag: string;
  label: string;
  className: string;
};

type SelectedElement = {
  id: string;
  tag: string;
  label: string;
  className: string;
  textEditable: boolean;
  css: StudioCssOverrides;
};

type PreviewMode = "select" | "interact";
type Device = "desktop" | "tablet" | "mobile";

const deviceWidths: Record<Device, string> = {
  desktop: "100%",
  tablet: "1024px",
  mobile: "390px",
};

function getFrameDocument(frame: HTMLIFrameElement | null): Document | null {
  return frame?.contentDocument ?? null;
}

function collectFrameNodes(document: Document): NodeSummary[] {
  const elements = [
    document.documentElement,
    document.body,
    ...Array.from(document.body?.querySelectorAll("*") ?? []),
  ];

  return elements
    .filter((element) => {
      const tag = element.tagName.toLowerCase();
      return !["script", "style", "noscript"].includes(tag);
    })
    .map((element, index) => {
      const id = `node-${index}-${element.tagName.toLowerCase()}`;
      element.setAttribute("data-studio-node-id", id);
      const directText = Array.from(element.childNodes)
        .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const label = (directText || element.textContent || element.tagName)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 84);

      return {
        id,
        tag: element.tagName.toLowerCase(),
        label: label || element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className : "",
      };
    });
}

function elementCss(element: Element): StudioCssOverrides {
  const style = window.getComputedStyle(element);
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    color: style.color,
    background: style.backgroundColor,
    padding: style.padding,
    margin: style.margin,
    borderRadius: style.borderRadius,
    width: style.width,
    maxWidth: style.maxWidth,
    gap: style.gap,
    letterSpacing: style.letterSpacing,
    opacity: style.opacity,
    display: style.display,
  };
}

export function StudioPageEditor() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [pagePath, setPagePath] = useState(studioPages[0].path);
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [state, setState] = useState<StudioState>(() => readStudioState());
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("select");
  const [device, setDevice] = useState<Device>("desktop");
  const [activePanel, setActivePanel] = useState<"element" | "calculator" | "design" | "cases">("element");
  const [dirty, setDirty] = useState(false);

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return nodes;
    return nodes.filter((node) =>
      node.label.toLowerCase().includes(query) ||
      node.tag.includes(query) ||
      node.className.toLowerCase().includes(query),
    );
  }, [nodes, search]);

  function persist(next: StudioState) {
    writeStudioState(next);
    setState(next);
    setDirty(true);
  }

  function refreshPreview() {
    frameRef.current?.contentWindow?.location.reload();
  }

  function getSelectedElement(): HTMLElement | null {
    const document = getFrameDocument(frameRef.current);
    if (!document || !selected) return null;
    const element = document.querySelector(
      `[data-studio-node-id="${CSS.escape(selected.id)}"]`,
    );
    return element instanceof HTMLElement ? element : null;
  }

  function selectElement(id: string) {
    const document = getFrameDocument(frameRef.current);
    if (!document) return;

    const element = document.querySelector(
      `[data-studio-node-id="${CSS.escape(id)}"]`,
    );
    if (!(element instanceof HTMLElement)) return;

    const directText = Array.from(element.childNodes)
      .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    setSelected({
      id,
      tag: element.tagName.toLowerCase(),
      label: directText || element.textContent?.replace(/\s+/g, " ").trim().slice(0, 84) || element.tagName.toLowerCase(),
      className: element.className,
      textEditable: element.children.length === 0,
      css: elementCss(element),
    });

    document.querySelectorAll(".studio-frame-selected").forEach((item) => {
      item.classList.remove("studio-frame-selected");
    });
    element.classList.add("studio-frame-selected");
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function installFrame() {
    const document = getFrameDocument(frameRef.current);
    if (!document) return;

    window.sessionStorage.setItem(STUDIO_MODE_KEY, "1");

    const frameStyleId = "malaya-studio-frame-style";
    document.getElementById(frameStyleId)?.remove();
    const style = document.createElement("style");
    style.id = frameStyleId;
    style.textContent = `
      [data-studio-node-id] { transition: outline-color .12s ease, box-shadow .12s ease; }
      [data-studio-node-id]:hover { outline: 1px dashed rgba(217,255,82,.85) !important; outline-offset: 2px; cursor: crosshair !important; }
      [data-studio-node-id].studio-frame-selected { outline: 2px solid #d9ff52 !important; outline-offset: 3px; box-shadow: 0 0 0 4px rgba(217,255,82,.14) !important; }
    `;
    document.head.appendChild(style);

    const frameNodes = collectFrameNodes(document);
    setNodes(frameNodes);

    const savedPage = state.pages[pagePath] ?? {};
    for (const [nodeId, override] of Object.entries(savedPage)) {
      const element = document.querySelector(
        `[data-studio-node-id="${CSS.escape(nodeId)}"]`,
      );
      if (!(element instanceof HTMLElement)) continue;
      if (override.text !== undefined && element.children.length === 0) {
        element.textContent = override.text;
      }
      for (const [property, value] of Object.entries(override.css ?? {})) {
        const cssName = STYLE_MAP[property as keyof StudioCssOverrides];
        if (cssName && value !== undefined) element.style.setProperty(cssName, value);
      }
    }

    for (const [name, value] of Object.entries(state.globalTokens)) {
      if (value) document.documentElement.style.setProperty(name, value);
    }

    const clickHandler = (event: MouseEvent) => {
      if (previewMode !== "select") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest("[data-studio-node-id]");
      if (!(element instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(element.dataset.studioNodeId ?? "");
    };

    document.addEventListener("click", clickHandler, true);

    window.setTimeout(() => {
      if (selected?.id) selectElement(selected.id);
    }, 50);
  }

  useEffect(() => {
    window.sessionStorage.setItem(STUDIO_MODE_KEY, "1");

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "studio-ready") installFrame();
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  });

  useEffect(() => {
    refreshPreview();
    setSelected(null);
    setNodes([]);
  }, [pagePath]);

  useEffect(() => {
    refreshPreview();
  }, [previewMode]);

  function updateText(value: string) {
    if (!selected?.textEditable) return;
    const element = getSelectedElement();
    if (!element) return;
    element.textContent = value;

    const next = mergePageOverride(state, pagePath, selected.id, { text: value });
    persist(next);
    setSelected((current) => current ? { ...current, label: value, css: elementCss(element) } : current);
    setNodes(collectFrameNodes(getFrameDocument(frameRef.current)!));
  }

  function updateStyle(property: keyof StudioCssOverrides, value: string) {
    const element = getSelectedElement();
    if (!element) return;
    const cssName = STYLE_MAP[property];
    element.style.setProperty(cssName, value);

    const next = mergePageOverride(state, pagePath, selected?.id ?? "", {
      css: { [property]: value },
    });
    persist(next);
    setSelected((current) =>
      current ? { ...current, css: { ...current.css, [property]: value } } : current,
    );
  }

  function resetSelected() {
    if (!selected) return;
    const document = getFrameDocument(frameRef.current);
    const element = getSelectedElement();
    if (!document || !element) return;

    const nextState = readStudioState();
    const page = { ...(nextState.pages[pagePath] ?? {}) };
    delete page[selected.id];
    const next = { ...nextState, pages: { ...nextState.pages, [pagePath]: page } };
    writeStudioState(next);
    setState(next);
    setDirty(true);
    refreshPreview();
    setSelected(null);
  }

  function resetPage() {
    const nextState = readStudioState();
    const pages = { ...nextState.pages };
    delete pages[pagePath];
    const next = { ...nextState, pages };
    writeStudioState(next);
    setState(next);
    setDirty(true);
    refreshPreview();
    setSelected(null);
  }

  function updateToken(name: keyof StudioState["globalTokens"], value: string) {
    const next = setGlobalToken(state, name, value);
    persist(next);
    const document = getFrameDocument(frameRef.current);
    document?.documentElement.style.setProperty(name, value);
  }

  function resetAll() {
    clearStudioDrafts();
    setState({ pages: {}, globalTokens: {} });
    setDirty(false);
    setSelected(null);
    refreshPreview();
  }

  function exportDraft() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pages: state.pages,
      globalTokens: state.globalTokens,
      calculator: readCalculatorConfig() ?? defaultCalculatorStudioConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "malaya-studio-draft.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="studio-app">
      <header className="studio-topbar">
        <div className="studio-brand">
          <span className="studio-brand-mark">G</span>
          <div>
            <b>MALAYA STUDIO</b>
            <span>visual page editor</span>
          </div>
        </div>

        <div className="studio-page-picker">
          <span>PAGE</span>
          <select value={pagePath} onChange={(event) => setPagePath(event.target.value)}>
            {studioPages.map((page) => (
              <option value={page.path} key={page.path}>{page.label} · {page.path}</option>
            ))}
          </select>
        </div>

        <div className="studio-top-actions">
          <span className={dirty ? "studio-status dirty" : "studio-status"}>{dirty ? "DRAFT" : "SAVED"}</span>
          <button type="button" className="studio-button studio-button-ghost" onClick={exportDraft}>
            <Download size={15} /> JSON
          </button>
          <a className="studio-button studio-button-acid" href={pagePath} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Открыть
          </a>
        </div>
      </header>

      <div className="studio-toolbar">
        <div className="studio-tabs">
          <button className={activePanel === "element" ? "active" : ""} onClick={() => setActivePanel("element")}>Элементы</button>
          <button className={activePanel === "design" ? "active" : ""} onClick={() => setActivePanel("design")}>Дизайн</button>
          {pagePath === "/cases" && (\n            <button className={activePanel === "cases" ? "active" : ""} onClick={() => setActivePanel("cases")}>Кейсы</button>\n          )}\n          {pagePath === "/calculator" && (
            <button className={activePanel === "calculator" ? "active" : ""} onClick={() => setActivePanel("calculator")}>Калькулятор</button>
          )}
        </div>

        <div className="studio-mode-switch">
          <button className={previewMode === "select" ? "active" : ""} onClick={() => setPreviewMode("select")}>SELECT</button>
          <button className={previewMode === "interact" ? "active" : ""} onClick={() => setPreviewMode("interact")}>INTERACT</button>
        </div>

        <div className="studio-device-switch">
          <button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} aria-label="Desktop"><Monitor size={15} /></button>
          <button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet"><Tablet size={15} /></button>
          <button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} aria-label="Mobile"><Smartphone size={15} /></button>
        </div>
      </div>

      <div className="studio-workspace">
        <aside className="studio-sidebar">
          {activePanel === "element" && (
            <>
              <div className="studio-panel-head">
                <div>
                  <span className="studio-kicker">DOM / TREE</span>
                  <h1>Элементы</h1>
                </div>
                <span>{nodes.length}</span>
              </div>
              <input
                className="studio-search"
                placeholder="Поиск элемента или класса"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="studio-node-list">
                {filteredNodes.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    className={selected?.id === node.id ? "studio-node active" : "studio-node"}
                    onClick={() => selectElement(node.id)}
                  >
                    <span>{node.tag}</span>
                    <strong>{node.label || "(без текста)"}</strong>
                    {node.className && <small>.{node.className.split(" ")[0]}</small>}
                  </button>
                ))}
              </div>
            </>
          )}

          {activePanel === "design" && (
            <div className="studio-panel-scroll">
              <div className="studio-panel-head">
                <div>
                  <span className="studio-kicker">SYSTEM / TOKENS</span>
                  <h1>Дизайн</h1>
                </div>
              </div>
              <p className="studio-help">Глобальные токены влияют на preview страницы и сохраняются в черновик.</p>
              <div className="studio-token-grid">
                {TOKEN_NAMES.map((name) => (
                  <label key={name}>
                    <span>{name}</span>
                    <input
                      value={state.globalTokens[name] ?? ""}
                      placeholder="auto / #..."
                      onChange={(event) => updateToken(name, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="studio-danger-zone">
                <button type="button" className="studio-danger" onClick={resetPage}><Trash2 size={15} /> Сбросить страницу</button>
                <button type="button" className="studio-danger" onClick={resetAll}><Undo2 size={15} /> Очистить весь Studio</button>
              </div>
            </div>
          )}

          {activePanel === "cases" && (\n            <div className="studio-panel-scroll studio-panel-wide"><CaseStudioEditor onChanged={refreshPreview} /></div>\n          )}\n\n          {activePanel === "calculator" && (
            <div className="studio-panel-scroll studio-panel-wide">
              <CalculatorStudioEditor onChanged={refreshPreview} />
              <div className="studio-note">
                <b>Studio-only</b>
                <span>{STUDIO_CALCULATOR_KEY}</span>
              </div>
            </div>
          )}
        </aside>

        <section className="studio-preview-stage">
          <div className="studio-preview-meta">
            <span>{pagePath}</span>
            <span>{previewMode === "select" ? "Клик по элементу открывает инспектор" : "Функции страницы доступны"}</span>
          </div>
          <div className={`studio-preview-canvas device-${device}`}>
            <iframe
              ref={frameRef}
              src={pagePath}
              title="Malaya Studio preview"
              onLoad={installFrame}
            />
          </div>
        </section>

        <aside className="studio-inspector">
          {selected ? (
            <>
              <div className="studio-panel-head">
                <div>
                  <span className="studio-kicker">INSPECTOR</span>
                  <h1>&lt;{selected.tag}&gt;</h1>
                </div>
                <button type="button" className="studio-icon-button" onClick={resetSelected} aria-label="Сбросить элемент">×</button>
              </div>

              <div className="studio-selected-chip">
                <b>{selected.id}</b>
                <span>{selected.className || "без класса"}</span>
              </div>

              <div className="studio-inspector-section">
                <h2>Контент</h2>
                <label className={selected.textEditable ? "" : "disabled"}>
                  <span>Текст</span>
                  <textarea
                    rows={4}
                    disabled={!selected.textEditable}
                    value={selected.textEditable ? selected.label : "Элемент содержит вложенные узлы. Выбери текстовый дочерний элемент."}
                    onChange={(event) => updateText(event.target.value)}
                  />
                </label>
              </div>

              <div className="studio-inspector-section">
                <h2>Размер и типографика</h2>
                {(["fontSize", "lineHeight", "letterSpacing", "width", "maxWidth"] as const).map((key) => (
                  <InspectorField
                    key={key}
                    label={key}
                    value={selected.css[key] ?? ""}
                    onChange={(value) => updateStyle(key, value)}
                  />
                ))}
              </div>

              <div className="studio-inspector-section">
                <h2>Цвет и фон</h2>
                <InspectorField label="color" value={selected.css.color ?? ""} onChange={(value) => updateStyle("color", value)} />
                <InspectorField label="background" value={selected.css.background ?? ""} onChange={(value) => updateStyle("background", value)} />
                <InspectorField label="opacity" value={selected.css.opacity ?? ""} onChange={(value) => updateStyle("opacity", value)} />
              </div>

              <div className="studio-inspector-section">
                <h2>Layout</h2>
                {(["padding", "margin", "gap", "borderRadius", "display"] as const).map((key) => (
                  <InspectorField
                    key={key}
                    label={key}
                    value={selected.css[key] ?? ""}
                    onChange={(value) => updateStyle(key, value)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="studio-empty-inspector">
              <span className="studio-kicker">NO SELECTION</span>
              <h2>Выбери любой элемент</h2>
              <p>Кликни по блоку в preview или выбери его из DOM-дерева слева. Затем здесь можно менять контент и CSS.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function InspectorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="studio-inspector-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
