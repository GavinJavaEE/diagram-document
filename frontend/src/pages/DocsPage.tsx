import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Plus, Trash2, Loader2, ArrowRight, AlertTriangle, Cloud, HardDrive, PencilLine, CheckSquare, X } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Header } from '@/components/Layout/Header';
import { DocCardSkeleton, LoadingError, useLoadingTimeout, FadeIn } from '@/components/Common/Loading';
import { useActiveDocStore, useIsLocalMode, useLocalDocsAccessor, isLocalDocId } from '@/hooks/useActiveDocStore';
import { MAX_LOCAL_DOCS } from '@/contexts/LocalDocContext';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { buildLoginUrl } from '@/utils/loginRedirect';

/**
 * 文档列表页 /docs
 * - 卡片式展示当前用户的 Markdown 文档
 * - 顶部「新建文档」CTA
 * - 登录态分区展示：云端存储 + 本地存储（本地文档可点击编辑，保存时迁移到云端）
 */
export const DocsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { initialized, user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const isLocalMode = useIsLocalMode();
  const activeStore = useActiveDocStore();
  const localStore = useLocalDocsAccessor();

  // 登录态：分区读取云端 + 本地；未登录态：仅 activeStore（local）
  const cloudDocs = user ? activeStore.docs : [];
  const cloudLoading = user ? activeStore.listLoading : false;
  const cloudError = user ? activeStore.listError : null;
  const localDocs = user ? localStore.docs : activeStore.docs;
  const localLoading = user ? localStore.listLoading : activeStore.listLoading;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // 多选模式状态
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const selectedCount = selectedIds.size;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectionMode = useCallback((next?: boolean) => {
    const target = next !== undefined ? next : !selectionMode;
    setSelectionMode(target);
    if (!target) clearSelection();
  }, [selectionMode, clearSelection]);

  // 列表加载：登录态并行拉云端 + 本地，未登录仅本地
  const loadLists = useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.all([
        activeStore.loadList(),
        user ? localStore.loadList() : Promise.resolve(),
      ]);
    } finally {
      setRetrying(false);
    }
  }, [activeStore, localStore, user]);

  useEffect(() => {
    if (!initialized) return;
    if (!isLocalMode && !user) {
      navigate(buildLoginUrl(location.pathname + location.search), { replace: true });
      return;
    }
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, isLocalMode, user]);

  const showEmpty = cloudDocs.length === 0 && localDocs.length === 0;
  const isLoading = retrying || (user ? (cloudLoading && localLoading) : localLoading);
  const timedOut = useLoadingTimeout(isLoading);

  // 新建文档：在新标签页打开 Markdown 编辑器，避免离开当前列表页
  const handleNew = () => {
    if (isLocalMode && localDocs.length >= MAX_LOCAL_DOCS) {
      showError(`本地模式最多创建 ${MAX_LOCAL_DOCS} 篇文档，请登录后使用云端存储`);
      return;
    }
    window.open('/docs/new', '_blank', 'noopener,noreferrer');
  };

  // 卡片普通点击：在新标签页打开文档预览页（只读）；多选模式下切换选中态
  const handleOpen = (id: string) => {
    if (selectionMode) {
      toggleSelect(id);
      return;
    }
    window.open(`/docs/${id}/view`, '_blank', 'noopener,noreferrer');
  };
  // 编辑按钮点击：直接进入编辑页
  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/docs/${id}`);
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确定删除选中的 ${ids.length} 篇文档？此操作不可恢复。`)) return;
    setBatchDeleting(true);
    try {
      // 并行删除：本地文档走 localStore，云端文档走 activeStore
      await Promise.all(
        ids.map((id) =>
          user && isLocalDocId(id) ? localStore.removeDoc(id) : activeStore.removeDoc(id),
        ),
      );
      // 重新加载列表
      await loadLists();
      clearSelection();
      showSuccess(`已删除 ${ids.length} 篇文档`);
    } catch (err) {
      showError(err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定删除该文档？此操作不可恢复。')) return;
    setDeletingId(id);
    try {
      // 登录态：本地文档走 localStore，云端走 activeStore
      if (user && isLocalDocId(id)) {
        await localStore.removeDoc(id);
        // 删除后重新加载本地列表，确保与 IndexedDB 完全同步
        await localStore.loadList();
      } else {
        await activeStore.removeDoc(id);
        // 删除后重新加载云端列表，确保与后端一致
        await activeStore.loadList();
      }
      showSuccess('已删除');
    } catch (err) {
      showError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // 卡片渲染：isLocal 标记用于本地文档加视觉标识
  const renderCard = (doc: { documentId: string; title?: string; updatedAt?: string; bytesSize?: number }, isLocal = false) => {
    const isSelected = selectedIds.has(doc.documentId);
    return (
      <div
        key={doc.documentId}
        onClick={() => handleOpen(doc.documentId)}
        className={`group relative bg-white dark:bg-dark-2 border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
          selectionMode && isSelected
            ? 'border-primary ring-2 ring-primary/30'
            : isLocal
              ? 'border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600'
              : 'border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/40'
        }`}
      >
        {/* 多选模式下右上角显示选中态 */}
        {selectionMode && (
          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
            isSelected
              ? 'bg-primary border-primary text-white'
              : 'bg-white/80 dark:bg-dark-2/80 border-gray-300 dark:border-gray-600'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isLocal ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'
          }`}>
            {isLocal ? (
              <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <FileText className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-dark-1 dark:text-white truncate flex items-center gap-1.5">
              <span className="truncate">{doc.title || '未命名文档'}</span>
              {isLocal && (
                <span className="shrink-0 px-1.5 py-px text-[10px] rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  本地
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {doc.updatedAt ? formatTime(doc.updatedAt) : ''}
              {doc.bytesSize ? ` · ${formatSize(doc.bytesSize)}` : ''}
            </p>
          </div>
        </div>
        {/* 右下角操作按钮组：编辑 + 删除，hover 显现，stopPropagation 防止触发卡片预览；多选模式下隐藏 */}
        {!selectionMode && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => handleEdit(e, doc.documentId)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
              title="编辑"
            >
              <PencilLine className="w-3 h-3" />
              编辑
            </button>
            <button
              onClick={(e) => handleDelete(e, doc.documentId)}
              disabled={deletingId === doc.documentId}
              className="p-1.5 rounded text-gray-400 hover:text-error hover:bg-error/10 transition-all disabled:opacity-50"
              title="删除"
            >
              {deletingId === doc.documentId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SEO
        title="我的文档 - DiagramAI"
        description="管理你的 Markdown 文档，支持图文与 Mermaid 图表混排。"
        url="https://diagramai.com/docs"
      />
      <div className="min-h-screen bg-light-1 dark:bg-dark-1 theme-transition">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-dark-1 dark:text-white">我的文档</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Markdown 文档，支持 Mermaid 图表实时渲染
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!selectionMode ? (
                <button
                  onClick={() => toggleSelectionMode(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-dark-1 dark:text-white border border-light-3 dark:border-dark-3 hover:bg-light-2 dark:hover:bg-dark-3 rounded-lg font-medium text-sm transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  多选
                </button>
              ) : (
                <button
                  onClick={() => toggleSelectionMode(false)}
                  disabled={batchDeleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-light-text-2 dark:text-dark-text-2 border border-light-3 dark:border-dark-3 hover:bg-light-2 dark:hover:bg-dark-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              )}
              <button
                onClick={handleNew}
                disabled={selectionMode}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                新建文档
              </button>
            </div>
          </div>

          {/* 批量操作栏：多选模式时显示 */}
          {selectionMode && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm text-primary font-medium">
                已选 {selectedCount} 篇
              </span>
              <button
                onClick={clearSelection}
                disabled={batchDeleting || selectedCount === 0}
                className="text-xs text-light-text-2 dark:text-dark-text-2 hover:text-primary transition-colors disabled:opacity-40"
              >
                清空选择
              </button>
              <div className="flex-1" />
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting || selectedCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                删除选中
              </button>
            </div>
          )}

          {/* 本地模式提示 */}
          {isLocalMode && (
            <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="font-medium">当前为本地模式：文档仅保存在浏览器缓存中</div>
                <div className="text-amber-600/80 dark:text-amber-400/80">登录后可享受云端存储、文档分享功能</div>
                <div className="text-amber-600/80 dark:text-amber-400/80">免费本地模式最多创建 {MAX_LOCAL_DOCS} 篇文档</div>
                <div className="text-amber-600/80 dark:text-amber-400/80">警告：清空浏览器缓存或更换设备将导致本地文档丢失</div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="flex-shrink-0 px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                登录
              </button>
            </div>
          )}

          {/* 内容区：骨架屏 → 超时重试 → 错误 → 空态 → 内容，逐级降级 */}
          {isLoading && !timedOut ? (
            <FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <DocCardSkeleton key={i} />
                ))}
              </div>
            </FadeIn>
          ) : isLoading && timedOut ? (
            <LoadingError
              message="加载时间较长，请检查网络后重试"
              onRetry={loadLists}
              retrying={retrying}
            />
          ) : cloudError ? (
            <LoadingError message={cloudError} onRetry={loadLists} retrying={retrying} />
          ) : showEmpty ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">还没有文档</p>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-sm transition-colors"
              >
                创建第一个文档
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <FadeIn>
              {/* 登录态：云端存储分区 */}
              {user && cloudDocs.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Cloud className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-dark-1 dark:text-white">云端存储</h2>
                    <span className="text-xs text-gray-400">({cloudDocs.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cloudDocs.map((doc) => renderCard(doc, false))}
                  </div>
                </section>
              )}

              {/* 登录态：本地存储分区 */}
              {user && localDocs.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-sm font-semibold text-dark-1 dark:text-white">本地存储</h2>
                    <span className="text-xs text-gray-400">({localDocs.length})</span>
                    <span className="ml-auto text-[11px] text-amber-500/80">编辑保存后自动迁移至云端</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {localDocs.map((doc) => renderCard(doc, true))}
                  </div>
                </section>
              )}

              {/* 未登录态：单区展示（无分区标题） */}
              {!user && localDocs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localDocs.map((doc) => renderCard(doc, false))}
                </div>
              )}
            </FadeIn>
          )}
        </main>
      </div>
    </>
  );
};

const formatTime = (s: string): string => {
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';  // Invalid Date 防护
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min}分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}小时前`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day}天前`;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};
