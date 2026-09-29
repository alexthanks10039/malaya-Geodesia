/**
 * ARCHITECTURE: Studio shared contracts.
 * Описывает типы административного интерфейса и конфигурации без зависимости от конкретного экрана.
 */

export type StudioPage = {
  label: string;
  path: string;
  description: string;
};

export type StudioCssOverrides = {
  fontSize?: string;
  lineHeight?: string;
  fontWeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  color?: string;
  background?: string;
  border?: string;
  borderRadius?: string;
  boxShadow?: string;
  padding?: string;
  margin?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  gap?: string;
  display?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  overflow?: string;
  minWidth?: string;
  minHeight?: string;
  opacity?: string;
  position?: string;
  zIndex?: string;
  transform?: string;
  transition?: string;
  customCss?: string;
};

export type StudioInsertedBlock = {
  parentId: string;
  kind: "text" | "button" | "divider" | "container";
  text: string;
  href?: string;
  order?: number;
  css?: StudioCssOverrides;
};

export type StudioResponsiveDevice = "desktop" | "tablet" | "mobile";

export type StudioPositionOffset = {
  x: number;
  y: number;
};

export type StudioLayoutConstraints = {
  horizontal?: "none" | "left" | "right" | "stretch";
  vertical?: "none" | "top" | "bottom" | "stretch";
};

export type StudioElementOverride = {
  text?: string;
  css?: StudioCssOverrides;
  responsiveCss?: Partial<Record<StudioResponsiveDevice, StudioCssOverrides>>;
  positionOffset?: StudioPositionOffset;
  responsivePositionOffset?: Partial<Record<StudioResponsiveDevice, StudioPositionOffset>>;
  attributes?: {
    href?: string;
    alt?: string;
    title?: string;
  };
  hidden?: boolean;
  locked?: boolean;
  constraints?: StudioLayoutConstraints;
  responsiveConstraints?: Partial<Record<StudioResponsiveDevice, StudioLayoutConstraints>>;
  inserted?: StudioInsertedBlock;
};

export type StudioPageOverrides = Record<string, StudioElementOverride>;

export type StudioComment = {
  id: string;
  pagePath: string;
  nodeId: string;
  nodeLabel: string;
  text: string;
  resolved: boolean;
  createdAt: string;
};

export type StudioGlobalTokens = {
  "--bg"?: string;
  "--paper"?: string;
  "--ink"?: string;
  "--muted"?: string;
  "--acid"?: string;
  "--line"?: string;
  "--acid-soft"?: string;
};

export type StudioState = {
  version?: number;
  pages: Record<string, StudioPageOverrides>;
  globalTokens: StudioGlobalTokens;
  comments?: StudioComment[];
};