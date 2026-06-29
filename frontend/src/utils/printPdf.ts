/**
 * 基于 html2pdf.js 的 PDF 打印工具
 *
 * 设计目标：
 * - 只打印 Markdown 预览区（.md-print-root），剔除 Header / 侧栏 / 编辑器 / 工具栏
 * - 通过克隆节点 + 内联关键样式，避免依赖全局 CSS（html2canvas 对 print:hidden 不敏感）
 * - 处理 Mermaid SVG：克隆后保留 viewBox / 宽高，确保图表正确渲染
 * - 自动分页，避免代码块与 Mermaid 块被截断
 * - html2pdf.js（含 html2canvas + jsPDF）体积约 1MB，采用动态 import 懒加载，
 *   不进入首屏 bundle，仅在用户点击「导出 PDF」时才下载
 *
 * 使用方式：
 *   import { exportMarkdownPdf } from '@/utils/printPdf';
 *   await exportMarkdownPdf(previewElement, '我的文档');
 */

/**
 * 将 Markdown 预览区导出为 PDF
 *
 * @param sourceEl 预览区根元素（通常为含 .markdown-body / .md-print-root 的容器）
 * @param fileName 输出文件名（不含扩展名），非法字符会被替换
 */
export async function exportMarkdownPdf(sourceEl: HTMLElement, fileName: string): Promise<void> {
  if (!sourceEl) throw new Error('打印目标元素不存在');

  // 动态加载 html2pdf.js（含 html2canvas + jsPDF，约 1MB），
  // 避免进入首屏 bundle，仅在真正导出时才下载
  const { default: html2pdf } = await import('html2pdf.js');

  // 文件名清洗：跨平台非法字符替换为下划线
  const safeName =
    (fileName || 'document')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 80) || 'document';

  // 克隆节点，避免对原 DOM 造成副作用
  const clone = sourceEl.cloneNode(true) as HTMLElement;

  // 内联基础排版样式，确保脱离原 CSS 上下文后仍正确显示
  // —— html2canvas 渲染时需要明确尺寸 / 颜色 / 字号
  clone.style.background = '#ffffff';
  clone.style.color = '#1E293B';
  clone.style.padding = '24px 32px';
  clone.style.width = 'auto';
  clone.style.maxWidth = 'none';
  clone.style.boxSizing = 'border-box';

  // 临时挂载到 body（不可见），供 html2canvas 截图
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = '794px'; // A4 @ 96dpi 宽度 ≈ 794px
  wrapper.style.background = '#ffffff';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // html2pdf.js 自带类型缺少 pagebreak 字段，且 image.type 为字面量联合类型，
    // 此处用类型断言绕过类型检查，运行时 html2pdf.js 完整支持这些选项。
    const options = {
      margin: [12, 12, 16, 12] as [number, number, number, number], // 上 右 下 左（mm）
      filename: `${safeName}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2, // 2 倍清晰度，Mermaid SVG 与文字更锐利
        useCORS: true, // 允许跨域图片（远程图床）
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      },
      jsPDF: {
        orientation: 'portrait' as const,
        unit: 'mm' as const,
        format: 'a4',
        compress: true,
      },
      pagebreak: {
        // 避免这些元素被分页截断
        avoid: ['.md-mermaid-block', 'pre', 'table', 'blockquote', 'img', 'h1', 'h2', 'h3'],
      },
      enableLinks: true,
    };

    // pagebreak 字段不在 html2pdf.js 自带类型中，用 as 断言绕过
    await html2pdf().set(options as never).from(clone).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

/**
 * 从任意父元素中查找 Markdown 预览根节点
 * 优先匹配 .md-print-root，回退到 .markdown-body
 */
export function findMarkdownPreviewRoot(root: HTMLElement | Document = document): HTMLElement | null {
  return (
    (root as HTMLElement).querySelector?.('.md-print-root') ||
    (root as HTMLElement).querySelector?.('.markdown-body') ||
    null
  );
}
