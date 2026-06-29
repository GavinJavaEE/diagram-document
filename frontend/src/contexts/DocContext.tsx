import { create } from 'zustand';
import type { DocumentResp } from '@/types';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  setDocumentPublic,
  checkTitleDuplicate,
} from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuthStore } from '@/contexts/AuthContext';

/** 判断当前是否本地模式（未登录）—— 防御性守卫，避免未登录时误调云端 API */
const isLocalMode = (): boolean => {
  const { user, initialized } = useAuthStore.getState();
  return initialized && !user;
};

/**
 * Markdown 文档状态管理
 *
 * 复用后端 /api/v1/documents 接口，用 chartType='markdown' 标识 Markdown 文档，
 * 与现有 Mermaid 单图文档（chartType=flowchart/sequence/...）区分。
 *
 * 状态分层：
 * - 列表层：docs[] + loading + 分页
 * - 编辑层：currentDocId / content / title / isDirty / lastSaved
 */

export const MARKDOWN_CHART_TYPE = 'markdown';

const AUTO_SAVE_DEBOUNCE_MS = 3000;

/**
 * 保存结果：
 * - 'success' 保存成功
 * - 'conflict' 标题与同 user + chartType 下其他文档重名，需前端弹窗处理（saveError 同时写入提示语）
 * - 'error'   其他保存失败（网络/权限等），saveError 含详情
 * - 'skipped'  非脏数据/无内容等导致未真正发起保存
 */
export type SaveResult =
  | { status: 'success' }
  | { status: 'conflict'; conflictDocId: string }
  | { status: 'error'; message: string }
  | { status: 'skipped' };

/** saveCurrent 选项 */
interface SaveCurrentOptions {
  /** 强制保存，跳过重名检测（用户已确认覆盖后调用） */
  force?: boolean;
  /** AbortSignal，用于组件卸载时取消 */
  signal?: AbortSignal;
  /**
   * 自动保存场景：遇到重名时自动追加序号 (1)、(2)…，而非返回 conflict。
   * 手动保存不传此参数，遇到重名返回 conflict 让 UI 弹窗处理。
   * 设计意图：自动保存不应被重名阻塞（用户没主动操作），手动保存需明确决策。
   */
  autoRename?: boolean;
}

/**
 * 标准化后端返回的日期字段。
 * 后端 LocalDateTime 未加 @JsonFormat，Jackson 默认序列化为数组 [y,m,d,h,mi,s]，
 * 直接 new Date(数组) 会得到 Invalid Date。这里统一转成 ISO 字符串。
 */
const normalizeDate = (raw: unknown): string => {
  if (!raw) return '';
  // 数组格式 [year, month, day, hour?, minute?, second?]
  if (Array.isArray(raw) && raw.length >= 3) {
    const [y, m, d, h = 0, mi = 0, s = 0] = raw as number[];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
  }
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return new Date(raw).toISOString();
  return '';
};

interface DocMeta {
  documentId: string;
  title: string;
  updatedAt?: string;
  bytesSize?: number;
}

interface DocState {
  // 列表
  docs: DocMeta[];
  listLoading: boolean;
  listError: string | null;
  total: number;

  // 当前编辑
  currentDocId: string | null;
  content: string;
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  // 分享状态（P3）：isPublic=true 时后端返回 shareToken 供生成分享链接
  isPublic: boolean;
  shareToken: string | null;

  // 列表操作
  loadList: (page?: number, pageSize?: number) => Promise<void>;
  // 编辑操作
  newDoc: () => void; // 进入空白新建态（不立即落库，首次保存时才 create）
  loadDoc: (id: string) => Promise<void>;
  setContent: (c: string) => void;
  setTitle: (t: string) => void;
  saveCurrent: (options?: SaveCurrentOptions) => Promise<SaveResult>;
  removeDoc: (id: string) => Promise<void>;
  reset: () => void;
  /** 清理所有云端数据（列表 + 编辑态），用于 logout 时防止上个账号数据残留 */
  clearCloudData: () => void;
  /**
   * 将一段 Mermaid 代码保存为新 Markdown 文档（chartType='markdown'）。
   * 内容包裹为 ```mermaid 代码块，标题根据代码首行推断。
   * 用于 EditorPage「保存为文档」入口，立即落库并返回 documentId 供跳转。
   */
  saveAsDocFromChart: (mermaidCode: string, title?: string) => Promise<string>;
  /**
   * 切换当前文档公开/私有状态，返回更新后的 shareToken（公开时非空）。
   * 仅对已落库文档（currentDocId 非空）有效。
   */
  toggleShare: () => Promise<string | null>;
}

export const useDocStore = create<DocState>((set, get) => {
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
      // 自动保存使用 autoRename 策略：遇到重名自动追加序号 (1)、(2)…，
      // 而非静默跳过——避免用户多次新建"未命名文档"时第二次起永远保存不了。
      // 手动保存不传 autoRename，遇到重名会返回 conflict 让 UI 弹窗明确处理。
      void get().saveCurrent({ autoRename: true }).then((result) => {
        if (result.status === 'conflict') {
          // autoRename 模式下理论上不会返回 conflict，但保险起见清理 saveError
          if (get().saveError && get().saveError.startsWith('文档名')) {
            set({ saveError: null });
          }
        }
      });
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  return {
    docs: [],
    listLoading: false,
    listError: null,
    total: 0,

    currentDocId: null,
    content: '',
    title: '',
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    saveError: null,
    isPublic: false,
    shareToken: null,

    loadList: async (page = 1, pageSize = 50) => {
      // 防御性守卫：未登录时不调用云端 API，避免触发 1002 弹窗
      if (isLocalMode()) {
        set({ docs: [], total: 0, listLoading: false, listError: null });
        return;
      }
      set({ listLoading: true, listError: null });
      try {
        const resp = await listDocuments(page, pageSize, MARKDOWN_CHART_TYPE);
        const docs = (resp.items || []).map((d) => ({
          documentId: d.documentId,
          title: d.title,
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

    newDoc: () => {
      clearAutoSave();
      set({
        currentDocId: null,
        content: DEFAULT_DOC_CONTENT,
        title: '未命名文档',
        isDirty: false,
        lastSavedAt: null,
        saveError: null,
        isPublic: false,
        shareToken: null,
      });
    },

    loadDoc: async (id) => {
      // 防御性守卫：未登录时不调用云端 API
      if (isLocalMode()) {
        return;
      }
      clearAutoSave();
      set({ currentDocId: id, isDirty: false, saveError: null });
      try {
        const doc: DocumentResp = await getDocument(id);
        set({
          content: doc.content || '',
          title: doc.title,
          currentDocId: doc.documentId,
          isPublic: !!doc.isPublic,
          shareToken: doc.shareToken || null,
        });
      } catch (err) {
        set({
          saveError: err instanceof Error ? err.message : '加载文档失败',
          content: '',
          title: '加载失败',
        });
      }
    },

    setContent: (c) => {
      // 用户继续编辑时清除上一次保存错误，避免过期错误信息持续显示
      set({ content: c, isDirty: true, saveError: null });
      scheduleAutoSave();
    },

    setTitle: (t) => {
      set((state) => ({
        title: t,
        isDirty: true,
        saveError: null,
        // 同步更新列表项标题，让侧栏/列表页实时反映改名（未保存前为本地视图，保存后由后端确认）
        docs: state.currentDocId
          ? state.docs.map((d) =>
              d.documentId === state.currentDocId ? { ...d, title: t } : d,
            )
          : state.docs,
      }));
      scheduleAutoSave();
    },

    saveCurrent: async (options) => {
      const signal = options?.signal;
      const force = options?.force ?? false;
      const autoRename = options?.autoRename ?? false;
      const state = get();

      if (!state.isDirty || state.isSaving) {
        return { status: 'skipped' };
      }

      // 防御性守卫：未登录或鉴权未初始化时不调用云端 API，避免触发 1002 弹窗。
      // 编辑入口已通过 useActiveDocStore 分流到 LocalDocContext，此处仅作兜底。
      if (isLocalMode() || !useAuthStore.getState().initialized) {
        return { status: 'skipped' };
      }

      // 立即抢占 isSaving 标志，缩小竞态窗口。
      // 之前 isSaving 检查与 set({ isSaving: true }) 之间隔着 await checkTitleDuplicate，
      // 自动保存（3s debounce）与手动保存（Ctrl+S）可能同时通过检查 → 重复创建文档。
      // 此处提前设置，确保后续并发的 saveCurrent 直接 skipped。
      set({ isSaving: true, saveError: null });

      let title = (state.title || '').trim() || '未命名文档';
      const content = state.content;

      // 标题唯一性校验：force=true 时跳过（用户已确认覆盖）
      if (!force) {
        try {
          let check = await checkTitleDuplicate(
            title,
            MARKDOWN_CHART_TYPE,
            state.currentDocId ?? undefined,
          );
          if (signal?.aborted) {
            set({ isSaving: false });
            return { status: 'skipped' };
          }

          if (check.duplicated && check.conflictDocumentId) {
            // 手动保存：直接返回 conflict 让 UI 弹窗让用户选择（覆盖/重命名/取消）
            if (!autoRename) {
              const msg = `文档名「${title}」已存在，请修改名称后重试`;
              set({ isSaving: false, saveError: msg });
              return { status: 'conflict', conflictDocId: check.conflictDocumentId };
            }

            // 自动保存：自动追加序号 (1)、(2)… 直到找到可用名称
            // 典型场景：连续多次新建"未命名文档"，后续的自动保存会被静默跳过 →
            // 改为自动改名为"未命名文档 (1)""(2)"… 保证自动保存始终能成功
            let attempt = 1;
            const baseTitle = title;
            while (attempt < 100) {
              const candidate = `${baseTitle} (${attempt})`;
              check = await checkTitleDuplicate(
                candidate,
                MARKDOWN_CHART_TYPE,
                state.currentDocId ?? undefined,
              );
              if (signal?.aborted) {
                set({ isSaving: false });
                return { status: 'skipped' };
              }
              if (!check.duplicated) {
                // 找到可用名称，更新 store 中的 title
                title = candidate;
                set({ title: candidate });
                break;
              }
              attempt++;
            }
            // attempt >= 100：极端情况（99 个同名），放弃自动保存，等用户手动处理
            if (attempt >= 100) {
              set({ isSaving: false });
              return { status: 'skipped' };
            }
          }
        } catch (err) {
          // 校验接口失败时不阻塞保存，避免单点故障
          // eslint-disable-next-line no-console
          console.warn('[DocContext] title check failed, fallback to direct save', err);
        }
      }

      try {
        if (state.currentDocId) {
          // 防御性检查：如果在标题校验期间文档被删除（currentDocId 被清空），放弃保存
          // 避免 autoSave 竞态导致已删除文档触发无意义的更新请求
          if (!get().currentDocId) {
            set({ isSaving: false });
            return { status: 'skipped' };
          }
          // 更新已有文档
          const updated = await updateDocument(state.currentDocId, title, content, undefined, MARKDOWN_CHART_TYPE, undefined);
          // 同步 docs 列表并按 updatedAt 倒序重排，确保刚更新的文档移到列表顶部
          // updateDocument 接口返回更新后的 DocumentResp（含最新 updatedAt），无需额外 loadList
          set({
            docs: get()
              .docs.map((d) =>
                d.documentId === state.currentDocId
                  ? {
                      ...d,
                      title: updated.title,
                      updatedAt: normalizeDate(updated.updatedAt),
                      bytesSize: updated.bytesSize,
                    }
                  : d,
              )
              .sort((a, b) => {
                const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return tb - ta;
              }),
          });
        } else {
          // 首次保存：创建新文档
          const created = await createDocument(title, MARKDOWN_CHART_TYPE, content);
          // 合并为一次 set：避免两次 set 之间被并发 loadList 覆盖，
          // 导致 currentDocId 已更新但 docs 列表未同步（侧栏不显示新文档）
          set({
            currentDocId: created.documentId,
            docs: [
              {
                documentId: created.documentId,
                title: created.title,
                updatedAt: normalizeDate(created.updatedAt),
                bytesSize: created.bytesSize,
              },
              ...get().docs,
            ],
          });
        }

        // 竞态守卫：异步保存期间若用户已切换文档（reset+loadDoc 导致 currentDocId 变化），
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
        if (signal?.aborted) {
          set({ isSaving: false });
          return { status: 'skipped' };
        }
        const message = err instanceof Error ? err.message : '保存失败';
        set({ isSaving: false, saveError: message });
        return { status: 'error', message };
      }
    },

    removeDoc: async (id) => {
      // 防御性守卫：未登录时不调用云端 API
      if (isLocalMode()) {
        return;
      }
      await deleteDocument(id);
      // 从列表移除
      set({ docs: get().docs.filter((d) => d.documentId !== id) });
      // 若删除的是当前文档，重置编辑态
      if (get().currentDocId === id) {
        clearAutoSave();
        set({
          currentDocId: null,
          content: '',
          title: '',
          isDirty: false,
        });
      }
    },

    reset: () => {
      clearAutoSave();
      set({
        currentDocId: null,
        content: '',
        title: '',
        isDirty: false,
        saveError: null,
        lastSavedAt: null,
        isPublic: false,
        shareToken: null,
      });
    },

    clearCloudData: () => {
      clearAutoSave();
      set({
        docs: [],
        total: 0,
        listError: null,
        currentDocId: null,
        content: '',
        title: '',
        isDirty: false,
        isSaving: false,
        saveError: null,
        lastSavedAt: null,
        isPublic: false,
        shareToken: null,
      });
    },

    saveAsDocFromChart: async (mermaidCode, title) => {
      // 防御性守卫：未登录时不调用云端 API
      if (isLocalMode()) {
        throw new Error('本地模式不支持另存为文档，请登录后使用云端存储');
      }
      // 包装为 mermaid 代码块
      const content = '```mermaid\n' + mermaidCode.trim() + '\n```\n';
      // 标题：优先使用传入值，否则根据代码首行推断图表类型
      const finalTitle = title || inferChartTitle(mermaidCode);

      const created = await createDocument(finalTitle, MARKDOWN_CHART_TYPE, content);

      // 同步到列表头部
      set({
        docs: [
          {
            documentId: created.documentId,
            title: created.title,
            updatedAt: created.updatedAt,
            bytesSize: created.bytesSize,
          },
          ...get().docs,
        ],
      });

      return created.documentId;
    },

    toggleShare: async () => {
      // 防御性守卫：未登录时不调用云端 API
      if (isLocalMode()) {
        throw new Error('本地模式不支持文档分享，请登录后使用云端存储');
      }
      const state = get();
      if (!state.currentDocId) {
        throw new Error('请先保存文档');
      }
      const nextPublic = !state.isPublic;
      const updated = await setDocumentPublic(state.currentDocId, nextPublic);
      set({
        isPublic: !!updated.isPublic,
        shareToken: updated.shareToken || null,
      });
      return updated.shareToken || null;
    },
  };
});

const DEFAULT_DOC_CONTENT = `# 我的文档

欢迎使用 **DiagramAI Markdown** 编辑器，支持 \`mermaid\` 代码块实时渲染。

\`\`\`mermaid
flowchart TD
  A[开始] --> B{条件判断}
  B -->|是| C[处理]
  B -->|否| D[跳过]
  C --> E[结束]
  D --> E
\`\`\`
`;

/**
 * 根据代码首行推断图表类型，作为默认文档标题。
 * 不识别时回退为"未命名图表"。
 */
const inferChartTitle = (code: string): string => {
  const firstLine = code.trim().split('\n')[0].toLowerCase();
  if (firstLine.includes('flowchart') || firstLine.includes('graph')) return '流程图';
  if (firstLine.includes('sequencediagram')) return '时序图';
  if (firstLine.includes('classdiagram')) return '类图';
  if (firstLine.includes('statediagram')) return '状态图';
  if (firstLine.includes('gantt')) return '甘特图';
  if (firstLine.includes('erdiagram')) return 'ER 图';
  return '未命名图表';
};

/** 供组件层使用的便捷钩子（封装 toast 提示） */
export const useDocActions = () => {
  const { showSuccess, showError } = useToast();
  const store = useDocStore();

  return {
    ...store,
    saveWithToast: async () => {
      const result = await store.saveCurrent();
      if (result.status === 'success') {
        showSuccess('已保存');
      } else if (result.status === 'error') {
        showError(result.message);
      }
      // conflict / skipped 不弹 toast，由调用方决定是否弹 Modal
      return result;
    },
    deleteWithToast: async (id: string) => {
      try {
        await store.removeDoc(id);
        showSuccess('已删除');
      } catch (err) {
        showError(err instanceof Error ? err.message : '删除失败');
      }
    },
  };
};
