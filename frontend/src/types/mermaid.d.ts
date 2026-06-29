interface MermaidRenderResult {
  svg: string;
  bindFunctions: () => void;
}

interface MermaidThemeVariables {
  primaryColor?: string;
  primaryTextColor?: string;
  primaryBorderColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  [key: string]: string | undefined;
}

interface MermaidConfig {
  startOnLoad?: boolean;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  themeVariables?: MermaidThemeVariables;
  [key: string]: unknown;
}

interface MermaidAPI {
  initialize: (config: MermaidConfig) => void;
  render: (id: string, code: string) => Promise<MermaidRenderResult>;
}

declare global {
  interface Window {
    mermaid?: MermaidAPI;
  }
}
