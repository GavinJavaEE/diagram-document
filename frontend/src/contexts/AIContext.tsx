import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEditorStore, ChartType } from '@/contexts/EditorContext';
import { aiGenerate, aiUpdate } from '@/services/api';
import { getMermaidType } from '@/services/chartTypes';
import type { ChatMessage } from '@/types';

// ==================== 类型定义 ====================
export interface GenerateRecord {
  id: string;
  prompt: string;
  code: string;
  chartType: ChartType;
  timestamp: number;
}

export interface ChatRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * 图表编辑上下文：用于将 AI 读写目标从默认的 EditorContext（单图编辑器）
 * 解耦到任意宿主（例如 Markdown 文档内的某个 mermaid 代码块）。
 *
 * - getCode：返回当前待修改的 mermaid 代码
 * - applyCode：AI 生成/修改后将新代码写回宿主
 * - getDescription：可选，返回用于在 AI 提示中标识上下文的描述
 * - getErrorMessage：可选，返回当前预览区解析出的语法错误信息；
 *                    非空时由 sendMessage 作为修复上下文传给 AI，提升修正针对性
 *
 * 不进入 persist：函数引用无需持久化，每次进入宿主时由宿主设置。
 */
export interface ChartEditingContext {
  getCode: () => string;
  applyCode: (code: string) => void;
  getDescription?: () => string;
  getErrorMessage?: () => string;
}

// ==================== Zustand Store ====================
interface AIStore {
  // 左侧边栏状态（宽屏幕使用）
  isSidebarOpen: boolean;
  sidebarActiveTab: 'generate' | 'chat';
  setIsSidebarOpen: (isOpen: boolean) => void;
  setSidebarActiveTab: (tab: 'generate' | 'chat') => void;
  openSidebar: (tab: 'generate' | 'chat') => void;
  closeSidebar: () => void;

  // 生成相关
  selectedChartType: ChartType;
  setSelectedChartType: (t: ChartType) => void;
  generateHistory: GenerateRecord[];
  generateCode: (prompt: string) => Promise<void>;
  loadFromHistory: (record: GenerateRecord) => void;

  // 聊天对话相关
  chatMessages: ChatRecord[];
  chatSending: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;

  // 图表编辑上下文：非空时 AI 读写目标切换到该上下文（用于 MD 文档内图表块）。
  // 进入宿主时设置，离开时清理，避免污染单图编辑器场景。
  chartEditingContext: ChartEditingContext | null;
  setChartEditingContext: (ctx: ChartEditingContext | null) => void;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      isSidebarOpen: false,
      sidebarActiveTab: 'generate',
      selectedChartType: 'flowchart',
      generateHistory: [],
      chatMessages: [],
      chatSending: false,
      chartEditingContext: null,

      setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setSidebarActiveTab: (sidebarActiveTab) => set({ sidebarActiveTab }),
      openSidebar: (tab) => set({ isSidebarOpen: true, sidebarActiveTab: tab }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      setSelectedChartType: (t) => set({ selectedChartType: t }),
      setChartEditingContext: (ctx) => set({ chartEditingContext: ctx }),

      generateCode: async (prompt: string) => {
        const ctx = get().chartEditingContext;
        const selectedType = get().selectedChartType;

        // 获取 Mermaid 内部类型名（从后端动态获取）
        // 如果未选择类型（selectedChartType 为 undefined 或 'unknown'），则不传 chartType，让 AI 自动选择
        const shouldAutoDetect = !selectedType || selectedType === 'unknown';
        const mermaidType = shouldAutoDetect ? undefined : (getMermaidType(selectedType) || selectedType);

        const resp = await aiGenerate(prompt, mermaidType);

        // 写回目标：优先 chartEditingContext（MD 文档内图表块），否则单图编辑器
        if (ctx) {
          ctx.applyCode(resp.mermaidCode);
        } else {
          useEditorStore.getState().setCode(resp.mermaidCode);
        }

        const newRecord: GenerateRecord = {
          id: resp.recordId || `gen-${Date.now()}`,
          prompt,
          code: resp.mermaidCode,
          chartType: selectedType,
          timestamp: Date.now(),
        };

        set((state) => ({
          generateHistory: [newRecord, ...state.generateHistory].slice(0, 10),
        }));
      },

      loadFromHistory: (record: GenerateRecord) => {
        const ctx = get().chartEditingContext;
        if (ctx) {
          ctx.applyCode(record.code);
        } else {
          useEditorStore.getState().setCode(record.code);
        }
        set({ selectedChartType: record.chartType });
      },

      sendMessage: async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) return;

        const ctx = get().chartEditingContext;
        // 读取当前代码：优先 chartEditingContext，否则单图编辑器
        const editorState = useEditorStore.getState();
        const currentCode = ctx ? ctx.getCode() : editorState.code;

        // 收集预览区当前语法错误信息作为 AI 修复上下文：
        // - 单图编辑器：读 EditorContext.error（Preview 组件渲染的同源数据）
        // - chartEditingContext：调用宿主提供的 getErrorMessage（如 MD 文档内 mermaid 块）
        // 错误信息为空字符串时不传，避免污染 prompt
        let errorMessage: string | undefined;
        if (ctx?.getErrorMessage) {
          errorMessage = ctx.getErrorMessage() || undefined;
        } else if (editorState.error) {
          // 与预览区展示保持一致：标题 + 详情
          errorMessage = `语法错误\n${editorState.error}`;
        }

        const userMsg: ChatRecord = {
          id: `u-${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
        };

        // 构建 history（不含当前这条用户消息）
        const prevMessages = get().chatMessages;
        const history: ChatMessage[] = prevMessages
          .filter((m) => m.content)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        set((state) => ({
          chatMessages: [...state.chatMessages, userMsg],
          chatSending: true,
        }));

        try {
          const resp = await aiUpdate(currentCode, trimmed, history, undefined, undefined, errorMessage);

          const assistantMsg: ChatRecord = {
            id: resp.recordId || `a-${Date.now()}`,
            role: 'assistant',
            content: resp.reply || (resp.updated ? '已根据你的要求修改图表。' : '已收到你的消息。'),
            timestamp: Date.now(),
          };

          // 若返回了修改后的代码则自动应用到目标
          if (resp.updated && resp.mermaidCode) {
            if (ctx) {
              ctx.applyCode(resp.mermaidCode);
            } else {
              useEditorStore.getState().setCode(resp.mermaidCode);
            }
          }

          set((state) => ({
            chatMessages: [...state.chatMessages, assistantMsg],
            chatSending: false,
          }));
        } catch (err) {
          const assistantMsg: ChatRecord = {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            content: err instanceof Error ? `出错了：${err.message}` : 'AI 处理失败，请稍后重试',
            timestamp: Date.now(),
          };
          set((state) => ({
            chatMessages: [...state.chatMessages, assistantMsg],
            chatSending: false,
          }));
          throw err;
        }
      },

      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'ai-storage',
      partialize: (state) => ({
        generateHistory: state.generateHistory,
        selectedChartType: state.selectedChartType,
      }),
    },
  ),
);

// 便捷：导出图表类型工具
export const chartTypeLabel: Record<ChartType, string> = {
  flowchart: '流程图',
  sequence: '时序图',
  gantt: '甘特图',
  er: 'ER 图',
  class: '类图',
  state: '状态图',
  unknown: '其他',
};
