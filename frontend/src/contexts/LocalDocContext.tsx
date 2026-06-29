import { create } from 'zustand';
import {
  readAllDocs,
  writeAllDocs,
  type LocalDocRecord,
} from '@/lib/localDb';

/**
 * 本地文档存储（无登录模式）
 *
 * 当用户未登录时启用，文档数据持久化到 IndexedDB（store: docs），与云端 DocContext
 * 接口对齐，让组件层通过 useActiveDocStore 透明切换，无需感知存储后端差异。
 *
 * 限制：
 * - 最多 5 篇文档（MAX_LOCAL_DOCS）
 * - 不支持分享（toggleShare 抛错）
 * - 文档 ID 格式 local_xxx，与云端 UUID 区分，兼容 /docs/:id 路由
 *
 * 风险提示：IndexedDB 随浏览器缓存清除而丢失，组件层需向用户明示。
 */

/** 首次使用引导标记：清除后或首次访问时弹出说明 */
export const ONBOARDED_KEY = 'local-md-onboarded';
/** 未登录用户文档数量上限 */
export const MAX_LOCAL_DOCS = 5;
/** 自动保存防抖：按需求 300ms */
const AUTO_SAVE_DEBOUNCE_MS = 300;

export interface DocMeta {
  documentId: string;
  title: string;
  updatedAt?: string;
  bytesSize?: number;
}

/** 复用 IndexedDB 中的 LocalDocRecord 类型 */
export type { LocalDocRecord };

/** 保存结果，与云端 DocContext 对齐（本地模式不会返回 conflict，保留类型以避免联合类型报错） */
export type SaveResult =
  | { status: 'success' }
  | { status: 'conflict'; conflictDocId: string }
  | { status: 'error'; message: string }
  | { status: 'skipped' };

interface SaveCurrentOptions {
  force?: boolean;
  signal?: AbortSignal;
  autoRename?: boolean;
}

/** 与云端 DocState 对齐的接口（toggleShare/saveAsDocFromChart 本地模式降级处理） */
interface LocalDocState {
  docs: DocMeta[];
  listLoading: boolean;
  listError: string | null;
  total: number;

  currentDocId: string | null;
  content: string;
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  isPublic: boolean;
  shareToken: string | null;

  loadList: (page?: number, pageSize?: number) => Promise<void>;
  newDoc: () => void;
  loadDoc: (id: string) => Promise<void>;
  setContent: (c: string) => void;
  setTitle: (t: string) => void;
  saveCurrent: (options?: SaveCurrentOptions) => Promise<SaveResult>;
  removeDoc: (id: string) => Promise<void>;
  reset: () => void;
  saveAsDocFromChart: (mermaidCode: string, title?: string) => Promise<string>;
  toggleShare: () => Promise<string | null>;
}

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

/** 读取 IndexedDB 全量文档，失败返回空数组 */
const readAll = readAllDocs;

/** 写入 IndexedDB 全量文档 */
const writeAll = writeAllDocs;

/**
 * 按 ID 直接从 IndexedDB 读取单条本地文档（只读消费，不经过 store，不污染编辑态）
 * 供预览页等只读场景使用
 */
export const readLocalDocById = async (id: string): Promise<LocalDocRecord | null> => {
  const records = await readAll();
  return records.find((r) => r.documentId === id) ?? null;
};

/** 生成 local_ 前缀的唯一 ID */
const genId = (): string =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** 记录转列表元数据 */
const toMeta = (r: LocalDocRecord): DocMeta => ({
  documentId: r.documentId,
  title: r.title,
  updatedAt: r.updatedAt,
  bytesSize: new Blob([r.content]).size,
});

export const useLocalDocStore = create<LocalDocState>((set, get) => {
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
      void get()
        .saveCurrent({ autoRename: true })
        .catch((err) => {
          // 兜底：saveCurrent 内部已 try-catch 并 set saveError，此处仅防意外 rejection
          const message = err instanceof Error ? err.message : '自动保存失败';
          set({ saveError: message });
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

    loadList: async () => {
      set({ listLoading: true, listError: null });
      try {
        const records = await readAll();
        // 按更新时间倒序（从近到远），与云端 list 接口 updatedAt DESC 排序保持一致
        const docs = records
          .map(toMeta)
          .sort((a, b) => {
            const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return tb - ta;
          });
        set({ docs, total: docs.length, listLoading: false });
      } catch (err) {
        set({
          listLoading: false,
          listError: err instanceof Error ? err.message : '加载本地文档失败',
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
      clearAutoSave();
      try {
        const records = await readAll();
        const found = records.find((r) => r.documentId === id);
        if (!found) {
          set({
            saveError: '文档不存在或已被清除',
            content: '',
            title: '加载失败',
            currentDocId: id,
          });
          return;
        }
        set({
          content: found.content,
          title: found.title,
          currentDocId: found.documentId,
          isDirty: false,
          saveError: null,
          isPublic: false,
          shareToken: null,
        });
      } catch (err) {
        // IndexedDB 读取失败：区分"读取失败"和"文档不存在"，避免误报
        set({
          saveError: err instanceof Error ? err.message : '加载文档失败（存储不可用）',
          content: '',
          title: '加载失败',
          currentDocId: id,
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
        // 同步更新列表项标题，让侧栏/列表页实时反映改名
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
      const state = get();

      if (!state.isDirty || state.isSaving) {
        return { status: 'skipped' };
      }
      if (signal?.aborted) return { status: 'skipped' };

      const title = (state.title || '').trim() || '未命名文档';
      const content = state.content;

      // 新建场景：检查 5 篇上限
      if (!state.currentDocId) {
        const records = await readAll();
        if (records.length >= MAX_LOCAL_DOCS) {
          const msg = `本地模式最多创建 ${MAX_LOCAL_DOCS} 篇文档，请登录后使用云端存储`;
          set({ saveError: msg });
          return { status: 'error', message: msg };
        }
      }

      // 标题重名检测：新建或更新时若与其他文档同名，自动追加 (1)、(2)… 序号。
      // 与云端 autoRename 行为对齐，避免本地模式连续新建"未命名文档"时重名覆盖。
      const autoRename = options?.autoRename ?? false;
      const recordsForCheck = await readAll();
      const isTitleDuplicate = (candidate: string): boolean =>
        recordsForCheck.some(
          (r) => r.title === candidate && r.documentId !== state.currentDocId,
        );

      let finalTitle = title;
      if (autoRename && isTitleDuplicate(title)) {
        const baseTitle = title;
        let attempt = 1;
        while (attempt < 100) {
          const candidate = `${baseTitle} (${attempt})`;
          if (!isTitleDuplicate(candidate)) {
            finalTitle = candidate;
            // 同步更新 store 中的 title，让 UI 立即显示改名后的名称
            set({ title: candidate });
            break;
          }
          attempt++;
        }
        // attempt >= 100：极端情况，保留原名继续保存
      }

      set({ isSaving: true, saveError: null });

      try {
        const records = await readAll();
        const now = new Date().toISOString();

        if (state.currentDocId) {
          // 更新已有文档
          const idx = records.findIndex((r) => r.documentId === state.currentDocId);
          if (idx >= 0) {
            records[idx] = { ...records[idx], title: finalTitle, content, updatedAt: now };
            await writeAll(records);
            // 同步 docs 列表并按 updatedAt 倒序重排，确保刚更新的文档移到列表顶部
            // 与云端 list 接口 updatedAt DESC 行为一致
            set({
              docs: get()
                .docs.map((d) =>
                  d.documentId === state.currentDocId
                    ? { ...d, title: finalTitle, updatedAt: now, bytesSize: new Blob([content]).size }
                    : d,
                )
                .sort((a, b) => {
                  const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                  const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                  return tb - ta;
                }),
            });
          } else {
            // ID 不存在：文档已被删除，放弃保存，避免误删后自动保存又把文档「复活」
            set({ isSaving: false });
            return { status: 'skipped' };
          }
        } else {
          // 首次保存：创建新文档
          const newId = genId();
          records.push({
            documentId: newId,
            title: finalTitle,
            content,
            createdAt: now,
            updatedAt: now,
          });
          await writeAll(records);
          // 合并为一次 set：避免两次 set 之间被并发 loadList 覆盖，
          // 导致 currentDocId 已更新但 docs 列表未同步（侧栏不显示新文档）
          set({
            currentDocId: newId,
            docs: [
              { documentId: newId, title: finalTitle, updatedAt: now, bytesSize: new Blob([content]).size },
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
        set({ isSaving: false });
        const message = err instanceof Error ? err.message : '保存失败';
        set({ saveError: message });
        return { status: 'error', message };
      }
    },

    // 注意：saveCurrent 在异步执行期间，若用户切换文档（reset + loadDoc），
    // 最终的 set({ isDirty: false, lastSavedAt }) 会错误标记新文档为已保存。
    // 上述实现中 state 在函数开始时捕获，写回 IndexedDB 使用的是旧 state 的 content/currentDocId，
    // 因此 IndexedDB 写入正确（保存到旧文档）。但最终 set 仍需守卫：
    // 若 currentDocId 已变化（用户切换到其他文档），跳过 isDirty/lastSavedAt 更新。

    removeDoc: async (id) => {
      const records = await readAll();
      const next = records.filter((r) => r.documentId !== id);
      await writeAll(next);
      set({ docs: get().docs.filter((d) => d.documentId !== id), total: next.length });
      if (get().currentDocId === id) {
        clearAutoSave();
        set({ currentDocId: null, content: '', title: '', isDirty: false });
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

    saveAsDocFromChart: async (mermaidCode, title) => {
      const content = '```mermaid\n' + mermaidCode.trim() + '\n```\n';
      const finalTitle = title || '未命名图表';
      const records = await readAll();

      if (records.length >= MAX_LOCAL_DOCS) {
        throw new Error(`本地模式最多创建 ${MAX_LOCAL_DOCS} 篇文档，请登录后使用云端存储`);
      }

      const newId = genId();
      const now = new Date().toISOString();
      records.push({ documentId: newId, title: finalTitle, content, createdAt: now, updatedAt: now });
      await writeAll(records);
      set({
        docs: [{ documentId: newId, title: finalTitle, updatedAt: now, bytesSize: new Blob([content]).size }, ...get().docs],
      });
      return newId;
    },

    toggleShare: async () => {
      throw new Error('本地模式不支持文档分享，请登录后使用云端存储');
    },
  };
});
