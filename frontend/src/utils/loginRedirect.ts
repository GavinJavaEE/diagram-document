/**
 * 登录回跳工具：支持「智能回跳」——被拦截去登录的用户，登录后回到来源页。
 *
 * 两种传递方式：
 * - URL 参数 `?redirect=xxx`：标准做法，刷新不丢失，适用于普通邮箱/注册登录
 * - localStorage 桥接：GitHub OAuth 中间会跳经 github.com，URL 参数丢失，需 localStorage 暂存
 *
 * 安全：redirect 仅允许站内路径（以 / 开头且非 // 协议相对 URL），防止开放重定向漏洞。
 */

const GITHUB_OAUTH_REDIRECT_KEY = 'github_oauth_redirect';

/**
 * 构建带来源页参数的登录 URL。
 *
 * @param redirect 来源页路径（站内绝对路径，如 /profile、/docs/xxx）
 * @returns 形如 /login?redirect=%2Fprofile
 */
export const buildLoginUrl = (redirect: string): string => {
  return `/login?redirect=${encodeURIComponent(redirect)}`;
};

/**
 * 读取并校验当前页面 URL 中的 redirect 参数。
 * 仅允许站内路径，拒绝 // 开头（协议相对 URL）和外部 URL，防开放重定向。
 *
 * @returns 合法的站内路径，或 null
 */
export const readLoginRedirect = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (!redirect) return null;
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return null;
  return redirect;
};

/**
 * GitHub OAuth 发起前暂存 redirect 到 localStorage。
 * OAuth 中间会跳经 github.com，回来时 URL 参数已丢失，必须用 localStorage 桥接。
 */
export const saveGithubRedirect = (redirect: string | null): void => {
  if (redirect) {
    localStorage.setItem(GITHUB_OAUTH_REDIRECT_KEY, redirect);
  } else {
    localStorage.removeItem(GITHUB_OAUTH_REDIRECT_KEY);
  }
};

/**
 * GitHub OAuth 回调后读取并清除暂存的 redirect。
 *
 * @returns 暂存的来源页路径，或 null
 */
export const consumeGithubRedirect = (): string | null => {
  const redirect = localStorage.getItem(GITHUB_OAUTH_REDIRECT_KEY);
  if (redirect) {
    localStorage.removeItem(GITHUB_OAUTH_REDIRECT_KEY);
  }
  return redirect;
};
