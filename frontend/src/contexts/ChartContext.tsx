import { create } from 'zustand';
import {
  listCharts,
  deleteDocument,
  getDocument,
  createDocument,
} from '@/services/api';
import { getDefaultChartTypes } from '@/services/chartTypes';
import { useAuthStore } from '@/contexts/AuthContext';
import {
  isLocalChartId,
  readLocalCharts,
  writeLocalCharts,
  genLocalChartId,
  MAX_LOCAL_CHARTS,
  type LocalChartRecord,
} from '@/contexts/EditorContext';

/**
 * 「我的图表」页面状态管理
 *
 * 与 DocContext 区别：
 * - DocContext 服务于 Markdown 文档（chartType='markdown'），含完整编辑态
 * - ChartContext 服务于 Mermaid 图表（chartType=flowchart/sequence/...），仅管理列表
 * - 图表编辑走 EditorPage，不在本 store 维护编辑态
 *
 * 双模式支持：
 * - 已登录：复用后端 /api/v1/documents 接口，通过 chartTypes 多值参数筛选
 * - 未登录：走 IndexedDB 本地存储（store: charts），最多 5 个图表
 *
 * 数据来源判断：useAuthStore.getState().user 是否存在
 */

/** 所有 Mermaid 图表类型的 categoryId 列表（用于拉取"全部图表"） */
const ALL_CHART_TYPES = getDefaultChartTypes().map((c) => c.categoryId);

/** 判断当前是否本地模式（未登录） */
const isLocalMode = (): boolean => {
  const { user, initialized } = useAuthStore.getState();
  return initialized && !user;
};

export interface ChartListItem {
  documentId: string;
  title?: string;
  content?: string;
  chartType?: string;
  updatedAt?: string;
  bytesSize?: number;
}

export interface ChartState {
  docs: ChartListItem[];
  listLoading: boolean;
  listError: string | null;
  total: number;
  /** 当前选中的类型筛选；null 表示"全部" */
  activeType: string | null;
  /** 多选模式：选中的 documentId 集合 */
  selectedIds: Set<string>;
  /** 是否处于多选模式 */
  selectionMode: boolean;

  loadList: (page?: number, pageSize?: number) => Promise<void>;
  setActiveType: (type: string | null) => void;
  removeDoc: (id: string) => Promise<void>;
  /** 复制图表：读取原文档 → 创建新文档（标题加" 副本"）→ 刷新列表 */
  copyDoc: (id: string) => Promise<void>;
  /** 批量删除：循环调用 deleteDocument，全部成功后刷新列表 */
  batchRemove: (ids: string[]) => Promise<void>;
  /** 进入/退出多选模式 */
  toggleSelectionMode: (enabled: boolean) => void;
  /** 切换单个卡片选中态 */
  toggleSelect: (id: string) => void;
  /** 全选/取消全选当前列表 */
  selectAll: () => void;
  clearSelection: () => void;
  reset: () => void;
}

const normalizeDate = (s?: string): string => {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
};

export const useChartStore = create<ChartState>((set, get) => ({
  docs: [],
  listLoading: false,
  listError: null,
  total: 0,
  activeType: null,
  selectedIds: new Set(),
  selectionMode: false,

  loadList: async (page = 1, pageSize = 50) => {
    set({ listLoading: true, listError: null });
    try {
      const { activeType } = get();

      // 本地模式：从 IndexedDB 读取并按 activeType 过滤
      if (isLocalMode()) {
        const records = await readLocalCharts();
        const filtered = activeType
          ? records.filter((r) => r.chartType === activeType)
          : records;
        // 按更新时间倒序，与云端 list 接口排序一致
        const docs: ChartListItem[] = filtered
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
        set({ docs, total: docs.length, listLoading: false });
        return;
      }

      // 云端模式：activeType 非空时走单值精确匹配；为空时拉取所有图表类型
      const resp = await listCharts(
        page,
        pageSize,
        activeType ? undefined : ALL_CHART_TYPES,
        activeType ?? undefined,
      );
      const docs = (resp.items || []).map((d) => ({
        documentId: d.documentId,
        title: d.title,
        content: d.content,
        chartType: d.chartType,
        updatedAt: normalizeDate(d.updatedAt),
        bytesSize: d.bytesSize,
      }));
      set({ docs, total: resp.total, listLoading: false });
    } catch (err) {
      set({
        listLoading: false,
        listError: err instanceof Error ? err.message : '加载列表失败',
      });
    }
  },

  setActiveType: (type) => {
    // 切换类型时清空选中集合：新列表的文档 ID 与旧选中 ID 不匹配，
    // 保留会导致"全选"判断错误、批量删除误删不在当前视图中的文档
    set({ activeType: type, selectedIds: new Set() });
  },

  removeDoc: async (id) => {
    // 本地存储分流
    if (isLocalChartId(id) || isLocalMode()) {
      const records = await readLocalCharts();
      const next = records.filter((r) => r.documentId !== id);
      await writeLocalCharts(next);
      set((state) => ({
        docs: state.docs.filter((d) => d.documentId !== id),
        total: Math.max(0, state.total - 1),
      }));
      return;
    }
    await deleteDocument(id);
    // 删除成功后从列表中移除，避免重新拉取
    set((state) => ({
      docs: state.docs.filter((d) => d.documentId !== id),
      total: Math.max(0, state.total - 1),
    }));
  },

  copyDoc: async (id) => {
    // 本地存储分流
    if (isLocalChartId(id) || isLocalMode()) {
      const records = await readLocalCharts();
      const src = records.find((r) => r.documentId === id);
      if (!src) throw new Error('原图表不存在');
      if (records.length >= MAX_LOCAL_CHARTS) {
        throw new Error(`本地模式最多创建 ${MAX_LOCAL_CHARTS} 个图表，请登录后使用云端存储`);
      }
      const newId = genLocalChartId();
      const now = new Date().toISOString();
      // 标题加" 副本"后缀；若已存在则追加序号
      let newTitle = `${src.title || '未命名图表'} 副本`;
      let attempt = 1;
      while (records.some((r) => r.title === newTitle)) {
        newTitle = `${src.title || '未命名图表'} 副本 (${attempt})`;
        attempt++;
        if (attempt >= 100) break;
      }
      const newRecord: LocalChartRecord = {
        documentId: newId,
        title: newTitle,
        content: src.content,
        chartType: src.chartType,
        createdAt: now,
        updatedAt: now,
      };
      await writeLocalCharts([...records, newRecord]);
      await get().loadList();
      return;
    }
    // 云端：1. 读取原文档内容 2. 创建新文档 3. 刷新列表
    const src = await getDocument(id);
    const newTitle = `${src.title || '未命名图表'} 副本`;
    await createDocument(newTitle, src.chartType || 'flowchart', src.content);
    await get().loadList();
  },

  batchRemove: async (ids) => {
    // 本地存储分流
    if (isLocalMode()) {
      const records = await readLocalCharts();
      const next = records.filter((r) => !ids.includes(r.documentId));
      await writeLocalCharts(next);
      set((state) => ({
        docs: state.docs.filter((d) => !ids.includes(d.documentId)),
        total: Math.max(0, state.total - ids.length),
        selectedIds: new Set(),
        selectionMode: false,
      }));
      return;
    }
    // 云端：串行删除，避免并发请求过多触发限流；任一失败则抛错让 UI 提示
    for (const id of ids) {
      await deleteDocument(id);
    }
    // 全部成功后从列表中移除并退出多选模式
    set((state) => ({
      docs: state.docs.filter((d) => !ids.includes(d.documentId)),
      total: Math.max(0, state.total - ids.length),
      selectedIds: new Set(),
      selectionMode: false,
    }));
  },

  toggleSelectionMode: (enabled) => {
    set({
      selectionMode: enabled,
      selectedIds: enabled ? new Set() : new Set(),
    });
  },

  toggleSelect: (id) => {
    const { selectedIds } = get();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedIds: next });
  },

  selectAll: () => {
    const { docs, selectedIds } = get();
    // 当前列表全部已选中 → 取消全选；否则全选
    const allSelected = docs.every((d) => selectedIds.has(d.documentId));
    if (allSelected) {
      set({ selectedIds: new Set() });
    } else {
      set({ selectedIds: new Set(docs.map((d) => d.documentId)) });
    }
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  reset: () => {
    set({
      docs: [],
      listLoading: false,
      listError: null,
      total: 0,
      activeType: null,
      selectedIds: new Set(),
      selectionMode: false,
    });
  },
}));
