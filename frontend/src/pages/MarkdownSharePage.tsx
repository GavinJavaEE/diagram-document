import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarkdownPreview } from '@/components/Markdown';
import { SEO } from '@/components/SEO';
import { FullPageLoader, LoadingError, useLoadingTimeout } from '@/components/Common/Loading';
import { getDocumentByShareToken } from '@/services/api';
import type { DocumentResp } from '@/types';
import { ArrowLeft, Printer } from 'lucide-react';
import { exportMarkdownPdf, findMarkdownPreviewRoot } from '@/utils/printPdf';

/**
 * Markdown 文档分享页（只读）
 *
 * - 通过 shareToken 拉取公开文档，无登录态要求
 * - 全屏预览布局：顶部导航栏 + 预览区填满剩余空间，支持上下滚动
 * - 复用 MarkdownPreview（其内部 mermaid 已用 strict 模式防注入）
 * - 支持「打印 / 另存为 PDF」：使用 html2pdf 仅导出预览区，保证排版质量
 */
export const MarkdownSharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<DocumentResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // 打印 / 导出 PDF：仅打印预览区
  const handlePrintPdf = async () => {
    if (printing) return;
    const root = findMarkdownPreviewRoot();
    if (!root) return;
    setPrinting(true);
    try {
      await exportMarkdownPdf(root, doc?.title || 'document');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setPrinting(false);
    }
  };

  const loadDoc = useCallback(async () => {
    if (!token) {
      setError('分享链接无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await getDocumentByShareToken(token);
      setDoc(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档加载失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  const timedOut = useLoadingTimeout(loading);

  if (loading) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-1 p-4">
          <LoadingError message="加载时间较长，请检查网络后重试" onRetry={loadDoc} />
        </div>
      );
    }
    return <FullPageLoader message="正在加载分享文档…" />;
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-1 p-4">
        <div className="max-w-md w-full">
          <LoadingError message={error || '文档不存在或链接已失效'} />
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-light-2 dark:bg-dark-2 hover:bg-light-3 dark:hover:bg-dark-3 text-gray-600 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${doc.title} - DiagramAI`}
        description={doc.content?.slice(0, 160) || '分享的 Markdown 文档'}
        keywords="Markdown 文档, Mermaid 图表, 在线文档分享"
        url={`https://diagramai.com/docs/${doc.documentId}/share/${token}`}
      />
      <div className="h-screen flex flex-col bg-light-1 dark:bg-dark-1">
        {/* 顶部栏：仅展示标题与打印按钮，不显示编辑入口 */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/"
              className="p-1.5 rounded hover:bg-light-2 dark:hover:bg-dark-2 text-gray-500 dark:text-gray-400 flex-shrink-0"
              title="返回首页"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-sm font-medium text-dark-1 dark:text-white truncate">
              {doc.title}
            </h1>
            <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap flex-shrink-0">
              分享文档
            </span>
          </div>
          <button
            onClick={handlePrintPdf}
            disabled={printing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="导出为 PDF（仅预览内容）"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{printing ? '导出中…' : '导出 PDF'}</span>
          </button>
        </header>

        {/* 居中限宽预览：max-w-4xl 提升可读性，flex 链路保证滚动 */}
        <main className="flex-1 min-h-0 flex">
          <div className="w-full max-w-4xl mx-auto flex">
            <MarkdownPreview
              content={doc.content || ''}
              exportFileName={doc.title}
              hideToolbar
            />
          </div>
        </main>
      </div>
    </>
  );
};
