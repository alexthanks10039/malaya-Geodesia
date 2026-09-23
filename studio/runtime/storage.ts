import type { CalculatorStudioConfig } from "@/studio/config/calculator";
import type { StudioGlobalTokens, StudioPageOverrides, StudioState } from "@/studio/types";

export const STUDIO_MODE_KEY = "malaya-studio-mode";
export const STUDIO_OVERRIDES_KEY = "malaya-studio-overrides";
export const STUDIO_CALCULATOR_KEY = "malaya-studio-calculator";

const emptyState: StudioState = {
  version: 2,
  pages: {},
  globalTokens: {},
  comments: [],
};

export function readStudioState(): StudioState {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(STUDIO_OVERRIDES_KEY);
    if (!raw) return emptyState;

    const parsed = JSON.parse(raw) as Partial<StudioState>;
    return {
      version: 2,
      pages: parsed.pages && typeof parsed.pages === "object" ? parsed.pages : {},
      globalTokens: parsed.globalTokens && typeof parsed.globalTokens === "object" ? parsed.globalTokens : {},
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    return emptyState;
  }
}

export function writeStudioState(state: StudioState): void {
  window.localStorage.setItem(STUDIO_OVERRIDES_KEY, JSON.stringify(state));
}

export function readCalculatorConfig(): CalculatorStudioConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_CALCULATOR_KEY);
    return raw ? JSON.parse(raw) as CalculatorStudioConfig : null;
  } catch {
    return null;
  }
}

export function writeCalculatorConfig(config: CalculatorStudioConfig): void {
  window.localStorage.setItem(STUDIO_CALCULATOR_KEY, JSON.stringify(config));
}

export function clearStudioDrafts(): void {
  window.localStorage.removeItem(STUDIO_OVERRIDES_KEY);
  window.localStorage.removeItem(STUDIO_CALCULATOR_KEY);
}

export function mergePageOverride(
  current: StudioState,
  path: string,
  nodeId: string,
  override: StudioPageOverrides[string],
): StudioState {
  const currentNode = current.pages[path]?.[nodeId];

  return {
    ...current,
    pages: {
      ...current.pages,
      [path]: {
        ...(current.pages[path] ?? {}),
        [nodeId]: {
          ...(currentNode ?? {}),
          ...override,
          css: override.css
            ? {
                ...(currentNode?.css ?? {}),
                ...override.css,
              }
            : currentNode?.css,
        },
      },
    },
  };
}

export function setGlobalToken(
  current: StudioState,
  name: keyof StudioGlobalTokens,
  value: string,
): StudioState {
  return {
    ...current,
    globalTokens: {
      ...current.globalTokens,
      [name]: value,
    },
  };
}
