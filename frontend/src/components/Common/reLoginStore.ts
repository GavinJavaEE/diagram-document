import { create } from 'zustand';

/**
 * 重新登录全局状态
 *
 * 触发场景：后端返回 {code:'1002', msg:'need relogin'} 时，request 拦截器调用 open()
 * 弹窗策略：禁用 ESC/遮罩关闭，强制用户在「确定跳转登录」与「取消停留」之间选择
 * 防重复：isOpen 标记避免并发请求同时弹多个弹窗
 *
 * 独立文件：避免 api.ts ↔ AuthContext 循环依赖
 */
interface ReLoginState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useReLoginStore = create<ReLoginState>((set) => ({
  isOpen: false,
  open: () => set((s) => (s.isOpen ? s : { isOpen: true })),
  close: () => set({ isOpen: false }),
}));
