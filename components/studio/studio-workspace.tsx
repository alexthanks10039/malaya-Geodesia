"use client";

import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FilePlus2,
  Grid3X3,
  Laptop,
  Layers3,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalculatorStudioEditor } from "@/components/studio/calculator-editor";
import { StudioLogout } from "@/components/studio/studio-logout";
import { CaseStudioEditor } from "@/components/studio/case-editor";
import { defaultCalculatorStudioConfig } from "@/studio/config/calculator";
import { studioPages } from "@/studio/config/pages";
import {
  STUDIO_CALCULATOR_KEY,
  clearStudioDrafts,
  readCalculatorConfig,
  readStudioState,
  writeStudioState,
} from "@/studio/runtime/storage";
import type {
  StudioComment,
  StudioCssOverrides,
  StudioElementOverride,
  StudioInsertedBlock,
  StudioState,
  StudioResponsiveDevice,
} from "@/studio/types";

const STYLE_MAP: Record<keyof StudioCssOverrides, string> = {
  fontSize: "font-size",
  lineHeight: "line-height",
  fontWeight: "font-weight",
  letterSpacing: "letter-spacing",
  textAlign: "text-align",
  color: "color",
  background: "background",
  border: "border",
  borderRadius: "border-radius",
  boxShadow: "box-shadow",
  padding: "padding",
  margin: "margin",
  width: "width",
  maxWidth: "max-width",
  height: "height",
  gap: "gap",
  display: "display",
  opacity: "opacity",
  position: "position",
  zIndex: "z-index",
  transform: "transform",
  transition: "transition",
  customCss: "",
};

const STYLE_LABELS: Record<keyof StudioCssOverrides, string> = {
  fontSize: "Размер",
  lineHeight: "Интерлиньяж",
  fontWeight: "Насыщенность",
  letterSpacing: "Трекинг",
  textAlign: "Выравнивание",
  color: "Цвет текста",
  background: "Фон",
  border: "Рамка",
  borderRadius: "Скругление",
  boxShadow: "Тень",
  padding: "Внутренний отступ",
  margin: "Внешний отступ",
  width: "Ширина",
  maxWidth: "Макс. ширина",
  height: "Высота",
  gap: "Расстояние",
  display: "Display",
  opacity: "Прозрачность",
  position: "Position",
  zIndex: "Z-index",
  transform: "Transform",
  transition: "Transition",
  customCss: "Custom CSS",
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

type Device = "desktop" | "tablet" | "mobile";
type MainTab = "layers" | "design" | "data" | "review";
type PreviewMode = "select" | "interact";
type Section = "content" | "typography" | "layout" | "appearance" | "advanced";

type NodeSummary = {
  id: string;
  tag: string;
  label: string;
  className: string;
  depth: number;
  children: NodeSummary[];
  inserted: boolean;
};

type SelectedElement = NodeSummary & {
  textEditable: boolean;
  css: StudioCssOverrides;
  attributes: {
    href: string;
    alt: string;
    title: string;
  };
};

type VersionSnapshot = {
  id: string;
  label: string;
  createdAt: string;
  state: StudioState;
};

const DEVICE_WIDTH: Record<Device, number | "fluid"> = {
  desktop: "fluid",
  tablet: 1024,
  mobile: 390,
};

const DEVICE_LABEL: Record<Device, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const SECTION_NAMES: Record<Section, string> = {
  content: "Контент",
  typography: "Типографика",
  layout: "Layout",
  appearance: "Внешний вид",
  advanced: "Advanced",
};

const SKIP_TAGS = new Set(["html", "head", "script", "style", "noscript", "svg", "path", "option", "link"]);
const LEAF_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button", "img", "video", "label", "li"]);

function emptyState(): StudioState {
  return { version: 2, pages: {}, globalTokens: {}, comments: [] };
}

function directText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function elementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    const parent: Element | null = current.parentElement;
    if (parent === null) break;
    const currentTag = current.tagName;
    const sameTag: Element[] = (Array.from(parent.children) as Element[]).filter((child: Element) => child.tagName === currentTag);
    const index = Math.max(0, sameTag.indexOf(current));
    parts.unshift(current.tagName.toLowerCase() + ":nth-of-type(" + (index + 1) + ")");
    current = parent;
  }
  return "studio:" + parts.join(">");
}

function frameElementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== current.ownerDocument.body) {
    const parent: Element | null = current.parentElement;
    if (parent === null) break;
    const currentTag = current.tagName;
    const sameTag: Element[] = (Array.from(parent.children) as Element[]).filter((child: Element) => child.tagName === currentTag);
    parts.unshift(current.tagName.toLowerCase() + ":nth-of-type(" + (Math.max(0, sameTag.indexOf(current)) + 1) + ")");
    current = parent;
  }
  return "studio:" + parts.join(">");
}

function nodeLabel(element: Element): string {
  const text =
    directText(element) ||
    element.getAttribute("aria-label") ||
    element.getAttribute("alt") ||
    element.getAttribute("title") ||
    element.tagName.toLowerCase();
  return text.replace(/\s+/g, " ").trim().slice(0, 96);
}

function collectTree(doc: Document): NodeSummary[] {
  const walk = (element: Element, depth: number): NodeSummary[] => {
    const tag = element.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag) || element.closest("[data-studio-dev-ui]")) {
      return [];
    }

    const id = element.getAttribute("data-studio-node-id") || frameElementPath(element);
    element.setAttribute("data-studio-node-id", id);

    const children = Array.from(element.children).flatMap((child) => walk(child, depth + 1));
    const useful = Boolean(
      directText(element) ||
      element.getAttribute("aria-label") ||
      element.getAttribute("alt") ||
      element.getAttribute("title") ||
      LEAF_TAGS.has(tag) ||
      children.length,
    );

    if (!useful) {
      return children;
    }

    return [
      {
        id,
        tag,
        label: nodeLabel(element),
        className: typeof element.className === "string" ? element.className : "",
        depth,
        children,
        inserted: element.hasAttribute("data-studio-inserted"),
      },
    ];
  };

  return Array.from(doc.body?.children ?? []).flatMap((child) => walk(child, 0));
}

function flatten(nodes: NodeSummary[]): NodeSummary[] {
  const output: NodeSummary[] = [];
  const visit = (items: NodeSummary[]) => {
    items.forEach((item) => {
      output.push(item);
      visit(item.children);
    });
  };
  visit(nodes);
  return output;
}

function readCss(element: Element): StudioCssOverrides {
  const style = window.getComputedStyle(element);
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlign,
    color: style.color,
    background: style.backgroundColor,
    border: style.border,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    padding: style.padding,
    margin: style.margin,
    width: style.width,
    maxWidth: style.maxWidth,
    height: style.height,
    gap: style.gap,
    display: style.display,
    opacity: style.opacity,
    position: style.position,
    zIndex: style.zIndex,
    transform: style.transform === "none" ? "" : style.transform,
    transition: style.transition,
  };
}

function applyCss(element: HTMLElement, css?: StudioCssOverrides): void {
  if (!css) return;

  for (const [property, value] of Object.entries(css)) {
    if (!value) continue;
    const cssName = STYLE_MAP[property as keyof StudioCssOverrides];
    if (cssName) {
      element.style.setProperty(cssName, value);
    }
  }

  if (css.customCss) {
    element.style.cssText += ";" + css.customCss;
  }
}

function findElement(doc: Document | null, id: string): HTMLElement | null {
  if (!doc || !id) return null;
  const element = doc.querySelector('[data-studio-node-id="' + CSS.escape(id) + '"]');
  return element instanceof HTMLElement ? element : null;
}

function stableInsertedId(seed: string): string {
  return "studio:inserted:" + seed;
}

function createInsertedElement(doc: Document, block: StudioInsertedBlock, id: string): HTMLElement | null {
  let element: HTMLElement;

  if (block.kind === "button") {
    const anchor = doc.createElement("a");
    anchor.href = block.href || "#";
    anchor.textContent = block.text || "Новая кнопка";
    anchor.className = "button button-dark";
    element = anchor;
  } else if (block.kind === "divider") {
    element = doc.createElement("div");
    element.setAttribute("aria-label", "Разделитель");
  } else if (block.kind === "container") {
    element = doc.createElement("div");
    element.textContent = block.text || "Новый контейнер";
  } else {
    element = doc.createElement("p");
    element.textContent = block.text || "Новый текст";
  }

  element.setAttribute("data-studio-node-id", id);
  element.setAttribute("data-studio-inserted", "true");

  if (block.kind === "divider") {
    element.style.minHeight = "1px";
    element.style.width = "100%";
    element.style.background = "currentColor";
    element.style.opacity = ".18";
  }

  applyCss(element, block.css);
  return element;
}

function insertRuntimeBlocks(doc: Document, page: StudioState["pages"][string], device: StudioResponsiveDevice): void {
  for (const [id, override] of Object.entries(page || {})) {
    if (!override.inserted) continue;
    const block = override.inserted;
    const parent = findElement(doc, block.parentId);
    if (!parent) continue;
    if (findElement(doc, id)) continue;
    const element = createInsertedElement(doc, block, id);
    if (element) {
      const responsive = override.responsiveCss?.[device];
      if (responsive) applyCss(element, responsive);
      parent.appendChild(element);
    }
  }
}

function applyPageState(doc: Document, state: StudioState, path: string, device: StudioResponsiveDevice): void {
  const page = state.pages[path] ?? {};

  for (const [id, override] of Object.entries(page)) {
    const element = findElement(doc, id);
    if (!element || override.inserted) continue;

    if (override.text !== undefined && element.children.length === 0) {
      element.textContent = override.text;
    }

    applyCss(element, override.css);
    if (device !== "desktop") applyCss(element, override.responsiveCss?.[device]);

    if (override.hidden) {
      element.style.setProperty("display", "none");
    }

    if (override.attributes?.href !== undefined && "href" in element) {
      element.setAttribute("href", override.attributes.href);
    }
    if (override.attributes?.alt !== undefined) {
      element.setAttribute("alt", override.attributes.alt);
    }
    if (override.attributes?.title !== undefined) {
      element.setAttribute("title", override.attributes.title);
    }
  }

  insertRuntimeBlocks(doc, page, device);
}

function filterTree(nodes: NodeSummary[], query: string): NodeSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return nodes;

  return nodes.flatMap((node) => {
    const children = filterTree(node.children, normalized);
    const selfMatches =
      node.label.toLowerCase().includes(normalized) ||
      node.tag.includes(normalized) ||
      node.className.toLowerCase().includes(normalized);
    if (!selfMatches && !children.length) return [];
    return [{ ...node, children }];
  });
}

function selectedAttributes(element: HTMLElement): SelectedElement["attributes"] {
  return {
    href: element.getAttribute("href") ?? "",
    alt: element.getAttribute("alt") ?? "",
    title: element.getAttribute("title") ?? "",
  };
}

function normalizeImportedState(value: unknown): StudioState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<StudioState>;
  if (!raw.pages || typeof raw.pages !== "object") return null;
  return {
    version: 2,
    pages: raw.pages as StudioState["pages"],
    globalTokens: raw.globalTokens && typeof raw.globalTokens === "object" ? raw.globalTokens : {},
    comments: Array.isArray(raw.comments) ? raw.comments as StudioComment[] : [],
  };
}

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "--:--";
  }
}

function sameState(a: StudioState, b: StudioState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function StudioWorkspace() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<StudioState[]>([]);
  const redoRef = useRef<StudioState[]>([]);
  const liveEditRef = useRef<string | null>(null);

  const [pagePath, setPagePath] = useState("/");
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [state, setState] = useState<StudioState>(() => readStudioState());
  const [initialState] = useState<StudioState>(() => readStudioState());
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("select");
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("layers");
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    content: true,
    typography: true,
    layout: true,
    appearance: false,
    advanced: false,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [textDraft, setTextDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [toast, setToast] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"none" | "left" | "right">("none");

  const flatNodes = useMemo(() => flatten(nodes), [nodes]);
  const filteredTree = useMemo(() => filterTree(nodes, search), [nodes, search]);
  const activeOverride = selected ? state.pages[pagePath]?.[selected.id] : undefined;
  const activeResponsiveCss = selected && device !== "desktop" ? activeOverride?.responsiveCss?.[device] : undefined;
  const styleForDevice = (property: keyof StudioCssOverrides) =>
    device === "desktop"
      ? selected?.css[property]
      : activeResponsiveCss?.[property] ?? selected?.css[property];
  const pageInfo = studioPages.find((page) => page.path === pagePath) ?? studioPages[0];
  const selectedIndex = selected ? flatNodes.findIndex((node) => node.id === selected.id) : -1;
  const selectedPosition = selectedIndex >= 0 ? selectedIndex + 1 : 0;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1500);
  }, []);

  const writeState = useCallback((next: StudioState) => {
    writeStudioState(next);
    setState(next);
  }, []);

  const commit = useCallback(
    (next: StudioState, history = true) => {
      if (sameState(next, state)) return;
      if (history) {
        undoRef.current.push(state);
        if (undoRef.current.length > 50) undoRef.current.shift();
        redoRef.current = [];
      }
      writeState(next);
    },
    [state, writeState],
  );

  const liveCommit = useCallback(
    (next: StudioState, editKey: string) => {
      if (liveEditRef.current !== editKey) {
        undoRef.current.push(state);
        if (undoRef.current.length > 50) undoRef.current.shift();
        redoRef.current = [];
        liveEditRef.current = editKey;
      }
      writeState(next);
    },
    [state, writeState],
  );

  const finishLiveEdit = useCallback(() => {
    liveEditRef.current = null;
  }, []);

  const refreshFrame = useCallback(() => {
    frameRef.current?.contentWindow?.location.reload();
    setSelected(null);
    setNodes([]);
  }, []);

  const selectInFrame = useCallback(
    (id: string) => {
      const doc = frameRef.current?.contentDocument ?? null;
      const element = findElement(doc, id);
      if (!element) return;

      doc?.querySelectorAll(".studio-frame-selected").forEach((item) => item.classList.remove("studio-frame-selected"));
      element.classList.add("studio-frame-selected");

      const nextSelected: SelectedElement = {
        id,
        tag: element.tagName.toLowerCase(),
        label: nodeLabel(element),
        className: typeof element.className === "string" ? element.className : "",
        depth: 0,
        children: [],
        inserted: element.hasAttribute("data-studio-inserted"),
        textEditable: element.hasAttribute("data-studio-inserted") || element.children.length === 0,
        css: readCss(element),
        attributes: selectedAttributes(element),
      };

      setSelected(nextSelected);
      setTextDraft(nextSelected.textEditable ? directText(element) : "");
      if (window.innerWidth <= 700) setMobilePanel("right");
      window.requestAnimationFrame(() => element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }));
    },
    [],
  );

  const installFrame = useCallback(() => {
    const doc = frameRef.current?.contentDocument ?? null;
    if (!doc?.body) return;

    doc.querySelector("#malaya-studio-frame-style")?.remove();
    const style = doc.createElement("style");
    style.id = "malaya-studio-frame-style";
    style.textContent = [
      "[data-studio-node-id]{transition:outline-color .12s ease,box-shadow .12s ease,opacity .12s ease}",
      previewMode === "select"
        ? "[data-studio-node-id]:hover{outline:1px dashed rgba(217,255,82,.92)!important;outline-offset:2px;cursor:crosshair!important}"
        : "[data-studio-node-id]:hover{cursor:default!important}",
      "[data-studio-node-id].studio-frame-selected{outline:2px solid #d9ff52!important;outline-offset:3px;box-shadow:0 0 0 4px rgba(217,255,82,.16)!important}",
      "[data-studio-inserted]{outline-offset:2px}",
    ].join("");

    doc.documentElement.style.cssText += "";
    for (const [name, value] of Object.entries(state.globalTokens)) {
      if (value) doc.documentElement.style.setProperty(name, value);
    }

    const page = state.pages[pagePath] ?? {};
    const beforeNodes = collectTree(doc);
    applyPageState(doc, state, pagePath, device);
    const nextNodes = collectTree(doc);
    setNodes(nextNodes);

    if (selected?.id) {
      const selectedNow = findElement(doc, selected.id);
      if (selectedNow) {
        selectedNow.classList.add("studio-frame-selected");
        setSelected((current) =>
          current
            ? {
                ...current,
                label: nodeLabel(selectedNow),
                css: readCss(selectedNow),
                attributes: selectedAttributes(selectedNow),
              }
            : current,
        );
      }
    }

    if (!beforeNodes.length && !page) {
      setNodes(nextNodes);
    }

    const clickHandler = (event: MouseEvent) => {
      if (previewMode !== "select") return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-studio-dev-ui]")) return;
      const element = target.closest("[data-studio-node-id]");
      if (!(element instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      selectInFrame(element.getAttribute("data-studio-node-id") ?? "");
    };

    doc.addEventListener("click", clickHandler, true);

    const interactClickHandler = (event: MouseEvent) => {
      if (previewMode !== "interact") return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-studio-dev-ui]")) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      try {
        const url = new URL(href, doc.location.href);
        if (url.origin !== doc.location.origin) return;
        url.searchParams.set("studioPreview", "1");
        event.preventDefault();
        event.stopPropagation();
        doc.defaultView?.location.assign(url.toString());
      } catch {
        // Leave non-standard links to the browser.
      }
    };

    doc.addEventListener("click", interactClickHandler, true);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        if (frameRef.current?.contentDocument === doc) {
          const latest = collectTree(doc);
          setNodes(latest);
        }
      });
    });
    observer.observe(doc.body, { childList: true, subtree: true, attributes: false });

    return () => {
      doc.removeEventListener("click", clickHandler, true);
      doc.removeEventListener("click", interactClickHandler, true);
      observer.disconnect();
    };
  }, [pagePath, previewMode, selectInFrame, selected, state]);

  useEffect(() => {
    window.sessionStorage.setItem("malaya-studio-mode", "1");
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem("malaya-studio-versions");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as VersionSnapshot[];
      if (Array.isArray(parsed)) setVersions(parsed.slice(0, 12));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => refreshFrame();
    window.addEventListener("malaya-studio-refresh-preview", handler);
    return () => window.removeEventListener("malaya-studio-refresh-preview", handler);
  }, [refreshFrame]);

  useEffect(() => {
    refreshFrame();
  }, [pagePath]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          const next = redoRef.current.pop();
          if (!next) return;
          undoRef.current.push(state);
          writeState(next);
          notify("Redo");
        } else {
          const previous = undoRef.current.pop();
          if (!previous) return;
          redoRef.current.push(state);
          writeState(previous);
          notify("Undo");
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveVersion(versionLabel || "Quick save");
        return;
      }

      if (event.key === "Escape" && !isTyping) {
        setMobilePanel("none");
        setSelected(null);
        frameRef.current?.contentDocument?.querySelectorAll(".studio-frame-selected").forEach((item) => item.classList.remove("studio-frame-selected"));
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        document.getElementById("studio-workspace-search")?.focus();
      }
    };

    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [notify, state, versionLabel, writeState]);

  function setOverride(id: string, updater: (current: StudioElementOverride) => StudioElementOverride, editKey?: string) {
    const page = state.pages[pagePath] ?? {};
    const current = page[id] ?? {};
    const next = {
      ...state,
      pages: {
        ...state.pages,
        [pagePath]: {
          ...page,
          [id]: updater(current),
        },
      },
    };
    if (editKey) liveCommit(next, editKey);
    else commit(next);
  }

  function updateText(value: string) {
    if (!selected?.textEditable) return;
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (!element) return;
    element.textContent = value;
    setTextDraft(value);
    setOverride(selected.id, (current) => ({ ...current, text: value }), "text:" + selected.id);
    setSelected((current) => current ? { ...current, label: value, css: readCss(element) } : current);
  }

  function updateStyle(property: keyof StudioCssOverrides, value: string) {
    if (!selected) return;
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (!element) return;
    const cssName = STYLE_MAP[property];
    if (!cssName) return;
    element.style.setProperty(cssName, value);
    setOverride(
      selected.id,
      (current) => ({
        ...current,
        ...(device === "desktop"
          ? { css: { ...(current.css ?? {}), [property]: value } }
          : {
              responsiveCss: {
                ...(current.responsiveCss ?? {}),
                [device]: {
                  ...(current.responsiveCss?.[device] ?? {}),
                  [property]: value,
                },
              },
            }),
      }),
      "css:" + device + ":" + selected.id + ":" + property,
    );
    setSelected((current) => current ? { ...current, css: { ...current.css, [property]: value } } : current);
  }

  function updateAttribute(name: "href" | "alt" | "title", value: string) {
    if (!selected) return;
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (!element) return;
    if (value) element.setAttribute(name, value);
    else element.removeAttribute(name);
    setOverride(selected.id, (current) => ({
      ...current,
      attributes: { ...(current.attributes ?? {}), [name]: value },
    }));
    setSelected((current) => current ? { ...current, attributes: { ...current.attributes, [name]: value } } : current);
  }

  function toggleHidden() {
    if (!selected) return;
    const hidden = !(activeOverride?.hidden ?? false);
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (element) element.style.setProperty("display", hidden ? "none" : "");
    setOverride(selected.id, (current) => ({ ...current, hidden }));
  }

  function resetSelected() {
    if (!selected) return;
    const page = { ...(state.pages[pagePath] ?? {}) };
    delete page[selected.id];
    const next = { ...state, pages: { ...state.pages, [pagePath]: page } };
    commit(next);
    setSelected(null);
    refreshFrame();
    notify("Элемент сброшен");
  }

  function resetPage() {
    if (!window.confirm("Сбросить все изменения этой страницы?")) return;
    const pages = { ...state.pages };
    delete pages[pagePath];
    commit({ ...state, pages });
    setSelected(null);
    refreshFrame();
    notify("Страница сброшена");
  }

  function resetAll() {
    if (!window.confirm("Очистить весь Studio draft?")) return;
    clearStudioDrafts();
    const next = emptyState();
    undoRef.current = [];
    redoRef.current = [];
    writeState(next);
    setSelected(null);
    refreshFrame();
    notify("Studio очищен");
  }

  function copySelector() {
    if (!selected) return;
    navigator.clipboard?.writeText(selected.id).then(() => notify("ID скопирован")).catch(() => undefined);
  }

  function saveVersion(label: string) {
    const snapshot: VersionSnapshot = {
      id: crypto.randomUUID(),
      label: label.trim() || "Snapshot",
      createdAt: new Date().toISOString(),
      state,
    };
    const next = [snapshot, ...versions].slice(0, 12);
    setVersions(next);
    window.localStorage.setItem("malaya-studio-versions", JSON.stringify(next));
    setVersionLabel("");
    notify("Версия сохранена");
  }

  function restoreVersion(snapshot: VersionSnapshot) {
    undoRef.current.push(state);
    redoRef.current = [];
    writeState(snapshot.state);
    refreshFrame();
    notify("Версия восстановлена");
  }

  function deleteVersion(id: string) {
    const next = versions.filter((item) => item.id !== id);
    setVersions(next);
    window.localStorage.setItem("malaya-studio-versions", JSON.stringify(next));
  }

  function exportDraft() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      pages: state.pages,
      globalTokens: state.globalTokens,
      comments: state.comments ?? [],
      calculator: readCalculatorConfig() ?? defaultCalculatorStudioConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "malaya-studio-draft.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("JSON экспортирован");
  }

  function importDraft(file: File) {
    file.text()
      .then((text) => JSON.parse(text) as unknown)
      .then((parsed) => {
        const imported = normalizeImportedState(parsed);
        if (!imported) {
          notify("Не удалось прочитать draft");
          return;
        }
        undoRef.current.push(state);
        redoRef.current = [];
        writeState(imported);
        refreshFrame();
        notify("Draft импортирован");
      })
      .catch(() => notify("Некорректный JSON"));
  }

  function addBlock(kind: StudioInsertedBlock["kind"]) {
    const current = selected ? findElement(frameRef.current?.contentDocument ?? null, selected.id) : null;
    if (!current) {
      notify("Сначала выбери контейнер");
      return;
    }

    const parentId =
      current.tagName.match(/^H[1-6]$/) || ["P", "SPAN", "A", "BUTTON"].includes(current.tagName)
        ? current.parentElement?.getAttribute("data-studio-node-id")
        : selected?.id;

    if (!parentId) {
      notify("Не найден контейнер");
      return;
    }

    const id = stableInsertedId(crypto.randomUUID());
    const block: StudioInsertedBlock = {
      parentId,
      kind,
      text: kind === "button" ? "Новая кнопка" : kind === "divider" ? "" : kind === "container" ? "Новый контейнер" : "Новый текст",
      href: kind === "button" ? "/calculator" : undefined,
    };

    const next = {
      ...state,
      pages: {
        ...state.pages,
        [pagePath]: {
          ...(state.pages[pagePath] ?? {}),
          [id]: { inserted: block },
        },
      },
    };
    commit(next);
    window.setTimeout(refreshFrame, 0);
    notify("Блок добавлен");
  }

  function removeSelected() {
    if (!selected) return;

    if (selected.inserted) {
      const page = { ...(state.pages[pagePath] ?? {}) };
      delete page[selected.id];
      commit({ ...state, pages: { ...state.pages, [pagePath]: page } });
      refreshFrame();
      notify("Блок удалён");
      return;
    }

    toggleHidden();
    notify("Элемент скрыт. Вернуть можно через Reset.");
  }

  function addComment() {
    if (!selected || !commentDraft.trim()) return;
    const comment: StudioComment = {
      id: crypto.randomUUID(),
      pagePath,
      nodeId: selected.id,
      nodeLabel: selected.label,
      text: commentDraft.trim(),
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    commit({ ...state, comments: [comment, ...(state.comments ?? [])] });
    setCommentDraft("");
    notify("Комментарий добавлен");
  }

  function toggleComment(id: string) {
    const comments = (state.comments ?? []).map((comment) =>
      comment.id === id ? { ...comment, resolved: !comment.resolved } : comment,
    );
    commit({ ...state, comments });
  }

  function updateToken(name: (typeof TOKEN_NAMES)[number], value: string, edit = false) {
    const next = {
      ...state,
      globalTokens: {
        ...state.globalTokens,
        [name]: value,
      },
    };
    if (edit) liveCommit(next, "token:" + name);
    else commit(next);
    frameRef.current?.contentDocument?.documentElement.style.setProperty(name, value);
  }

  function toggleSection(section: Section) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  const changedCount = flatNodes.filter((node) => Boolean(state.pages[pagePath]?.[node.id])).length;
  const pageComments = (state.comments ?? []).filter((comment) => comment.pagePath === pagePath);
  const previewWidth = DEVICE_WIDTH[device];
  const canvasStyle =
    previewWidth === "fluid"
      ? { width: "100%", zoom: zoom / 100 }
      : {
          width: previewWidth + "px",
          zoom: zoom / 100,
        };

  const renderTree = (items: NodeSummary[]) =>
    items.map((node) => {
      const isOpen = search.trim() ? true : expanded[node.id] ?? node.depth < 1;
      return (
        <div key={node.id} className="studio-v2-layer">
          <div className={selected?.id === node.id ? "studio-v2-layer-row active" : "studio-v2-layer-row"}>
            <button
              type="button"
              className="studio-v2-layer-chevron"
              onClick={() => setExpanded((current) => ({ ...current, [node.id]: !isOpen }))}
              disabled={!node.children.length}
              aria-label={isOpen ? "Свернуть" : "Развернуть"}
            >
              {node.children.length ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span />}
            </button>
            <button
              type="button"
              className="studio-v2-layer-select"
              onClick={() => selectInFrame(node.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                event.preventDefault();
                const index = flatNodes.findIndex((item) => item.id === node.id);
                const nextIndex = event.key === "ArrowDown"
                  ? Math.min(flatNodes.length - 1, index + 1)
                  : Math.max(0, index - 1);
                const next = flatNodes[nextIndex];
                if (next) {
                  selectInFrame(next.id);
                  document.querySelector<HTMLButtonElement>('[data-studio-layer-id="' + CSS.escape(next.id) + '"]')?.focus();
                }
              }}
              data-studio-layer-id={node.id}
            >
              <span className="studio-v2-layer-tag">{node.tag}</span>
              <span className="studio-v2-layer-name">
                <b>{node.label || "(без текста)"}</b>
                {node.className && <small>.{node.className.split(" ")[0]}</small>}
              </span>
              {node.inserted && <span className="studio-v2-insert-badge">NEW</span>}
            </button>
          </div>
          {isOpen && node.children.length ? <div className="studio-v2-layer-children">{renderTree(node.children)}</div> : null}
        </div>
      );
    });

  return (
    <main className={[
      "studio-v2",
      focusMode ? "studio-v2-focus" : "",
      mobilePanel !== "none" ? "studio-v2-mobile-" + mobilePanel : "",
    ].filter(Boolean).join(" ")}>
      <header className="studio-v2-topbar">
        <div className="studio-v2-brand">
          <span className="studio-v2-mark">G</span>
          <div>
            <strong>MALAYA STUDIO</strong>
            <span>Site design workspace</span>
          </div>
        </div>

        <div className="studio-v2-page">
          <span>PAGE</span>
          <select value={pagePath} onChange={(event) => setPagePath(event.target.value)} aria-label="Страница">
            {studioPages.map((page) => (
              <option value={page.path} key={page.path}>{page.label} · {page.path}</option>
            ))}
          </select>
        </div>

        <div className="studio-v2-top-actions">
          <div className="studio-v2-history">
            <button type="button" onClick={() => {
              const previous = undoRef.current.pop();
              if (!previous) return;
              redoRef.current.push(state);
              writeState(previous);
              refreshFrame();
              notify("Undo");
            }} disabled={!undoRef.current.length} title="Undo · Ctrl/Cmd+Z"><Undo2 size={15} /></button>
            <button type="button" onClick={() => {
              const next = redoRef.current.pop();
              if (!next) return;
              undoRef.current.push(state);
              writeState(next);
              refreshFrame();
              notify("Redo");
            }} disabled={!redoRef.current.length} title="Redo · Shift+Ctrl/Cmd+Z"><Redo2 size={15} /></button>
          </div>
          <span className={"studio-v2-draft-status " + (sameState(state, initialState) ? "" : "is-changed")}><i /> {sameState(state, initialState) ? "LOCAL DRAFT" : "UNSAVED CHANGES"}</span>
          <button type="button" className="studio-v2-button ghost studio-v2-hide-mobile" onClick={exportDraft}><Download size={14} /> Export</button>
          <button type="button" className="studio-v2-button acid" onClick={() => saveVersion(versionLabel || "Quick save")}><Save size={14} /> Save</button>
          <Link className="studio-v2-button ghost studio-v2-hide-mobile" href={pagePath} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open</Link>
          <StudioLogout />\n          <Link className="studio-v2-button ghost" href="/studio?engine=puck"><Code2 size={14} /> Puck</Link>
        </div>
      </header>

      <div className="studio-v2-toolbar">
        <div className="studio-v2-tabs">
          <button className={activeTab === "layers" ? "active" : ""} type="button" onClick={() => setActiveTab("layers")}><Layers3 size={14} /> Layers</button>
          <button className={activeTab === "design" ? "active" : ""} type="button" onClick={() => setActiveTab("design")}><Grid3X3 size={14} /> Design</button>
          <button className={activeTab === "data" ? "active" : ""} type="button" onClick={() => setActiveTab("data")}><Laptop size={14} /> Data</button>
          <button className={activeTab === "review" ? "active" : ""} type="button" onClick={() => setActiveTab("review")}><MessageSquare size={14} /> Review{pageComments.length ? <em>{pageComments.length}</em> : null}</button>
        </div>

        <div className="studio-v2-toolbar-center">
          <select className="studio-v2-mobile-page-select" value={pagePath} onChange={(event) => { setMobilePanel("none"); setPagePath(event.target.value); }} aria-label="Страница">
            {studioPages.map((page) => (
              <option value={page.path} key={page.path}>{page.label}</option>
            ))}
          </select>
          <button type="button" className="studio-v2-mobile-toggle" onClick={() => setMobilePanel((value) => value === "left" ? "none" : "left")} title="Layers / Design panel"><Layers3 size={14} /> Layers</button>
          <button type="button" className="studio-v2-mobile-toggle" onClick={() => setMobilePanel((value) => value === "right" ? "none" : "right")} title="Inspector panel"><Code2 size={14} /> Inspector</button>
          <button type="button" className="studio-v2-mobile-toggle studio-v2-mobile-focus" onClick={() => { setMobilePanel("none"); setFocusMode((value) => !value); }} title="Focus mode"><MoreHorizontal size={14} /> Focus</button>
          <button type="button" className={previewMode === "select" ? "active" : ""} onClick={() => setPreviewMode("select")} title="Select mode"><MousePointer2 size={14} /> Select</button>
          <button type="button" className={previewMode === "interact" ? "active" : ""} onClick={() => setPreviewMode("interact")} title="Interact mode"><Eye size={14} /> Interact</button>
        </div>

        <div className="studio-v2-toolbar-right">
          <button type="button" className={showGrid ? "active" : ""} onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={14} /> Grid</button>
          <div className="studio-v2-device">
            <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Desktop"><Monitor size={14} /></button>
            <button type="button" className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} title="Tablet"><Tablet size={14} /></button>
            <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile"><Smartphone size={14} /></button>
          </div>
          <button type="button" onClick={() => setZoom((value) => Math.max(60, value - 10))} title="Уменьшить"><ZoomOut size={14} /></button>
          <span className="studio-v2-zoom-value">{zoom}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(130, value + 10))} title="Увеличить"><ZoomIn size={14} /></button>
          <button type="button" onClick={() => setFocusMode((value) => !value)} title="Focus mode"><MoreHorizontal size={15} /></button>
        </div>
      </div>

      {mobilePanel !== "none" && !focusMode ? (
        <button
          type="button"
          className="studio-v2-mobile-scrim"
          aria-label="Закрыть боковую панель"
          onClick={() => setMobilePanel("none")}
        />
      ) : null}

      <div className="studio-v2-workspace">
        {!focusMode && (
          <aside className="studio-v2-left">
            {activeTab === "layers" && (
              <>
                <div className="studio-v2-sidebar-head">
                  <div><span>LAYERS</span><strong>Структура</strong></div>
                  <b>{flatNodes.length}</b>
                </div>
                <div className="studio-v2-search">
                  <Search size={13} />
                  <input id="studio-workspace-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Искать слой, текст или класс" />
                  <kbd>/</kbd>
                </div>
                <div className="studio-v2-tree-actions">
                  <span>{changedCount ? changedCount + " изменено" : "Без изменений"}</span>
                  <div>
                    <button type="button" onClick={() => setExpanded(Object.fromEntries(flatNodes.map((node) => [node.id, true])))}>Expand</button>
                    <button type="button" onClick={() => setExpanded({})}>Collapse</button>
                  </div>
                </div>
                <div className="studio-v2-tree">
                  {filteredTree.length ? renderTree(filteredTree) : <div className="studio-v2-empty"><Search size={18} /><strong>Слой не найден</strong><span>Проверь текст или CSS-класс.</span></div>}
                </div>
              </>
            )}

            {activeTab === "design" && (
              <div className="studio-v2-panel-scroll">
                <div className="studio-v2-sidebar-head">
                  <div><span>DESIGN SYSTEM</span><strong>Токены</strong></div>
                </div>
                <p className="studio-v2-help">Изменения применяются к текущему preview и сохраняются в локальный draft.</p>
                <div className="studio-v2-token-list">
                  {TOKEN_NAMES.map((name) => (
                    <label key={name}>
                      <span>{name}</span>
                      <div>
                        <input value={state.globalTokens[name] ?? ""} placeholder="auto / #..." onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateToken(name, event.target.value, true)} onBlur={finishLiveEdit} />
                        <span className="studio-v2-token-swatch" style={{ background: state.globalTokens[name] || "transparent" }} />
                      </div>
                    </label>
                  ))}
                </div>
                <div className="studio-v2-design-actions">
                  <button type="button" onClick={resetPage}><RotateCcw size={14} /> Reset page</button>
                  <button type="button" onClick={resetAll}><Trash2 size={14} /> Reset Studio</button>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="studio-v2-panel-scroll">
                {pagePath === "/calculator" ? <CalculatorStudioEditor onChanged={refreshFrame} /> : null}
                {pagePath === "/cases" ? <CaseStudioEditor onChanged={refreshFrame} /> : null}
                {pagePath !== "/calculator" && pagePath !== "/cases" ? (
                  <div className="studio-v2-data-empty">
                    <Laptop size={22} />
                    <strong>Контентные модели</strong>
                    <span>Калькулятор и кейсы подключаются здесь как специализированные редакторы.</span>
                    <Link className="studio-v2-data-link" href="/studio/content">Открыть CMS</Link>
                  </div>
                ) : null}
                {pagePath === "/calculator" ? <small className="studio-v2-storage-key">{STUDIO_CALCULATOR_KEY}</small> : null}
              </div>
            )}

            {activeTab === "review" && (
              <div className="studio-v2-panel-scroll">
                <div className="studio-v2-sidebar-head">
                  <div><span>REVIEW</span><strong>Версии</strong></div>
                  <b>{versions.length}</b>
                </div>
                <div className="studio-v2-save-version">
                  <input value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} placeholder="Название версии" onKeyDown={(event) => { if (event.key === "Enter") saveVersion(versionLabel || "Snapshot"); }} />
                  <button type="button" onClick={() => saveVersion(versionLabel || "Snapshot")}><Save size={13} /></button>
                </div>
                <div className="studio-v2-version-list">
                  {versions.map((version) => (
                    <div key={version.id} className="studio-v2-version">
                      <div>
                        <b>{version.label}</b>
                        <span>{formatTime(version.createdAt)}</span>
                      </div>
                      <div>
                        <button type="button" onClick={() => restoreVersion(version)}><RotateCcw size={12} /> Restore</button>
                        <button type="button" onClick={() => deleteVersion(version.id)} aria-label="Удалить версию"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {!versions.length && <div className="studio-v2-empty small"><Save size={16} /><strong>Версий пока нет</strong><span>Ctrl/Cmd+S создаёт snapshot.</span></div>}
                </div>

                <div className="studio-v2-review-divider" />
                <div className="studio-v2-sidebar-head">
                  <div><span>COMMENTS</span><strong>Review</strong></div>
                  <b>{pageComments.filter((comment) => !comment.resolved).length}</b>
                </div>
                {selected ? (
                  <div className="studio-v2-comment-box">
                    <div><span>Для</span><b>{selected.tag} · {selected.label}</b></div>
                    <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Что изменить в этом месте?" />
                    <button type="button" onClick={addComment}><MessageSquare size={13} /> Оставить комментарий</button>
                  </div>
                ) : <p className="studio-v2-help">Выбери элемент в preview, чтобы привязать комментарий.</p>}

                <div className="studio-v2-comment-list">
                  {pageComments.map((comment) => (
                    <div key={comment.id} className={comment.resolved ? "studio-v2-comment resolved" : "studio-v2-comment"}>
                      <div className="studio-v2-comment-meta"><b>{comment.nodeLabel}</b><span>{formatTime(comment.createdAt)}</span></div>
                      <p>{comment.text}</p>
                      <button type="button" onClick={() => toggleComment(comment.id)}>{comment.resolved ? "Вернуть" : "Resolve"}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        <section className="studio-v2-canvas-shell">
          <div className="studio-v2-canvas-head">
            <div><span>{pagePath}</span><small>{pageInfo.description}</small></div>
            <div><span>{DEVICE_LABEL[device]}</span>{previewMode === "select" ? <small>Select mode</small> : <small>Live interaction</small>}</div>
          </div>

          <div className={showGrid ? "studio-v2-canvas-area grid-on" : "studio-v2-canvas-area"}>
            <div className="studio-v2-grid-overlay" />
            <div className="studio-v2-frame" style={canvasStyle}>
              <iframe ref={frameRef} title="Malaya Studio preview" src={pagePath + (pagePath.includes("?") ? "&" : "?") + "studioPreview=1"} onLoad={installFrame} />
            </div>
          </div>

          <footer className="studio-v2-canvas-footer">
            <span><i /> LIVE PREVIEW</span>
            <span>{previewWidth === "fluid" ? "Fluid viewport" : previewWidth + " px"} · {zoom}%</span>
            <button type="button" onClick={refreshFrame}><RefreshCw size={12} /> Refresh</button>
          </footer>
        </section>

        {!focusMode && (
          <aside className="studio-v2-right">
            {selected ? (
              <>
                <div className="studio-v2-inspector-head">
                  <div>
                    <span>INSPECTOR</span>
                    <strong>&lt;{selected.tag}&gt;</strong>
                    <small>{selected.className || "без класса"}</small>
                  </div>
                  <div>
                    <button type="button" onClick={copySelector} title="Copy selector"><Copy size={13} /></button>
                    <button type="button" onClick={() => setSelected(null)} title="Close inspector"><X size={14} /></button>
                  </div>
                </div>

                <div className="studio-v2-selected-chip">
                  <span className="studio-v2-layer-tag">{selected.tag}</span>
                  <b>{selected.label || "(без текста)"}</b>
                  <small>{"#"+selectedPosition+" / "+flatNodes.length}</small>
                  {device !== "desktop" && <em className="studio-v2-responsive-badge">{DEVICE_LABEL[device]} only</em>}
                  {selected.inserted ? <em>NEW BLOCK</em> : activeOverride ? <em>OVERRIDE</em> : <i>DEFAULT</i>}
                </div>

                {(["content", "typography", "layout", "appearance", "advanced"] as Section[]).map((section) => (
                  <section key={section} className="studio-v2-inspector-section">
                    <button type="button" className="studio-v2-section-toggle" onClick={() => toggleSection(section)}>
                      <span>{SECTION_NAMES[section]}</span>
                      {openSections[section] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>

                    {openSections[section] && section === "content" ? (
                      <div className="studio-v2-section-body">
                        {selected.textEditable ? (
                          <label className="studio-v2-field wide">
                            <span>Текст</span>
                            <textarea value={textDraft} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateText(event.target.value)} onBlur={finishLiveEdit} />
                          </label>
                        ) : (
                          <div className="studio-v2-info-note">Элемент содержит дочерние узлы. Изменяй текстовые узлы ниже в Layers.</div>
                        )}

                        {selected.tag === "a" && (
                          <label className="studio-v2-field wide">
                            <span>Ссылка</span>
                            <input value={selected.attributes.href} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateAttribute("href", event.target.value)} onBlur={finishLiveEdit} />
                          </label>
                        )}

                        {selected.tag === "img" && (
                          <label className="studio-v2-field wide">
                            <span>Alt</span>
                            <input value={selected.attributes.alt} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateAttribute("alt", event.target.value)} onBlur={finishLiveEdit} />
                          </label>
                        )}

                        <div className="studio-v2-add-block">
                          <div><span>INSERT</span><small>Добавить в контейнер</small></div>
                          <div>
                            <button type="button" onClick={() => addBlock("text")}><Type size={13} /> Text</button>
                            <button type="button" onClick={() => addBlock("button")}><Plus size={13} /> Button</button>
                            <button type="button" onClick={() => addBlock("divider")}><MoreHorizontal size={13} /> Divider</button>
                            <button type="button" onClick={() => addBlock("container")}><FilePlus2 size={13} /> Container</button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {openSections[section] && section === "typography" ? (
                      <div className="studio-v2-section-body">
                        <div className="studio-v2-field-grid">
                          {(["fontSize", "lineHeight", "fontWeight", "letterSpacing"] as const).map((property) => (
                            <label className="studio-v2-field" key={property}>
                              <span>{STYLE_LABELS[property]}</span>
                              <input value={styleForDevice(property) ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle(property, event.target.value)} onBlur={finishLiveEdit} />
                            </label>
                          ))}
                        </div>
                        <div className="studio-v2-align">
                          <span>Выравнивание</span>
                          <div>
                            {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([value, Icon]) => (
                              <button key={value} type="button" className={selected.css.textAlign === value ? "active" : ""} onClick={() => updateStyle("textAlign", value)}><Icon size={13} /></button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {openSections[section] && section === "layout" ? (
                      <div className="studio-v2-section-body">
                        <div className="studio-v2-field-grid">
                          {(["display", "width", "maxWidth", "height", "gap", "position", "zIndex"] as const).map((property) => (
                            <label className="studio-v2-field" key={property}>
                              <span>{STYLE_LABELS[property]}</span>
                              <input value={styleForDevice(property) ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle(property, event.target.value)} onBlur={finishLiveEdit} />
                            </label>
                          ))}
                        </div>
                        <div className="studio-v2-field wide">
                          <span>Padding</span>
                          <input value={selected.css.padding ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("padding", event.target.value)} onBlur={finishLiveEdit} />
                        </div>
                        <div className="studio-v2-field wide">
                          <span>Margin</span>
                          <input value={selected.css.margin ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("margin", event.target.value)} onBlur={finishLiveEdit} />
                        </div>
                      </div>
                    ) : null}

                    {openSections[section] && section === "appearance" ? (
                      <div className="studio-v2-section-body">
                        <div className="studio-v2-field-grid">
                          {(["color", "background", "border", "borderRadius", "boxShadow", "opacity"] as const).map((property) => (
                            <label className="studio-v2-field" key={property}>
                              <span>{STYLE_LABELS[property]}</span>
                              <input value={styleForDevice(property) ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle(property, event.target.value)} onBlur={finishLiveEdit} />
                            </label>
                          ))}
                        </div>
                        <div className="studio-v2-selected-actions">
                          <button type="button" onClick={toggleHidden}><EyeOff size={13} /> {activeOverride?.hidden ? "Показать" : "Скрыть"}</button>
                          <button type="button" className="danger" onClick={removeSelected}>{selected.inserted ? <Trash2 size={13} /> : <EyeOff size={13} />} {selected.inserted ? "Удалить блок" : "Скрыть элемент"}</button>
                        </div>
                      </div>
                    ) : null}

                    {openSections[section] && section === "advanced" ? (
                      <div className="studio-v2-section-body">
                        <label className="studio-v2-field wide">
                          <span>Transform</span>
                          <input value={selected.css.transform ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("transform", event.target.value)} onBlur={finishLiveEdit} />
                        </label>
                        <label className="studio-v2-field wide">
                          <span>Transition</span>
                          <input value={selected.css.transition ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("transition", event.target.value)} onBlur={finishLiveEdit} />
                        </label>
                        <label className="studio-v2-field wide">
                          <span>Custom CSS</span>
                          <textarea value={activeOverride?.css?.customCss ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("customCss", event.target.value)} onBlur={finishLiveEdit} placeholder="background: linear-gradient(...);" />
                        </label>
                        <div className="studio-v2-selector">
                          <span>STABLE SELECTOR</span>
                          <code>{selected.id}</code>
                        </div>
                        <button type="button" className="studio-v2-reset-element" onClick={resetSelected}><RotateCcw size={13} /> Reset element</button>
                      </div>
                    ) : null}
                  </section>
                ))}
              </>
            ) : (
              <div className="studio-v2-inspector-empty">
                <MousePointer2 size={22} />
                <strong>Выбери элемент</strong>
                <span>Нажми на любой блок в preview, чтобы открыть Inspector.</span>
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="studio-v2-bottom-bar">
        <div><span>{pagePath}</span><b>{selected ? selected.tag + " · " + selected.label : "Ничего не выбрано"}</b></div>
        <div>
          <span>{flatNodes.length} layers</span>
          <span>{changedCount} overrides</span>
          <span>Ctrl/Cmd+S snapshot</span>
          <label className="studio-v2-import">
            <input ref={importRef} type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importDraft(file); event.currentTarget.value = ""; }} />
            <Download size={12} /> Import JSON
          </label>
        </div>
      </div>

      {toast ? <div className="studio-v2-toast"><Check size={14} /> {toast}</div> : null}
    </main>
  );
}
