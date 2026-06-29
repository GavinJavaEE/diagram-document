import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, Shield } from 'lucide-react';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { sendVerificationCode } from '@/services/api';
import { Link, useNavigate } from 'react-router-dom';
import { AuthHeader } from './AuthHeader';
import { readLoginRedirect } from '@/utils/loginRedirect';

export const RegisterForm = () => {
  const { register } = useAuthStore();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', verificationCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      showError('请输入邮箱地址');
      return;
    }
    if (!isValidEmail(formData.email)) {
      showError('邮箱格式不正确');
      return;
    }

    setSendingCode(true);

    try {
      await sendVerificationCode(formData.email, 'register');
      setCountdown(60);
      showSuccess('验证码已发送，请查收邮件');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '发送验证码失败，请重试';
      showError(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(formData.email)) {
      showError('请输入有效的邮箱地址');
      return;
    }
    if (formData.password.length < 6) {
      showError('密码至少需要 6 个字符');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }
    if (!formData.verificationCode.trim()) {
      showError('请输入邮箱验证码');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.confirmPassword, formData.verificationCode);
      // 智能回跳：注册流程同样尊重来源页参数
      navigate(readLoginRedirect() || '/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '注册失败，请重试';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-1 via-white to-primary/5 dark:from-dark-1 dark:via-dark-1 dark:to-primary/5">
      <AuthHeader />

      <main className="flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-dark-1 dark:text-white mb-2">创建账户</h1>
            <p className="text-gray-500 dark:text-gray-400">注册以解锁全部功能</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6 md:p-8 shadow-lg shadow-black/5 dark:shadow-black/10 space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-1 dark:text-white mb-2">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-1 dark:text-white mb-2">邮箱验证码</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.verificationCode}
                    onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value.replace(/\D/g, '') })}
                    placeholder="6 位验证码"
                    className="w-full pl-10 pr-4 py-3 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-widest"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  className="px-4 py-3 bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary rounded-xl font-semibold text-sm whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">请输入邮箱后点击获取验证码，验证码有效期 10 分钟</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-1 dark:text-white mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="至少 6 个字符"
                  className="w-full pl-10 pr-10 py-3 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-dark-1 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-1 dark:text-white mb-2">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="再次输入密码"
                  className="w-full pl-10 pr-10 py-3 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-dark-1 dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-300 dark:disabled:bg-dark-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : (
                <>
                  注册
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-light-3 dark:border-dark-3">
              已有账户？{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};
