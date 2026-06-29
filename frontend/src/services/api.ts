import type {
  ApiResponse,
  PageResp,
  UserResp,
  UserProfileResp,
  UserProfileUpdateReq,
  AiGenerateReq,
  AiGenerateResp,
  AiFixReq,
  AiFixResp,
  AiUpdateReq,
  AiUpdateResp,
  AiRecordResp,
  AiUsageResp,
  AiTokenStatResp,
  DocumentCreateReq,
  DocumentUpdateReq,
  DocumentResp,
  DocumentTitleCheckResp,
  DocumentVersionResp,
  TemplateResp,
} from '@/types';
import { useReLoginStore } from '@/components/Common/reLoginStore';

// ==================== 基础配置 ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const AUTH_BASE = API_BASE_URL;
const API_V1_BASE = `${API_BASE_URL}/api/v1`;
const RE_LOGIN_CODE = '1002';
// 默认请求超时：覆盖常规 CRUD/认证等接口，可通过环境变量覆盖
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_DEFAULT_MS) || 15000;
// AI 接口超时：大模型响应周期较长（生成/修复/多轮对话），单独配置更长阈值
const AI_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_AI_MS) || 60000;

/**
 * 将外部 AbortSignal 与超时合并为一个 AbortSignal。
 * 任一触发即中止请求；外部 signal 已 aborted 时立即中止。
 */
const mergeSignals = (
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; timer: ReturnType<typeof setTimeout> } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'AbortError')), timeoutMs);

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener(
        'abort',
        () => controller.abort((external as AbortSignal & { reason?: unknown }).reason),
        { once: true },
      );
    }
  }
  return { signal: controller.signal, timer };
};

interface RequestOptions extends RequestInit {
  params?: Record<string, unknown>;
}

// ==================== 统一 fetch 封装 ====================
const request = async <T>(
  url: string,
  options: RequestOptions = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> => {
  const { params, ...fetchOptions } = options;
  
  let finalUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const paramsString = searchParams.toString();
    if (paramsString) {
      finalUrl += (url.includes('?') ? '&' : '?') + paramsString;
    }
  }

  const mergedHeaders = new Headers(fetchOptions.headers || {});
  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }
  // 禁用浏览器/CDN 对 API 响应的缓存，避免删除后刷新页面命中旧缓存
  // 导致列表接口返回已删除文档（数据库已无记录，但 HTTP 缓存仍返回旧数据）
  if (!mergedHeaders.has('Cache-Control')) {
    mergedHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  if (!mergedHeaders.has('Pragma')) {
    mergedHeaders.set('Pragma', 'no-cache');
  }

  const { signal: mergedSignal, timer } = mergeSignals(fetchOptions.signal as AbortSignal | undefined, timeoutMs);

  let res: Response;
  try {
    res = await fetch(finalUrl, {
      ...fetchOptions,
      headers: mergedHeaders,
      credentials: 'include',
      // no-store：彻底绕过浏览器 HTTP 缓存，每次都走网络
      cache: 'no-store',
      signal: mergedSignal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (mergedSignal.aborted) {
      throw err instanceof DOMException && err.name === 'AbortError'
        ? new Error('请求超时或已取消，请稍后重试')
        : err;
    }
    throw err;
  }
  clearTimeout(timer);

  const contentType = res.headers.get('content-type') || '';

  let body: ApiResponse<T> | null = null;
  if (contentType.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const msg = body?.msg || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (body && body.code && body.code !== '0000') {
    if (body.code === RE_LOGIN_CODE) {
      // 触发全局重新登录弹窗（防重复：store 内部已用 isOpen 守卫）
      useReLoginStore.getState().open();
      throw new Error('登录已过期，请重新登录');
    }
    throw new Error(body.msg || '操作失败');
  }

  if (body) {
    return body.data as T;
  }
  return (await res.text()) as unknown as T;
};

// ==================== 认证相关 API ====================

/**
 * 验证码场景：
 *  - register       注册
 *  - delete_account 注销账户
 */
export type VerificationCodeScene = 'register' | 'delete_account';

/**
 * 发送邮箱验证码
 */
export const sendVerificationCode = async (
  email: string,
  scene: VerificationCodeScene,
): Promise<void> => {
  await request<void>(`${AUTH_BASE}/send-verification-code`, {
    method: 'POST',
    body: JSON.stringify({ email, scene }),
  });
};

/**
 * 用户注册
 */
export const register = async (
  email: string,
  password: string,
  confirmPassword: string,
  verificationCode: string,
): Promise<UserResp> => {
  return await request<UserResp>(`${AUTH_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword, verificationCode }),
  });
};

/**
 * 用户登录
 */
export const login = async (email: string, password: string): Promise<UserResp> => {
  return await request<UserResp>(`${AUTH_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

/**
 * GitHub OAuth 登录
 */
export const githubLogin = async (code: string): Promise<UserResp> => {
  return await request<UserResp>(`${AUTH_BASE}/login/github-callback`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

/**
 * 退出登录
 */
export const logout = async (): Promise<void> => {
  await request<void>(`${AUTH_BASE}/logout`, {
    method: 'POST',
  });
};

/**
 * 获取当前登录用户信息
 *
 * /me 接口已放开登录拦截：
 * - 已登录：返回 { code:'0000', data: UserResp }
 * - 未登录：返回 { code:'0000', data: null }
 *
 * 因此本函数永不抛错，未登录返回 null，由调用方静默处理。
 */
export const getCurrentUser = async (): Promise<UserResp | null> => {
  return await request<UserResp | null>(`${AUTH_BASE}/me`, {
    method: 'GET',
  });
};

// ==================== 用户资料相关 API ====================

/**
 * 获取用户资料
 */
export const getUserProfile = async (): Promise<UserProfileResp> => {
  return await request<UserProfileResp>(`${API_V1_BASE}/user/profile`, {
    method: 'GET',
  });
};

/**
 * 更新用户资料
 */
export const updateUserProfile = async (
  req: UserProfileUpdateReq,
): Promise<UserProfileResp> => {
  return await request<UserProfileResp>(`${API_V1_BASE}/user/profile`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
};

/**
 * 注销账户（逻辑删除）
 *
 * 携带邮箱 + 注销验证码（scene=delete_account）。
 * 服务端会校验请求邮箱 = 当前登录用户邮箱，防越权。
 */
export const deleteAccount = async (req: {
  email: string;
  verificationCode: string;
}): Promise<void> => {
  await request<void>(`${API_V1_BASE}/user/account`, {
    method: 'DELETE',
    body: JSON.stringify(req),
  });
};

// ==================== AI 相关 API ====================

/**
 * AI 生成图表
 */
export const aiGenerate = async (
  description: string,
  chartType?: string,
  options?: Record<string, any>,
  signal?: AbortSignal,
): Promise<AiGenerateResp> => {
  const body: AiGenerateReq = { description };
  if (chartType) {
    body.chartType = chartType;
  }
  if (options && Object.keys(options).length > 0) {
    body.options = options;
  }
  return await request<AiGenerateResp>(
    `${API_V1_BASE}/ai/generate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    },
    AI_TIMEOUT_MS,
  );
};

/**
 * AI 修复代码
 */
export const aiFix = async (
  mermaidCode: string,
  errorMessage?: string,
  options?: Record<string, any>,
  signal?: AbortSignal,
): Promise<AiFixResp> => {
  const body: AiFixReq = { mermaidCode };
  if (errorMessage) {
    body.errorMessage = errorMessage;
  }
  if (options && Object.keys(options).length > 0) {
    body.options = options;
  }
  return await request<AiFixResp>(
    `${API_V1_BASE}/ai/fix`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    },
    AI_TIMEOUT_MS,
  );
};

/**
 * AI 对话修改图表（多轮）
 */
export const aiUpdate = async (
  mermaidCode: string,
  message: string,
  history?: AiUpdateReq['history'],
  options?: Record<string, any>,
  signal?: AbortSignal,
  errorMessage?: string,
): Promise<AiUpdateResp> => {
  const body: AiUpdateReq = { mermaidCode, message };
  if (history && history.length > 0) {
    body.history = history;
  }
  if (options && Object.keys(options).length > 0) {
    body.options = options;
  }
  if (errorMessage) {
    body.errorMessage = errorMessage;
  }
  return await request<AiUpdateResp>(
    `${API_V1_BASE}/ai/update`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    },
    AI_TIMEOUT_MS,
  );
};

/**
 * 获取 AI 使用历史记录
 */
export const getAiHistory = async (
  page = 1,
  pageSize = 20,
  type?: string,
): Promise<PageResp<AiRecordResp>> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (type) {
    params.set('type', type);
  }
  return await request<PageResp<AiRecordResp>>(
    `${API_V1_BASE}/ai/history?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 获取 AI 使用量
 */
export const getAiUsage = async (): Promise<AiUsageResp[]> => {
  return await request<AiUsageResp[]>(`${API_V1_BASE}/ai/usage`, {
    method: 'GET',
  });
};

/**
 * 获取每日 Token 使用量统计（个人中心折线图）
 *
 * @param days 统计天数（含今天），默认 30，后端范围 [1, 90]
 */
export const getAiTokenStats = async (days = 30): Promise<AiTokenStatResp[]> => {
  return await request<AiTokenStatResp[]>(`${API_V1_BASE}/ai/token-stats`, {
    method: 'GET',
    params: { days },
  });
};

// ==================== 文档相关 API ====================

/**
 * 创建文档
 */
export const createDocument = async (
  title: string,
  chartType: string,
  content?: string,
  description?: string,
  tags?: string,
): Promise<DocumentResp> => {
  const body: DocumentCreateReq = { title, chartType };
  if (content) body.content = content;
  if (description) body.description = description;
  if (tags) body.tags = tags;
  return await request<DocumentResp>(`${API_V1_BASE}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * 获取文档列表
 */
export const listDocuments = async (
  page = 1,
  pageSize = 20,
  chartType?: string,
): Promise<PageResp<DocumentResp>> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (chartType) {
    params.set('chartType', chartType);
  }
  return await request<PageResp<DocumentResp>>(
    `${API_V1_BASE}/documents?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 获取「我的图表」列表：按多个 chartType 查询，排除 markdown 文档。
 *
 * @param chartTypes Mermaid 图表类型集合（flowchart/sequence/class/state/gantt/er）
 *                   传空数组或 undefined 时由后端退化为查询全部文档
 * @param activeType 当前选中的单一类型筛选；与 chartTypes 二选一：
 *                   - 进入页面时传 chartTypes（拉取所有图表类型）
 *                   - 用户点击类型 Tab 筛选时传 activeType（单值精确匹配）
 */
export const listCharts = async (
  page = 1,
  pageSize = 20,
  chartTypes?: string[],
  activeType?: string,
): Promise<PageResp<DocumentResp>> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (activeType) {
    params.set('chartType', activeType);
  } else if (chartTypes && chartTypes.length > 0) {
    // 多值参数：chartTypes=flowchart&chartTypes=sequence&...
    chartTypes.forEach((t) => params.append('chartTypes', t));
  }
  return await request<PageResp<DocumentResp>>(
    `${API_V1_BASE}/documents?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 获取单个文档
 */
export const getDocument = async (documentId: string): Promise<DocumentResp> => {
  return await request<DocumentResp>(`${API_V1_BASE}/documents/${documentId}`, {
    method: 'GET',
  });
};

/**
 * 文档名唯一性校验：保存前由前端调用，校验当前用户 + chartType 范围内是否重名。
 * excludeDocumentId 用于编辑已有文档改名时排除自身。
 */
export const checkTitleDuplicate = async (
  title: string,
  chartType = 'markdown',
  excludeDocumentId?: string,
): Promise<DocumentTitleCheckResp> => {
  const params = new URLSearchParams({
    title,
    chartType,
  });
  if (excludeDocumentId) {
    params.set('excludeDocumentId', excludeDocumentId);
  }
  return await request<DocumentTitleCheckResp>(
    `${API_V1_BASE}/documents/check-title?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 更新文档
 */
export const updateDocument = async (
  documentId: string,
  title: string,
  content?: string,
  description?: string,
  chartType?: string,
  tags?: string,
): Promise<DocumentResp> => {
  const body: DocumentUpdateReq = { title };
  if (content) body.content = content;
  if (description) body.description = description;
  if (chartType) body.chartType = chartType;
  if (tags) body.tags = tags;
  return await request<DocumentResp>(`${API_V1_BASE}/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * 删除文档
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  await request<void>(`${API_V1_BASE}/documents/${documentId}`, {
    method: 'DELETE',
  });
};

/**
 * 获取文档版本列表
 */
export const listDocumentVersions = async (
  documentId: string,
  page = 1,
  pageSize = 20,
): Promise<DocumentVersionResp[]> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return await request<DocumentVersionResp[]>(
    `${API_V1_BASE}/documents/${documentId}/versions?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 恢复指定文档版本
 */
export const restoreDocumentVersion = async (
  documentId: string,
  version: number,
): Promise<DocumentResp> => {
  return await request<DocumentResp>(
    `${API_V1_BASE}/documents/${documentId}/versions/${version}/restore`,
    { method: 'POST' },
  );
};

/**
 * 设置文档是否公开
 */
export const setDocumentPublic = async (
  documentId: string,
  isPublic: boolean,
): Promise<DocumentResp> => {
  const params = new URLSearchParams({ isPublic: String(isPublic) });
  return await request<DocumentResp>(
    `${API_V1_BASE}/documents/${documentId}/public?${params.toString()}`,
    { method: 'PATCH' },
  );
};

/**
 * 通过分享 token 获取公开文档
 */
export const getDocumentByShareToken = async (
  shareToken: string,
): Promise<DocumentResp> => {
  return await request<DocumentResp>(
    `${API_V1_BASE}/documents/public/${shareToken}`,
    { method: 'GET' },
  );
};

// ==================== 模板相关 API ====================

/**
 * 获取模板列表
 */
export const listTemplates = async (
  page = 1,
  pageSize = 20,
  category?: string,
): Promise<PageResp<TemplateResp>> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) {
    params.set('category', category);
  }
  return await request<PageResp<TemplateResp>>(
    `${API_V1_BASE}/templates?${params.toString()}`,
    { method: 'GET' },
  );
};

/**
 * 获取单个模板
 */
export const getTemplate = async (templateId: string): Promise<TemplateResp> => {
  return await request<TemplateResp>(`${API_V1_BASE}/templates/${templateId}`, {
    method: 'GET',
  });
};

/**
 * 使用模板（基于模板创建文档）
 */
export const useTemplate = async (templateId: string): Promise<DocumentResp> => {
  return await request<DocumentResp>(`${API_V1_BASE}/templates/${templateId}/use`, {
    method: 'POST',
  });
};

/**
 * 从文档保存为模板
 */
export const saveAsTemplate = async (documentId: string): Promise<TemplateResp> => {
  return await request<TemplateResp>(
    `${API_V1_BASE}/templates/from-document/${documentId}`,
    { method: 'POST' },
  );
};

// ==================== 兼容旧名字的别名（方便现有代码不改） ====================
export { login as authLogin, register as authRegister, logout as authLogout, githubLogin as authGithubLogin, sendVerificationCode as authSendVerificationCode };
