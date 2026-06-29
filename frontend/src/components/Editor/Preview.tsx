import React, { useRef, useEffect, useState, useCallback, type MouseEvent as RMouseEvent, type WheelEvent as RWheelEvent } from 'react';
import { initMermaid, renderMermaid } from '@/services/mermaid';
import { useEditorStore, getChartTypeInfo, useChartType } from '@/contexts/EditorContext';
import { useThemeStore } from '@/contexts/ThemeContext';
import { useAIStore } from '@/contexts/AIContext';
import { useActiveSettings, useSettingsStore } from '@/contexts/SettingsContext';
import { Eye, Download, ZoomIn, ZoomOut, AlertCircle, Maximize2, Move, CheckCircle2, RefreshCw, ChevronDown, FileType2, FileImage, Wand2, Settings } from 'lucide-react';

type Transform = {
  scale: number;
  x: number;
  y: number;
};

const defaultTransform: Transform = { scale: 1.3, x: 0, y: 0 };
const defaultFullscreenTransform: Transform = { scale: 1.6, x: 0, y: 0 };

const DEBOUNCE_MS = 300;

export const Preview = () => {
  const { code, setError: setStoreError, setHighlightedNodeId } = useEditorStore();
  const currentChartType = useChartType();
  const { theme } = useThemeStore();
  const { chartTheme } = useActiveSettings();
  const openSidebar = useAIStore((s) => s.openSidebar);
  const openSettings = useSettingsStore((s) => s.openDrawer);
  const chartInfo = getChartTypeInfo(currentChartType);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  // 本地跟踪当前点选的节点 ID（用 ref 避免 setHighlightedNodeId 触发 Preview 重渲染）
  const highlightedNodeIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>(defaultTransform);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenTransform, setFullscreenTransform] = useState<Transform>(defaultTransform);
  const [exportState, setExportState] = useState<'idle' | 'success'>('idle');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 清理 mermaid 渲染失败时可能泄漏到 body 直接子级的错误 SVG / 提示元素。
  // 仅做定点清理（不遍历整棵树、不持续监听），性能开销极低。
  const cleanupMermaidErrorElements = useCallback(() => {
    try {
      const bodyChildren = document.body.children;
      for (let i = bodyChildren.length - 1; i >= 0; i--) {
        const el = bodyChildren[i];
        if (!(el instanceof Element)) continue;
        // 关键防御：绝不能移除应用根节点 #root，否则整个 React 应用会从 DOM 消失导致白屏
        // 历史教训：旧逻辑用 textContent.includes('Parse error') 判断错误面板，
        // 但 #root 内部渲染的错误 UI 也含 'Parse error'，导致 #root 被误删
        if (el.id === 'root') continue;
        const text = el.textContent || '';
        // mermaid 错误面板特征：直接挂在 body 下的 svg/div，含错误关键词
        // 注意：textContent 会递归包含所有后代文本，因此必须排除 #root
        const isErrorLike =
          (el.tagName === 'svg' || el.tagName === 'DIV') &&
          (text.includes('Syntax error') ||
            text.includes('Parse error') ||
            text.includes('mermaid version'));
        if (isErrorLike) {
          el.remove();
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }, []);

  // --- Mermaid 初始化（幂等，主题/图表配色变化时复用 services 的初始化）---
  // 编辑器场景使用 loose 以保留 htmlLabels 富文本；分享场景应使用 strict（见 services/mermaid.ts）。
  // chartTheme 变化时（用户在设置面板切换配色）会触发重新初始化，实现实时预览。
  useEffect(() => {
    try {
      initMermaid(theme, 'loose', chartTheme);
    } catch (e) {
      console.error('Mermaid init error:', e);
    }
    cleanupMermaidErrorElements();
  }, [theme, chartTheme, cleanupMermaidErrorElements]);

  // 点击导出下拉菜单外部时关闭
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  /**
   * 绑定 SVG 节点点击事件（包5 只读高亮版）。
   * mermaid 渲染的节点 <g> 通常带 class="node" 且 id 形如 "flowchart-A-0"，
   * 其中 A 是源码中的节点 ID。点击时提取该 ID 写入 store，CodeEditor 据此高亮。
   * 同时给被点击节点加视觉高亮（outline），再次点击同一节点取消高亮。
   */
  const bindNodeClickHandlers = useCallback((container: HTMLDivElement) => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const nodes = svg.querySelectorAll<SVGGElement>('.node, .edgePath, .node.default, .cluster');
    nodes.forEach((node) => {
      node.style.cursor = 'pointer';
      node.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        // 从 id 解析节点 ID：mermaid 常见格式 "flowchart-A-0"、"A"、"nodeId" 等
        const rawId = node.id || '';
        // 匹配 flowchart/graph: "flowchart-{nodeId}-{n}" → 取中间段
        // 其他类型通常 id 就是 nodeId 本身
        let nodeId = rawId;
        const m = rawId.match(/(?:flowchart|graph)-(.+)-\d+$/);
        if (m) {
          nodeId = m[1];
        }
        if (!nodeId) return;
        // 清除之前的点击高亮
        svg.querySelectorAll('.node-clicked').forEach((el) => el.classList.remove('node-clicked'));
        // 切换高亮：若与当前相同则取消
        if (highlightedNodeIdRef.current === nodeId) {
          highlightedNodeIdRef.current = null;
          setHighlightedNodeId(null);
        } else {
          highlightedNodeIdRef.current = nodeId;
          node.classList.add('node-clicked');
          setHighlightedNodeId(nodeId);
        }
      });
    });
    // 点击 SVG 空白处清除高亮
    svg.addEventListener('click', () => {
      if (highlightedNodeIdRef.current) {
        highlightedNodeIdRef.current = null;
        setHighlightedNodeId(null);
        svg.querySelectorAll('.node-clicked').forEach((el) => el.classList.remove('node-clicked'));
      }
    });
  }, [setHighlightedNodeId]);

  // --- 渲染图表到指定容器 ---
  const renderToContainer = useCallback(async (el: HTMLDivElement, chartCode: string, onError?: (msg: string | null) => void) => {
    if (!chartCode.trim()) {
      el.innerHTML = '';
      if (onError) onError(null);
      return;
    }
    try {
      // 清空容器内容 - 确保每次渲染都是全新开始
      el.innerHTML = '';
      // 生成唯一ID - 加入时间戳避免mermaid缓存问题
      const id = 'mermaid-render-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const svg = await renderMermaid(id, chartCode);
      if (!svg) throw new Error('Mermaid returned empty SVG');
      el.innerHTML = svg;
      // 绑定节点点击：实现「只读高亮」——点击 SVG 节点高亮对应代码行
      bindNodeClickHandlers(el);
      if (onError) onError(null);
    } catch (err) {
      console.error('Mermaid render error:', err);
      el.innerHTML = '';
      if (onError) onError(err instanceof Error ? err.message : '渲染失败');
      // 渲染失败后定点清理可能泄漏到 body 的错误元素
      cleanupMermaidErrorElements();
    }
  }, [cleanupMermaidErrorElements, bindNodeClickHandlers]);

  // --- 主预览区渲染（防抖 + 主题变化时重新渲染 + 手动刷新）---
  useEffect(() => {
    if (!containerRef.current) return;
    if (!code.trim()) {
      containerRef.current.innerHTML = '';
      setError(null);
      setStoreError(null);
      return;
    }
    const el = containerRef.current;
    const handle = setTimeout(() => {
      renderToContainer(el, code, (msg) => {
        setError(msg);
        setStoreError(msg);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [code, theme, chartTheme, renderToContainer, setStoreError, refreshKey]);

  // --- 手动刷新预览 ---
  const handleManualRefresh = useCallback(() => {
    setError(null);
    setStoreError(null);
    // 改变 refreshKey 触发重新渲染
    setRefreshKey((k) => k + 1);
  }, [setStoreError]);

  // --- 全屏模式下渲染 ---
  useEffect(() => {
    if (!fullscreen) return;
    if (!fullscreenContainerRef.current) return;
    if (!code.trim()) {
      fullscreenContainerRef.current.innerHTML = '';
      return;
    }
    const el = fullscreenContainerRef.current;
    const handle = setTimeout(() => {
      renderToContainer(el, code);
    }, 0);
    return () => clearTimeout(handle);
  }, [fullscreen, code, theme, renderToContainer]);

  // --- ESC 关闭全屏 ---
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // --- 拖拽处理（按需监听：仅 mousedown 时挂载 window 监听，mouseup 时卸载，避免常驻）---
  const isFullscreenRef = useRef(false);
  // rAF 句柄：合并同一帧内的多次 mousemove，避免高频 setState 引发重排
  const dragRafRef = useRef(0);

  useEffect(() => {
    isFullscreenRef.current = fullscreen;
  }, [fullscreen]);

  const handleMouseDown = (e: RMouseEvent<HTMLDivElement>, isFullscreen: boolean) => {
    if (!code.trim() || error) return;
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    const current = isFullscreen ? fullscreenTransform : transform;
    dragStartRef.current = { x: e.clientX, y: e.clientY, tx: current.x, ty: current.y };
    // 拖拽期间挂载监听，结束时卸载
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newX = dragStartRef.current.tx + dx;
    const newY = dragStartRef.current.ty + dy;
    // rAF 合并：取消上一帧未执行的更新，仅保留最新值
    cancelAnimationFrame(dragRafRef.current);
    dragRafRef.current = requestAnimationFrame(() => {
      if (isFullscreenRef.current) {
        setFullscreenTransform((t) => ({ ...t, x: newX, y: newY }));
      } else {
        setTransform((t) => ({ ...t, x: newX, y: newY }));
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    cancelAnimationFrame(dragRafRef.current);
    // 卸载监听，恢复无拖拽时的零开销
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // 组件卸载时兜底清理，防止监听泄漏
  useEffect(() => {
    return () => {
      cancelAnimationFrame(dragRafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- 鼠标滚轮缩放 ---
  const handleWheel = (e: RWheelEvent<HTMLDivElement>, isFullscreen: boolean) => {
    if (!code.trim() || error) return;
    e.preventDefault();
    const current = isFullscreen ? fullscreenTransform : transform;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newScale = Math.max(0.2, Math.min(10, current.scale + delta));
    if (isFullscreen) {
      setFullscreenTransform((t) => ({ ...t, scale: newScale }));
    } else {
      setTransform((t) => ({ ...t, scale: newScale }));
    }
  };

  // --- 缩放按钮 ---
  const zoomIn = (isFullscreen: boolean) => {
    if (isFullscreen) setFullscreenTransform((t) => ({ ...t, scale: Math.min(10, t.scale + 0.1) }));
    else setTransform((t) => ({ ...t, scale: Math.min(10, t.scale + 0.1) }));
  };
  const zoomOut = (isFullscreen: boolean) => {
    if (isFullscreen) setFullscreenTransform((t) => ({ ...t, scale: Math.max(0.2, t.scale - 0.1) }));
    else setTransform((t) => ({ ...t, scale: Math.max(0.2, t.scale - 0.1) }));
  };
  const resetTransform = (isFullscreen: boolean) => {
    if (isFullscreen) setFullscreenTransform(defaultFullscreenTransform);
    else setTransform(defaultTransform);
  };

  // --- 导出 ---
  const triggerExportSuccess = () => {
    setExportState('success');
    setTimeout(() => setExportState('idle'), 1500);
  };

  const handleExportPNG = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
    const bbox = svgEl.getBoundingClientRect();

    let width = bbox.width;
    let height = bbox.height;

    const viewBox = clonedSvg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (!isNaN(vbW) && !isNaN(vbH) && vbW > 0 && vbH > 0) {
          width = vbW;
          height = vbH;
        }
      }
    }

    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));
    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    const styleSheets = document.styleSheets;
    let extraStyles = '';
    try {
      for (let i = 0; i < styleSheets.length; i++) {
        const rules = (styleSheets[i] as CSSStyleSheet).cssRules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j] as CSSStyleRule;
          const text = rule.cssText;
          if (text && (text.includes('.node') || text.includes('.edge') || text.includes('foreignObject') || text.includes('mermaid'))) {
            extraStyles += text + '\n';
          }
        }
      }
    } catch (e) {
      // 某些 stylesheet 可能因跨域无法读取，忽略
    }

    if (extraStyles) {
      const styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleTag.textContent = extraStyles;
      clonedSvg.insertBefore(styleTag, clonedSvg.firstChild);
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const img = new Image();
    const scale = 2;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(width * scale));
      canvas.height = Math.max(1, Math.ceil(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = theme === 'dark' ? '#0F172A' : '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `mermaid-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      triggerExportSuccess();
    };
    img.onerror = () => {
      console.warn('SVG image failed to decode');
      triggerExportSuccess();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleExportSVG = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
    const bbox = svgEl.getBoundingClientRect();

    let width = bbox.width;
    let height = bbox.height;

    const viewBox = clonedSvg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (!isNaN(vbW) && !isNaN(vbH) && vbW > 0 && vbH > 0) {
          width = vbW;
          height = vbH;
        }
      }
    }

    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));
    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `mermaid-${Date.now()}.svg`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    triggerExportSuccess();
  };

  const transformStyle = (t: Transform): React.CSSProperties => ({
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
    transformOrigin: 'center center',
  });

  const renderCanvas = (
    ref: React.RefObject<HTMLDivElement>,
    t: Transform,
    isFullscreen: boolean,
  ) => (
    <div
      className="flex-1 overflow-hidden relative bg-white dark:bg-dark-1"
      onMouseDown={(e) => handleMouseDown(e, isFullscreen)}
      onWheel={(e) => handleWheel(e, isFullscreen)}
      style={{ cursor: isDraggingRef.current ? 'grabbing' : (code.trim() && !error ? 'grab' : 'default') }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center select-none"
        style={transformStyle(t)}
      >
        {/* 容器始终挂载，保证 ref 始终可用，避免错误态下无法重新渲染 */}
        <div ref={ref} className="p-4" />
      </div>
      {!code.trim() ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center pointer-events-none">
          输入 Mermaid 代码以预览图表
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="text-red-500 dark:text-red-400 flex items-start gap-2 max-w-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-1">语法错误</div>
              <div className="text-sm opacity-80 font-mono whitespace-pre-wrap mb-2.5">{error}</div>
              <button
                onClick={() => openSidebar('chat')}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors"
                title="用 AI 对话修复当前语法错误"
              >
                <Wand2 className="w-3.5 h-3.5" />
                用 AI 修复
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {code.trim() && !error && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none flex items-center gap-1">
          <Move className="w-3 h-3" />
          <span>拖拽平移 · 滚轮缩放</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-light-1 dark:bg-dark-1">
      {/* 工具栏 - padding 与 CodeEditor 工具栏统一为 px-3 sm:px-4；图表类型徽章由 CodeEditor 侧显示，此处去重 */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3 theme-transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-dark-1 dark:text-white whitespace-nowrap">预览</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => zoomOut(false)} className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors" title="缩小">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs w-12 text-center text-gray-500 dark:text-gray-400">{Math.round(transform.scale * 100)}%</span>
          <button onClick={() => zoomIn(false)} className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors" title="放大">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
          <button
            onClick={() => resetTransform(false)}
            className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors"
            title="1:1 原始尺寸"
          >
            1:1
          </button>
          <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
          <button
            onClick={handleManualRefresh}
            className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
            title="刷新预览"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
          <button
            onClick={() => { setFullscreen(true); setFullscreenTransform(defaultFullscreenTransform); }}
            className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors"
            title="全屏查看"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen((v) => !v)}
              className="flex items-center gap-1 p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors"
              title="导出图片"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
            >
              {exportState === 'success' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Download className="w-4 h-4" />}
              <ChevronDown className="w-3 h-3" />
            </button>
            {exportMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 shadow-lg z-20 py-1 theme-transition"
              >
                <button
                  onClick={() => { handleExportPNG(); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors"
                  role="menuitem"
                  title="导出为 PNG 图片（适合嵌入网页/文档）"
                >
                  <FileImage className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>导出 PNG</span>
                </button>
                <button
                  onClick={() => { handleExportSVG(); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors"
                  role="menuitem"
                  title="导出为 SVG 矢量图（可编辑无损放大）"
                >
                  <FileType2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>导出 SVG</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主画布 */}
      {renderCanvas(containerRef, transform, false)}

      {/* 全屏模态 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
        >
          {/* 全屏工具栏 */}
          <div className="flex items-center justify-between px-4 py-3 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3 shadow-sm theme-transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-dark-1 dark:text-white whitespace-nowrap">全屏预览</span>
              </div>
              <div className="flex items-center gap-2 pl-3 border-l border-light-3 dark:border-dark-3">
                <div className={'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ' + chartInfo.accent}>
                  <span className="text-sm">{chartInfo.icon}</span>
                  <span className="whitespace-nowrap">{chartInfo.label}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 ml-2 hidden sm:inline">按 ESC 或点击空白处关闭</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => zoomOut(true)} className="p-2 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors" title="缩小">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs w-14 text-center text-gray-500 dark:text-gray-400">{Math.round(fullscreenTransform.scale * 100)}%</span>
              <button onClick={() => zoomIn(true)} className="p-2 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors" title="放大">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
              <button
                onClick={() => resetTransform(true)}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors"
                title="1:1 原始尺寸"
              >
                1:1
              </button>
              <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1" />
              <button
                onClick={handleManualRefresh}
                className="p-2 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
                title="刷新预览"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1 hidden sm:block" />
              <button
                onClick={openSettings}
                className="p-2 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
                title="偏好设置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1 hidden sm:block" />
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-xs transition-colors shadow-sm"
                title="导出为 PNG 图片（适合嵌入网页/文档）"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">下载 PNG</span>
              </button>
              <button
                onClick={handleExportSVG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success hover:bg-success/90 text-white font-medium text-xs transition-colors shadow-sm"
                title="导出为 SVG 矢量图（可编辑无损放大）"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="whitespace-nowrap">下载 SVG</span>
              </button>
              <div className="w-px h-4 bg-light-3 dark:bg-dark-3 mx-1 hidden sm:block" />
              <button onClick={() => setFullscreen(false)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors">
                关闭
              </button>
            </div>
          </div>

          {/* 全屏画布 */}
          {renderCanvas(fullscreenContainerRef, fullscreenTransform, true)}
        </div>
      )}
    </div>
  );
};
