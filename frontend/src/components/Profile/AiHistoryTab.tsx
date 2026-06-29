import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, MessageSquare, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import type { AiRecordResp, PageResp } from '@/types';
import { getAiHistory } from '@/services/api';
import { useEditorStore } from '@/contexts/EditorContext';
import { useToast } from '@/contexts/ToastContext';
import { LoadingError, Spinner, useLoadingTimeout } from '@/components/Common/Loading';

const PAGE_SIZE = 15;

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  generate: { label: '生成', icon: <Sparkles className="w-4 h-4" />, color: 'text-emerald-500' },
  fix: { label: '修复', icon: <Wand2 className="w-4 h-4" />, color: 'text-amber-500' },
  update: { label: '对话', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500' },
  chat: { label: '对话', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500' },
};

const formatTime = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleDateString('zh-CN');
};

export const AiHistoryTab = () => {
  const navigate = useNavigate();
  const setCode = useEditorStore((s) => s.setCode);
  const { showSuccess } = useToast();
  const [records, setRecords] = useState<AiRecordResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reusingId, setReusingId] = useState<string | null>(null);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: PageResp<AiRecordResp> = await getAiHistory(1, PAGE_SIZE);
      setRecords(resp.items);
      setHasMore(resp.items.length >= PAGE_SIZE);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const resp: PageResp<AiRecordResp> = await getAiHistory(next, PAGE_SIZE);
      setRecords((prev) => [...prev, ...resp.items]);
      setHasMore(resp.items.length >= PAGE_SIZE);
      setPage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const timedOut = useLoadingTimeout(loading);

  const handleReuse = async (record: AiRecordResp) => {
    if (reusingId) return;
    setReusingId(record.recordId);
    try {
      // setCode 内部自动 detectChartType，跳转后 CodeEditor 读取 store 已有 code
      setCode(record.resultCode);
      showSuccess('已加载到编辑器');
      navigate('/editor');
    } finally {
      setReusingId(null);
    }
  };

  if (loading) {
    return timedOut ? (
      <LoadingError message="加载时间较长，请检查网络后重试" onRetry={loadFirst} />
    ) : (
      <div className="flex items-center justify-center py-16">
        <Spinner className="text-primary" />
      </div>
    );
  }

  if (error) {
    return <LoadingError message={error} onRetry={loadFirst} />;
  }

  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-12 text-center">
        <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-light-text-2 dark:text-dark-text-2">暂无 AI 使用记录</p>
        <button
          onClick={() => navigate('/editor')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
        >
          去使用 AI
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => {
        const meta = TYPE_META[r.type] || TYPE_META.update;
        const success = r.isSuccess !== 0;
        return (
          <div
            key={r.recordId}
            className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 类型标识 */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-light-2 dark:bg-dark-3 flex items-center justify-center ${meta.color}`}>
                {meta.icon}
              </div>

              {/* 内容区 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-dark-1 dark:text-white">{meta.label}</span>
                  <span className="text-xs text-light-text-2 dark:text-dark-text-2">{r.chartType}</span>
                  {success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-error" />
                  )}
                  <span className="text-xs text-light-text-2 dark:text-dark-text-2 ml-auto">
                    {formatTime(r.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                  {r.prompt || '（无提示词）'}
                </p>
                {/* Token 与耗时 */}
                <div className="flex items-center gap-3 text-xs text-light-text-2 dark:text-dark-text-2">
                  {r.totalTokens != null && <span>{r.totalTokens} tokens</span>}
                  {r.processingTimeMs != null && <span>{(r.processingTimeMs / 1000).toFixed(1)}s</span>}
                  {r.provider && <span>{r.provider}</span>}
                </div>
              </div>

              {/* 复用按钮 */}
              <button
                type="button"
                onClick={() => handleReuse(r)}
                disabled={!success || !!reusingId}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={success ? '加载到编辑器继续编辑' : '失败的记录不可复用'}
              >
                {reusingId === r.recordId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                复用
              </button>
            </div>
          </div>
        );
      })}

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-light-2 dark:bg-dark-3 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingMore ? <Spinner size="sm" /> : null}
            加载更多
          </button>
        </div>
      )}
    </div>
  );
};
