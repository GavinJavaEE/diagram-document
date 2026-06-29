import mermaid, { type MermaidConfig } from 'mermaid';
import type { Theme } from '@/contexts/ThemeContext';
import type { ChartTheme } from '@/contexts/SettingsContext';

// Mermaid 11.x 使用 ESM 动态导入，无需静态注册图表类型

export type MermaidSecurityLevel = 'loose' | 'strict';

// 主题变量模板：集中管理，避免在多处重复配置
const buildThemeVariables = (theme: Theme): MermaidConfig['themeVariables'] => {
  if (theme === 'dark') {
    return {
      primaryColor: '#58A6FF',
      primaryTextColor: '#F0F6FC',
      primaryBorderColor: '#58A6FF',
      lineColor: '#8B949E',
      secondaryColor: '#161B22',
      tertiaryColor: '#21262D',
      background: '#0D1117',
      mainBkg: '#161B22',
      nodeBorder: '#58A6FF',
      clusterBkg: '#21262D',
      clusterBorder: '#30363D',
      titleColor: '#F0F6FC',
      edgeLabelBackground: '#161B22',
    };
  }
  return {
    primaryColor: '#4F46E5',
    primaryTextColor: '#1E293B',
    primaryBorderColor: '#4F46E5',
    lineColor: '#64748B',
    secondaryColor: '#F1F5F9',
    tertiaryColor: '#E2E8F0',
    background: '#FFFFFF',
    mainBkg: '#F8FAFC',
    nodeBorder: '#4F46E5',
    clusterBkg: '#F1F5F9',
    clusterBorder: '#CBD5E1',
    titleColor: '#1E293B',
    edgeLabelBackground: '#F8FAFC',
  };
};

const buildConfig = (
  theme: Theme,
  securityLevel: MermaidSecurityLevel,
  chartTheme: ChartTheme = 'default',
): MermaidConfig => {
  // 非 default 图表主题（forest/neutral/dark）：直接使用 mermaid 内置主题，让 mermaid 管理配色
  if (chartTheme !== 'default') {
    return {
      startOnLoad: false,
      theme: chartTheme, // 'forest' | 'neutral' | 'dark' 直接映射到 mermaid 内置主题
      // suppressErrorRendering=true：语法错误时不往 DOM 注入炸弹错误面板，
      // 只在 render() 的 Promise 中抛出异常，由调用方（缩略图/编辑器）自行处理降级 UI
      suppressErrorRendering: true,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 20,
        diagramMarginY: 20,
      },
      securityLevel,
    };
  }
  // default 主题：用自定义变量精细控制 light/dark 配色
  return {
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    themeVariables: buildThemeVariables(theme),
    suppressErrorRendering: true,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
    },
    sequence: {
      useMaxWidth: true,
      diagramMarginX: 20,
      diagramMarginY: 20,
    },
    securityLevel,
  };
};

// 幂等控制：避免相同参数重复 initialize
let lastKey: string | null = null;

/**
 * 初始化 Mermaid（幂等）。
 * - 编辑器场景使用 `securityLevel: 'loose'`（保留 htmlLabels 等富文本能力）
 * - 分享/公开场景使用 `securityLevel: 'strict'`（防注入）
 * - chartTheme 控制图表配色主题（default/forest/neutral/dark），用户可在设置面板切换
 */
export const initMermaid = (
  theme: Theme = 'dark',
  securityLevel: MermaidSecurityLevel = 'strict',
  chartTheme: ChartTheme = 'default',
): void => {
  const key = `${theme}:${securityLevel}:${chartTheme}`;
  if (lastKey === key) return;
  mermaid.initialize(buildConfig(theme, securityLevel, chartTheme));
  lastKey = key;
};

/** 强制重新初始化（仅在异常恢复时使用） */
export const resetMermaidInit = (): void => {
  lastKey = null;
};

export const renderMermaid = async (id: string, code: string): Promise<string> => {
  // 使用 detached 临时 div 渲染，避免 mermaid 内部往 container 注入错误面板等副作用污染实际页面 DOM
  // （mermaid v11 语法错误时即便 suppressErrorRendering=true，早期版本仍可能往 container 插入节点）
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = '800px';
  tempContainer.style.visibility = 'hidden';
  document.body.appendChild(tempContainer);
  try {
    const { svg } = await mermaid.render(id, code, tempContainer);
    return svg;
  } catch (err) {
    throw err;
  } finally {
    // 无论成功失败都清理临时容器及其子节点（可能残留的错误面板）
    tempContainer.remove();
  }
};

export const parseMermaidError = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message;
    // Try to extract line number from mermaid error
    const lineMatch = message.match(/line\s*(\d+)/i);
    if (lineMatch) {
      return `Line ${lineMatch[1]}: ${message}`;
    }
    return message;
  }
  return 'Unknown error occurred';
};
