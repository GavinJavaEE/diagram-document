// ==================== 通用响应结构 ====================

export interface ApiResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export interface PageResp<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 用户/认证相关类型 ====================

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: Date | string;
}

export interface UserResp {
  userId: string;
  email: string;
  role?: string;
  subscriptionPlan?: string;
  subscribed?: boolean;
}

export interface UserProfileResp {
  userId: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  phone?: string;
  location?: string;
  isSubscribed?: number;
  planType?: string;
  subscriptionEndAt?: string;
  totalDocuments?: number;
  totalCharts?: number;
  totalAiCalls?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileUpdateReq {
  nickname?: string;
  avatarUrl?: string;
  phone?: string;
  location?: string;
}

// ==================== AI 相关类型 ====================

export interface AiGenerateReq {
  description: string;
  chartType?: string;
  options?: Record<string, any>;
}

export interface AiGenerateResp {
  recordId: string;
  mermaidCode: string;
  chartType: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  processingTimeMs?: number;
}

export interface AiFixReq {
  mermaidCode: string;
  errorMessage?: string;
  options?: Record<string, any>;
}

export interface AiFixResp {
  recordId: string;
  originalCode: string;
  fixedCode: string;
  fixSummary?: string[];
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  processingTimeMs?: number;
}

export interface AiRecordResp {
  recordId: string;
  type: string;
  chartType: string;
  prompt: string;
  resultCode: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  processingTimeMs?: number;
  provider?: string;
  isSuccess?: number;
  createdAt?: string;
}

export interface AiUsageResp {
  type: string;
  usedCount: number;
  limitCount: number;
  remainingCount: number;
  period: string;
}

/** 每日 AI Token 使用量统计（个人中心堆叠面积图） */
export interface AiTokenStatResp {
  /** 日期 yyyy-MM-dd */
  date: string;
  /** 当日 token 总消耗 */
  totalTokens: number;
  /** 当日 AI 调用次数 */
  callCount: number;
  /** 当日输入 token（prompt_tokens） */
  promptTokens: number;
  /** 当日输出 token（completion_tokens） */
  completionTokens: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiUpdateReq {
  mermaidCode: string;
  message: string;
  history?: ChatMessage[];
  options?: Record<string, any>;
  /** 可选：当前 Mermaid 代码的语法错误信息（来自预览区解析），非空时由 LLM 作为修复上下文使用 */
  errorMessage?: string;
}

export interface AiUpdateResp {
  recordId: string;
  reply: string;
  mermaidCode: string;
  updated: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  processingTimeMs?: number;
}

// ==================== 文档相关类型 ====================

export interface DocumentCreateReq {
  title: string;
  content?: string;
  description?: string;
  chartType: string;
  tags?: string;
}

export interface DocumentUpdateReq {
  title: string;
  content?: string;
  description?: string;
  chartType?: string;
  tags?: string;
}

export interface DocumentResp {
  documentId: string;
  title: string;
  content?: string;
  description?: string;
  tags?: string;
  chartType: string;
  version?: number;
  isPublic?: number;
  shareToken?: string;
  bytesSize?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 文档名唯一性校验响应 */
export interface DocumentTitleCheckResp {
  duplicated: boolean;
  conflictDocumentId?: string;
}

export interface DocumentVersionResp {
  documentId: string;
  version: number;
  title: string;
  content?: string;
  changeSummary?: string;
  createdAt?: string;
}

// ==================== 模板相关类型 ====================

export interface TemplateCategoryResp {
  categoryId: string;
  name: string;
  icon?: string;
  description?: string;
  mermaidType?: string;
  sortOrder?: number;
}

export interface TemplateResp {
  templateId: string;
  title: string;
  category: string;
  description?: string;
  content?: string;
  tags?: string;
  isPublic?: number;
  ownerUserId?: string;
  useCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== 编辑器状态 ====================

export interface ErrorLineInfo {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface EditorState {
  code: string;
  error: string | null;
  errors: ErrorLineInfo[];
  isRendering: boolean;
  lastSaved: Date | null;
}

// ==================== 图表类型 ====================

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt';
