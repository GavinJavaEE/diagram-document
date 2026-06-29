import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 用户偏好设置 store。
 *
 * 设计要点（双层数据模型）：
 * - `settings`：已保存并生效的设置，持久化到 localStorage
 * - `draft`：草稿层，用于 Drawer 打开期间的实时预览；同样持久化，
 *            以满足"关闭 Drawer 不保存时保留草稿，下次打开可恢复"的需求
 * - `isDrawerOpen`：控制 Drawer 显隐
 *
 * 实时预览 + 手动持久化机制：
 * - 消费方通过 `useActiveSettings` 读取当前生效值
 * - Drawer 打开时返回 draft（实时预览），关闭时返回 settings（已保存状态）
 * - 只有显式调用 `saveDraft` 才将 draft 提交到 settings 真正持久化生效
 */

/** AI 侧栏位置 */
export type AISidebarPosition = 'left' | 'right' | 'bottom';

/** 默认视图模式 */
export type ViewMode = 'split' | 'code-only' | 'preview-only';

/** 图表配色主题（对应 mermaid 内置主题） */
export type ChartTheme = 'default' | 'forest' | 'neutral' | 'dark';

/** AI 默认 Tab */
export type DefaultAITab = 'generate' | 'chat';

/** 用户设置结构 */
export interface UserSettings {
  // 编辑器布局
  aiSidebarPosition: AISidebarPosition;
  aiSidebarWidth: number; // 280-480
  codePreviewRatio: number; // 30-70，代码区占比
  defaultViewMode: ViewMode;
  // 外观
  chartTheme: ChartTheme;
  // 编辑器
  editorFontSize: number; // 12-20
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  // AI
  defaultAITab: DefaultAITab;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: UserSettings = {
  aiSidebarPosition: 'left',
  aiSidebarWidth: 360,
  codePreviewRatio: 50,
  defaultViewMode: 'split',
  chartTheme: 'default',
  editorFontSize: 14,
  editorWordWrap: true,
  editorLineNumbers: true,
  defaultAITab: 'generate',
};

interface SettingsStore {
  /** 已保存并生效的设置 */
  settings: UserSettings;
  /** 草稿层（实时预览用，持久化以便恢复未保存改动） */
  draft: UserSettings;
  /** Drawer 是否打开 */
  isDrawerOpen: boolean;

  /** 打开 Drawer：以当前 settings 为基准初始化 draft（若存在未保存草稿则恢复） */
  openDrawer: () => void;
  /** 关闭 Drawer：不保存，draft 保留 */
  closeDrawer: () => void;
  /** 更新草稿（实时预览） */
  updateDraft: (partial: Partial<UserSettings>) => void;
  /** 保存：draft → settings，持久化生效 */
  saveDraft: () => void;
  /** 放弃当前草稿改动：draft 回滚到 settings */
  resetDraft: () => void;
  /** 重置草稿为默认值（需再保存才生效） */
  resetToDefault: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      draft: { ...DEFAULT_SETTINGS },
      isDrawerOpen: false,

      openDrawer: () => {
        // 打开时若草稿与已保存一致（说明上次已保存或未改过），则以当前 settings 重新初始化 draft；
        // 若不一致（存在未保存草稿），则保留草稿以便用户继续编辑
        const { settings, draft } = get();
        const isDraftPristine = JSON.stringify(settings) === JSON.stringify(draft);
        set({
          isDrawerOpen: true,
          draft: isDraftPristine ? { ...settings } : draft,
        });
      },

      closeDrawer: () => set({ isDrawerOpen: false }),

      updateDraft: (partial) =>
        set((state) => ({ draft: { ...state.draft, ...partial } })),

      saveDraft: () =>
        set((state) => ({
          settings: { ...state.draft },
          isDrawerOpen: false,
        })),

      resetDraft: () =>
        set((state) => ({ draft: { ...state.settings } })),

      resetToDefault: () => set({ draft: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'user-settings-storage',
      // 仅持久化数据，不持久化 isDrawerOpen（刷新后 Drawer 应关闭）
      partialize: (state) => ({
        settings: state.settings,
        draft: state.draft,
      }),
    }
  )
);

/**
 * 读取当前生效的设置。
 *
 * - Drawer 打开期间返回 draft（实时预览）
 * - Drawer 关闭时返回 settings（已保存状态）
 *
 * 消费方（EditorPage、AISidebar、CodeEditor 等）统一使用此 hook，
 * 无需关心 draft/settings 的切换逻辑。
 */
export const useActiveSettings = (): UserSettings => {
  const isDrawerOpen = useSettingsStore((s) => s.isDrawerOpen);
  const settings = useSettingsStore((s) => s.settings);
  const draft = useSettingsStore((s) => s.draft);
  return isDrawerOpen ? draft : settings;
};
