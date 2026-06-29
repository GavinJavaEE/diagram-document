import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MarkdownPreview } from '@/components/Markdown';
import { SEO } from '@/components/SEO';
import { FullPageLoader, LoadingError, useLoadingTimeout, Spinner } from '@/components/Common/Loading';
import { getDocument, setDocumentPublic } from '@/services/api';
import type { DocumentResp } from '@/types';
import { useAuthStore } from '@/contexts/AuthContext';
import { isLocalDocId } from '@/hooks/useActiveDocStore';
import { readLocalDocById } from '@/contexts/LocalDocContext';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Printer, PencilLine, Share2, Link2, Check } from 'lucide-react';
import { buildLoginUrl } from '@/utils/loginRedirect';
import { exportMarkdownPdf, findMarkdownPreviewRoot } from '@/utils/printPdf';

/**
 * Markdown 文档预览页（只读 + 所有者可编辑/分享）
 *
 * - 路由：/docs/:id/view
 * - 数据源：云端文档调 getDocument（登录态，后端仅返回当前用户文档）；
 *          本地文档（local_ 前缀）从 localStore 读取
 * - 所有者判断：getDocument 成功即说明当前用户为所有者（后端只返回自己的文档）；
 *              本地文档天然属于当前用户。仅所有者可见编辑/分享按钮
 * - 布局复用 MarkdownSharePage 风格：顶部栏 + 居中限宽预览区
 */
export const MarkdownViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { initialized, user } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [doc, setDoc] = useState<DocumentResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分享相关状态
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareToggling, setShareToggling] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  // 打印 / 导出 PDF：仅打印预览区，使用 html2pdf 保证排版质量
  const handlePrintPdf = async () => {
    if (printing) return;
    const root = findMarkdownPreviewRoot();
    if (!root) {
      showError('未找到可打印的预览内容');
      return;
    }
    setPrinting(true);
    try {
      await exportMarkdownPdf(root, doc?.title || 'document');
      showSuccess('PDF 已开始下载');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setPrinting(false);
    }
  };

  // 文档加载：提取为可重试回调，超时/失败后用户可手动重试
  const loadDoc = useCallback(async () => {
    if (!id) {
      setError('文档 ID 无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 本地文档：直接从 IndexedDB 读取，不经过 store，避免闭包陷阱和编辑态污染
      if (isLocalDocId(id)) {
        const localDoc = await readLocalDocById(id);
        if (!localDoc) throw new Error('本地文档不存在');
        setDoc({
          documentId: localDoc.documentId,
          title: localDoc.title,
          content: localDoc.content,
          chartType: 'markdown',
          updatedAt: localDoc.updatedAt,
          createdAt: localDoc.createdAt,
        });
        setIsPublic(false);
        setShareToken(null);
      } else {
        // 云端文档：需登录态，未登录跳转登录，带 redirect 以便登录后回到当前文档
        if (!user) {
          navigate(buildLoginUrl(location.pathname + location.search), { replace: true });
          return;
        }
        const resp = await getDocument(id);
        setDoc(resp);
        setIsPublic(!!resp.isPublic);
        setShareToken(resp.shareToken || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (!initialized) return;
    void loadDoc();
  }, [initialized, loadDoc]);

  const timedOut = useLoadingTimeout(loading);

  // 分享菜单：点击外部关闭
  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareMenuOpen]);

  // 切换公开/私有
  const handleToggleShare = async () => {
    if (shareToggling || !doc) return;
    setShareToggling(true);
    try {
      const updated = await setDocumentPublic(doc.documentId, !isPublic);
      setIsPublic(!!updated.isPublic);
      setShareToken(updated.shareToken || null);
      showSuccess(updated.isPublic ? '已开启分享' : '已关闭分享');
    } catch (err) {
      showError(err instanceof Error ? err.message : '分享设置失败');
    } finally {
      setShareToggling(false);
    }
  };

  // 复制分享链接
  const handleCopyShareLink = async () => {
    if (!shareToken || !doc) return;
    const link = `${window.location.origin}/docs/${doc.documentId}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      showSuccess('分享链接已复制');
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      showError('复制失败，请手动复制链接');
    }
  };

  if (loading) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-light-1 dark:bg-dark-1 p-4">
          <LoadingError
            message="加载时间较长，请检查网络后重试"
            onRetry={loadDoc}
          />
        </div>
      );
    }
    return <FullPageLoader message="正在加载文档…" />;
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-1 dark:bg-dark-1 p-4">
        <div className="max-w-md w-full">
          <LoadingError message={error || '文档不存在或无权访问'} />
          <div className="text-center">
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-light-2 dark:bg-dark-2 hover:bg-light-3 dark:hover:bg-dark-3 text-gray-600 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回文档列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 编辑入口：所有者可见（云端 getDocument 成功 / 本地文档天然属于当前用户）
  const canEdit = !!user || isLocalDocId(id);
  // 分享入口：仅云端文档的所有者可见（本地文档不支持分享）
  const canShare = !!user && !isLocalDocId(id);

  return (
    <>
      <SEO
        title={`${doc.title} - DiagramAI`}
        description={doc.content?.slice(0, 160) || 'Markdown 文档'}
        url={`https://diagramai.com/docs/${doc.documentId}/view`}
      />
      <div className="h-screen flex flex-col bg-light-1 dark:bg-dark-1">
        {/* 顶部栏：返回 + 标题 + 编辑按钮（所有者）+ 分享（所有者）+ 打印 */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/docs"
              className="p-1.5 rounded hover:bg-light-2 dark:hover:bg-dark-2 text-gray-500 dark:text-gray-400 flex-shrink-0"
              title="返回文档列表"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-sm font-medium text-dark-1 dark:text-white truncate">
              {doc.title}
            </h1>
            <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap flex-shrink-0">
              {isLocalDocId(id) ? '本地文档' : '预览'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/docs/${doc.documentId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
                title="编辑文档"
              >
                <PencilLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">编辑</span>
              </button>
            )}
            {/* 分享按钮：仅云端文档所有者可见，UI 与编辑页保持一致 */}
            {canShare && (
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShareMenuOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isPublic
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
                  }`}
                  title={isPublic ? '已开启分享' : '分享文档'}
                >
                  {shareToggling ? (
                    <Spinner size="sm" className="w-3.5 h-3.5" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isPublic ? '已分享' : '分享'}</span>
                </button>
                {shareMenuOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-lg shadow-lg z-20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                        公开访问
                      </span>
                      <button
                        onClick={handleToggleShare}
                        disabled={shareToggling}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          isPublic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={isPublic ? '点击关闭分享' : '点击开启分享'}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            isPublic ? 'translate-x-4' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {isPublic && shareToken ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400">分享链接</div>
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            value={`${window.location.origin}/docs/${doc.documentId}/share/${shareToken}`}
                            className="flex-1 min-w-0 px-2 py-1 text-xs bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded text-gray-600 dark:text-gray-300"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={handleCopyShareLink}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark transition-colors whitespace-nowrap"
                            title="复制链接"
                          >
                            {linkCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        开启后，任何人通过分享链接可只读访问本文档。
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handlePrintPdf}
              disabled={printing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出为 PDF（仅预览内容）"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{printing ? '导出中…' : '导出 PDF'}</span>
            </button>
          </div>
        </header>

        {/* 居中限宽预览：max-w-4xl 提升可读性 */}
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
