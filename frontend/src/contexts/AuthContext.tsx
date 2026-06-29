import { create } from 'zustand';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  githubLogin as apiGithubLogin,
  sendVerificationCode as apiSendVerificationCode,
  getCurrentUser,
  type VerificationCodeScene,
} from '@/services/api';

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, confirmPassword: string, verificationCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  githubLogin: (code: string) => Promise<boolean>;
  sendVerificationCode: (email: string, scene: VerificationCodeScene) => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  (set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    initialized: false,

    // 初始化：在应用启动时调用，通过 cookie 验证当前会话
    // /me 接口已放开拦截，未登录返回 data=null（不触发 1002 弹窗）
    initialize: async () => {
      try {
        const userData = await getCurrentUser();
        if (userData && userData.userId) {
          set({
            user: { id: userData.userId, email: userData.email },
            isAuthenticated: true,
            initialized: true,
          });
        } else {
          set({ user: null, isAuthenticated: false, initialized: true });
        }
      } catch (err) {
        set({ user: null, isAuthenticated: false, initialized: true });
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const resp = await apiLogin(email, password);
        set({
          user: { id: resp.userId, email: resp.email },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    register: async (email: string, password: string, confirmPassword: string, verificationCode: string) => {
      set({ isLoading: true });
      try {
        const resp = await apiRegister(email, password, confirmPassword, verificationCode);
        set({
          user: { id: resp.userId, email: resp.email },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      let apiError: unknown = null;
      try {
        await apiLogout();
      } catch (err) {
        apiError = err;
      }
      // 清理云端 store 残留状态（文档/图表列表 + 编辑态），防止下个账号看到上个账号的数据
      // 使用动态 import 避免与 DocContext/EditorContext/ChartContext 形成循环依赖
      try {
        const [{ useDocStore }, { useEditorStore }, { useChartStore }] = await Promise.all([
          import('@/contexts/DocContext'),
          import('@/contexts/EditorContext'),
          import('@/contexts/ChartContext'),
        ]);
        useDocStore.getState().clearCloudData();
        useEditorStore.getState().clearCloudData();
        useChartStore.getState().reset();
      } catch (err) {
        // 清理失败不阻塞 logout，store 残留会在下次 loadList 时被覆盖
        console.warn('[AuthContext] clear cloud store failed', err);
      }
      // 无论后端 logout 是否成功，都清前端登录态
      // （httpOnly cookie 前端无法清除，若后端失败，调用方应提示用户）
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (apiError) {
        // 重新抛出，让调用方知道后端 logout 失败
        // （前端 state 已清，但 cookie/Redis 可能未清，刷新后会恢复登录态）
        throw apiError;
      }
    },

    githubLogin: async (code: string) => {
      set({ isLoading: true });
      try {
        const resp = await apiGithubLogin(code);
        set({
          user: { id: resp.userId, email: resp.email },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    sendVerificationCode: async (email: string, scene: VerificationCodeScene) => {
      await apiSendVerificationCode(email, scene);
      return true;
    },
  }),
);
