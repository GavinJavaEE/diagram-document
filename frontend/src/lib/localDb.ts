/**
 * 本地存储 IndexedDB 封装
 *
 * 替换原 localStorage 同步 API，使用 idb-keyval 提供异步、不阻塞主线程的存储。
 *
 * 设计要点：
 * - 两个独立的 IDB store：charts（图表）和 docs（Markdown 文档），数据隔离
 * - 单 key 容器存储全量数组（key = `__all__`），与原 localStorage 行为对齐，
 *   调用方代码改动最小（仅增加 await）
 * - 不再受 localStorage 5MB 配额限制；IDB 异步 I/O 避免 JSON.stringify 阻塞主线程
 * - 启动时执行一次性迁移：若检测到旧 localStorage key，导入到 IDB 后清除原 key
 *
 * 保留的常量：
 * - `LOCAL_CHARTS_KEY` / `LOCAL_DOCS_KEY` 仅作为迁移源 key 名，不再用于写入
 */

import { createStore, get, set, type UseStore } from 'idb-keyval';

/** 单 key 容器：存放全量数组（与原 localStorage 的存储模式对齐） */
const ALL_KEY = '__all__';

/** 旧 localStorage key 名（仅用于迁移读取） */
export const LEGACY_LOCAL_CHARTS_KEY = 'local-charts';
export const LEGACY_LOCAL_DOCS_KEY = 'local-md-docs';

/** 迁移完成标记 key（localStorage 永久标记，幂等避免重复迁移） */
const MIGRATION_FLAG_KEY = 'idb-migration-done';

/** charts 独立 store，避免与 docs 数据混淆 */
const chartsStore: UseStore = createStore('mermaid-ai-db', 'charts');
/** docs 独立 store */
const docsStore: UseStore = createStore('mermaid-ai-db', 'docs');

// ============================================================
// Charts 存储 API
// ============================================================

export interface LocalChartRecord {
  documentId: string;
  title: string;
  content: string;
  chartType: string;
  createdAt: string;
  updatedAt: string;
}

/** 读取全部本地图表。失败时抛错，让调用方区分"读取失败"和"无数据"。 */
export const readAllCharts = async (): Promise<LocalChartRecord[]> => {
  const val = await get<LocalChartRecord[]>(ALL_KEY, chartsStore);
  return Array.isArray(val) ? val : [];
};

/** 写入全部本地图表（覆盖式）。失败时抛错，让调用方感知并提示用户。 */
export const writeAllCharts = async (charts: LocalChartRecord[]): Promise<void> => {
  await set(ALL_KEY, charts, chartsStore);
};

/** 清空全部本地图表 */
export const clearAllCharts = async (): Promise<void> => {
  try {
    await set(ALL_KEY, [], chartsStore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[localDb] clearAllCharts failed', err);
  }
};

/** 读取本地图表数量（用于个人中心统计，避免读取全量数据） */
export const countCharts = async (): Promise<number> => {
  return (await readAllCharts()).length;
};

/**
 * 按 ID 读取单条本地图表。
 *
 * 用于图表预览页 `/charts/:id/view` 直接读取本地数据，
 * 不经过 store，避免闭包陷阱和编辑态污染。
 */
export const readChartById = async (id: string): Promise<LocalChartRecord | null> => {
  const records = await readAllCharts();
  return records.find((r) => r.documentId === id) ?? null;
};

// ============================================================
// Docs 存储 API
// ============================================================

export interface LocalDocRecord {
  documentId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** 读取全部本地文档。失败时抛错，让调用方区分"读取失败"和"无数据"。 */
export const readAllDocs = async (): Promise<LocalDocRecord[]> => {
  const val = await get<LocalDocRecord[]>(ALL_KEY, docsStore);
  return Array.isArray(val) ? val : [];
};

/** 写入全部本地文档（覆盖式）。失败时抛错，让调用方感知并提示用户。 */
export const writeAllDocs = async (docs: LocalDocRecord[]): Promise<void> => {
  await set(ALL_KEY, docs, docsStore);
};

/** 清空全部本地文档 */
export const clearAllDocs = async (): Promise<void> => {
  try {
    await set(ALL_KEY, [], docsStore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[localDb] clearAllDocs failed', err);
  }
};

/** 读取本地文档数量（用于个人中心统计） */
export const countDocs = async (): Promise<number> => {
  return (await readAllDocs()).length;
};

// ============================================================
// 迁移：localStorage → IndexedDB（一次性，幂等）
// ============================================================

/**
 * 检测并执行 localStorage 旧数据迁移到 IndexedDB。
 *
 * 触发时机：main.tsx 应用启动前。
 *
 * 幂等保证：
 * - MIGRATION_FLAG_KEY 标记成功完成后不再执行
 * - 若 IDB 中已有数据则跳过导入，仅清理 localStorage 旧 key
 *
 * 失败容错：迁移失败不阻塞应用启动，下次启动会重试（标记未写入）
 */
export const migrateFromLocalStorageIfNeeded = async (): Promise<void> => {
  // 已迁移过则跳过
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

  try {
    // ----- 迁移 charts -----
    const legacyChartsRaw = localStorage.getItem(LEGACY_LOCAL_CHARTS_KEY);
    if (legacyChartsRaw) {
      try {
        const parsed = JSON.parse(legacyChartsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 仅在 IDB 为空时导入，避免覆盖已写入的新数据
          const existing = await readAllCharts();
          if (existing.length === 0) {
            await writeAllCharts(parsed);
          }
        }
      } catch {
        // JSON 解析失败：忽略，继续清理旧 key
      }
      // 清理旧 key，避免下次启动重复读取
      localStorage.removeItem(LEGACY_LOCAL_CHARTS_KEY);
    }

    // ----- 迁移 docs -----
    const legacyDocsRaw = localStorage.getItem(LEGACY_LOCAL_DOCS_KEY);
    if (legacyDocsRaw) {
      try {
        const parsed = JSON.parse(legacyDocsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existing = await readAllDocs();
          if (existing.length === 0) {
            await writeAllDocs(parsed);
          }
        }
      } catch {
        // JSON 解析失败：忽略，继续清理旧 key
      }
      localStorage.removeItem(LEGACY_LOCAL_DOCS_KEY);
    }

    // 标记迁移完成（即使没有旧数据也写入标记，避免每次启动都检查）
    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[localDb] migration failed, will retry next launch', err);
  }
};
