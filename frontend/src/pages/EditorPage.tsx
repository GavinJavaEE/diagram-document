import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { CodeEditor } from '@/components/Editor/CodeEditor';
import { Preview } from '@/components/Editor/Preview';
import { StatusBar } from '@/components/Editor/StatusBar';
import { QuickStartPanel } from '@/components/Editor/QuickStartPanel';
import { AISidebar } from '@/components/AI/AISidebar';
import { SEO } from '@/components/SEO';
import { Dialog } from '@/components/Common/Dialog';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAIStore } from '@/contexts/AIContext';
import { useActiveSettings } from '@/contexts/SettingsContext';
import { useEditorStore } from '@/contexts/EditorContext';
import { useChartStore } from '@/contexts/ChartContext';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Code2, Eye, Save, Loader2, CheckCircle2, FileX2, PencilLine, Check, AlertTriangle } from 'lucide-react';

const MIN_PERCENTAGE = 25; // 代码/预览区最小宽度百分比

type MobileTab = 'code' | 'preview';

export const EditorPage = () => {
  const { isNarrowScreen, mode } = useResponsiveLayout();
  const { isSidebarOpen } = useAIStore();
  // 读取用户设置（实时预览 + 手动持久化）：AI 侧栏位置、代码区占比、默认视图模式
  const { aiSidebarPosition, codePreviewRatio, defaultViewMode } = useActiveSettings();

  // codePanelPercent 以用户设置的 codePreviewRatio 为初始值；
  // 当用户在设置 Drawer 中调整 codePreviewRatio 时，同步更新（拖拽 resizer 仅改本地 state，不污染设置）
  const [codePanelPercent, setCodePanelPercent] = useState<number>(codePreviewRatio);
  const [isDragging, setIsDragging] = useState(false);
  // 窄屏 Tab 切换：初始值尊重用户设置的默认视图模式（preview-only 时默认看预览）
  const [mobileTab, setMobileTab] = useState<MobileTab>(
    defaultViewMode === 'preview-only' ? 'preview' : 'code',
  );

  // 设置变化时同步代码区占比（实时预览）
  useEffect(() => {
    setCodePanelPercent(codePreviewRatio);
  }, [codePreviewRatio]);

  // 布局模式判定：
  // - 窄屏(<768)：始终单栏 Tab
  // - 中等屏幕(768-1280, mode=COLLAPSIBLE_AI)：AI 打开时三栏会严重挤压，自动切单栏 Tab，
  //   仅在 AI 关闭时恢复双栏，兼顾笔记本用户的双栏编辑与 AI 使用体验
  // - 宽屏(≥1280, mode=THREE_COLUMN)：保持双栏，空间充足
  // - bottom 位置不触发 Tab 切换（AI 在底部，不挤压横向空间）
  const shouldUseTabLayout =
    isNarrowScreen || (mode === 'COLLAPSIBLE_AI' && isSidebarOpen && aiSidebarPosition !== 'bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // rAF 句柄：合并拖拽期间的高频 mousemove，避免逐次 setState 引发重排，稳定 60fps
  const dragRafRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    draggingRef.current = true;
  }, []);

  // 从「我的图表」页面跳转携带 ?id=xxx：加载已有图表内容到编辑器
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { initialized, user } = useAuthStore();
  const isLocalMode = initialized && !user;
  const { showSuccess, showError } = useToast();
  const {
    title,
    isDirty,
    isSaving,
    lastSavedAt,
    currentDocId,
    saveError,
    loadDoc,
    newChart,
    setTitle,
    saveCurrent,
  } = useEditorStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // 冲突处理状态机：与 MarkdownEditorPage 对齐
  // - conflict: 主弹窗（覆盖 / 重命名 / 取消）
  // - confirmOverwrite: 二次确认（删除同名图表不可恢复）
  // - renaming: 重命名输入态
  const [conflict, setConflict] = useState<{
    conflictDocId: string;
    conflictTitle: string;
  } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [handling, setHandling] = useState(false);

  // 加载已有图表：等 auth 初始化完成后再请求（本地模式下也从 IndexedDB 读取）
  useEffect(() => {
    if (!initialized) return;
    const docId = searchParams.get('id');
    if (!docId) {
      // 无 id 参数：进入新建态
      // 若用户在 auth 初始化前已开始编辑（persist 恢复了上次代码），
      // 保留其编辑内容，不调用 newChart() 重置——否则会清空自动保存定时器 + isDirty
      if (!useEditorStore.getState().isDirty) {
        newChart();
      }
      return;
    }
    let cancelled = false;
    setLoadingDoc(true);
    setLoadError(null);
    loadDoc(docId)
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : '加载图表失败');
        // 加载失败时重置编辑器，避免 currentDocId 残留为上次编辑的文档 ID
        // 否则用户继续编辑保存会误更新错误的文档
        newChart();
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, initialized, user, loadDoc, newChart]);

  // URL 同步：首次保存后 currentDocId 从 null 变为 ID，使用 replaceState 静默更新 URL。
  // 不用 setSearchParams（会触发 searchParams 变化 → 主 useEffect 重跑 → loadDoc 覆盖，造成闪烁）。
  // replaceState 仅改 URL 用于刷新恢复，不触发 React Router 重渲染。
  useEffect(() => {
    if (!currentDocId) return;
    const currentIdInUrl = searchParams.get('id');
    if (currentIdInUrl === currentDocId) return;
    const params = new URLSearchParams(searchParams);
    params.set('id', currentDocId);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocId]);

  // 手动保存（Ctrl+S 或点击保存按钮）
  // 本地模式和云端模式都走 saveCurrent，内部会自动分流
  const handleManualSave = useCallback(async () => {
    const result = await saveCurrent();
    if (result.status === 'success') {
      showSuccess('已保存');
    } else if (result.status === 'error') {
      showError(result.message);
    } else if (result.status === 'conflict') {
      // 手动保存遇到重名：弹出冲突处理 Modal（覆盖 / 重命名 / 取消）
      setConflict({
        conflictDocId: result.conflictDocId,
        conflictTitle: title || '未命名图表',
      });
      setRenameValue(title || '未命名图表');
    }
  }, [saveCurrent, showSuccess, showError, title]);

  // 冲突处理：覆盖（删除同名老文档 → 强制保存当前）
  const handleOverwrite = async () => {
    if (!conflict || handling) return;
    setHandling(true);
    try {
      // 通过 ChartContext.removeDoc 删除冲突文档（自动分流本地/云端）
      await useChartStore.getState().removeDoc(conflict.conflictDocId);
      const result = await saveCurrent({ force: true });
      if (result.status === 'success') {
        showSuccess('已覆盖同名图表并保存');
        setConflict(null);
        setConfirmOverwrite(false);
      } else if (result.status === 'error') {
        showError(result.message);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '覆盖失败');
    } finally {
      setHandling(false);
    }
  };

  // 冲突处理：重命名
  const handleRename = async () => {
    if (!conflict || handling) return;
    const newName = renameValue.trim();
    if (!newName) {
      showError('请输入新的图表名');
      return;
    }
    if (newName === conflict.conflictTitle) {
      showError('新名称与原名称相同，请改为其他名称');
      return;
    }
    setHandling(true);
    try {
      setTitle(newName);
      const result = await saveCurrent();
      if (result.status === 'success') {
        showSuccess('已重命名并保存');
        setConflict(null);
        setRenaming(false);
      } else if (result.status === 'conflict') {
        showError(`名称「${newName}」也已存在，请换一个`);
        setConflict({
          conflictDocId: result.conflictDocId,
          conflictTitle: newName,
        });
      } else if (result.status === 'error') {
        showError(result.message);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '重命名失败');
    } finally {
      setHandling(false);
    }
  };

  const handleCancelConflict = () => {
    setConflict(null);
    setRenaming(false);
    setRenameValue('');
  };

  // Ctrl+S / Cmd+S 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleManualSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave]);

  // 保存状态文案
  const savedLabel = (() => {
    if (isSaving) return '保存中…';
    if (saveError) return '保存失败';
    if (isDirty) return '● 未保存';
    if (lastSavedAt) return `已保存 ${formatTime(lastSavedAt)}`;
    return '';
  })();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const containerWidth = rect.width;

      let newPercent = (relativeX / containerWidth) * 100;

      if (newPercent < MIN_PERCENTAGE) newPercent = MIN_PERCENTAGE;
      if (newPercent > 100 - MIN_PERCENTAGE) newPercent = 100 - MIN_PERCENTAGE;

      // rAF 合并：仅保留每帧最新百分比，避免高频 setState 引发布局抖动
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => setCodePanelPercent(newPercent));
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
      document.body.classList.remove('no-select');
    };

    if (isDragging) {
      document.body.classList.add('no-select');
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      cancelAnimationFrame(dragRafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      <SEO
        title="DiagramAI 在线编辑器 - Mermaid 流程图 时序图 甘特图 ER图"
        description="使用 DiagramAI 在线编辑器，通过 Mermaid 语法代码或 AI 描述快速创建流程图、时序图、甘特图、ER图、类图、状态图等专业图表。实时预览，一键导出 PNG/SVG。"
        keywords="Mermaid 编辑器, 在线流程图工具, 代码绘图, 图表生成, AI绘图, 时序图, 甘特图, ER图"
        url="https://diagramai.com/editor"
      />
      <div className="h-screen flex flex-col relative bg-white dark:bg-dark-1 theme-transition animate-fade-in">
        <Header />
        {/* 快速开始面板：模板画廊 + 最近 AI 图表，缓解从首页硬切到全屏编辑器的突兀感 */}
        <QuickStartPanel />
        {/* 标题栏 + 保存状态 + 保存按钮 */}
        <div className="flex items-center gap-2 px-4 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
          {/* 标题输入：带边框容器，focus-within 高亮，避免与工具栏混为一体 */}
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-dark-3 border border-light-3 dark:border-dark-3 rounded-lg px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Code2 className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入图表标题…"
              disabled={loadingDoc}
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-dark-1 dark:text-white outline-none placeholder:text-gray-400 placeholder:font-normal disabled:opacity-60"
            />
          </div>
          {/* 保存状态文案 */}
          <span
            className={`text-xs whitespace-nowrap hidden sm:inline ${
              isDirty ? 'text-warning' : 'text-gray-400'
            }`}
          >
            {savedLabel}
          </span>
          {/* 保存按钮：本地模式 + 云端模式 统一显示 */}
          <button
            onClick={handleManualSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="保存（Ctrl+S）"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存
          </button>
        </div>
        {/* 加载已有图表时的状态提示条 */}
        {loadingDoc && (
          <div className="px-4 py-1.5 text-xs text-primary bg-primary/5 border-b border-primary/20 text-center">
            正在加载图表...
          </div>
        )}
        {loadError && (
          <div className="px-4 py-1.5 text-xs text-error bg-error/5 border-b border-error/20 text-center">
            {loadError}
          </div>
        )}
        {/* 本地模式提示：未登录时显示，引导用户登录升级云端存储 */}
        {isLocalMode && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate">
              本地模式：图表仅保存在浏览器缓存中，最多 5 个。清空缓存或更换设备将丢失，登录后享云端存储。
            </span>
            <button
              onClick={() => navigate('/login')}
              className="flex-shrink-0 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              登录
            </button>
          </div>
        )}
        {/* 保存状态浮动指示器（右下角，与文档页一致） */}
        {(isSaving || isDirty || lastSavedAt || saveError) && (
          <div
            className={`absolute bottom-10 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-md transition-all max-w-[280px] ${
              isSaving
                ? 'bg-primary/90 text-white'
                : saveError
                  ? 'bg-red-500/90 text-white'
                  : isDirty
                    ? 'bg-amber-500/90 text-white'
                    : 'bg-emerald-500/90 text-white'
            }`}
            role="status"
            aria-live="polite"
            title={saveError || undefined}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>保存中…</span>
              </>
            ) : saveError ? (
              <>
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{saveError}</span>
              </>
            ) : isDirty ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>未保存</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>已保存</span>
              </>
            )}
          </div>
        )}
        {/* main 区域：根据 AI 侧栏位置决定 flex 方向。bottom 时纵向排列，其余横向 */}
        <main
          className={`flex-1 overflow-hidden bg-light-1 dark:bg-dark-1 flex ${
            aiSidebarPosition === 'bottom' ? 'flex-col' : 'flex-row'
          }`}
        >
          {/* left 位置：AI 在编辑区之前渲染 */}
          {aiSidebarPosition === 'left' && <AISidebar isOpen={isSidebarOpen} />}

          {shouldUseTabLayout ? (
            // 窄屏或中等屏+AI打开(非bottom)：Tab 切换代码/预览，避免三栏挤压
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex border-b border-light-3 dark:border-dark-3 bg-light-2 dark:bg-dark-2">
                <button
                  onClick={() => setMobileTab('code')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    mobileTab === 'code'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  代码
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    mobileTab === 'preview'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
              </div>
              <div className="flex-1 flex min-w-0">
                {mobileTab === 'code' ? (
                  <div className="flex flex-col w-full min-w-0">
                    <CodeEditor />
                  </div>
                ) : (
                  <div className="flex flex-col w-full min-w-0">
                    <Preview />
                  </div>
                )}
              </div>
            </div>
          ) : defaultViewMode === 'code-only' ? (
            // 宽屏 + 仅代码模式
            <div className="flex-1 flex p-3 min-w-0">
              <div className="flex flex-col w-full min-w-0">
                <CodeEditor />
              </div>
            </div>
          ) : defaultViewMode === 'preview-only' ? (
            // 宽屏 + 仅预览模式
            <div className="flex-1 flex p-3 min-w-0">
              <div className="flex flex-col w-full min-w-0">
                <Preview />
              </div>
            </div>
          ) : (
            // 宽屏 + 分屏模式：分隔栏拖拽布局
            <div ref={containerRef} className="flex-1 flex p-3 min-w-0">
              <div className="flex flex-col min-w-0" style={{ width: `${codePanelPercent}%` }}>
                <CodeEditor />
              </div>

              <div
                onMouseDown={handleMouseDown}
                className={`resizer ${isDragging ? 'dragging' : ''}`}
                title="拖动调整宽度"
              />

              <div className="w-3" />

              <div className="flex flex-col min-w-0" style={{ width: `${100 - codePanelPercent}%` }}>
                <Preview />
              </div>
            </div>
          )}

          {/* right/bottom 位置：AI 在编辑区之后渲染 */}
          {aiSidebarPosition !== 'left' && <AISidebar isOpen={isSidebarOpen} />}
        </main>
        <StatusBar />

        {/* 图表名冲突主弹窗：覆盖 / 重命名 / 取消（与 MarkdownEditorPage 对齐） */}
        <Dialog
          open={!!conflict && !confirmOverwrite}
          title="图表名已存在"
          variant="warning"
          onClose={handling ? null : handleCancelConflict}
          description={
            renaming ? (
              <span>
                请输入新的图表名，原名称 <span className="font-medium text-amber-600 dark:text-amber-400">「{conflict?.conflictTitle}」</span> 已被占用。
              </span>
            ) : (
              <span>
                已存在同名图表 <span className="font-medium text-amber-600 dark:text-amber-400">「{conflict?.conflictTitle}」</span>。请选择处理方式，或修改名称后重试。
              </span>
            )
          }
          footer={
            renaming ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelConflict}
                  disabled={handling}
                  className="px-3 py-1.5 rounded-lg text-sm text-light-text-2 dark:text-dark-text-2 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(false);
                    setRenameValue(title || '');
                  }}
                  disabled={handling}
                  className="px-3 py-1.5 rounded-lg text-sm text-light-text-2 dark:text-dark-text-2 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors disabled:opacity-50"
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={handling || !renameValue.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {handling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  确认改名
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancelConflict}
                  disabled={handling}
                  className="px-3 py-1.5 rounded-lg text-sm text-light-text-2 dark:text-dark-text-2 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors disabled:opacity-50"
                >
                  取消保存
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  disabled={handling}
                  className="px-3 py-1.5 rounded-lg text-sm bg-light-1 dark:bg-dark-3 text-dark-1 dark:text-white hover:bg-light-2 dark:hover:bg-dark-4 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  重命名当前图表
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOverwrite(true)}
                  disabled={handling}
                  className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileX2 className="w-3.5 h-3.5" />
                  覆盖现有图表
                </button>
              </>
            )
          }
        >
          {renaming && (
            <div className="space-y-2">
              <label className="block text-xs text-light-text-2 dark:text-dark-text-2">新图表名</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !handling) void handleRename();
                  if (e.key === 'Escape') handleCancelConflict();
                }}
                placeholder="输入新的图表名"
                className="w-full px-3 py-2 rounded-lg border border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-3 text-sm text-dark-1 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
          )}
        </Dialog>

        {/* 覆盖二次确认：删除老图表不可恢复 */}
        <Dialog
          open={confirmOverwrite}
          title="确定覆盖同名图表？"
          variant="danger"
          onClose={handling ? null : () => setConfirmOverwrite(false)}
          description={
            <span>
              将永久删除已有的同名图表 <span className="font-medium text-red-600 dark:text-red-400">「{conflict?.conflictTitle}」</span>，并保留你当前正在编辑的内容。此操作不可恢复。
            </span>
          }
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirmOverwrite(false)}
                disabled={handling}
                className="px-3 py-1.5 rounded-lg text-sm text-light-text-2 dark:text-dark-text-2 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleOverwrite}
                disabled={handling}
                className="px-4 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {handling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileX2 className="w-3.5 h-3.5" />}
                确认覆盖
              </button>
            </>
          }
        />
      </div>
    </>
  );
};

const formatTime = (d: Date): string => {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
