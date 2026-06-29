import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, LogIn, Github } from 'lucide-react';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import { AuthHeader } from './AuthHeader';
import { readLoginRedirect, saveGithubRedirect } from '@/utils/loginRedirect';

// 生成 64 字符随机 state 防止 CSRF
const generateRandomState = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || '';

const handleGithubLogin = () => {
  // 环境变量未配置 → 不生成无效链接，直接提示用户
  const trimmedId = GITHUB_CLIENT_ID.trim();
  const trimmedUri = GITHUB_REDIRECT_URI.trim();
  if (
    !trimmedId ||
    trimmedId === 'your_github_client_id_here' ||
    trimmedId.includes('your_') ||
    !trimmedUri
  ) {
    alert(
      'GitHub OAuth 尚未配置完成。\n\n' +
        '1. 在 https://github.com/settings/developers 创建 OAuth App\n' +
        '2. Authorization callback URL 设置为：' +
        'http://localhost:5173/oauth/github/callback\n' +
        '3. 编辑 frontend/.env，填入 VITE_GITHUB_CLIENT_ID\n' +
        '4. 重启前端开发服务器（npm run dev）以使 .env 生效\n\n' +
        '同时请在后端 diagram-ai/src/main/resources/application.properties 中填入 ' +
        'diagramai.github.client-id 和 diagramai.github.client-secret',
    );
    return;
  }

  const state = generateRandomState();
  localStorage.setItem('github_oauth_state', state);
  // OAuth 中间跳经 github.com 会丢失 URL 参数，暂存 redirect 到 localStorage 以便回调后回跳
  saveGithubRedirect(readLoginRedirect());

  const githubAuthUrl = 'https://github.com/login/oauth/authorize';
  const params = new URLSearchParams({
    client_id: trimmedId,
    redirect_uri: trimmedUri,
    scope: 'read:user user:email',
    state,
  });

  window.location.href = `${githubAuthUrl}?${params.toString()}`;
};

export const LoginForm = () => {
  const { login } = useAuthStore();
  const { showError } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 检测 GitHub OAuth 是否已配置
  const trimmedId = GITHUB_CLIENT_ID.trim();
  const trimmedUri = GITHUB_REDIRECT_URI.trim();
  const githubConfigured =
    !!trimmedId &&
    trimmedId !== 'your_github_client_id_here' &&
    !trimmedId.includes('your_') &&
    !!trimmedUri;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      // 智能回跳：有来源页参数则回来源页，否则跳首页
      navigate(readLoginRedirect() || '/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请重试';
      showError(msg || '邮箱或密码错误');
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
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-dark-1 dark:text-white mb-2">欢迎回来</h1>
            <p className="text-gray-500 dark:text-gray-400">登录您的账户，解锁全部功能</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6 md:p-8 shadow-lg shadow-black/5 dark:shadow-black/10 space-y-5"
          >
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
              <label className="block text-sm font-medium text-dark-1 dark:text-white mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-300 dark:disabled:bg-dark-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : (
                <>
                  登录
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-light-3 dark:border-dark-3" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-dark-2 px-4 text-gray-400 dark:text-gray-500 font-medium">
                  或使用第三方登录
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGithubLogin}
              className="w-full py-3 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-gray-200 disabled:bg-gray-300 text-white dark:text-gray-900 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              <Github className="w-5 h-5" />
              {githubConfigured ? '通过 GitHub 登录' : '通过 GitHub 登录（未配置）'}
            </button>

            {!githubConfigured && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                未检测到有效的 VITE_GITHUB_CLIENT_ID。请在 frontend/.env 中配置后重启前端。
              </p>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-light-3 dark:border-dark-3">
              还没有账户？{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                立即注册
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};
