import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorState, ErrorLineInfo } from '@/types';
import { getChartCategory as getDynamicChartTypeInfo } from '@/services/chartTypes';
import {
  createDocument,
  getDocument,
  updateDocument,
  checkTitleDuplicate,
} from '@/services/api';
import { useAuthStore } from '@/contexts/AuthContext';
import {
  readAllCharts,
  writeAllCharts,
  type LocalChartRecord,
} from '@/lib/localDb';

const AUTO_SAVE_DEBOUNCE_MS = 3000;

// ===== 本地存储（未登录模式）=====
// 实现已迁移至 IndexedDB（src/lib/localDb.ts），此处仅保留向后兼容的导出名称。
// 调用方需以 `await readLocalCharts()` / `await writeLocalCharts(records)` 形式使用。
/** 未登录用户图表数量上限（与文档页 MAX_LOCAL_DOCS 对齐） */
export const MAX_LOCAL_CHARTS = 5;

/** 判断文档 ID 是否属于本地存储 */
export const isLocalChartId = (id: string | null | undefined): boolean =>
  !!id && id.startsWith('local_chart_');

/** 生成 local_chart_ 前缀的唯一 ID */
export const genLocalChartId = (): string =>
  `local_chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** 读取 IndexedDB 全量本地图表（异步） */
export const readLocalCharts = readAllCharts;

/** 写入 IndexedDB 全量本地图表（异步） */
export const writeLocalCharts = writeAllCharts;

/** 导出本地存储记录类型，供 ChartContext 复用 */
export type { LocalChartRecord };

/** 判断当前是否本地模式（未登录） */
const isLocalMode = (): boolean => {
  const { user, initialized } = useAuthStore.getState();
  return initialized && !user;
};

// 从错误信息中提取行号和列号
const parseErrorInfo = (error: string): ErrorLineInfo[] => {
  const errors: ErrorLineInfo[] = [];
  
  if (!error) return errors;

  // 匹配 Mermaid 错误格式: "Parse error on line 3 at column 5: ..."
  const lineMatch = error.match(/line\s*(\d+)/i);
  const colMatch = error.match(/column\s*(\d+)/i);
  
  const line = lineMatch ? parseInt(lineMatch[1], 10) : 0;
  const column = colMatch ? parseInt(colMatch[1], 10) : 0;
  
  errors.push({
    line,
    column,
    message: error,
    severity: 'error',
  });
  
  return errors;
};

export type ChartType = 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt' | 'er' | 'unknown';

interface ChartTypeInfo {
  key: ChartType;
  label: string;
  description: string;
  accent: string;
  icon: string;
}

// 默认图表类型信息（降级方案）
const DEFAULT_CHART_TYPE_INFO: Record<Exclude<ChartType, 'unknown'>, ChartTypeInfo> = {
  flowchart: {
    key: 'flowchart',
    label: '流程图',
    description: '标准流程图',
    accent: 'bg-primary/15 text-primary border-primary/30 dark:bg-primary/25 dark:text-white dark:border-primary/60',
    icon: '🔷',
  },
  sequence: {
    key: 'sequence',
    label: '时序图',
    description: '序列交互图',
    accent: 'bg-success/15 text-success border-success/30 dark:bg-success/25 dark:text-white dark:border-success/60',
    icon: '📊',
  },
  class: {
    key: 'class',
    label: '类图',
    description: '面向对象类图',
    accent: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/25 dark:text-white dark:border-purple-400/60 border-purple-500/30',
    icon: '📦',
  },
  state: {
    key: 'state',
    label: '状态图',
    description: '状态机转换图',
    accent: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-white dark:border-rose-400/60 border-rose-500/30',
    icon: '🔄',
  },
  gantt: {
    key: 'gantt',
    label: '甘特图',
    description: '项目排期图',
    accent: 'bg-warning/15 text-warning border-warning/30 dark:bg-warning/25 dark:text-white dark:border-warning/60',
    icon: '📅',
  },
  er: {
    key: 'er',
    label: 'ER 图',
    description: '实体关系图',
    accent: 'bg-info/15 text-info border-info/30 dark:bg-info/25 dark:text-white dark:border-info/60',
    icon: '🗄️',
  },
};

export const detectChartType = (code: string): ChartType => {
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return 'unknown';

  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes('flowchart') || firstLine.includes('graph ')) return 'flowchart';
  if (firstLine.includes('sequencediagram')) return 'sequence';
  if (firstLine.includes('classdiagram')) return 'class';
  if (firstLine.includes('statediagram') || firstLine.includes('state-diagram')) return 'state';
  if (firstLine.includes('gantt')) return 'gantt';
  if (firstLine.includes('erdiagram') || firstLine.includes('er diagram')) return 'er';

  if (trimmed.includes('flowchart')) return 'flowchart';
  if (trimmed.includes('sequencediagram')) return 'sequence';
  if (trimmed.includes('classdiagram')) return 'class';
  if (trimmed.includes('statediagram') || trimmed.includes('state-diagram')) return 'state';
  if (trimmed.includes('gantt')) return 'gantt';
  if (trimmed.includes('erdiagram') || trimmed.includes('er diagram')) return 'er';

  return 'unknown';
};

export const getChartTypeInfo = (type: ChartType): ChartTypeInfo => {
  if (type === 'unknown') {
    return {
      key: 'unknown',
      label: '未识别',
      description: '自定义代码',
      accent: 'bg-gray-400/15 text-gray-600 dark:text-gray-200 dark:bg-gray-500/25 dark:border-gray-400/60 border-gray-400/30',
      icon: '✨',
    };
  }
  
  // 尝试从动态获取的图表类型中获取信息
  const dynamicInfo = getDynamicChartTypeInfo(type);
  if (dynamicInfo) {
    return {
      key: type,
      label: dynamicInfo.name,
      description: dynamicInfo.description || '',
      accent: DEFAULT_CHART_TYPE_INFO[type].accent,
      icon: dynamicInfo.icon || '📊',
    };
  }
  
  // 降级到默认配置
  return DEFAULT_CHART_TYPE_INFO[type];
};

/** 保存结果，与 DocContext 对齐 */
export type ChartSaveResult =
  | { status: 'success' }
  | { status: 'conflict'; conflictDocId: string }
  | { status: 'error'; message: string }
  | { status: 'skipped' };

interface EditorStore extends EditorState {
  currentChartType: ChartType;
  /** 被点选高亮的节点 ID（来自 Preview 中点击 SVG 节点），CodeEditor 据此高亮对应代码行 */
  highlightedNodeId: string | null;
  // ===== 保存相关状态 =====
  /** 当前编辑的文档 ID；null 表示新建态，首次保存后赋值 */
  currentDocId: string | null;
  /** 图表标题 */
  title: string;
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 是否正在保存中 */
  isSaving: boolean;
  /** 最近一次保存时间 */
  lastSavedAt: Date | null;
  /** 保存错误信息 */
  saveError: string | null;

  setCode: (code: string) => void;
  /** 加载模板代码到编辑器：仅替换 code，不触发 isDirty/自动保存（用户可能连续切换多个模板挑选） */
  loadTemplate: (code: string) => void;
  setError: (error: string | null) => void;
  setIsRendering: (isRendering: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  setHighlightedNodeId: (id: string | null) => void;
  // ===== 保存相关方法 =====
  setTitle: (t: string) => void;
  /** 加载已有图表到编辑器 */
  loadDoc: (id: string) => Promise<void>;
  /** 进入新建图表态 */
  newChart: () => void;
  /** 保存当前图表（新建或更新） */
  saveCurrent: (options?: { force?: boolean; autoRename?: boolean }) => Promise<ChartSaveResult>;
  /** 重置编辑器到初始态 */
  resetEditor: () => void;
  /** 清理云端相关状态（logout 时调用），保留 code（本地编辑内容） */
  clearCloudData: () => void;
}

const defaultCode = `flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]
    C --> D`;

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => {
      // 自动保存定时器（模块级，单实例）
      let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

      const clearAutoSave = () => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
          autoSaveTimer = null;
        }
      };

      /** 内容变更后安排自动保存（debounce 3s） */
      const scheduleAutoSave = () => {
        clearAutoSave();
        autoSaveTimer = setTimeout(() => {
          void get().saveCurrent({ autoRename: true }).then((result) => {
            if (result.status === 'conflict') {
              // autoRename 模式下理论上不会 conflict，保险清理
              if (get().saveError && get().saveError.startsWith('图表名')) {
                set({ saveError: null });
              }
            }
            // error 状态：saveCurrent 内部已 set saveError，EditorPage 浮动指示器展示
            // success/skipped 状态：无需额外处理
          }).catch((err) => {
            // 兜底：saveCurrent 不应抛异常（内部 try-catch），但防止意外 rejection
            const message = err instanceof Error ? err.message : '自动保存失败';
            set({ saveError: message });
          });
        }, AUTO_SAVE_DEBOUNCE_MS);
      };

      return {
        code: defaultCode,
        error: null,
        errors: [],
        isRendering: false,
        lastSaved: null,
        currentChartType: detectChartType(defaultCode),
        highlightedNodeId: null,
        // 保存相关初始状态
        currentDocId: null,
        title: '',
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        saveError: null,

        setCode: (code) => {
          // 用户继续编辑时清除上一次保存错误，避免过期错误信息持续显示
          set({ code, error: null, errors: [], currentChartType: detectChartType(code), isDirty: true, saveError: null });
          scheduleAutoSave();
        },
        loadTemplate: (code) => {
          // 仅替换 code，不触发 isDirty/自动保存：用户在 QuickStartPanel 连续点击多个模板挑选时，
          // 不应每次都创建一个新文档。只有用户在模板基础上做了实际编辑（setCode）才标记 dirty。
          set({ code, error: null, errors: [], currentChartType: detectChartType(code) });
        },
        setError: (error) => set({ error, errors: parseErrorInfo(error || '') }),
        setIsRendering: (isRendering) => set({ isRendering }),
        setLastSaved: (lastSaved) => set({ lastSaved }),
        setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),

        setTitle: (t) => {
          set({ title: t, isDirty: true, saveError: null });
          scheduleAutoSave();
        },

        loadDoc: async (id) => {
          clearAutoSave();
          // 鉴权未初始化完成时不调用云端 API，避免触发 1002 弹窗
          if (!useAuthStore.getState().initialized) {
            return;
          }
          // 本地存储分流：id 为 local_chart_ 前缀或未登录态 → 从 IndexedDB 读取
          if (isLocalChartId(id) || isLocalMode()) {
            const records = await readLocalCharts();
            const found = records.find((r) => r.documentId === id);
            if (!found) {
              set({
                saveError: '图表不存在或已被清除',
                code: defaultCode,
                title: '加载失败',
                currentDocId: id,
              });
              return;
            }
            set({
              currentDocId: found.documentId,
              code: found.content || defaultCode,
              currentChartType: detectChartType(found.content || ''),
              title: found.title || '',
              isDirty: false,
              isSaving: false,
              lastSavedAt: new Date(found.updatedAt),
              saveError: null,
              error: null,
              errors: [],
            });
            return;
          }
          const doc = await getDocument(id);
          set({
            currentDocId: doc.documentId,
            code: doc.content || defaultCode,
            currentChartType: detectChartType(doc.content || ''),
            title: doc.title || '',
            isDirty: false,
            isSaving: false,
            lastSavedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
            saveError: null,
            error: null,
            errors: [],
          });
        },

        newChart: () => {
          clearAutoSave();
          set({
            currentDocId: null,
            code: defaultCode,
            currentChartType: detectChartType(defaultCode),
            title: '',
            isDirty: false,
            isSaving: false,
            lastSavedAt: null,
            saveError: null,
            error: null,
            errors: [],
            highlightedNodeId: null,
          });
        },

        saveCurrent: async (options) => {
          const force = options?.force ?? false;
          const autoRename = options?.autoRename ?? false;
          const state = get();

          if (!state.isDirty || state.isSaving) {
            return { status: 'skipped' };
          }

          // 鉴权未初始化完成时暂不保存：避免未登录态误走云端分支触发 1002 弹窗。
          // 重新调度自动保存，待 initialized 完成后重试。
          if (!useAuthStore.getState().initialized) {
            scheduleAutoSave();
            return { status: 'skipped' };
          }

          // 抢占 isSaving 标志，缩小竞态窗口
          set({ isSaving: true, saveError: null });

          let title = (state.title || '').trim() || '未命名图表';
          const code = state.code;
          const chartType = state.currentChartType;

          // 本地存储分流：currentDocId 为 local_chart_ 前缀或未登录态 → 走 IndexedDB
          if (isLocalChartId(state.currentDocId) || isLocalMode()) {
            // 新建场景：检查 5 篇上限
            if (!state.currentDocId) {
              const records = await readLocalCharts();
              if (records.length >= MAX_LOCAL_CHARTS) {
                const msg = `本地模式最多创建 ${MAX_LOCAL_CHARTS} 个图表，请登录后使用云端存储`;
                set({ isSaving: false, saveError: msg });
                return { status: 'error', message: msg };
              }
            }

            // 标题重名检测：本地存储内查重（同 chartType 范围内），自动追加序号
            const recordsForCheck = await readLocalCharts();
            const isTitleDuplicate = (candidate: string): boolean =>
              recordsForCheck.some(
                (r) => r.title === candidate && r.chartType === chartType && r.documentId !== state.currentDocId,
              );

            if (!force && isTitleDuplicate(title)) {
              if (!autoRename) {
                const conflictDoc = recordsForCheck.find(
                  (r) => r.title === title && r.chartType === chartType && r.documentId !== state.currentDocId,
                );
                set({ isSaving: false, saveError: `图表名「${title}」已存在` });
                return {
                  status: 'conflict',
                  conflictDocId: conflictDoc?.documentId ?? '',
                };
              }
              const baseTitle = title;
              let attempt = 1;
              while (attempt < 100) {
                const candidate = `${baseTitle} (${attempt})`;
                if (!isTitleDuplicate(candidate)) {
                  title = candidate;
                  set({ title: candidate });
                  break;
                }
                attempt++;
              }
              if (attempt >= 100) {
                set({ isSaving: false });
                return { status: 'skipped' };
              }
            }

            try {
              const records = await readLocalCharts();
              const now = new Date().toISOString();

              if (state.currentDocId) {
                const idx = records.findIndex((r) => r.documentId === state.currentDocId);
                if (idx >= 0) {
                  records[idx] = {
                    ...records[idx],
                    title,
                    content: code,
                    chartType,
                    updatedAt: now,
                  };
                  await writeLocalCharts(records);
                } else {
                  // ID 不存在：文档已被删除，放弃保存避免「复活」
                  set({ isSaving: false });
                  return { status: 'skipped' };
                }
              } else {
                const newId = genLocalChartId();
                records.push({
                  documentId: newId,
                  title,
                  content: code,
                  chartType,
                  createdAt: now,
                  updatedAt: now,
                });
                await writeLocalCharts(records);
                set({ currentDocId: newId });
              }
              // 竞态守卫：异步保存期间若用户已切换图表（reset+loadDoc 导致 currentDocId 变化），
              // 仅清除 isSaving，不覆盖新文档的 isDirty/lastSavedAt，避免错误标记新文档为已保存。
              // 注意：新建场景下 state.currentDocId 为 null，保存成功后 currentDocId 变为新 ID 是预期行为，
              // 不应视为竞态。仅当原 currentDocId 非 null 且已被改变时才判定为竞态。
              const isRaceCondition =
                state.currentDocId !== null && get().currentDocId !== state.currentDocId;
              if (!isRaceCondition) {
                set({ isSaving: false, isDirty: false, lastSavedAt: new Date() });
              } else {
                set({ isSaving: false });
              }
              return { status: 'success' };
            } catch (err) {
              const message = err instanceof Error ? err.message : '保存失败';
              set({ isSaving: false, saveError: message });
              return { status: 'error', message };
            }
          }

          // 云端保存：原有逻辑
          // 标题唯一性校验
          if (!force) {
            try {
              let check = await checkTitleDuplicate(
                title,
                chartType,
                state.currentDocId ?? undefined,
              );
              if (check.duplicated && check.conflictDocumentId) {
                if (!autoRename) {
                  const msg = `图表名「${title}」已存在，请修改名称后重试`;
                  set({ isSaving: false, saveError: msg });
                  return { status: 'conflict', conflictDocId: check.conflictDocumentId };
                }
                // 自动保存：自动追加序号
                let attempt = 1;
                const baseTitle = title;
                while (attempt < 100) {
                  const candidate = `${baseTitle} (${attempt})`;
                  check = await checkTitleDuplicate(
                    candidate,
                    chartType,
                    state.currentDocId ?? undefined,
                  );
                  if (!check.duplicated) {
                    title = candidate;
                    set({ title: candidate });
                    break;
                  }
                  attempt++;
                }
                if (attempt >= 100) {
                  set({ isSaving: false });
                  return { status: 'skipped' };
                }
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('[EditorContext] title check failed, fallback to direct save', err);
            }
          }

          try {
            if (state.currentDocId) {
              if (!get().currentDocId) {
                set({ isSaving: false });
                return { status: 'skipped' };
              }
              await updateDocument(state.currentDocId, title, code, undefined, chartType, undefined);
            } else {
              const created = await createDocument(title, chartType, code);
              set({ currentDocId: created.documentId });
            }
            // 竞态守卫：异步保存期间若用户已切换图表（currentDocId 变化），
            // 仅清除 isSaving，不覆盖新文档的 isDirty/lastSavedAt。
            // 注意：新建场景下 state.currentDocId 为 null，保存成功后 currentDocId 变为新 ID 是预期行为，
            // 不应视为竞态。仅当原 currentDocId 非 null 且已被改变时才判定为竞态。
            const isRaceCondition =
              state.currentDocId !== null && get().currentDocId !== state.currentDocId;
            if (!isRaceCondition) {
              set({ isSaving: false, isDirty: false, lastSavedAt: new Date() });
            } else {
              set({ isSaving: false });
            }
            return { status: 'success' };
          } catch (err) {
            const message = err instanceof Error ? err.message : '保存失败';
            set({ isSaving: false, saveError: message });
            return { status: 'error', message };
          }
        },

        resetEditor: () => {
          clearAutoSave();
          set({
            currentDocId: null,
            code: defaultCode,
            currentChartType: detectChartType(defaultCode),
            title: '',
            isDirty: false,
            isSaving: false,
            lastSavedAt: null,
            saveError: null,
            error: null,
            errors: [],
            highlightedNodeId: null,
          });
        },

        clearCloudData: () => {
          clearAutoSave();
          // logout 时清理云端相关状态，但保留 code（用户本地编辑内容，persist 已保存）
          // 避免下次登录时 currentDocId 残留为上个账号的文档 ID，导致误更新
          set({
            currentDocId: null,
            title: '',
            isDirty: false,
            isSaving: false,
            lastSavedAt: null,
            saveError: null,
          });
        },
      };
    },
    {
      name: 'editor-storage',
      partialize: (state) => ({ code: state.code }),
      onRehydrateStorage: () => (state) => {
        if (state && state.code) {
          state.currentChartType = detectChartType(state.code);
        }
      },
    }
  )
);

export const useChartType = (): ChartType => {
  const code = useEditorStore((s) => s.code);
  return detectChartType(code);
};
