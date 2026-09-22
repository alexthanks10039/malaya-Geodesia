export type StudioPage = {
  label: string;
  path: string;
  description: string;
};

export type StudioCssOverrides = {
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  background?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  width?: string;
  maxWidth?: string;
  gap?: string;
  letterSpacing?: string;
  opacity?: string;
  display?: string;
};

export type StudioElementOverride = {
  text?: string;
  css?: StudioCssOverrides;
};

export type StudioPageOverrides = Record<string, StudioElementOverride>;

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
  pages: Record<string, StudioPageOverrides>;
  globalTokens: StudioGlobalTokens;
};
