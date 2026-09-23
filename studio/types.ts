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