import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Github, Home } from 'lucide-react';
import { consumeGithubRedirect } from '@/utils/loginRedirect';

export const GithubCallbackPage = () => {
  const navigate = useNavigate();
  const { githubLogin } = useAuthStore();
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const errorCode = params.get('error');

    // 用户拒绝授权
    if (errorCode) {
      if (errorCode === 'access_denied') {
        showError('您取消了 GitHub 授权');
      } else {
        showError('GitHub 授权失败，请重试');
      }
      setLoading(false);
      return;
    }

    if (!code) {
      showError('缺少授权码，请重试');
      setLoading(false);
      return;
    }

    // 校验 state 防止 CSRF
    const savedState = localStorage.getItem('github_oauth_state');
    if (!state || !savedState || state !== savedState) {
      showError('安全验证失败，请重试');
      localStorage.removeItem('github_oauth_state');
      setLoading(false);
      return;
    }

    localStorage.removeItem('github_oauth_state');

    // 调后端用 code 换 access_token + user info
    githubLogin(code)
      .then(() => {
        // 智能回跳：读取发起 OAuth 前暂存的来源页，无则跳首页
        navigate(consumeGithubRedirect() || '/', { replace: true });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'GitHub 登录失败，请重试';
        showError(msg || 'GitHub 登录失败，请重试');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [githubLogin, navigate, showError]);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-1 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-light-1 dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl p-8 text-center">
        {loading ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Github className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-dark-1 dark:text-white mb-2">正在通过 GitHub 登录...</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">正在与 GitHub 交换授权信息，请稍候</p>
          </>
        ) : error ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-error/10 mb-4">
              <Github className="w-7 h-7 text-error" />
            </div>
            <h1 className="text-xl font-bold text-dark-1 dark:text-white mb-2">登录失败</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              返回登录
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default GithubCallbackPage;
