import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { renderMarkdown } from '@/services/markdown';
import { useThemeStore } from '@/contexts/ThemeContext';

/**
 * Markdown 预览
 * - debounce 300ms 调用 renderMarkdown（含 mermaid 异步渲染）
 * - 主题切换时需重新渲染（mermaid 主题变量依赖 initMermaid）
 * - 工具栏支持「导出 MD」：将原始 MD 源码打包为 .md 文件下载（P3）
 *
 * 注：mermaid 块的右键「用 AI 修改」菜单已移除——AISidebar 在 Markdown 编辑场景
 * 不再承载 mermaid 块级别的编辑入口，避免误操作覆盖文档源码。如需 AI 修改图表，
 * 用户可在绘图编辑器（/editor）内进行。mermaid 块恢复浏览器默认右键行为（复制图片等）。
 */
const DEBOUNCE_MS = 300;

interface MarkdownPreviewProps {
  content: string;
  /** 预留接口：当前未使用，保留以兼容历史调用方签名 */
  onUpdateMermaidBlock?: (oldCode: string, newCode: string) => void;
  /** 导出 .md 文件名（不含扩展名），默认 'document' */
  exportFileName?: string;
  /** 点击「全屏预览」按钮时回调，由父组件渲染全屏覆盖层 */
  onEnterFullscreen?: () => void;
  /** 隐藏组件自带工具栏：全屏模式下由外层提供统一导航栏，避免双栏叠加 */
  hideToolbar?: boolean;
}

export const MarkdownPreview = ({ content, onUpdateMermaidBlock, exportFileName, onEnterFullscreen, hideToolbar = false }: MarkdownPreviewProps) => {
  const [html, setHtml] = useState<string>('');
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // onUpdateMermaidBlock 当前为预留接口，引用以避免 ESLint 未使用变量告警
  void onUpdateMermaidBlock;

  useEffect(() => {
    if (!content || !content.trim()) {
      setHtml('');
      setError(null);
      return;
    }

    let cancelled = false;
    setRendering(true);

    const timer = setTimeout(async () => {
      try {
        const result = await renderMarkdown(content, theme);
        if (!cancelled) {
          setHtml(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '渲染失败');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, theme]);

  // 导出原始 Markdown 源码为 .md 文件（P3）
  // 文件名非法字符替换为下划线，避免跨平台文件名问题
  const handleExportMd = useCallback(() => {
    if (!content.trim()) return;
    const safeName = (exportFileName || 'document')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 80) || 'document';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, exportFileName]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-light-1 dark:bg-dark-1">
        <div className="text-center max-w-md">
          <div className="text-error text-sm font-medium mb-2">渲染出错</div>
          <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap text-left">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-light-1 dark:bg-dark-1">
      {/* 工具栏：全屏模式下隐藏，由外层统一导航栏承载 */}
      {!hideToolbar && (
      <div className="flex items-center justify-between px-4 py-1.5 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-dark-1 dark:text-white">预览</span>
          {rendering && (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline">{content ? `${content.length} 字符` : '空文档'}</span>
          <button
            onClick={handleExportMd}
            disabled={!content.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="导出 Markdown 文件"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出 MD</span>
          </button>
          {onEnterFullscreen && (
            <button
              onClick={onEnterFullscreen}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors"
              title="全屏预览（ESC 退出）"
              aria-label="全屏预览"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">全屏</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* 渲染容器
          注意：React 不允许同时设置 children 与 dangerouslySetInnerHTML
          （assertValidProps 检查 children != null，false 也会触发）。
          因此按 html 是否存在拆成两条分支，避免同时存在。 */}
      {html ? (
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-auto px-6 py-6 markdown-body md-print-root"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-auto px-6 py-6 markdown-body md-print-root"
        >
          {!rendering && (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center mt-12">
              在左侧输入 Markdown，预览将实时显示
            </div>
          )}
        </div>
      )}
    </div>
  );
};
