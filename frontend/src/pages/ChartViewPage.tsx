import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { FullPageLoader, LoadingError, useLoadingTimeout, Spinner } from '@/components/Common/Loading';
import { getDocument, setDocumentPublic } from '@/services/api';
import type { DocumentResp } from '@/types';
import { useAuthStore } from '@/contexts/AuthContext';
import { isLocalChartId } from '@/contexts/EditorContext';
import { readChartById } from '@/lib/localDb';
import { useToast } from '@/contexts/ToastContext';
import { useThemeStore } from '@/contexts/ThemeContext';
import { useActiveSettings } from '@/contexts/SettingsContext';
import { initMermaid, renderMermaid } from '@/services/mermaid';
import { ArrowLeft, Printer, PencilLine, Share2, Link2, Check, AlertCircle } from 'lucide-react';
import { buildLoginUrl } from '@/utils/loginRedirect';
import { exportMarkdownPdf } from '@/utils/printPdf';

/**
 * 图表预览页（只读 + 所有者可编辑/分享/导出 PDF）
 *
 * - 路由：/charts/:id/view
 * - 数据源：云端图表调 getDocument（登录态）；本地图表（local_chart_ 前缀）从 IndexedDB 读取
 * - 所有者判断：getDocument 成功即说明当前用户为所有者；本地图表天然属于当前用户。
 *   仅所有者可见编辑/分享按钮
 * - 布局与 MarkdownViewPage 保持一致：顶部栏 + 居中限宽预览区
 */
export const ChartViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { initialized, user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { theme } = useThemeStore();
  const { chartTheme } = useActiveSettings();

  const [doc, setDoc] = useState<DocumentResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  // 分享相关状态
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareToggling, setShareToggling] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  // 导出 PDF：将渲染好的 SVG 包裹到 A4 宽度容器后调用 html2pdf
  const handlePrintPdf = async () => {
    if (printing) return;
    const svgEl = document.querySelector<HTMLElement>('#chart-print-root > svg');
    if (!svgEl) {
      showError('未找到可导出的图表');
      return;
    }
    setPrinting(true);
    try {
      // 用临时容器包裹 SVG，复用 exportMarkdownPdf 的打印逻辑
      const tmp = document.createElement('div');
      tmp.id = 'chart-print-root';
      tmp.style.background = '#ffffff';
      tmp.style.color = '#1E293B';
      tmp.style.padding = '24px 32px';
      tmp.style.width = 'auto';
      tmp.style.display = 'flex';
      tmp.style.justifyContent = 'center';
      // 克隆 SVG 并设宽度，避免被原容器 transform 影响
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.removeAttribute('style');
      clone.style.maxWidth = '730px';
      clone.style.height = 'auto';
      tmp.appendChild(clone);

      await exportMarkdownPdf(tmp, doc?.title || 'chart');
      showSuccess('PDF 已开始下载');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setPrinting(false);
    }
  };

  // 图表加载：提取为可重试回调，超时/失败后用户可手动重试
  const loadDoc = useCallback(async () => {
    if (!id) {
      setError('图表 ID 无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setRenderError(null);
    setSvg('');
    try {
      // 本地图表：直接从 IndexedDB 读取
      if (isLocalChartId(id)) {
        const localChart = await readChartById(id);
        if (!localChart) throw new Error('本地图表不存在');
        setDoc({
          documentId: localChart.documentId,
          title: localChart.title,
          content: localChart.content,
          chartType: localChart.chartType,
          updatedAt: localChart.updatedAt,
          createdAt: localChart.createdAt,
        });
        setIsPublic(false);
        setShareToken(null);
      } else {
        // 云端图表：需登录态
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
      setError(err instanceof Error ? err.message : '图表加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (!initialized) return;
    void loadDoc();
  }, [initialized, loadDoc]);

  // 渲染 Mermaid SVG（doc 变化或主题变化时重新渲染）
  useEffect(() => {
    if (!doc?.content) return;
    let cancelled = false;
    const renderId = `chart-view-${doc.documentId}-${Date.now().toString(36)}`;
    initMermaid(theme, 'strict', chartTheme);
    renderMermaid(renderId, doc.content)
      .then((svgStr) => {
        if (!cancelled) {
          setSvg(svgStr);
          setRenderError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '图表渲染失败';
          setRenderError(msg);
          setSvg('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [doc, theme, chartTheme]);

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
    return <FullPageLoader message="正在加载图表…" />;
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-1 dark:bg-dark-1 p-4">
        <div className="max-w-md w-full">
          <LoadingError message={error || '图表不存在或无权访问'} />
          <div className="text-center">
            <Link
              to="/charts"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-light-2 dark:bg-dark-2 hover:bg-light-3 dark:hover:bg-dark-3 text-gray-600 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回图表列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 编辑入口：所有者可见（云端 getDocument 成功 / 本地图表天然属于当前用户）
  const canEdit = !!user || isLocalChartId(id);
  // 分享入口：仅云端图表的所有者可见（本地图表不支持分享）
  const canShare = !!user && !isLocalChartId(id);

  return (
    <>
      <SEO
        title={`${doc.title} - DiagramAI`}
        description={doc.content?.slice(0, 160) || 'Mermaid 图表'}
        url={`https://diagramai.com/charts/${doc.documentId}/view`}
      />
      <div className="h-screen flex flex-col bg-light-1 dark:bg-dark-1">
        {/* 顶部栏：返回 + 标题 + 编辑按钮（所有者）+ 分享（所有者）+ 打印 */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/charts"
              className="p-1.5 rounded hover:bg-light-2 dark:hover:bg-dark-2 text-gray-500 dark:text-gray-400 flex-shrink-0"
              title="返回图表列表"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-sm font-medium text-dark-1 dark:text-white truncate">
              {doc.title}
            </h1>
            <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap flex-shrink-0">
              {isLocalChartId(id) ? '本地图表' : '预览'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/editor?id=${doc.documentId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
                title="编辑图表"
              >
                <PencilLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">编辑</span>
              </button>
            )}
            {/* 分享按钮：仅云端图表所有者可见，UI 与 MarkdownViewPage 保持一致 */}
            {canShare && (
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShareMenuOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isPublic
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3'
                  }`}
                  title={isPublic ? '已开启分享' : '分享图表'}
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
                        开启后，任何人通过分享链接可只读访问本图表。
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handlePrintPdf}
              disabled={printing || !svg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出为 PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{printing ? '导出中…' : '导出 PDF'}</span>
            </button>
          </div>
        </header>

        {/* 居中限宽预览区：与 MarkdownViewPage 布局一致 */}
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="w-full max-w-5xl mx-auto p-6">
            {renderError ? (
              <div className="flex flex-col items-center gap-2 py-16 text-error">
                <AlertCircle className="w-10 h-10" />
                <p className="text-sm font-medium">图表渲染失败</p>
                <pre className="text-xs text-gray-500 dark:text-gray-400 max-w-full overflow-auto bg-light-2 dark:bg-dark-2 p-3 rounded">
                  {renderError}
                </pre>
              </div>
            ) : !svg ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <div
                id="chart-print-root"
                className="flex items-center justify-center bg-white dark:bg-dark-2 rounded-lg p-8 shadow-sm"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
};
