import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { MarkdownEditor, MarkdownPreview, DocSidebar } from '@/components/Markdown';
import { Dialog } from '@/components/Common/Dialog';
import { AISidebar } from '@/components/AI/AISidebar';
import { SEO } from '@/components/SEO';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useIsLocalMode, getActiveDocApi, useLocalDocsAccessor, useCloudDocsAccessor, isLocalDocId } from '@/hooks/useActiveDocStore';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAIStore } from '@/contexts/AIContext';
import { createDocument, checkTitleDuplicate, deleteDocument } from '@/services/api';
import { Code2, Eye, EyeOff, FileText, Save, Loader2, PanelLeft, Share2, Link2, Check, Printer, AlertTriangle, FileX2, PencilLine, X, CheckCircle2, CloudUpload } from 'lucide-react';
import { exportMarkdownPdf, findMarkdownPreviewRoot } from '@/utils/printPdf';

const MIN_PERCENTAGE = 25;
// 分隔比例 localStorage 键名，持久化用户拖拽偏好
const PANEL_PERCENT_KEY = 'md-editor-panel-percent';
type MobileTab = 'editor' | 'preview';

export const MarkdownEditorPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isNarrowScreen } = useResponsiveLayout();
  const { initialized, user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { isSidebarOpen: isAiSidebarOpen, setChartEditingContext, closeSidebar } = useAIStore();
  // 本地模式：未登录时使用 IndexedDB 存储，不重定向到登录页
  const isLocalMode = useIsLocalMode();

  // 双 store 订阅：登录态下同时持有云端与本地 store，按 editingSource 切换编辑目标
  const cloudStore = useCloudDocsAccessor();
  const localStore = useLocalDocsAccessor();
  // 编辑源判定：
  // - 未登录：始终 local（activeStore 即 localStore）
  // - 登录 + id 以 local_ 开头：local（编辑本地文档，保存时迁移到云端）
  // - 登录 + 其他：cloud
  const editingSource: 'cloud' | 'local' = (!user || isLocalDocId(id)) ? 'local' : 'cloud';
  const editStore = editingSource === 'local' ? localStore : cloudStore;

  const {
    content,
    title,
    isDirty,
    isSaving,
    lastSavedAt,
    currentDocId,
    isPublic,
    shareToken,
    saveError,
    loadDoc,
    newDoc,
    setContent,
    setTitle,
    saveCurrent,
    removeDoc,
    reset,
    toggleShare,
  } = editStore;

  // 分隔比例：从 localStorage 恢复，缺失或越界时回退 50%
  const [panelPercent, setPanelPercent] = useState<number>(() => {
    const saved = Number(localStorage.getItem(PANEL_PERCENT_KEY));
    if (Number.isFinite(saved) && saved >= MIN_PERCENTAGE && saved <= 100 - MIN_PERCENTAGE) {
      return saved;
    }
    return 50;
  });
  // 拖拽比例持久化：变化即写入，下次进入恢复用户偏好
  useEffect(() => {
    localStorage.setItem(PANEL_PERCENT_KEY, String(panelPercent));
  }, [panelPercent]);

  // 进入文档编辑页时关闭 AI 助手栏：避免继承绘图页的全局 isSidebarOpen 状态污染。
  // 文档页的 AI 助手由右键菜单主动触发，不应默认展开。
  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 预览区折叠：宽屏下可隐藏预览区获得沉浸式编辑；窄屏走 Tab 切换，不使用此开关
  const [previewHidden, setPreviewHidden] = useState(false);
  // 预览全屏：覆盖整个视口，ESC 或按钮退出
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareToggling, setShareToggling] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // 文档名冲突处理状态机：
  // - conflict: 主弹窗（覆盖 / 重命名 / 取消）
  // - confirmOverwrite: 二次确认（删除同名文档不可恢复）
  // - renaming: 重命名输入态
  // - source: 'save' 普通保存冲突 | 'migrate' 本地→云端迁移时遇到云端同名
  const [conflict, setConflict] = useState<{
    conflictDocId: string;
    conflictTitle: string;
    source: 'save' | 'migrate';
  } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [handling, setHandling] = useState(false);
  // 本地→云端迁移进行中：用于按钮禁用与加载提示
  const [migrating, setMigrating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragRafRef = useRef(0);
  // 保存最新 isDirty 到 ref，供 beforeunload 同步读取
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 根据 URL 加载或新建：云端模式需等待初始化+登录，本地模式仅需初始化完成
  // 登录态切换会影响 editingSource（local/cloud），故 user 也作为依赖
  useEffect(() => {
    if (!initialized) return;
    if (!isLocalMode && !useAuthStore.getState().user) return;
    if (id) {
      void loadDoc(id);
    } else {
      // 若用户在 auth 初始化前已开始编辑，保留其编辑内容
      if (!isDirty) {
        newDoc();
      }
    }
    // 离开页面时重置，避免脏状态残留到下次进入
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialized, isLocalMode, user]);

  // beforeunload：未保存时提示
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // 分隔栏拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    draggingRef.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const containerWidth = rect.width;
      let newPercent = (relativeX / containerWidth) * 100;
      if (newPercent < MIN_PERCENTAGE) newPercent = MIN_PERCENTAGE;
      if (newPercent > 100 - MIN_PERCENTAGE) newPercent = 100 - MIN_PERCENTAGE;
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => setPanelPercent(newPercent));
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

  // 手动保存
  const handleManualSave = async () => {
    // 登录态编辑本地文档：保存触发迁移到云端（本地删除 + 云端创建 + URL 切换）
    if (user && editingSource === 'local') {
      return handleMigrateLocalToCloud();
    }
    const wasNewDoc = !currentDocId; // 保存前是否为新文档（用于判断保存后是否需要刷新列表）
    const result = await saveCurrent();
    if (result.status === 'success') {
      showSuccess('已保存');
      // 首次保存成功后主动刷新列表，确保侧栏/列表页与后端一致。
      // saveCurrent 内部已 prepend 新文档到 docs（即时反馈），但若 prepend 数据字段缺失
      // 或后端写入延迟，prepend 可能与后端列表有偏差。loadList 拉取后端权威列表覆盖，
      // 避免"保存后侧栏不显示"或"刷新后列表丢失"的偶发问题。
      // 仅登录态云端编辑场景需要刷新云端列表；未登录态 activeStore 即 localStore，
      // prepend 已直接更新 localStore.docs，无需额外请求。
      if (wasNewDoc && user && editingSource === 'cloud') {
        void cloudStore.loadList();
      }
      // 注意：不在此处 navigate 同步 URL 到 /docs/{newDocId}。
      // navigate 会使 id 参数变化，触发主加载 useEffect 的 cleanup（reset 清空 store 内容）
      // + 重新执行（loadDoc 覆盖），造成编辑区闪烁甚至丢失用户保存后继续编辑的输入。
      // store 内 currentDocId 已更新，后续自动保存走 update 分支不会重复创建。
      // URL 保持 /docs/new，用户刷新页面会进入 newDoc()，但文档已在后端和列表中，可找回。
    } else if (result.status === 'conflict') {
      // 弹出冲突处理 Modal（saveCurrent 内部已写入 saveError，主弹窗承载三选项）
      setConflict({
        conflictDocId: result.conflictDocId,
        conflictTitle: title || '未命名文档',
        source: 'save',
      });
      setRenameValue(title || '');
    } else if (result.status === 'error') {
      showError(result.message);
    }
    // skipped：无变更或正在保存，无需处理
  };

  /**
   * 本地文档迁移到云端：
   * 1) 校验云端同名 → 无冲突直接创建
   * 2) 冲突弹 Modal（复用 conflict 状态机，source='migrate'）
   * 3) 创建云端文档 → 删除本地文档 → 切换 URL 至云端文档
   * overrideTitle 用于重命名后重新迁移，避免再读 store 闭包旧值
   */
  const handleMigrateLocalToCloud = async (overrideTitle?: string) => {
    // 直接读取 editStore（localStore）解构的闭包值：迁移为模态操作，期间用户无法编辑，闭包值稳定
    const localId = currentDocId;
    const finalTitle = (overrideTitle ?? title ?? '').trim() || '未命名文档';
    const finalContent = content ?? '';

    if (!localId) {
      showError('未找到本地文档，无法迁移');
      return;
    }

    setMigrating(true);
    try {
      // 1. 校验云端同名
      const check = await checkTitleDuplicate(finalTitle, 'markdown');
      if (check.duplicated && check.conflictDocumentId) {
        setConflict({
          conflictDocId: check.conflictDocumentId,
          conflictTitle: finalTitle,
          source: 'migrate',
        });
        setRenameValue(finalTitle);
        return; // 等待用户在 Modal 中选择
      }
      // 2. 创建云端文档
      const created = await createDocument(finalTitle, 'markdown', finalContent);
      // 3. 删除本地文档（迁移成功后才删除，避免数据丢失）
      await localStore.removeDoc(localId);
      // 4. 刷新云端列表，让侧栏/列表页立即出现新文档（createDocument 直连 API 不会自动更新 store.docs）
      await cloudStore.loadList();
      // 5. 切换 URL 至云端文档，触发 editStore 重新加载为 cloud
      showSuccess('已迁移至云端存储');
      navigate(`/docs/${created.documentId}`, { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : '迁移失败，本地文档未受影响');
    } finally {
      setMigrating(false);
    }
  };

  // 保存最新 handleManualSave 到 ref，供全局快捷键监听读取（避免监听器闭包陈旧）
  const saveHandlerRef = useRef(handleManualSave);
  saveHandlerRef.current = handleManualSave;

  // 全局 Ctrl+S 拦截（P0 4.3）：覆盖标题输入框、按钮等非 Monaco 焦点场景。
  // Monaco 编辑器聚焦时由其 addCommand 处理并 preventDefault，此处 defaultPrevented 为 true 自动跳过，避免重复保存。
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key;
      if (k !== 's' && k !== 'S') return;
      if (e.defaultPrevented) return; // Monaco 已处理
      e.preventDefault();
      e.stopPropagation();
      saveHandlerRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 冲突处理：覆盖（删除同名老文档 → 强制保存当前）
  const handleOverwrite = async () => {
    if (!conflict || handling) return;
    setHandling(true);
    try {
      if (conflict.source === 'migrate') {
        // 迁移场景：删除云端同名文档 → 创建云端文档 → 删除本地 → 切换 URL
        // 闭包值来自 editStore（localStore），模态期间稳定
        const localId = currentDocId;
        const finalTitle = (title ?? '').trim() || '未命名文档';
        const finalContent = content ?? '';
        await deleteDocument(conflict.conflictDocId);
        const created = await createDocument(finalTitle, 'markdown', finalContent);
        if (localId) await localStore.removeDoc(localId);
        // 刷新云端列表，让覆盖后的新文档在侧栏出现
        await cloudStore.loadList();
        showSuccess('已覆盖云端同名文档并完成迁移');
        setConflict(null);
        setConfirmOverwrite(false);
        navigate(`/docs/${created.documentId}`, { replace: true });
        return;
      }
      // 普通保存场景：删除老文档 → 强制保存当前
      await removeDoc(conflict.conflictDocId);
      const result = await saveCurrent({ force: true });
      if (result.status === 'success') {
        showSuccess('已覆盖同名文档并保存');
        setConflict(null);
        setConfirmOverwrite(false);
        // 首次保存场景同步 URL
        const newDocId = getActiveDocApi(isLocalMode).getState().currentDocId;
        if (newDocId && !id) {
          navigate(`/docs/${newDocId}`, { replace: true });
        }
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
      showError('请输入新的文档名');
      return;
    }
    if (newName === conflict.conflictTitle) {
      showError('新名称与原名称相同，请改为其他名称');
      return;
    }

    // 迁移场景：关闭弹窗 → 同步标题到 localStore → 用新名称重新走迁移
    if (conflict.source === 'migrate') {
      setConflict(null);
      setRenaming(false);
      setTitle(newName);
      await handleMigrateLocalToCloud(newName);
      return;
    }

    setHandling(true);
    try {
      setTitle(newName);
      // 等待 setTitle 触发 store 更新，再调用 saveCurrent 重新校验
      const result = await saveCurrent();
      if (result.status === 'success') {
        showSuccess('已重命名并保存');
        setConflict(null);
        setRenaming(false);
        const newDocId = getActiveDocApi(isLocalMode).getState().currentDocId;
        if (newDocId && !id) {
          navigate(`/docs/${newDocId}`, { replace: true });
        }
      } else if (result.status === 'conflict') {
        // 改的名字仍然冲突，留在重命名态让用户继续改
        showError(`名称「${newName}」也已存在，请换一个`);
        setConflict({
          conflictDocId: result.conflictDocId,
          conflictTitle: newName,
          source: 'save',
        });
      } else if (result.status === 'error') {
        showError(result.message);
      }
    } finally {
      setHandling(false);
    }
  };

  // 取消：关闭所有弹窗，不动文档状态
  const handleCancelConflict = () => {
    setConflict(null);
    setConfirmOverwrite(false);
    setRenaming(false);
    setRenameValue('');
  };

  // AI 修改 mermaid 块后写回 MD 源码：定位对应 ```mermaid 块并替换内容。
  // 仅替换第一个匹配块（文档内重复相同图表块属边缘情况，不展开处理）。
  const handleUpdateMermaidBlock = useCallback(
    (oldCode: string, newCode: string) => {
      const oldBlock = '```mermaid\n' + oldCode + '\n```';
      const newBlock = '```mermaid\n' + newCode.trim() + '\n```';
      const idx = content.indexOf(oldBlock);
      if (idx < 0) return;
      const next = content.slice(0, idx) + newBlock + content.slice(idx + oldBlock.length);
      setContent(next);
    },
    [content, setContent],
  );

  // 离开页面时清理 AI 图表编辑上下文，避免污染单图编辑器场景
  useEffect(() => {
    return () => {
      setChartEditingContext(null);
    };
  }, [setChartEditingContext]);

  // 分享菜单：点击外部关闭
  const shareMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareMenuOpen]);

  // 全屏预览：ESC 退出
  useEffect(() => {
    if (!previewFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewFullscreen]);

  // 切换公开/私有：需先保存文档
  const handleToggleShare = async () => {
    if (shareToggling) return;
    if (!currentDocId) {
      showError('请先保存文档');
      return;
    }
    setShareToggling(true);
    try {
      await toggleShare();
      showSuccess(isPublic ? '已关闭分享' : '已开启分享');
    } catch (err) {
      showError(err instanceof Error ? err.message : '分享设置失败');
    } finally {
      setShareToggling(false);
    }
  };

  // 复制分享链接
  const handleCopyShareLink = async () => {
    if (!shareToken || !currentDocId) return;
    const link = `${window.location.origin}/docs/${currentDocId}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      showSuccess('分享链接已复制');
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      showError('复制失败，请手动复制链接');
    }
  };

  // 打印 / 导出 PDF：仅打印预览区，使用 html2pdf 保证排版质量
  // 编辑页双栏布局，必须精确定位预览根节点，避免把编辑器也导出
  const [printing, setPrinting] = useState(false);
  const handlePrint = async () => {
    if (printing) return;
    const root = findMarkdownPreviewRoot();
    if (!root) {
      showError('未找到可打印的预览内容');
      return;
    }
    setPrinting(true);
    try {
      await exportMarkdownPdf(root, title || 'document');
      showSuccess('PDF 已开始下载');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setPrinting(false);
    }
  };

  const charCount = content.length;
  const lineCount = content ? content.split('\n').length : 0;

  const savedLabel = (() => {
    if (migrating) return '迁移中…';
    if (isSaving) return '保存中…';
    if (isDirty) return '● 未保存';
    if (lastSavedAt) return `已保存 ${formatTime(lastSavedAt)}`;
    return '';
  })();

  // 登录态编辑本地文档：保存按钮变为「迁移至云端」
  const isMigrateMode = !!user && editingSource === 'local';

  return (
    <>
      <SEO
        title="Markdown 文档 - DiagramAI"
        description="在线 Markdown 编辑器，支持代码高亮与 Mermaid 图表实时渲染。"
        keywords="Markdown 编辑器, 在线 Markdown, Mermaid 文档, 图文混排"
        url="https://diagramai.com/docs"
      />
      <div className="h-screen flex flex-col bg-white dark:bg-dark-1 theme-transition">
        <Header />
        <main className="flex-1 flex overflow-hidden bg-light-1 dark:bg-dark-1">
          {/* 文档列表侧栏 */}
          <DocSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isNarrowScreen={isNarrowScreen}
          />

          {/* AI 侧栏：用于 mermaid 块「用 AI 修改」（P2 协同）。
              isAiSidebarOpen 由 useAIStore 控制，右键菜单触发时打开。 */}
          <AISidebar isOpen={isAiSidebarOpen} />

          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
            {/* 保存状态浮动指示器：自动保存时显示加载动画，完成后短暂反馈。
                固定在编辑区右下角，不干扰工具栏与编辑操作。
                迁移态（migrating）优先显示，提示本地→云端迁移进度。 */}
            {(migrating || isSaving || isDirty || lastSavedAt || saveError) && (
              <div
                className={`absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-md transition-all max-w-[280px] ${
                  migrating
                    ? 'bg-primary/90 text-white'
                    : isSaving
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
                {migrating ? (
                  <>
                    <CloudUpload className="w-3 h-3 animate-pulse" />
                    <span>迁移至云端…</span>
                  </>
                ) : isSaving ? (
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

            {/* 标题栏 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400"
                title={sidebarOpen ? '收起列表' : '展开列表'}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              {/* 预览开关：仅宽屏显示（窄屏走 Tab 切换） */}
              {!isNarrowScreen && (
                <button
                  onClick={() => setPreviewHidden((v) => !v)}
                  className="p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 transition-colors"
                  title={previewHidden ? '显示预览' : '隐藏预览'}
                  aria-label={previewHidden ? '显示预览' : '隐藏预览'}
                  aria-pressed={!previewHidden}
                >
                  {previewHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
              {/* 标题输入：带边框容器，focus-within 高亮，避免与工具栏混为一体 */}
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-dark-3 border border-light-3 dark:border-dark-3 rounded-lg px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入文档标题…"
                  className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-dark-1 dark:text-white outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
              <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap">
                {charCount} 字 · {lineCount} 行
              </span>
              <span className={`text-xs whitespace-nowrap hidden sm:inline ${isDirty ? 'text-warning' : 'text-gray-400'}`}>
                {savedLabel}
              </span>
              <button
                onClick={handleManualSave}
                disabled={isMigrateMode ? migrating : (isSaving || !isDirty)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={isMigrateMode ? '迁移至云端存储（Ctrl+S）' : '保存（Ctrl+S）'}
              >
                {(isMigrateMode ? migrating : isSaving) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isMigrateMode ? <CloudUpload className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {isMigrateMode ? '迁移至云端' : '保存'}
              </button>

              {/* 打印 / PDF：使用 html2pdf 仅导出预览区 */}
              <button
                onClick={handlePrint}
                disabled={printing}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors print:hidden disabled:opacity-50 disabled:cursor-not-allowed"
                title="导出为 PDF（仅预览内容）"
              >
                {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{printing ? '导出中…' : 'PDF'}</span>
              </button>

              {/* 分享：下拉菜单含开关 + 复制链接。本地模式不支持分享，隐藏入口 */}
              {!isLocalMode && (
              <div className="relative print:hidden" ref={shareMenuRef}>
                <button
                  onClick={() => setShareMenuOpen((v) => !v)}
                  disabled={!currentDocId}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isPublic
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
                  }`}
                  title={isPublic ? '已开启分享' : '分享文档'}
                >
                  {shareToggling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isPublic ? '已分享' : '分享'}</span>
                </button>
                {shareMenuOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-lg shadow-lg z-20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                        公开访问
                      </span>
                      <button
                        onClick={handleToggleShare}
                        disabled={shareToggling}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          isPublic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={isPublic ? '点击关闭分享' : '点击开启分享'}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            isPublic ? 'translate-x-4' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {isPublic && shareToken ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400">分享链接</div>
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            value={`${window.location.origin}/docs/${currentDocId}/share/${shareToken}`}
                            className="flex-1 min-w-0 px-2 py-1 text-xs bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded text-gray-600 dark:text-gray-300"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={handleCopyShareLink}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark transition-colors whitespace-nowrap"
                            title="复制链接"
                          >
                            {linkCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        开启后，任何人通过分享链接可只读访问本文档。
                      </p>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* 本地模式提示：醒目但不干扰编辑区，可一键跳登录升级云端 */}
            {isLocalMode && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate">
                  本地模式：文档仅保存在浏览器缓存中，最多 5 篇。清空缓存或更换设备将丢失，登录后享云端存储与分享。
                </span>
                <button
                  onClick={() => navigate('/login')}
                  className="flex-shrink-0 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  登录
                </button>
              </div>
            )}

            {isNarrowScreen ? (
              // 窄屏：Tab 切换
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex border-b border-light-3 dark:border-dark-3 bg-light-2 dark:bg-dark-2">
                  <button
                    onClick={() => setMobileTab('editor')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                      mobileTab === 'editor' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                      mobileTab === 'preview' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    预览
                  </button>
                </div>
                <div className="flex-1 flex min-w-0 min-h-0">
                  {mobileTab === 'editor' ? (
                    <div className="flex flex-col w-full min-w-0 min-h-0">
                      <MarkdownEditor value={content} onChange={setContent} onSave={handleManualSave} />
                    </div>
                  ) : (
                    <div className="flex flex-col w-full min-w-0 min-h-0">
                      <MarkdownPreview
                        content={content}
                        onUpdateMermaidBlock={handleUpdateMermaidBlock}
                        exportFileName={title}
                        onEnterFullscreen={() => setPreviewFullscreen(true)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // 宽屏：分隔栏拖拽（预览隐藏时编辑器铺满，不渲染分隔栏与预览列）
              <div ref={containerRef} className="flex-1 flex p-3 min-w-0 min-h-0">
                <div className="flex flex-col min-w-0 min-h-0" style={{ width: previewHidden ? '100%' : `${panelPercent}%` }}>
                  <MarkdownEditor value={content} onChange={setContent} onSave={handleManualSave} />
                </div>
                {!previewHidden && (
                  <>
                    <div
                      onMouseDown={handleMouseDown}
                      className={`resizer ${isDragging ? 'dragging' : ''}`}
                      title="拖动调整宽度"
                    />
                    <div className="flex flex-col min-w-0 min-h-0" style={{ width: `${100 - panelPercent}%` }}>
                      <MarkdownPreview
                        content={content}
                        onUpdateMermaidBlock={handleUpdateMermaidBlock}
                        exportFileName={title}
                        onEnterFullscreen={() => setPreviewFullscreen(true)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 全屏预览覆盖层：占满视口，ESC 或右上角按钮退出，内容可缩放滚动 */}
      {previewFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-light-1 dark:bg-dark-1 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 print:hidden">
            <span className="text-sm font-medium text-dark-1 dark:text-white">全屏预览</span>
            <button
              onClick={() => setPreviewFullscreen(false)}
              className="p-1.5 rounded hover:bg-light-2 dark:hover:bg-dark-2 text-gray-500 dark:text-gray-400 transition-colors"
              title="退出全屏（ESC）"
              aria-label="退出全屏"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex">
            <div className="w-full max-w-4xl mx-auto flex">
              <MarkdownPreview
                content={content}
                onUpdateMermaidBlock={handleUpdateMermaidBlock}
                exportFileName={title}
                hideToolbar
              />
            </div>
          </div>
        </div>
      )}

      {/* 文档名冲突主弹窗：覆盖 / 重命名 / 取消 */}
      <Dialog
        open={!!conflict && !confirmOverwrite}
        title="文档名已存在"
        variant="warning"
        onClose={handling ? null : handleCancelConflict}
        description={
          renaming ? (
            <span>
              请输入新的文档名，原名称 <span className="font-medium text-amber-600 dark:text-amber-400">「{conflict?.conflictTitle}」</span> 已被占用。
            </span>
          ) : (
            <span>
              已存在同名文档 <span className="font-medium text-amber-600 dark:text-amber-400">「{conflict?.conflictTitle}」</span>。请选择处理方式，或修改名称后重试。
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
                重命名当前文档
              </button>
              <button
                type="button"
                onClick={() => setConfirmOverwrite(true)}
                disabled={handling}
                className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileX2 className="w-3.5 h-3.5" />
                覆盖现有文档
              </button>
            </>
          )
        }
      >
        {renaming && (
          <div className="space-y-2">
            <label className="block text-xs text-light-text-2 dark:text-dark-text-2">新文档名</label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !handling) void handleRename();
                if (e.key === 'Escape') handleCancelConflict();
              }}
              placeholder="输入新的文档名"
              className="w-full px-3 py-2 rounded-lg border border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-3 text-sm text-dark-1 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>
        )}
      </Dialog>

      {/* 覆盖二次确认：删除老文档不可恢复 */}
      <Dialog
        open={confirmOverwrite}
        title="确定覆盖同名文档？"
        variant="danger"
        onClose={handling ? null : () => setConfirmOverwrite(false)}
        description={
          <span>
            将永久删除已有的同名文档 <span className="font-medium text-red-600 dark:text-red-400">「{conflict?.conflictTitle}」</span>，并保留你当前正在编辑的内容。此操作不可恢复。
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
              className="px-4 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {handling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              确认覆盖
            </button>
          </>
        }
      />
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
