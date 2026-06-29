import { useEffect, useRef, useState, memo } from 'react';
import { renderMermaid, initMermaid } from '@/services/mermaid';

/**
 * Mermaid 图表缩略图：懒渲染 + 错误降级
 *
 * 使用场景：「我的图表」列表卡片预览图
 *
 * 设计要点：
 * - IntersectionObserver 监听卡片进入视口才渲染，离屏卡片零开销
 * - 渲染失败（语法错误等）时降级为占位图，不阻塞列表展示
 * - memo 包裹：相同 code 不重复渲染（同一图表在列表/筛选切换时可能复用）
 * - SVG 用 viewBox 自适应缩放，固定容器高度，居中展示
 *
 * 不做的事：
 * - 不复用编辑器主题变量（缩略图固定 light 主题，避免列表与编辑器主题耦合）
 * - 不支持点击交互（点击行为由父级卡片处理）
 */
interface MermaidThumbnailProps {
  /** Mermaid 源代码 */
  code: string;
  /** 缩略图唯一 id（用于 mermaid.render 的挂载点） */
  id: string;
  /** 容器高度，默认 120px */
  height?: number;
}

type RenderState = 'idle' | 'rendering' | 'success' | 'error';

const MermaidThumbnailInner = ({ code, id, height = 120 }: MermaidThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RenderState>('idle');
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 已渲染成功/失败则不再重复触发
    if (state !== 'idle') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            setState('rendering');
            // 初始化为 light 主题（缩略图独立于编辑器主题）
            initMermaid('light', 'strict', 'default');
            // 用 requestIdleCallback 避免阻塞主线程渲染
            const run = () => {
              renderMermaid(`thumb-${id}`, code)
                .then((svgStr) => {
                  setSvg(svgStr);
                  setState('success');
                })
                .catch(() => {
                  setState('error');
                });
            };
            const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
            if (ric) {
              ric(run);
            } else {
              setTimeout(run, 0);
            }
          }
        }
      },
      { rootMargin: '50px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [code, id, state]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-light-2 dark:bg-dark-3 rounded-lg flex items-center justify-center overflow-hidden"
      style={{ height }}
    >
      {state === 'idle' || state === 'rendering' ? (
        <div className="w-3/4 h-2 bg-light-3 dark:bg-dark-4 rounded animate-pulse" />
      ) : state === 'error' ? (
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">📊</span>
          <span className="text-[10px]">预览不可用</span>
        </div>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};

export const MermaidThumbnail = memo(MermaidThumbnailInner);
