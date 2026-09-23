"use client";

import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUp,
  ChevronsDown,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CopyPlus,
  Group,
  MoreVertical,
  ExternalLink,
  FilePlus2,
  Grid3X3,
  Laptop,
  Layers3,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  GripVertical,
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
  StudioPositionOffset,
  StudioLayoutConstraints,
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
  flexDirection: "flex-direction",
  flexWrap: "flex-wrap",
  justifyContent: "justify-content",
  alignItems: "align-items",
  alignSelf: "align-self",
  gridTemplateColumns: "grid-template-columns",
  gridTemplateRows: "grid-template-rows",
  overflow: "overflow",
  minWidth: "min-width",
  minHeight: "min-height",
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
  flexDirection: "Flex direction",
  flexWrap: "Flex wrap",
  justifyContent: "Justify",
  alignItems: "Align",
  alignSelf: "Align self",
  gridTemplateColumns: "Grid columns",
  gridTemplateRows: "Grid rows",
  overflow: "Overflow",
  minWidth: "Мин. ширина",
  minHeight: "Мин. высота",
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
    flexDirection: style.flexDirection,
    flexWrap: style.flexWrap,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    alignSelf: style.alignSelf,
    gridTemplateColumns: style.gridTemplateColumns,
    gridTemplateRows: style.gridTemplateRows,
    overflow: style.overflow,
    minWidth: style.minWidth,
    minHeight: style.minHeight,
    opacity: style.opacity,
    position: style.position,
    zIndex: style.zIndex,
    transform: style.transform === "none" ? "" : style.transform,
    transition: style.transition,
  };
}

function applyConstraints(element: HTMLElement, constraints?: StudioLayoutConstraints): void {
  if (!constraints) return;
  const parent = element.parentElement;
  if (constraints.horizontal || constraints.vertical) {
    element.style.position = "absolute";
    if (parent && window.getComputedStyle(parent).position === "static") {
      (parent as HTMLElement).style.position = "relative";
    }
  }

  const horizontal = constraints.horizontal ?? "none";
  if (horizontal === "left") {
    element.style.left = "0";
    element.style.right = "auto";
  } else if (horizontal === "right") {
    element.style.left = "auto";
    element.style.right = "0";
  } else if (horizontal === "stretch") {
    element.style.left = "0";
    element.style.right = "0";
    element.style.width = "auto";
  } else {
    element.style.left = "auto";
    element.style.right = "auto";
  }

  const vertical = constraints.vertical ?? "none";
  if (vertical === "top") {
    element.style.top = "0";
    element.style.bottom = "auto";
  } else if (vertical === "bottom") {
    element.style.top = "auto";
    element.style.bottom = "0";
  } else if (vertical === "stretch") {
    element.style.top = "0";
    element.style.bottom = "0";
    element.style.height = "auto";
  } else {
    element.style.top = "auto";
    element.style.bottom = "auto";
  }
}

function applyPositionOffset(element: HTMLElement, offset?: StudioPositionOffset): void {
  if (!offset) {
    element.style.translate = "";
    return;
  }
  element.style.translate = Math.round(offset.x) + "px " + Math.round(offset.y) + "px";
}

function applyCss(element: HTMLElement, css?: StudioCssOverrides): void {
  if (!css) return;

  for (const [property, value] of Object.entries(css)) {
    if (!value) continue;
    const cssName = STYLE_MAP[property as keyof StudioCssOverrides];
    if (cssName) element.style.setProperty(cssName, value);
  }

  if (css.customCss) element.style.cssText += ";" + css.customCss;
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
  const inserted = Object.entries(page || {})
    .filter((entry): entry is [string, StudioElementOverride & { inserted: StudioInsertedBlock }] => Boolean(entry[1].inserted))
    .sort(([, left], [, right]) => (left.inserted.order ?? Number.MAX_SAFE_INTEGER) - (right.inserted.order ?? Number.MAX_SAFE_INTEGER));
  for (const [id, override] of inserted) {
    const block = override.inserted;
    const parent = findElement(doc, block.parentId);
    if (!parent) continue;
    if (findElement(doc, id)) continue;
    const element = createInsertedElement(doc, block, id);
    if (element) {
      const responsive = override.responsiveCss?.[device];
      if (responsive) applyCss(element, responsive);
      const offset = device === "desktop"
        ? override.positionOffset
        : override.responsivePositionOffset?.[device] ?? override.positionOffset;
      applyPositionOffset(element, offset);
      const constraints = device === "desktop"
        ? override.constraints
        : override.responsiveConstraints?.[device] ?? override.constraints;
      applyConstraints(element, constraints);
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
    const offset = device === "desktop"
      ? override.positionOffset
      : override.responsivePositionOffset?.[device] ?? override.positionOffset;
    applyPositionOffset(element, offset);
    const constraints = device === "desktop"
      ? override.constraints
      : override.responsiveConstraints?.[device] ?? override.constraints;
    applyConstraints(element, constraints);

    if (override.hidden) {
      element.style.setProperty("display", "none");
    }
    if (override.locked) {
      element.setAttribute("data-studio-locked", "true");
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const stateRef = useRef(state);
  const draggedNodeRef = useRef<string | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const flatNodes = useMemo(() => flatten(nodes), [nodes]);
  const filteredTree = useMemo(() => filterTree(nodes, search), [nodes, search]);
  const activeOverride = selected ? state.pages[pagePath]?.[selected.id] : undefined;
  const activeResponsiveCss = selected && device !== "desktop" ? activeOverride?.responsiveCss?.[device] : undefined;
  const activeConstraints = selected
    ? device === "desktop"
      ? activeOverride?.constraints
      : activeOverride?.responsiveConstraints?.[device] ?? activeOverride?.constraints
    : undefined;
  const activePositionOffset = selected
    ? device === "desktop"
      ? activeOverride?.positionOffset
      : activeOverride?.responsivePositionOffset?.[device] ?? activeOverride?.positionOffset
    : undefined;
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
    stateRef.current = next;
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

  const updatePositionOffset = useCallback((id: string, offset: StudioPositionOffset, editKey?: string) => {
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[id] ?? {};
    const next = {
      ...currentState,
      pages: {
        ...currentState.pages,
        [pagePath]: {
          ...page,
          [id]: device === "desktop"
            ? { ...current, positionOffset: { x: Math.round(offset.x), y: Math.round(offset.y) } }
            : {
                ...current,
                responsivePositionOffset: {
                  ...(current.responsivePositionOffset ?? {}),
                  [device]: { x: Math.round(offset.x), y: Math.round(offset.y) },
                },
              },
        },
      },
    };
    if (editKey) {
      if (liveEditRef.current !== editKey) {
        undoRef.current.push(currentState);
        if (undoRef.current.length > 50) undoRef.current.shift();
        redoRef.current = [];
        liveEditRef.current = editKey;
      }
      writeState(next);
    } else {
      commit(next);
    }
  }, [commit, device, pagePath, writeState]);

  const refreshFrame = useCallback(() => {
    frameRef.current?.contentWindow?.location.reload();
    setSelected(null);
    setNodes([]);
  }, []);

  const selectInFrame = useCallback(
    (id: string, additive = false) => {
      const doc = frameRef.current?.contentDocument ?? null;
      const element = findElement(doc, id);
      if (!element) return;

      const currentSelection = selectedIdsRef.current;
      const nextSelection = additive
        ? (currentSelection.includes(id) && currentSelection.length === 1
            ? currentSelection
            : currentSelection.includes(id)
              ? currentSelection.filter((item) => item !== id)
              : [...currentSelection, id])
        : [id];
      if (!nextSelection.length) return;
      doc?.querySelectorAll(".studio-frame-selected,.studio-frame-multi-selected").forEach((item) => item.classList.remove("studio-frame-selected", "studio-frame-multi-selected"));
      nextSelection.forEach((itemId) => {
        const target = findElement(doc, itemId);
        target?.classList.add(itemId === id ? "studio-frame-selected" : "studio-frame-multi-selected");
      });

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
      setSelectedIds(nextSelection);
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
      '[data-studio-node-id][data-studio-locked="true"]{cursor:not-allowed!important;opacity:.72}',

      "[data-studio-node-id].studio-frame-selected{outline:2px solid #d9ff52!important;outline-offset:3px;box-shadow:0 0 0 4px rgba(217,255,82,.16)!important}",
      "[data-studio-node-id].studio-frame-multi-selected{outline:1px solid rgba(217,255,82,.75)!important;outline-offset:2px;box-shadow:0 0 0 2px rgba(217,255,82,.08)!important}",
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

    if (selectedIds.length) {
      doc.querySelectorAll(".studio-frame-selected,.studio-frame-multi-selected").forEach((item) => {
        item.classList.remove("studio-frame-selected", "studio-frame-multi-selected");
      });
      selectedIds.forEach((id) => findElement(doc, id)?.classList.add(id === selected?.id ? "studio-frame-selected" : "studio-frame-multi-selected"));
    }
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
      selectInFrame(element.getAttribute("data-studio-node-id") ?? "", event.shiftKey);
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
  }, [pagePath, previewMode, selectInFrame, selected, selectedIds, state]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument ?? null;
    if (!doc?.body || !selected || previewMode !== "select") return;
    const element = findElement(doc, selected.id);
    if (!element) return;

    const guideHost = doc.createElement("div");
    guideHost.id = "malaya-studio-guides";
    guideHost.innerHTML = '<span data-guide="vertical"></span><span data-guide="horizontal"></span>';
    doc.body.appendChild(guideHost);
    const verticalGuide = guideHost.querySelector('[data-guide="vertical"]');
    const horizontalGuide = guideHost.querySelector('[data-guide="horizontal"]');
    if (!(verticalGuide instanceof HTMLElement) || !(horizontalGuide instanceof HTMLElement)) {
      guideHost.remove();
      return;
    }

    const currentState = stateRef.current;
    const override = currentState.pages[pagePath]?.[selected.id];
    const startOffset = device === "desktop"
      ? override?.positionOffset ?? { x: 0, y: 0 }
      : override?.responsivePositionOffset?.[device] ?? override?.positionOffset ?? { x: 0, y: 0 };
    const startRect = element.getBoundingClientRect();
    const isGroup = selectedIds.length > 1;
    const groupElements = (isGroup ? selectedIds : [selected.id])
      .map((id) => findElement(doc, id))
      .filter((item): item is HTMLElement => Boolean(item));
    const groupStartRects = groupElements.map((item) => ({ element: item, rect: item.getBoundingClientRect() }));
    const parent = element.parentElement;
    const candidatesX: number[] = [];
    const candidatesY: number[] = [];

    if (parent) {
      const rect = parent.getBoundingClientRect();
      candidatesX.push(rect.left, rect.left + rect.width / 2, rect.right);
      candidatesY.push(rect.top, rect.top + rect.height / 2, rect.bottom);
      parent.querySelectorAll("[data-studio-node-id]").forEach((node) => {
        if (!(node instanceof HTMLElement) || node === element) return;
        const rect = node.getBoundingClientRect();
        candidatesX.push(rect.left, rect.left + rect.width / 2, rect.right);
        candidatesY.push(rect.top, rect.top + rect.height / 2, rect.bottom);
      });
    }

    let drag: { startX: number; startY: number } | null = null;
    let groupLastX = 0;
    let groupLastY = 0;

    const calculateSnap = (rawX: number, rawY: number) => {
      const grid = 8;
      let nextX = Math.round(rawX / grid) * grid;
      let nextY = Math.round(rawY / grid) * grid;
      let xGuide: number | null = null;
      let yGuide: number | null = null;

      const proposedLeft = startRect.left + (nextX - startOffset.x);
      const proposedTop = startRect.top + (nextY - startOffset.y);
      const sourceX = [proposedLeft, proposedLeft + startRect.width / 2, proposedLeft + startRect.width];
      const sourceY = [proposedTop, proposedTop + startRect.height / 2, proposedTop + startRect.height];

      let bestX = 7;
      for (const candidate of candidatesX) {
        for (const point of sourceX) {
          const distance = Math.abs(candidate - point);
          if (distance < bestX) {
            bestX = distance;
            nextX += candidate - point;
            xGuide = candidate;
          }
        }
      }

      const adjustedTop = startRect.top + (nextY - startOffset.y);
      const adjustedBottomPoints = [adjustedTop, adjustedTop + startRect.height / 2, adjustedTop + startRect.height];
      let bestY = 7;
      for (const candidate of candidatesY) {
        for (const point of adjustedBottomPoints) {
          const distance = Math.abs(candidate - point);
          if (distance < bestY) {
            bestY = distance;
            nextY += candidate - point;
            yGuide = candidate;
          }
        }
      }

      return { x: Math.round(nextX), y: Math.round(nextY), xGuide, yGuide };
    };

    const updateGuideUi = (result: { x: number; y: number; xGuide: number | null; yGuide: number | null }) => {
      element.style.translate = result.x + "px " + result.y + "px";
      if (result.xGuide === null) {
        verticalGuide.style.opacity = "0";
      } else {
        verticalGuide.style.left = Math.round(result.xGuide) + "px";
        verticalGuide.style.opacity = "1";
      }
      if (result.yGuide === null) {
        horizontalGuide.style.opacity = "0";
      } else {
        horizontalGuide.style.top = Math.round(result.yGuide) + "px";
        horizontalGuide.style.opacity = "1";
      }
      const resizeUi = doc.getElementById("malaya-studio-resize-ui");
      if (resizeUi instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        resizeUi.style.left = rect.left + "px";
        resizeUi.style.top = rect.top + "px";
      }
    };

    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("[data-resize]")) return;
      if (event.target instanceof Element && event.target.closest("[data-studio-dev-ui]")) return;
      const current = stateRef.current.pages[pagePath]?.[selected.id];
      if (current?.locked) return;
      drag = { startX: event.clientX, startY: event.clientY };
      groupLastX = 0;
      groupLastY = 0;
      element.setPointerCapture?.(event.pointerId);
      groupElements.forEach((item) => { item.style.cursor = "move"; });
    };

    const pointerMove = (event: PointerEvent) => {
      if (!drag) return;
      event.preventDefault();
      event.stopPropagation();

      if (isGroup) {
        const nextGroupX = Math.round((event.clientX - drag.startX) / 8) * 8;
        const nextGroupY = Math.round((event.clientY - drag.startY) / 8) * 8;
        const deltaX = nextGroupX - groupLastX;
        const deltaY = nextGroupY - groupLastY;
        if (deltaX || deltaY) {
          moveSelectionBy(deltaX, deltaY, "group-drag:" + device + ":" + selectedIds.join(","));
          groupLastX = nextGroupX;
          groupLastY = nextGroupY;
        }
        return;
      }

      const result = calculateSnap(
        startOffset.x + event.clientX - drag.startX,
        startOffset.y + event.clientY - drag.startY,
      );
      updateGuideUi(result);
      updatePositionOffset(selected.id, { x: result.x, y: result.y }, "move:" + device + ":" + selected.id);
    };

    const pointerUp = () => {
      if (!drag) return;
      drag = null;
      groupElements.forEach((item) => { item.style.cursor = ""; });
      verticalGuide.style.opacity = "0";
      horizontalGuide.style.opacity = "0";
      liveEditRef.current = null;
    };

    element.addEventListener("pointerdown", pointerDown);
    doc.addEventListener("pointermove", pointerMove, true);
    doc.addEventListener("pointerup", pointerUp, true);
    doc.addEventListener("pointercancel", pointerUp, true);

    return () => {
      element.removeEventListener("pointerdown", pointerDown);
      doc.removeEventListener("pointermove", pointerMove, true);
      doc.removeEventListener("pointerup", pointerUp, true);
      doc.removeEventListener("pointercancel", pointerUp, true);
      guideHost.remove();
      groupElements.forEach((item) => { item.style.cursor = ""; delete item.dataset.studioGroupLast; });
    };
  }, [device, pagePath, previewMode, selected, selectedIds, moveSelectionBy, updatePositionOffset]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument ?? null;
    if (!doc?.body || !selected || previewMode !== "select") return;
    const element = findElement(doc, selected.id);
    if (!element) return;

    doc.querySelector("#malaya-studio-resize-ui")?.remove();
    const overlay = doc.createElement("div");
    overlay.id = "malaya-studio-resize-ui";
    overlay.className = "studio-v2-resize-ui";
    overlay.innerHTML = '<span data-resize="right"></span><span data-resize="bottom"></span><span data-resize="corner"></span>';
    doc.body.appendChild(overlay);

    const position = () => {
      const rect = element.getBoundingClientRect();
      overlay.style.left = rect.left + "px";
      overlay.style.top = rect.top + "px";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";
    };

    let drag: { kind: "right" | "bottom" | "corner"; startX: number; startY: number; width: number; height: number } | null = null;

    const setLiveDimension = (property: "width" | "height", value: string) => {
      const currentState = stateRef.current;
      const page = currentState.pages[pagePath] ?? {};
      const current = page[id] ?? {};
      const next = {
        ...currentState,
        pages: {
          ...currentState.pages,
          [pagePath]: {
            ...page,
            [selected.id]: device === "desktop"
              ? { ...current, css: { ...(current.css ?? {}), [property]: value } }
              : {
                  ...current,
                  responsiveCss: {
                    ...(current.responsiveCss ?? {}),
                    [device]: {
                      ...(current.responsiveCss?.[device] ?? {}),
                      [property]: value,
                    },
                  },
                },
          },
        },
      };
      if (liveEditRef.current !== "resize:" + device + ":" + selected.id) {
        undoRef.current.push(currentState);
        if (undoRef.current.length > 50) undoRef.current.shift();
        redoRef.current = [];
        liveEditRef.current = "resize:" + device + ":" + selected.id;
      }
      writeState(next);
    };

    const pointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-resize]") : null;
      if (!target) return;
      const kind = target.getAttribute("data-resize");
      if (kind !== "right" && kind !== "bottom" && kind !== "corner") return;
      const rect = element.getBoundingClientRect();
      drag = { kind, startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height };
      event.preventDefault();
      event.stopPropagation();
      (target as HTMLElement).setPointerCapture?.(event.pointerId);
    };

    const pointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const nextWidth = drag.kind === "bottom" ? drag.width : Math.max(24, drag.width + event.clientX - drag.startX);
      const nextHeight = drag.kind === "right" ? drag.height : Math.max(24, drag.height + event.clientY - drag.startY);
      element.style.width = Math.round(nextWidth) + "px";
      element.style.height = Math.round(nextHeight) + "px";
      setLiveDimension("width", Math.round(nextWidth) + "px");
      if (drag.kind !== "right") setLiveDimension("height", Math.round(nextHeight) + "px");
      position();
      setSelected((current) => current ? { ...current, css: { ...current.css, width: Math.round(nextWidth) + "px", ...(drag?.kind !== "right" ? { height: Math.round(nextHeight) + "px" } : {}) } } : current);
    };

    const pointerUp = () => {
      if (!drag) return;
      drag = null;
      liveEditRef.current = null;
    };

    overlay.addEventListener("pointerdown", pointerDown);
    overlay.addEventListener("pointermove", pointerMove);
    overlay.addEventListener("pointerup", pointerUp);
    overlay.addEventListener("pointercancel", pointerUp);
    doc.defaultView?.addEventListener("scroll", position, true);
    doc.defaultView?.addEventListener("resize", position);
    position();

    return () => {
      overlay.removeEventListener("pointerdown", pointerDown);
      overlay.removeEventListener("pointermove", pointerMove);
      overlay.removeEventListener("pointerup", pointerUp);
      overlay.removeEventListener("pointercancel", pointerUp);
      doc.defaultView?.removeEventListener("scroll", position, true);
      doc.defaultView?.removeEventListener("resize", position);
      overlay.remove();
    };
  }, [selected?.id, device, previewMode, pagePath, selectedIds.length]);

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
    if (!frameRef.current) return;
    refreshFrame();
  }, [device, refreshFrame]);

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

      if (!isTyping && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateInserted();
        return;
      }

      if (!isTyping && (event.key === "]" || event.key === "}")) {
        event.preventDefault();
        moveLayerOrder(event.shiftKey ? "front" : "forward");
        return;
      }

      if (!isTyping && (event.key === "[" || event.key === "{")) {
        event.preventDefault();
        moveLayerOrder(event.shiftKey ? "back" : "backward");
        return;
      }

      if (!isTyping && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        removeSelected();
        return;
      }

      if (!isTyping && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 8 : 1;
        nudgeSelection(
          event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
          event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
        );
        return;
      }

      if (event.key === "Escape" && !isTyping) {
        setContextMenu(null);
        setMobilePanel("none");
        setSelected(null);
        setSelectedIds([]);
        frameRef.current?.contentDocument?.querySelectorAll(".studio-frame-selected,.studio-frame-multi-selected").forEach((item) => item.classList.remove("studio-frame-selected", "studio-frame-multi-selected"));
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        document.getElementById("studio-workspace-search")?.focus();
      }
    };

    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [notify, removeSelected, duplicateInserted, nudgeSelection, state, versionLabel, writeState]);

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

  function updateStylesBatch(updates: Partial<StudioCssOverrides>, editKey = "batch-style") {
    if (!selected) return;
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (!element) return;

    Object.entries(updates).forEach(([property, value]) => {
      if (value === undefined) return;
      const cssName = STYLE_MAP[property as keyof StudioCssOverrides];
      if (cssName) element.style.setProperty(cssName, value);
    });

    const apply = (current: StudioElementOverride) =>
      device === "desktop"
        ? { ...current, css: { ...(current.css ?? {}), ...updates } }
        : {
            ...current,
            responsiveCss: {
              ...(current.responsiveCss ?? {}),
              [device]: {
                ...(current.responsiveCss?.[device] ?? {}),
                ...updates,
              },
            },
          };

    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[selected.id] ?? {};
    const next = {
      ...currentState,
      pages: { ...currentState.pages, [pagePath]: { ...page, [selected.id]: apply(current) } },
    };
    liveCommit(next, editKey + ":" + device + ":" + selected.id);
    setSelected((currentSelected) => currentSelected ? { ...currentSelected, css: { ...currentSelected.css, ...updates } } : currentSelected);
  }

  function updateStyle(property: keyof StudioCssOverrides, value: string) {
    if (!selected) return;
    const element = findElement(frameRef.current?.contentDocument ?? null, selected.id);
    if (!element) return;
    const cssName = STYLE_MAP[property];
    if (cssName) element.style.setProperty(cssName, value);
    else if (property === "customCss" && value) element.style.cssText += ";" + value;
    else if (!cssName) return;
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

  function setAutoLayout(mode: "flow" | "row" | "column" | "grid") {
    if (!selected) return;
    if (mode === "flow") {
      updateStylesBatch({ display: "block", flexDirection: "", flexWrap: "", justifyContent: "", alignItems: "", gridTemplateColumns: "", gridTemplateRows: "" }, "auto-layout");
    } else if (mode === "row") {
      updateStylesBatch({ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" }, "auto-layout");
    } else if (mode === "column") {
      updateStylesBatch({ display: "flex", flexDirection: "column", flexWrap: "nowrap", justifyContent: "flex-start", alignItems: "stretch" }, "auto-layout");
    } else {
      updateStylesBatch({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "", gap: styleForDevice("gap") || "16px" }, "auto-layout");
    }
    notify("Auto Layout updated");
  }

  function updateConstraints(nextConstraints: StudioLayoutConstraints) {
    if (!selected || !selected.inserted) {
      notify("Constraints доступны для Studio-блоков");
      return;
    }
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[selected.id] ?? {};
    const active = device === "desktop" ? current.constraints : current.responsiveConstraints?.[device];
    const hasConstraint = nextConstraints.horizontal !== "none" || nextConstraints.vertical !== "none";
    const nextOverride = device === "desktop"
      ? {
          ...current,
          constraints: hasConstraint ? nextConstraints : undefined,
          css: {
            ...(current.css ?? {}),
            position: hasConstraint ? "absolute" : "",
          },
        }
      : {
          ...current,
          responsiveConstraints: {
            ...(current.responsiveConstraints ?? {}),
            ...(hasConstraint ? { [device]: nextConstraints } : {}),
          },
          responsiveCss: {
            ...(current.responsiveCss ?? {}),
            [device]: {
              ...(current.responsiveCss?.[device] ?? {}),
              position: hasConstraint ? "absolute" : "",
            },
          },
        };
    const nextPage = { ...page, [selected.id]: nextOverride };
    const parentId = current.inserted?.parentId;
    if (hasConstraint && parentId) {
      const parentOverride = nextPage[parentId] ?? {};
      nextPage[parentId] = {
        ...parentOverride,
        css: { ...(parentOverride.css ?? {}), position: "relative" },
      };
      const parentElement = findElement(frameRef.current?.contentDocument ?? null, parentId);
      if (parentElement && getComputedStyle(parentElement).position === "static") {
        parentElement.style.position = "relative";
      }
    }
    if (device !== "desktop" && !Object.keys(nextOverride.responsiveConstraints ?? {}).length) {
      delete nextOverride.responsiveConstraints;
    }
    commit({ ...currentState, pages: { ...currentState.pages, [pagePath]: nextPage } });
    refreshFrame();
    notify(active ? DEVICE_LABEL[device] + " constraints updated" : "Constraints added");
  }

  function moveLayerOrder(direction: "forward" | "backward" | "front" | "back", id = selected?.id) {
    if (!id) return;
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[selected.id] ?? {};

    if (!current.inserted) {
      const element = findElement(frameRef.current?.contentDocument ?? null, id);
      const currentZ = Number.parseInt(getComputedStyle(element ?? document.body).zIndex, 10);
      const zIndex = Number.isFinite(currentZ) ? currentZ : 0;
      const delta = direction === "forward" ? 1 : direction === "backward" ? -1 : direction === "front" ? 1000 : -1000;
      updateStyle("zIndex", String(zIndex + delta));
      return;
    }

    const parentId = current.inserted.parentId;
    const siblings = Object.entries(page)
      .filter(([, override]) => override.inserted?.parentId === parentId)
      .sort(([, left], [, right]) => (left.inserted?.order ?? 0) - (right.inserted?.order ?? 0))
      .map(([id]) => id);
    const index = siblings.indexOf(id);
    if (index < 0) return;
    let targetIndex = index;
    if (direction === "forward") targetIndex = Math.min(siblings.length - 1, index + 1);
    if (direction === "backward") targetIndex = Math.max(0, index - 1);
    if (direction === "front") targetIndex = siblings.length - 1;
    if (direction === "back") targetIndex = 0;
    if (targetIndex === index) return;

    const reordered = siblings.filter((itemId) => itemId !== id);
    reordered.splice(targetIndex, 0, id);
    const nextPage = { ...page };
    reordered.forEach((id, order) => {
      const override = nextPage[id];
      if (!override?.inserted) return;
      nextPage[id] = { ...override, inserted: { ...override.inserted, order } };
    });
    commit({ ...currentState, pages: { ...currentState.pages, [pagePath]: nextPage } });
    refreshFrame();
    notify("Layer order updated");
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

  function resetResponsive() {
    if (!selected || device === "desktop") return;
    const page = { ...(state.pages[pagePath] ?? {}) };
    const current = page[selected.id];
    if (!current?.responsiveCss?.[device]) return;
    const responsiveCss = { ...(current.responsiveCss ?? {}) };
    delete responsiveCss[device];
    const responsivePositionOffset = { ...(current.responsivePositionOffset ?? {}) };
    delete responsivePositionOffset[device];
    const nextOverride = { ...current };
    if (Object.keys(responsiveCss).length) nextOverride.responsiveCss = responsiveCss;
    else delete nextOverride.responsiveCss;
    if (Object.keys(responsivePositionOffset).length) nextOverride.responsivePositionOffset = responsivePositionOffset;
    else delete nextOverride.responsivePositionOffset;
    page[selected.id] = nextOverride;
    commit({ ...state, pages: { ...state.pages, [pagePath]: page } });
    refreshFrame();
    notify(DEVICE_LABEL[device] + " overrides сброшены");
  }

  function resetSelected() {
    if (!selected) return;
    const page = { ...(state.pages[pagePath] ?? {}) };
    delete page[selected.id];
    const next = { ...state, pages: { ...state.pages, [pagePath]: page } };
    commit(next);
    setSelected(null);
    setSelectedIds([]);
    refreshFrame();
    notify("Элемент сброшен");
  }

  function resetPage() {
    if (!window.confirm("Сбросить все изменения этой страницы?")) return;
    const pages = { ...state.pages };
    delete pages[pagePath];
    commit({ ...state, pages });
    setSelected(null);
    setSelectedIds([]);
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
    setSelectedIds([]);
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
          [id]: { inserted: { ...block, order: Object.values(state.pages[pagePath] ?? {}).filter((item) => item.inserted?.parentId === parentId).length } },
        },
      },
    };
    commit(next);
    window.setTimeout(refreshFrame, 0);
    notify("Блок добавлен");
  }

  function reorderInserted(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const source = page[sourceId]?.inserted;
    const target = page[targetId]?.inserted;
    if (!source || !target || source.parentId !== target.parentId) return;

    const siblings = Object.entries(page)
      .filter(([, override]) => override.inserted?.parentId === source.parentId)
      .sort(([, left], [, right]) => (left.inserted?.order ?? 0) - (right.inserted?.order ?? 0))
      .map(([id]) => id);
    const withoutSource = siblings.filter((id) => id !== sourceId);
    const targetIndex = withoutSource.indexOf(targetId);
    if (targetIndex < 0) return;
    withoutSource.splice(targetIndex, 0, sourceId);

    const nextPage = { ...page };
    withoutSource.forEach((id, index) => {
      const override = nextPage[id];
      if (!override?.inserted) return;
      nextPage[id] = { ...override, inserted: { ...override.inserted, order: index } };
    });

    writeState({
      ...currentState,
      pages: { ...currentState.pages, [pagePath]: nextPage },
    });
    refreshFrame();
    notify("Порядок блоков изменён");
  }

  function applyBatchAlignment(mode: "left" | "centerX" | "right" | "top" | "centerY" | "bottom" | "distributeX" | "distributeY") {
    const ids = selectedIds.length > 1 ? selectedIds : selected ? [selected.id] : [];
    if (ids.length < 2) return;
    const doc = frameRef.current?.contentDocument ?? null;
    if (!doc) return;

    const items = ids.map((id) => {
      const element = findElement(doc, id);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const override = stateRef.current.pages[pagePath]?.[id];
      const offset = device === "desktop"
        ? override?.positionOffset ?? { x: 0, y: 0 }
        : override?.responsivePositionOffset?.[device] ?? override?.positionOffset ?? { x: 0, y: 0 };
      return { id, element, rect, offset };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length < 2) return;

    const deltas = new Map<string, { x: number; y: number }>();
    if (mode === "left" || mode === "centerX" || mode === "right") {
      const target = mode === "left"
        ? Math.min(...items.map((item) => item.rect.left))
        : mode === "right"
          ? Math.max(...items.map((item) => item.rect.right))
          : (Math.min(...items.map((item) => item.rect.left)) + Math.max(...items.map((item) => item.rect.right))) / 2;
      items.forEach((item) => {
        const point = mode === "left" ? item.rect.left : mode === "right" ? item.rect.right : item.rect.left + item.rect.width / 2;
        deltas.set(item.id, { x: target - point, y: 0 });
      });
    } else if (mode === "top" || mode === "centerY" || mode === "bottom") {
      const target = mode === "top"
        ? Math.min(...items.map((item) => item.rect.top))
        : mode === "bottom"
          ? Math.max(...items.map((item) => item.rect.bottom))
          : (Math.min(...items.map((item) => item.rect.top)) + Math.max(...items.map((item) => item.rect.bottom))) / 2;
      items.forEach((item) => {
        const point = mode === "top" ? item.rect.top : mode === "bottom" ? item.rect.bottom : item.rect.top + item.rect.height / 2;
        deltas.set(item.id, { x: 0, y: target - point });
      });
    } else {
      const axis = mode === "distributeX" ? "x" : "y";
      const ordered = [...items].sort((a, b) => axis === "x" ? a.rect.left - b.rect.left : a.rect.top - b.rect.top);
      const start = axis === "x" ? ordered[0].rect.left : ordered[0].rect.top;
      const end = axis === "x"
        ? ordered[ordered.length - 1].rect.right
        : ordered[ordered.length - 1].rect.bottom;
      const totalSize = ordered.reduce((sum, item) => sum + (axis === "x" ? item.rect.width : item.rect.height), 0);
      const gap = (end - start - totalSize) / (ordered.length - 1);
      let cursor = start;
      ordered.forEach((item) => {
        const currentStart = axis === "x" ? item.rect.left : item.rect.top;
        const delta = cursor - currentStart;
        deltas.set(item.id, axis === "x" ? { x: delta, y: 0 } : { x: 0, y: delta });
        cursor += (axis === "x" ? item.rect.width : item.rect.height) + gap;
      });
    }

    let next = stateRef.current;
    const page = { ...(next.pages[pagePath] ?? {}) };
    items.forEach((item) => {
      const delta = deltas.get(item.id);
      if (!delta) return;
      const offset = item.offset;
      const newOffset = { x: Math.round(offset.x + delta.x), y: Math.round(offset.y + delta.y) };
      const current = page[item.id] ?? {};
      page[item.id] = device === "desktop"
        ? { ...current, positionOffset: newOffset }
        : {
            ...current,
            responsivePositionOffset: {
              ...(current.responsivePositionOffset ?? {}),
              [device]: newOffset,
            },
          };
      item.element.style.translate = newOffset.x + "px " + newOffset.y + "px";
    });

    const nextState = { ...next, pages: { ...next.pages, [pagePath]: page } };
    commit(nextState);
    refreshFrame();
    notify("Групповое выравнивание применено");
  }

  function clearMultiSelection() {
    setSelectedIds(selected ? [selected.id] : []);
  }

  function toggleHiddenById(id: string) {
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[id] ?? {};
    const hidden = !(current.hidden ?? false);
    const next = { ...currentState, pages: { ...currentState.pages, [pagePath]: { ...page, [id]: { ...current, hidden } } } };
    commit(next);
    const element = findElement(frameRef.current?.contentDocument ?? null, id);
    if (element) element.style.setProperty("display", hidden ? "none" : "");
    notify(hidden ? "Layer hidden" : "Layer shown");
  }

  function toggleLocked(id = selected?.id) {
    if (!id) return;
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const current = page[id] ?? {};
    const locked = !current.locked;
    const next = { ...currentState, pages: { ...currentState.pages, [pagePath]: { ...page, [id]: { ...current, locked } } } };
    commit(next);
    const element = findElement(frameRef.current?.contentDocument ?? null, id);
    if (element) {
      if (locked) element.setAttribute("data-studio-locked", "true");
      else element.removeAttribute("data-studio-locked");
    }
    notify(locked ? "Layer locked" : "Layer unlocked");
  }

  function duplicateInserted(ids = selectedIds.length ? selectedIds : selected ? [selected.id] : []) {
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const sourceIds = ids.filter((id) => Boolean(page[id]?.inserted));
    if (!sourceIds.length) {
      notify("Duplicate доступен для Studio-блоков");
      return;
    }

    const used = new Set(Object.keys(page));
    let counter = 1;
    const newPage = { ...page };

    const makeId = () => {
      let id = stableInsertedId("duplicate-" + crypto.randomUUID());
      while (used.has(id)) id = stableInsertedId("duplicate-" + crypto.randomUUID() + "-" + counter++);
      used.add(id);
      return id;
    };

    const cloneTree = (sourceId: string, parentId: string) => {
      const source = page[sourceId]?.inserted;
      if (!source) return;
      const nextId = makeId();
      newPage[nextId] = {
        ...page[sourceId],
        inserted: {
          ...source,
          parentId,
          text: source.text,
          css: source.css ? { ...source.css } : undefined,
          order: (source.order ?? 0) + 1,
        },
      };
      Object.entries(page)
        .filter(([, override]) => override.inserted?.parentId === sourceId)
        .forEach(([childId]) => cloneTree(childId, nextId));
    };

    sourceIds.forEach((id) => {
      const source = page[id]?.inserted;
      if (source) cloneTree(id, source.parentId);
    });

    commit({ ...currentState, pages: { ...currentState.pages, [pagePath]: newPage } });
    setSelectedIds([]);
    setSelected(null);
    refreshFrame();
    notify(sourceIds.length > 1 ? "Блоки дублированы" : "Блок дублирован");
  }

  function groupInsertedSelection() {
    const ids = selectedIds.filter((id) => Boolean(stateRef.current.pages[pagePath]?.[id]?.inserted));
    if (ids.length < 2) {
      notify("Выбери минимум два Studio-блока");
      return;
    }
    const page = stateRef.current.pages[pagePath] ?? {};
    const sources = ids.map((id) => page[id]?.inserted).filter((item): item is StudioInsertedBlock => Boolean(item));
    const parentId = sources[0]?.parentId;
    if (!parentId || sources.some((item) => item.parentId !== parentId)) {
      notify("Блоки должны быть в одном контейнере");
      return;
    }
    const groupId = stableInsertedId("frame-" + crypto.randomUUID());
    const maxOrder = Math.max(...Object.values(page).map((item) => item.inserted?.order ?? 0), 0);
    const frame: StudioInsertedBlock = { parentId, kind: "container", text: "Frame", order: maxOrder + 1, css: { display: "block" } };
    const nextPage: StudioState["pages"][string] = { ...page, [groupId]: { inserted: frame } };
    ids.forEach((id, index) => {
      const override = nextPage[id];
      if (!override?.inserted) return;
      nextPage[id] = { ...override, inserted: { ...override.inserted, parentId: groupId, order: index } };
    });
    commit({ ...stateRef.current, pages: { ...stateRef.current.pages, [pagePath]: nextPage } });
    setSelected(null);
    setSelectedIds([groupId]);
    refreshFrame();
    window.setTimeout(() => selectInFrame(groupId), 0);
    notify("Frame создан");
  }

  function moveSelectionBy(dx: number, dy: number, editKey?: string) {
    const ids = selectedIdsRef.current.length > 1
      ? selectedIdsRef.current
      : selected?.id
        ? [selected.id]
        : [];
    if (!ids.length) return;

    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const nextPage = { ...page };
    const currentOffsets: Record<string, StudioPositionOffset> = {};

    ids.forEach((id) => {
      const current = nextPage[id] ?? {};
      if (current.locked) return;
      const offset = device === "desktop"
        ? current.positionOffset ?? { x: 0, y: 0 }
        : current.responsivePositionOffset?.[device] ?? current.positionOffset ?? { x: 0, y: 0 };
      currentOffsets[id] = offset;
      const nextOffset = { x: Math.round(offset.x + dx), y: Math.round(offset.y + dy) };
      nextPage[id] = device === "desktop"
        ? { ...current, positionOffset: nextOffset }
        : {
            ...current,
            responsivePositionOffset: {
              ...(current.responsivePositionOffset ?? {}),
              [device]: nextOffset,
            },
          };
      const element = findElement(frameRef.current?.contentDocument ?? null, id);
      if (element) element.style.translate = nextOffset.x + "px " + nextOffset.y + "px";
    });

    const nextState = { ...currentState, pages: { ...currentState.pages, [pagePath]: nextPage } };
    if (editKey) {
      if (liveEditRef.current !== editKey) {
        undoRef.current.push(currentState);
        if (undoRef.current.length > 50) undoRef.current.shift();
        redoRef.current = [];
        liveEditRef.current = editKey;
      }
      writeState(nextState);
    } else {
      commit(nextState);
    }
  }

  function nudgeSelection(dx: number, dy: number) {
    const ids = selectedIds.length ? selectedIds : selected ? [selected.id] : [];
    if (!ids.length) return;
    const currentState = stateRef.current;
    const page = currentState.pages[pagePath] ?? {};
    const nextPage = { ...page };
    ids.forEach((id) => {
      const current = nextPage[id] ?? {};
      if (current.locked) return;
      const offset = device === "desktop"
        ? current.positionOffset ?? { x: 0, y: 0 }
        : current.responsivePositionOffset?.[device] ?? current.positionOffset ?? { x: 0, y: 0 };
      const nextOffset = { x: offset.x + dx, y: offset.y + dy };
      nextPage[id] = device === "desktop"
        ? { ...current, positionOffset: nextOffset }
        : {
            ...current,
            responsivePositionOffset: {
              ...(current.responsivePositionOffset ?? {}),
              [device]: nextOffset,
            },
          };
      const element = findElement(frameRef.current?.contentDocument ?? null, id);
      if (element) element.style.translate = nextOffset.x + "px " + nextOffset.y + "px";
    });
    commit({ ...currentState, pages: { ...currentState.pages, [pagePath]: nextPage } });
    notify(ids.length > 1 ? "Group moved" : "Layer moved");
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
          <div className={selected?.id === node.id ? "studio-v2-layer-row active" : selectedIds.includes(node.id) ? "studio-v2-layer-row multi-active" : "studio-v2-layer-row"}>
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
              onClick={(event) => selectInFrame(node.id, event.shiftKey)}
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
              {node.inserted ? <GripVertical className="studio-v2-layer-grip" size={12} aria-hidden="true" /> : null}
              <span className="studio-v2-layer-tag">{node.tag}</span>
              <span className="studio-v2-layer-name">
                <b>{node.label || "(без текста)"}</b>
                {node.className && <small>.{node.className.split(" ")[0]}</small>}
              </span>
              {node.inserted && <span className="studio-v2-insert-badge">NEW</span>}
            </button>
            <button
              type="button"
              className="studio-v2-layer-more"
              title="Layer actions"
              aria-label="Layer actions"
              onClick={(event) => {
                event.stopPropagation();
                setContextMenu({
                  id: node.id,
                  x: Math.min(event.clientX, window.innerWidth - 210),
                  y: Math.min(event.clientY, window.innerHeight - 260),
                });
              }}
            ><MoreVertical size={13} /></button>
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
          <button type="button" className={showGrid ? "active" : ""} onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={14} /> Grid / Snap</button>
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
                  {selectedIds.length > 1 ? <em className="studio-v2-multi-badge">{selectedIds.length} SELECTED</em> : null}
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
                        {selectedIds.length > 1 ? (
                          <div className="studio-v2-batch-panel">
                            <div className="studio-v2-batch-title"><span>GROUP</span><b>{selectedIds.length} layers selected</b></div>
                            <div className="studio-v2-batch-actions">
                              <button type="button" onClick={() => applyBatchAlignment("left")}><AlignLeft size={12} /> Left</button>
                              <button type="button" onClick={() => applyBatchAlignment("centerX")}><AlignCenter size={12} /> Center</button>
                              <button type="button" onClick={() => applyBatchAlignment("right")}><AlignRight size={12} /> Right</button>
                              <button type="button" onClick={() => applyBatchAlignment("top")}>↑ Top</button>
                              <button type="button" onClick={() => applyBatchAlignment("centerY")}>↕ Middle</button>
                              <button type="button" onClick={() => applyBatchAlignment("bottom")}>↓ Bottom</button>
                              <button type="button" onClick={() => applyBatchAlignment("distributeX")}>↔ Distribute X</button>
                              <button type="button" onClick={() => applyBatchAlignment("distributeY")}>↕ Distribute Y</button>
                            </div>
                            <button type="button" className="studio-v2-clear-selection" onClick={clearMultiSelection}>Leave multi-select</button>
                          </div>
                        ) : null}

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
                        <div className="studio-v2-auto-layout">
                          <div className="studio-v2-auto-layout-head"><span>AUTO LAYOUT</span><small>flex / grid</small></div>
                          <div className="studio-v2-auto-layout-presets">
                            <button type="button" onClick={() => setAutoLayout("flow")}>Flow</button>
                            <button type="button" onClick={() => setAutoLayout("row")}>Row</button>
                            <button type="button" onClick={() => setAutoLayout("column")}>Column</button>
                            <button type="button" onClick={() => setAutoLayout("grid")}>Grid</button>
                          </div>
                          {styleForDevice("display") === "flex" ? (
                            <div className="studio-v2-field-grid compact">
                              <label className="studio-v2-field"><span>Direction</span><select value={styleForDevice("flexDirection") || "row"} onChange={(event) => updateStyle("flexDirection", event.target.value)}><option value="row">row</option><option value="column">column</option><option value="row-reverse">row-reverse</option><option value="column-reverse">column-reverse</option></select></label>
                              <label className="studio-v2-field"><span>Wrap</span><select value={styleForDevice("flexWrap") || "nowrap"} onChange={(event) => updateStyle("flexWrap", event.target.value)}><option value="nowrap">nowrap</option><option value="wrap">wrap</option><option value="wrap-reverse">wrap-reverse</option></select></label>
                              <label className="studio-v2-field"><span>Justify</span><select value={styleForDevice("justifyContent") || "flex-start"} onChange={(event) => updateStyle("justifyContent", event.target.value)}><option value="flex-start">start</option><option value="center">center</option><option value="flex-end">end</option><option value="space-between">between</option><option value="space-around">around</option><option value="space-evenly">even</option></select></label>
                              <label className="studio-v2-field"><span>Align</span><select value={styleForDevice("alignItems") || "stretch"} onChange={(event) => updateStyle("alignItems", event.target.value)}><option value="stretch">stretch</option><option value="flex-start">start</option><option value="center">center</option><option value="flex-end">end</option><option value="baseline">baseline</option></select></label>
                            </div>
                          ) : null}
                          {styleForDevice("display") === "grid" ? (
                            <div className="studio-v2-field-grid compact">
                              <label className="studio-v2-field wide"><span>Grid columns</span><input value={styleForDevice("gridTemplateColumns") || ""} onChange={(event) => updateStyle("gridTemplateColumns", event.target.value)} placeholder="repeat(2, 1fr)" /></label>
                              <label className="studio-v2-field wide"><span>Grid rows</span><input value={styleForDevice("gridTemplateRows") || ""} onChange={(event) => updateStyle("gridTemplateRows", event.target.value)} placeholder="auto auto" /></label>
                            </div>
                          ) : null}
                        </div>

                        {selected.inserted ? (
                          <div className="studio-v2-constraints-panel">
                            <div className="studio-v2-auto-layout-head"><span>CONSTRAINTS</span><small>{device === "desktop" ? "base" : DEVICE_LABEL[device]}</small></div>
                            <div className="studio-v2-constraint-row">
                              <label className="studio-v2-field"><span>Horizontal</span><select value={activeConstraints?.horizontal || "none"} onChange={(event) => updateConstraints({ horizontal: event.target.value as StudioLayoutConstraints["horizontal"], vertical: activeConstraints?.vertical || "none" })}><option value="none">free</option><option value="left">left</option><option value="right">right</option><option value="stretch">stretch</option></select></label>
                              <label className="studio-v2-field"><span>Vertical</span><select value={activeConstraints?.vertical || "none"} onChange={(event) => updateConstraints({ horizontal: activeConstraints?.horizontal || "none", vertical: event.target.value as StudioLayoutConstraints["vertical"] })}><option value="none">free</option><option value="top">top</option><option value="bottom">bottom</option><option value="stretch">stretch</option></select></label>
                            </div>
                            <small className="studio-v2-constraints-help">Pins use absolute positioning inside the current parent.</small>
                          </div>
                        ) : null}

                        <div className="studio-v2-position-grid">
                          <label className="studio-v2-field">
                            <span>X / {device === "desktop" ? "base" : DEVICE_LABEL[device]}</span>
                            <input
                              type="number"
                              value={Math.round(activePositionOffset?.x ?? 0)}
                              onFocus={() => { liveEditRef.current = null; }}
                              onChange={(event) => updatePositionOffset(selected.id, { x: Number(event.target.value) || 0, y: activePositionOffset?.y ?? 0 }, "position:" + device + ":" + selected.id)}
                              onBlur={finishLiveEdit}
                            />
                          </label>
                          <label className="studio-v2-field">
                            <span>Y / {device === "desktop" ? "base" : DEVICE_LABEL[device]}</span>
                            <input
                              type="number"
                              value={Math.round(activePositionOffset?.y ?? 0)}
                              onFocus={() => { liveEditRef.current = null; }}
                              onChange={(event) => updatePositionOffset(selected.id, { x: activePositionOffset?.x ?? 0, y: Number(event.target.value) || 0 }, "position:" + device + ":" + selected.id)}
                              onBlur={finishLiveEdit}
                            />
                          </label>
                          <button type="button" className="studio-v2-position-reset" onClick={() => {
                            updatePositionOffset(selected.id, { x: 0, y: 0 });
                            notify("Позиция сброшена");
                          }}><RotateCcw size={12} /> Reset offset</button>
                        </div>

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
                          {device !== "desktop" && activeResponsiveCss && Object.keys(activeResponsiveCss).length ? (
                            <button type="button" onClick={resetResponsive}><RotateCcw size={13} /> Reset {DEVICE_LABEL[device]}</button>
                          ) : null}
                          <button type="button" onClick={() => toggleLocked()}>{activeOverride?.locked ? <Unlock size={13} /> : <Lock size={13} />} {activeOverride?.locked ? "Unlock" : "Lock"}</button>
                          <button type="button" onClick={() => moveLayerOrder("forward")}><ChevronRight size={13} /> Forward</button>
                          <button type="button" onClick={() => moveLayerOrder("backward")}><ChevronLeft size={13} /> Back</button>
                          <button type="button" onClick={toggleHidden}><EyeOff size={13} /> {activeOverride?.hidden ? "Показать" : "Скрыть"}</button>
                          <button type="button" className="danger" onClick={removeSelected}>{selected.inserted ? <Trash2 size={13} /> : <EyeOff size={13} />} {selected.inserted ? "Удалить блок" : "Скрыть элемент"}</button>
                        </div>
                      </div>
                    ) : null}

                    {openSections[section] && section === "advanced" ? (
                      <div className="studio-v2-section-body">
                        <label className="studio-v2-field wide">
                          <span>Transform</span>
                          <input value={styleForDevice("transform") ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("transform", event.target.value)} onBlur={finishLiveEdit} />
                        </label>
                        <label className="studio-v2-field wide">
                          <span>Transition</span>
                          <input value={styleForDevice("transition") ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("transition", event.target.value)} onBlur={finishLiveEdit} />
                        </label>
                        <label className="studio-v2-field wide">
                          <span>Custom CSS</span>
                          <textarea value={styleForDevice("customCss") ?? ""} onFocus={() => { liveEditRef.current = null; }} onChange={(event) => updateStyle("customCss", event.target.value)} onBlur={finishLiveEdit} placeholder="background: linear-gradient(...);" />
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

      {contextMenu ? (
        <div
          className="studio-v2-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="studio-v2-context-title">LAYER ACTIONS</div>
          <button type="button" onClick={() => { selectInFrame(contextMenu.id); setContextMenu(null); }}><MousePointer2 size={13} /> Select</button>
          <button type="button" onClick={() => { toggleLocked(contextMenu.id); setContextMenu(null); }}>
            {state.pages[pagePath]?.[contextMenu.id]?.locked ? <Unlock size={13} /> : <Lock size={13} />}
            {state.pages[pagePath]?.[contextMenu.id]?.locked ? "Unlock" : "Lock"}
          </button>
          <button type="button" onClick={() => { toggleHiddenById(contextMenu.id); setContextMenu(null); }}>
            {state.pages[pagePath]?.[contextMenu.id]?.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            {state.pages[pagePath]?.[contextMenu.id]?.hidden ? "Show" : "Hide"}
          </button>
          {state.pages[pagePath]?.[contextMenu.id]?.inserted ? (
            <button type="button" onClick={() => { duplicateInserted([contextMenu.id]); setContextMenu(null); }}><CopyPlus size={13} /> Duplicate</button>
          ) : null}
          <div className="studio-v2-context-separator" />
          <button type="button" onClick={() => { setContextMenu(null); moveLayerOrder("forward", contextMenu.id); }}><ChevronRight size={13} /> Bring forward</button>
          <button type="button" onClick={() => { setContextMenu(null); moveLayerOrder("backward", contextMenu.id); }}><ChevronLeft size={13} /> Send backward</button>
          <button type="button" onClick={() => { setContextMenu(null); moveLayerOrder("front", contextMenu.id); }}><ChevronsUp size={13} /> Bring to front</button>
          <button type="button" onClick={() => { setContextMenu(null); moveLayerOrder("back", contextMenu.id); }}><ChevronsDown size={13} /> Send to back</button>
          {selectedIds.length > 1 && selectedIds.every((id) => Boolean(state.pages[pagePath]?.[id]?.inserted)) ? (
            <button type="button" onClick={() => { groupInsertedSelection(); setContextMenu(null); }}><Group size={13} /> Group / Frame</button>
          ) : null}
          <div className="studio-v2-context-shortcuts">↑↓ MOVE · SHIFT ×8 · CMD/CTRL+D DUPLICATE</div>
        </div>
      ) : null}

      {toast ? <div className="studio-v2-toast"><Check size={14} /> {toast}</div> : null}
    </main>
  );
}
