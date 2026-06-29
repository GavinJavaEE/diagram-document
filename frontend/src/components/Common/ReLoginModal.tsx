import { Dialog } from './Dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/contexts/AuthContext';
import { useReLoginStore } from './reLoginStore';
import { LogIn } from 'lucide-react';
import { buildLoginUrl } from '@/utils/loginRedirect';

/**
 * 重新登录模态弹窗
 *
 * - 确定：清登录态 + 跳转登录页
 * - 取消：关闭弹窗，用户停留当前页（不强制跳转）
 * - onClose=null：禁用遮罩/ESC 关闭，确保用户必须做出选择
 *
 * 必须挂在 Router 内部以使用 useNavigate；App.tsx 已在 Router 内挂载，安全。
 */
const ReLoginModalInner = () => {
  const isOpen = useReLoginStore((s) => s.isOpen);
  const close = useReLoginStore((s) => s.close);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  const handleConfirm = async () => {
    close();
    // 清除本地登录态（Cookie 由后端 logout 接口清除，此处仅清前端状态）
    // token 已过期（1002），后端 logout 失败可容忍：前端 state 已清（AuthContext.logout 保证），
    // 失败也不会恢复登录态（Redis 中 token 已失效）
    try {
      await logout();
    } catch {
      // 忽略：token 已过期，后端 logout 失败不影响
    }
    // 带 redirect 以便重新登录后回到过期前的页面，避免丢失工作上下文
    navigate(buildLoginUrl(location.pathname + location.search), { replace: true });
  };

  const handleCancel = () => {
    close();
  };

  return (
    <Dialog
      open={isOpen}
      title="登录状态已过期"
      variant="warning"
      onClose={null}
      maxWidth="sm"
      description="您的登录状态已过期，请重新登录。"
      footer={
        <>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-light-2 dark:bg-dark-3 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            确定
          </button>
        </>
      }
    />
  );
};

export const ReLoginModal = () => <ReLoginModalInner />;
