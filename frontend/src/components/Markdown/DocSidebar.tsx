import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Search, X, AlertTriangle, Cloud, HardDrive } from 'lucide-react';
import { Spinner } from '@/components/Common/Loading';
import { FixedSizeList as VirtualList, type ListChildComponentProps } from 'react-window';
import { useActiveDocStore, useIsLocalMode, useLocalDocsAccessor, isLocalDocId } from '@/hooks/useActiveDocStore';
import { useAuthStore } from '@/contexts/AuthContext';
import { MAX_LOCAL_DOCS } from '@/contexts/LocalDocContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * 文档列表侧栏
 * - 展示当前用户的 Markdown 文档列表
 * - 顶部搜索框：前端按标题过滤，避免对后端做额外请求（量级一般 < 千）
 * - 长列表（>50 项）启用 react-window 虚拟滚动，防止 DOM 节点过多造成卡顿
 * - 点击切换 / 右侧删除
 * - 顶部「新建」按钮跳转 /docs/new
 * - 登录态分区展示：云端存储 + 本地存储（本地文档可点击编辑，保存时迁移到云端）
 */
interface DocSidebarProps {
  /** 窄屏时是否展开（受控） */
  open?: boolean;
  onClose?: () => void;
  /** 窄屏抽屉模式：选中/新建后自动收起；桌面端常驻不收起 */
  isNarrowScreen?: boolean;
}

// 虚拟滚动阈值：超过该数量才启用，小列表原生渲染更省内存
const VIRTUAL_THRESHOLD = 50;
// 每行高度（与下方行内样式保持一致）
const ROW_HEIGHT = 44;

export const DocSidebar = ({ open = true, onClose, isNarrowScreen = false }: DocSidebarProps) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const isLocalMode = useIsLocalMode();
  const { user, initialized } = useAuthStore();
  // 登录态：需要并行读取云端 + 本地两个 store 分区展示
  // 未登录态：useActiveDocStore 返回 local store，localAccessor 返回同一个，无额外开销
  const activeStore = useActiveDocStore();
  const localStore = useLocalDocsAccessor();

  // 登录态：云端用 activeStore（即 cloud store），本地用 localStore
  // 未登录态：activeStore 即 localStore，localStore 重复订阅无副作用
  const cloudStore = user ? activeStore : null;
  const {
    docs: cloudDocs,
    listLoading: cloudLoading,
    listError: cloudError,
    currentDocId,
    isDirty,
    loadList: loadCloudList,
    removeDoc: removeCloudDoc,
    saveCurrent: saveCloudCurrent,
  } = cloudStore ?? {};
  const {
    docs: localDocs,
    loadList: loadLocalList,
    removeDoc: removeLocalDoc,
    currentDocId: localCurrentDocId,
    isDirty: localIsDirty,
    saveCurrent: saveLocalCurrent,
  } = localStore;

  // 未登录态：列表数据来自 activeStore（local）；登录态：分区使用 cloudDocs / localDocs
  const docs = user ? cloudDocs : activeStore.docs;
  const listLoading = user ? cloudLoading : activeStore.listLoading;
  const listError = user ? cloudError : activeStore.listError;
  const loadList = user ? loadCloudList! : activeStore.loadList;
  const removeDoc = user ? removeCloudDoc! : activeStore.removeDoc;
  const saveCurrent = user ? saveCloudCurrent! : activeStore.saveCurrent;

  const [query, setQuery] = useState('');

  // 列表容器高度，供虚拟列表使用；用 ResizeObserver 动态测量以适配抽屉/响应式
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    // 必须等待 auth 初始化完成：未初始化时 useActiveDocStore 返回 cloud store，
    // loadList 会调用 /api/v1/documents 触发 1002 弹窗
    if (!initialized) return;
    if (open) {
      void loadList();
      // 登录态额外加载本地文档列表，用于分区展示
      if (user) void loadLocalList();
    }
  }, [open, loadList, loadLocalList, user, initialized]);

  // 监听列表区高度变化（窗口缩放/侧栏宽度变化时同步）
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setListHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 前端过滤：按标题子串匹配（大小写不敏感）；空查询返回全量
  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => (d.title || '未命名文档').toLowerCase().includes(q));
  }, [docs, query]);

  // 登录态：本地文档过滤（独立分区）
  const filteredLocalDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localDocs;
    return localDocs.filter((d) => (d.title || '未命名文档').toLowerCase().includes(q));
  }, [localDocs, query]);

  const handleNew = async () => {
    // 本地模式 5 篇上限：达上限时拦截并引导登录
    if (isLocalMode && docs.length >= MAX_LOCAL_DOCS) {
      showError(`本地模式最多创建 ${MAX_LOCAL_DOCS} 篇文档，请登录后使用云端存储`);
      return;
    }
    // 编辑中新建：先自动保存当前文档，失败时询问是否继续。
    // 登录态下需判断当前编辑的是本地文档还是云端文档，选择正确的 store 保存：
    // - localStore.currentDocId 非 null → 正在编辑本地文档，用 localStore 保存
    // - 否则用 cloudStore（activeStore）保存
    // 否则会用 cloudStore 的 isDirty（false）跳过保存，导致本地文档未保存内容在 reset 时丢失
    const isEditingLocal = user && !!localCurrentDocId;
    const dirty = isEditingLocal ? localIsDirty : (user ? isDirty : activeStore.isDirty);
    const doSave = isEditingLocal ? saveLocalCurrent : (user ? saveCurrent : activeStore.saveCurrent);
    if (dirty && doSave) {
      const result = await doSave();
      if (result.status === 'error') {
        const proceed = window.confirm(
          `当前文档保存失败：${result.message}\n是否仍要新建文档？（未保存内容将丢失）`,
        );
        if (!proceed) return;
      }
    }
    // 本地模式（未登录）下，自动保存首次创建文档后 currentDocId 变为 local_xxx，
    // 但 URL 仍是 /docs/new。此时再 navigate('/docs/new') 路径不变，主 useEffect 不会重新执行，
    // newDoc() 不会被调用 → 编辑区保持旧文档，表现为"点击新建无反应"。
    // 解决：若当前 URL 已是 /docs/new，主动调用 newDoc() 重置编辑区。
    if (window.location.pathname === '/docs/new') {
      activeStore.newDoc();
    } else {
      navigate('/docs/new');
    }
    if (isNarrowScreen) onClose?.();
  };

  const handleSelect = async (id: string) => {
    // 切换文档前先保存当前文档（若有未保存改动），避免 reset() 清空导致内容丢失。
    // 自动保存有 3s debounce，用户快速切换时可能尚未触发，此处显式保存兜底。
    // 登录态下需判断当前编辑的是本地文档还是云端文档，选择正确的 store 保存：
    // - localStore.currentDocId 非 null → 正在编辑本地文档，用 localStore 保存
    // - 否则用 cloudStore（activeStore）保存
    // 否则会用 cloudStore 的 isDirty（false）跳过保存，导致本地文档未保存内容在 reset 时丢失
    const isEditingLocal = user && !!localCurrentDocId;
    const dirty = isEditingLocal ? localIsDirty : (user ? isDirty : activeStore.isDirty);
    const doSave = isEditingLocal ? saveLocalCurrent : (user ? saveCurrent : activeStore.saveCurrent);
    if (dirty && doSave) {
      const result = await doSave();
      if (result.status === 'error') {
        const proceed = window.confirm(
          `当前文档保存失败：${result.message}\n是否仍要切换文档？（未保存内容将丢失）`,
        );
        if (!proceed) return;
      }
    }
    // 侧栏点击直接进入编辑页，对被点击的文档进行编辑
    navigate(`/docs/${id}`);
    if (isNarrowScreen) onClose?.();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定删除该文档？此操作不可恢复。')) return;
    try {
      // 登录态下本地文档走 localStore 删除，云端文档走 activeStore
      if (user && isLocalDocId(id)) {
        await removeLocalDoc(id);
        // 删除后重新加载本地列表，确保与 IndexedDB 完全同步，避免「刷新后记录复活」
        await loadLocalList();
      } else {
        await removeDoc(id);
        // 删除后重新加载云端列表，确保与后端一致
        await loadList();
      }
      if (id === currentDocId) navigate('/docs/new');
    } catch (err) {
      // 删除失败时明确提示用户，避免误以为删除成功
      showError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 单行渲染：虚拟列表与普通列表共用，保证视觉一致
  // isLocal 标记用于登录态分区时本地文档行加视觉标识（左侧琥珀色条 + 标签）
  const renderRow = (doc: { documentId: string; title?: string; updatedAt?: string }, isLocal = false) => {
    // 登录态下本地文档选中态需对比 localStore 的 currentDocId，
    // 否则 cloudStore 的 currentDocId 永远不等于 local_xxx，导致本地文档无选中效果
    const active = isLocal
      ? doc.documentId === localCurrentDocId
      : doc.documentId === currentDocId;
    return (
      <div
        onClick={() => handleSelect(doc.documentId)}
        className={`group flex items-center gap-2 px-3 cursor-pointer transition-colors border-l-2 ${
          active
            ? 'bg-primary/10 text-primary border-primary'
            : isLocal
              ? 'text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/10 border-amber-400/60'
              : 'text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 border-transparent'
        }`}
        style={{ height: ROW_HEIGHT }}
      >
        <FileText className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : isLocal ? 'text-amber-500' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate flex items-center gap-1">
            <span className="truncate">{doc.title || '未命名文档'}</span>
            {/* 登录态分区展示时，本地文档加「本地」小标签 */}
            {isLocal && user && (
              <span className="shrink-0 px-1 py-px text-[9px] rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                本地
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400">
            {doc.updatedAt ? formatTime(doc.updatedAt) : ''}
          </div>
        </div>
        <button
          onClick={(e) => handleDelete(e, doc.documentId)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-error transition-all"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // 虚拟列表行组件：FixedSizeList 通过 style 控制绝对定位，必须原样应用
  const VirtualRow = ({ index, style, data }: ListChildComponentProps) => {
    const doc = data[index];
    return (
      <div style={style} key={doc.documentId}>
        {renderRow(doc)}
      </div>
    );
  };

  const useVirtual = filteredDocs.length > VIRTUAL_THRESHOLD;

  return (
    <aside
      className={`flex flex-col bg-light-2 dark:bg-dark-2 border-r border-light-3 dark:border-dark-3 transition-all duration-200 ${
        open ? 'w-60' : 'w-0 overflow-hidden'
      }`}
    >
      {/* 顶部标题栏：柔和背景 + 底部分隔线，强化头部区域感 */}
      <div className="flex items-center justify-between px-3 py-3 bg-light-1/60 dark:bg-dark-1/40 border-b border-light-3 dark:border-dark-3">
        <span className="text-sm font-semibold text-dark-1 dark:text-white">文档列表</span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
          title="新建文档"
        >
          <Plus className="w-3.5 h-3.5" />
          新建
        </button>
      </div>

      {/* 本地模式提示：卡片式布局，分层展示关键信息，减少视觉压迫 */}
      {isLocalMode && (
        <div className="mx-3 my-2 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-1.5 text-xs leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <div className="font-medium">本地模式：文档仅存于浏览器</div>
              <div className="text-amber-600/80 dark:text-amber-400/80">清空缓存或换设备将丢失</div>
              <div className="text-amber-600/80 dark:text-amber-400/80">免费上限 {MAX_LOCAL_DOCS} 篇 · 登录享云端</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-2 w-full px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs transition-colors"
          >
            登录升级云端
          </button>
        </div>
      )}

      {/* 搜索框：仅在有文档时显示；有列表错误时不展示以免干扰 */}
      {(docs.length > 0 || (user && localDocs.length > 0)) && !listError && (
        <div className="px-3 py-2 border-b border-light-3 dark:border-dark-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文档标题…"
              className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 text-dark-1 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              aria-label="搜索文档"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-1 dark:hover:text-white"
                title="清除搜索"
                aria-label="清除搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={listContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {listLoading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Spinner size="sm" className="text-gray-400" />
          </div>
        )}

        {listError && (
          <div className="px-3 py-4 text-xs text-error text-center">{listError}</div>
        )}

        {!listLoading && !listError && filteredDocs.length === 0 && (!user || filteredLocalDocs.length === 0) && (
          <div className="px-3 py-10 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <div>
              {query ? '未找到匹配的文档' : '暂无文档'}
              {!query && (
                <>
                  <br />
                  点击「新建」开始
                </>
              )}
            </div>
          </div>
        )}

        {!listLoading && !listError && filteredDocs.length > 0 && (
          <>
            {/* 登录态：云端分区标题 - 色块背景增强分区感 */}
            {user && (
              <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-light-1/80 dark:bg-dark-1/60 backdrop-blur-sm border-b border-light-3/60 dark:border-dark-3/60">
                <Cloud className="w-3 h-3 text-primary" />
                云端存储
                <span className="font-normal opacity-70">({filteredDocs.length})</span>
              </div>
            )}
            {useVirtual ? (
              <VirtualList
                height={listHeight}
                width="100%"
                itemCount={filteredDocs.length}
                itemSize={ROW_HEIGHT}
                itemData={filteredDocs}
                overscanCount={5}
              >
                {VirtualRow}
              </VirtualList>
            ) : (
              <ul className="py-1">
                {filteredDocs.map((doc) => (
                  <li key={doc.documentId}>{renderRow(doc, false)}</li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* 登录态：本地存储分区 - 琥珀色调背景块，与云端清晰区分 */}
        {!listLoading && !listError && user && filteredLocalDocs.length > 0 && (
          <div className="mt-1 border-t-2 border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10">
            <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/30 backdrop-blur-sm border-b border-amber-200/60 dark:border-amber-800/40">
              <HardDrive className="w-3 h-3" />
              本地存储
              <span className="font-normal opacity-70">({filteredLocalDocs.length})</span>
              <span className="ml-auto font-normal normal-case text-[9px] text-amber-600/70 dark:text-amber-400/70">保存即迁移至云端</span>
            </div>
            <ul className="py-1">
              {filteredLocalDocs.map((doc) => (
                <li key={doc.documentId}>{renderRow(doc, true)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
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
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
};
