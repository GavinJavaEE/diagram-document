import MarkdownIt from 'markdown-it';
import { initMermaid, renderMermaid } from '@/services/mermaid';
import type { Theme } from '@/contexts/ThemeContext';

/**
 * Markdown 渲染服务
 * - 编辑场景：html=false（安全转义），信任作者输入的纯 MD 语法
 * - 分享场景：应另行使用 html=false 的独立实例（P3 实现）
 *
 * Mermaid 代码块（```mermaid）会被替换为渲染后的 SVG，
 * 复用 services/mermaid.ts 的初始化与渲染能力。
 */

// 编辑场景实例：关闭原始 HTML，防止误输入导致 XSS
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

// 安全：所有链接强制 target=_blank + rel=noopener（防止 reverse tabnabbing）
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const targetIndex = token.attrIndex('target');
  if (targetIndex < 0) {
    token.attrPush(['target', '_blank']);
    token.attrPush(['rel', 'noopener noreferrer']);
  } else {
    tokens[idx].attrs![targetIndex][1] = '_blank';
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// 用于 SVG 占位的唯一 id 计数器（mermaid.render 需要唯一 id）
let mermaidIdCounter = 0;

/**
 * 将 mermaid 代码块渲染为 SVG 字符串。
 * 失败时返回带错误提示的占位 HTML，不抛异常（保证整篇 MD 仍可渲染）。
 *
 * 渲染后的容器带有 data-mermaid-block 和 data-mermaid-code（base64 编码的原始代码），
 * 供 MarkdownPreview 实现右键「用 AI 修改」时反查原始代码。
 */
const renderMermaidBlock = async (code: string, theme: Theme): Promise<string> => {
  try {
    // 编辑场景也用 strict：MD 文档中不应执行任意脚本
    initMermaid(theme, 'strict');
    const id = `md-mermaid-${Date.now()}-${mermaidIdCounter++}`;
    const svg = await renderMermaid(id, code.trim());
    // base64 编码原始代码，避免代码中的特殊字符破坏 HTML 属性
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return `<div class="md-mermaid-block" data-mermaid-block="1" data-mermaid-code="${encoded}">${svg}</div>`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `<div class="md-mermaid-error">Mermaid 渲染失败：${escapeHtml(msg)}</div>`;
  }
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * 从 <pre><code class="language-mermaid">...</code></pre> 中提取代码文本。
 * markdown-it 会将代码内容做 HTML 转义，需反转义回原始 mermaid 代码。
 */
const decodeEntities = (s: string): string => {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

// 匹配 mermaid 代码块的 HTML 输出（markdown-it 默认输出格式）
const MERMAID_BLOCK_RE =
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;

/**
 * 渲染 Markdown 为 HTML，并将 mermaid 代码块替换为 SVG。
 *
 * @param content Markdown 原文
 * @param theme 当前主题（影响 mermaid 配色）
 * @returns 完整 HTML 字符串（可直接注入到容器 innerHTML）
 */
export const renderMarkdown = async (content: string, theme: Theme = 'dark'): Promise<string> => {
  if (!content || !content.trim()) return '';

  // 1. 先用 markdown-it 渲染为 HTML
  const html = md.render(content);

  // 2. 收集所有 mermaid 代码块
  const matches: { raw: string; code: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = MERMAID_BLOCK_RE.exec(html)) !== null) {
    matches.push({ raw: m[0], code: decodeEntities(m[1]) });
  }
  MERMAID_BLOCK_RE.lastIndex = 0;

  // 3. 无 mermaid 块：直接返回
  if (matches.length === 0) return html;

  // 4. 并行渲染所有 mermaid 块
  const svgs = await Promise.all(matches.map((it) => renderMermaidBlock(it.code, theme)));

  // 5. 依次替换原 <pre><code> 块为 SVG
  let result = html;
  for (let i = 0; i < matches.length; i++) {
    result = result.replace(matches[i].raw, svgs[i]);
  }
  return result;
};

/**
 * 同步渲染（不含 mermaid）：用于编辑器内即时预览的快速兜底。
 * mermaid 块以占位形式返回，由异步流程后续替换。
 */
export const renderMarkdownSync = (content: string): string => {
  if (!content || !content.trim()) return '';
  return md.render(content);
};

export default md;
