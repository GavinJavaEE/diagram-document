import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, ArrowRight, PencilLine, Copy, CheckSquare, X, AlertTriangle, Cloud, HardDrive } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Header } from '@/components/Layout/Header';
import { DocCardSkeleton, LoadingError, useLoadingTimeout, FadeIn } from '@/components/Common/Loading';
import { MermaidThumbnail } from '@/components/Common/MermaidThumbnail';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useChartStore } from '@/contexts/ChartContext';
import { readLocalCharts, isLocalChartId, MAX_LOCAL_CHARTS } from '@/contexts/EditorContext';
import { getDefaultChartTypes } from '@/services/chartTypes';
import type { ChartListItem } from '@/contexts/ChartContext';

/**
 * 图表列表页 /charts
 * - 卡片式展示当前用户的 Mermaid 图表（flowchart/sequence/class/state/gantt/er）
 * - 顶部「新建图表」CTA → /editor
 * - 类型筛选 Tab：全部 / 流程图 / 时序图 / 类图 / 状态图 / 甘特图 / ER 图
 * - 卡片操作：编辑 / 复制 / 删除
 * - 多选模式：批量删除
 *
 * 双模式支持（与 DocsPage 对齐）：
 * - 已登录：云端图表列表
 * - 未登录：本地 IndexedDB 存储，最多 5 个图表，顶部显示升级提示
 * - 卡片展示 Mermaid 缩略图懒渲染
 */
export const ChartsPage = () => {
  const navigate = useNavigate();
  const { initialized, user } = useAuthStore();
  const isLocalMode = initialized && !user;
  const { showSuccess, showError } = useToast();
  const {
    docs,
    listLoading,
    listError,
    activeType,
    selectedIds,
    selectionMode,
    loadList,
    setActiveType,
    removeDoc,
    copyDoc,
    batchRemove,
    toggleSelectionMode,
    toggleSelect,
  } = useChartStore();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // 本地存储图表（登录态下与云端分区展示；未登录态作为唯一数据源）
  const [localCharts, setLocalCharts] = useState<ChartListItem[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const chartTypes = getDefaultChartTypes();

  // 读取本地存储图表 → state（按 activeType 过滤）
  // overrideType 用于在 setActiveType 后立即用新值过滤，绕过闭包捕获的旧 activeType
  const loadLocalCharts = useCallback(async (overrideType?: string | null) => {
    setLocalLoading(true);
    try {
      const filterType = overrideType !== undefined ? overrideType : activeType;
      const records = await readLocalCharts();
      const filtered = filterType
        ? records.filter((r) => r.chartType === filterType)
        : records;
      const items: ChartListItem[] = filtered
        .map((r) => ({
          documentId: r.documentId,
          title: r.title,
          content: r.content,
          chartType: r.chartType,
          updatedAt: r.updatedAt,
          bytesSize: new Blob([r.content]).size,
        }))
        .sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
      setLocalCharts(items);
    } finally {
      setLocalLoading(false);
    }
  }, [activeType]);

  const reload = useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.all([
        loadList(),
        user ? loadLocalCharts() : Promise.resolve(),
      ]);
    } finally {
      setRetrying(false);
    }
  }, [loadList, loadLocalCharts, user]);

  useEffect(() => {
    if (!initialized) return;
    // 未登录也加载列表（本地存储模式），不再跳转登录
    // 登录态：并行加载云端 + 本地，分区展示
    void loadList();
    if (user) void loadLocalCharts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user]);

  // 切换类型筛选时重新拉取列表
  const handleTypeChange = useCallback(
    async (type: string | null) => {
      setActiveType(type);
      await loadList();
      // 传入 type 绕过闭包中旧的 activeType，立即用新类型过滤本地列表
      await loadLocalCharts(type);
    },
    [setActiveType, loadList, loadLocalCharts],
  );

  // 未登录：docs 即本地列表（ChartContext 分流）；登录：docs 为云端列表，localCharts 为本地列表
  const cloudDocs = user ? docs : [];
  const displayLocalDocs = user ? localCharts : docs;
  const showEmpty = cloudDocs.length === 0 && displayLocalDocs.length === 0;
  const isLoading = retrying || listLoading || (user ? localLoading : false);
  const timedOut = useLoadingTimeout(isLoading);
  const selectedCount = selectedIds.size;

  // 新建图表：在新标签页打开编辑器，避免离开当前列表页
  const handleNew = () => {
    window.open('/editor', '_blank', 'noopener,noreferrer');
  };

  const handleOpen = (id: string) => {
    // 多选模式下点击卡片切换选中态，不跳转
    if (selectionMode) {
      toggleSelect(id);
      return;
    }
    // 卡片点击：在新标签页打开图表预览页（只读 + 所有者可编辑/分享/导出 PDF）
    window.open(`/charts/${id}/view`, '_blank', 'noopener,noreferrer');
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/editor?id=${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定删除该图表？此操作不可恢复。')) return;
    setDeletingId(id);
    try {
      await removeDoc(id);
      // 本地存储的图表删除后，同步刷新 localCharts state
      if (isLocalChartId(id)) await loadLocalCharts();
      showSuccess('已删除');
    } catch (err) {
      showError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCopyingId(id);
    try {
      await copyDoc(id);
      // 复制可能产生本地副本，同步刷新 localCharts state
      if (isLocalChartId(id)) await loadLocalCharts();
      showSuccess('已复制');
    } catch (err) {
      showError(err instanceof Error ? err.message : '复制失败');
    } finally {
      setCopyingId(null);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确定删除选中的 ${ids.length} 个图表？此操作不可恢复。`)) return;
    setBatchDeleting(true);
    try {
      await batchRemove(ids);
      // 批量删除可能包含本地图表，同步刷新 localCharts state
      if (ids.some(isLocalChartId)) await loadLocalCharts();
      showSuccess(`已删除 ${ids.length} 个图表`);
    } catch (err) {
      showError(err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleExitSelectionMode = () => {
    toggleSelectionMode(false);
  };

  const renderCard = (chart: ChartListItem) => {
    const typeInfo = chartTypes.find((c) => c.categoryId === chart.chartType);
    const icon = typeInfo?.icon ?? '📊';
    const typeName = typeInfo?.name ?? chart.chartType ?? '图表';
    const isSelected = selectedIds.has(chart.documentId);

    return (
      <div
        key={chart.documentId}
        onClick={() => handleOpen(chart.documentId)}
        className={`group relative bg-white dark:bg-dark-2 border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
          selectionMode && isSelected
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/40'
        }`}
      >
        {/* 缩略图区：Mermaid 懒渲染 */}
        <div className="relative">
          <MermaidThumbnail
            code={chart.content || ''}
            id={chart.documentId}
            height={140}
          />
          {/* 类型徽章：左上角绝对定位 */}
          <span className="absolute top-2 left-2 px-1.5 py-px text-[10px] rounded bg-white/90 dark:bg-dark-2/90 text-primary backdrop-blur-sm">
            {icon} {typeName}
          </span>
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
        </div>
        {/* 信息区 */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-dark-1 dark:text-white truncate">
            {chart.title || '未命名图表'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {chart.updatedAt ? formatTime(chart.updatedAt) : ''}
            {chart.bytesSize ? ` · ${formatSize(chart.bytesSize)}` : ''}
          </p>
        </div>
        {/* hover 操作：右下角（多选模式下隐藏） */}
        {!selectionMode && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => handleEdit(e, chart.documentId)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
              title="编辑"
            >
              <PencilLine className="w-3 h-3" />
              编辑
            </button>
            <button
              onClick={(e) => handleCopy(e, chart.documentId)}
              disabled={copyingId === chart.documentId}
              className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
              title="复制"
            >
              {copyingId === chart.documentId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={(e) => handleDelete(e, chart.documentId)}
              disabled={deletingId === chart.documentId}
              className="p-1.5 rounded text-gray-400 hover:text-error hover:bg-error/10 transition-all disabled:opacity-50"
              title="删除"
            >
              {deletingId === chart.documentId ? (
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
        title="我的图表 - DiagramAI"
        description="管理你的 Mermaid 图表：流程图、时序图、类图、状态图、甘特图、ER 图。"
        url="https://diagramai.com/charts"
      />
      <div className="min-h-screen bg-light-1 dark:bg-dark-1 theme-transition">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* 页头 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-dark-1 dark:text-white">我的图表</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mermaid 图表，支持 AI 生成与代码编辑
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 多选模式切换按钮：列表非空时显示 */}
              {!showEmpty && !listError && !isLoading && (
                <button
                  onClick={() => toggleSelectionMode(!selectionMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectionMode
                      ? 'bg-primary text-white'
                      : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectionMode ? '退出多选' : '多选'}
                </button>
              )}
              <button
                onClick={handleNew}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                新建图表
              </button>
            </div>
          </div>

          {/* 批量操作栏：多选模式时显示 */}
          {selectionMode && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm text-primary font-medium">
                已选 {selectedCount} 项
              </span>
              <button
                onClick={() => {
                  // 全选当前展示的所有图表（云端 + 本地）
                  const allIds = [...cloudDocs, ...displayLocalDocs].map((d) => d.documentId);
                  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
                  if (allSelected) {
                    // 取消全选：清空选中
                    selectedIds.forEach((id) => toggleSelect(id));
                  } else {
                    // 全选：补选未选中的
                    allIds.forEach((id) => {
                      if (!selectedIds.has(id)) toggleSelect(id);
                    });
                  }
                }}
                className="text-xs text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                {[...cloudDocs, ...displayLocalDocs].length > 0 &&
                [...cloudDocs, ...displayLocalDocs].every((d) => selectedIds.has(d.documentId))
                  ? '取消全选'
                  : '全选'}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleBatchDelete}
                disabled={selectedCount === 0 || batchDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                删除选中
              </button>
              <button
                onClick={handleExitSelectionMode}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="退出多选"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 本地模式提示：未登录时显示，引导用户登录升级云端存储 */}
          {isLocalMode && (
            <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 min-w-0">
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

          {/* 类型筛选 Tab */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => handleTypeChange(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeType === null
                  ? 'bg-primary text-white'
                  : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
              }`}
            >
              全部
            </button>
            {chartTypes.map((t) => (
              <button
                key={t.categoryId}
                onClick={() => handleTypeChange(t.categoryId)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeType === t.categoryId
                    ? 'bg-primary text-white'
                    : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
                }`}
              >
                <span>{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>

          {/* 内容区：骨架屏 → 超时重试 → 错误 → 空态 → 内容 */}
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
              onRetry={reload}
              retrying={retrying}
            />
          ) : listError ? (
            <LoadingError message={listError} onRetry={reload} retrying={retrying} />
          ) : showEmpty ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {activeType ? `还没有${chartTypes.find((c) => c.categoryId === activeType)?.name ?? '该类型'}图表` : '还没有图表'}
              </p>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-sm transition-colors"
              >
                创建第一个图表
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
                    {cloudDocs.map((chart) => renderCard(chart))}
                  </div>
                </section>
              )}

              {/* 登录态：本地存储分区（编辑保存后可迁移至云端） */}
              {user && displayLocalDocs.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-sm font-semibold text-dark-1 dark:text-white">本地存储</h2>
                    <span className="text-xs text-gray-400">({displayLocalDocs.length}/{MAX_LOCAL_CHARTS})</span>
                    <span className="ml-auto text-[11px] text-amber-500/80">登录后编辑保存可迁移至云端</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayLocalDocs.map((chart) => renderCard(chart))}
                  </div>
                </section>
              )}

              {/* 未登录态：单区展示（无分区标题） */}
              {!user && displayLocalDocs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayLocalDocs.map((chart) => renderCard(chart))}
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
    if (isNaN(d.getTime())) return '';
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
