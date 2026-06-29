import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { UserProfileResp } from '@/types';
import { deleteAccount, sendVerificationCode } from '@/services/api';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Dialog } from '@/components/Common/Dialog';
import { maskEmail } from '@/utils/format';

interface SecurityTabProps {
  profile: UserProfileResp;
}

const COUNTDOWN_SECONDS = 60;

export const SecurityTab = ({ profile }: SecurityTabProps) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = profile.email;
  const canDelete = verificationCode.trim().length === 6 && !deleting && !sendingCode;

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown]);

  const resetDialog = () => {
    setVerificationCode('');
    setCountdown(0);
    setSendingCode(false);
    setDeleting(false);
  };

  const handleSendCode = async () => {
    if (sendingCode || countdown > 0) return;
    setSendingCode(true);
    try {
      await sendVerificationCode(email, 'delete_account');
      setCountdown(COUNTDOWN_SECONDS);
      showSuccess('验证码已发送至注册邮箱，请查收');
    } catch (err) {
      showError(err instanceof Error ? err.message : '发送验证码失败，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await deleteAccount({ email, verificationCode: verificationCode.trim() });
      // 账户已在后端注销（用户记录已删除），logout 失败可容忍：
      // cookie 会在下次请求时因用户不存在而失效，不会恢复登录态
      try {
        await logout();
      } catch {
        // 忽略：账户已注销，logout 失败不影响安全
      }
      showSuccess('账户已注销');
      navigate('/', { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : '注销失败，请稍后重试');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 退出登录 */}
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6 flex flex-col">
        <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-2">登录状态</h3>
        <p className="text-sm text-light-text-2 dark:text-dark-text-2 mb-4">
          退出当前账号，本地文档不受影响，云端文档需重新登录后访问。
        </p>
        <div className="mt-auto flex justify-end">
          <button
            type="button"
            onClick={async () => {
              try {
                await logout();
                showSuccess('已退出登录');
              } catch (err) {
                // 后端 logout 失败：前端 state 已清，但 cookie/Redis 可能未清
                // 刷新页面后会恢复登录态，提示用户重试
                const message = err instanceof Error ? err.message : '退出登录失败';
                showError(`退出登录失败：${message}，请刷新页面后重试`);
              }
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-light-2 dark:bg-dark-3 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 危险区：注销账户 */}
      <div className="bg-white dark:bg-dark-2 border border-error/30 rounded-2xl p-6 flex flex-col">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center text-error">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark-1 dark:text-white">注销账户</h3>
            <p className="text-sm text-light-text-2 dark:text-dark-text-2 mt-1">
              注销后，账户下的所有云端文档、AI 历史与配额将永久删除，且不可恢复。本地文档不受影响。
            </p>
          </div>
        </div>
        <div className="mt-auto flex justify-end">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-lg transition-colors"
          >
            注销账户
          </button>
        </div>
      </div>

      {/* 二次确认弹窗：邮箱验证码校验 */}
      <Dialog
        open={showConfirm}
        title="确认注销账户"
        variant="danger"
        onClose={() => {
          if (!deleting && !sendingCode) {
            setShowConfirm(false);
            resetDialog();
          }
        }}
        maxWidth="sm"
        description={
          <>
            此操作不可逆。为确认是你本人操作，我们将向注册邮箱
            <span className="font-medium text-dark-1 dark:text-white"> {maskEmail(email)} </span>
            发送验证码，请输入验证码后继续。
          </>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                resetDialog();
              }}
              disabled={deleting || sendingCode}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-light-2 dark:bg-dark-3 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              确认注销
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 位邮箱验证码"
              disabled={deleting}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-dark-1 text-dark-1 dark:text-white rounded-lg border border-light-3 dark:border-dark-3 focus:border-error focus:ring-1 focus:ring-error outline-none transition-colors tracking-widest"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0 || deleting}
              className="px-3 py-2 text-sm font-medium text-error border border-error/40 hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[110px]"
            >
              {sendingCode ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : countdown > 0 ? (
                `${countdown}s 后重发`
              ) : (
                '获取验证码'
              )}
            </button>
          </div>
          <p className="text-xs text-error">
            注销将立即生效，所有云端数据将被永久删除。
          </p>
        </div>
      </Dialog>
    </div>
  );
};
