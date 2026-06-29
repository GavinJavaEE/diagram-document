import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, BarChart3, Sparkles, Calendar, Crown, Cloud, HardDrive } from 'lucide-react';
import type { UserProfileResp, AiUsageResp } from '@/types';
import { getAiUsage } from '@/services/api';
import { FullPageLoader, LoadingError, useLoadingTimeout } from '@/components/Common/Loading';
import { UsageRing } from './UsageRing';
import { TokenStatsChart } from './TokenStatsChart';
import { getAvatarStyle } from './avatar';
import { maskEmail } from '@/utils/format';
import { countCharts, countDocs } from '@/lib/localDb';

interface OverviewTabProps {
  profile: UserProfileResp;
  onNavigateToAiHistory?: () => void;
}

// AI 用量类型标签（已下线 "AI 修复" fix 类型，保留映射仅作历史数据兜底）
const AI_TYPE_LABEL: Record<string, string> = {
  generate: 'AI 生成',
  update: 'AI 对话',
  chat: 'AI 对话',
};

const formatDate = (s?: string) => (s ? new Date(s).toLocaleDateString('zh-CN') : '—');

/**
 * 从 IndexedDB 异步读取本地文档/图表数量。
 *
 * 替换原 localStorage 同步读取（迁移到 IDB 后 localStorage 旧 key 已清除）。
 * storage 事件不再适用（IDB 不触发 window.storage 事件），改用轮询保持统计实时性。
 */
const fetchLocalCounts = async (): Promise<{ docs: number; charts: number }> => {
  const [docs, charts] = await Promise.all([countDocs(), countCharts()]);
  return { docs, charts };
};

export const OverviewTab = ({ profile, onNavigateToAiHistory }: OverviewTabProps) => {
  const [usage, setUsage] = useState<AiUsageResp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 初始 0，IndexedDB 异步加载后填充
  const [localDocCount, setLocalDocCount] = useState(0);
  const [localChartCount, setLocalChartCount] = useState(0);

  // 首次挂载：从 IndexedDB 读取本地数量
  useEffect(() => {
    let active = true;
    void fetchLocalCounts().then((c) => {
      if (!active) return;
      setLocalDocCount(c.docs);
      setLocalChartCount(c.charts);
    });
    return () => {
      active = false;
    };
  }, []);

  // 轮询保持统计实时性：用户在其他 Tab 创建/删除本地数据时同步显示
  // IDB 不触发 storage 事件，2s 轮询是简单可靠的折中方案
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchLocalCounts().then((c) => {
        setLocalDocCount(c.docs);
        setLocalChartCount(c.charts);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const cloudDocCount = profile.totalDocuments ?? 0;
  const cloudChartCount = profile.totalCharts ?? 0;
  const totalAiCalls = profile.totalAiCalls ?? 0;

  // 卡片点击在新标签页打开列表页，避免离开个人中心
  const handleDocsClick = useCallback(() => {
    window.open('/docs', '_blank', 'noopener,noreferrer');
  }, []);

  const handleChartsClick = useCallback(() => {
    window.open('/charts', '_blank', 'noopener,noreferrer');
  }, []);

  const handleAiHistoryClick = useCallback(() => {
    if (onNavigateToAiHistory) {
      onNavigateToAiHistory();
    }
  }, [onNavigateToAiHistory]);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 用 AbortController 防止卸载后 setState：用户快速切 tab 时请求仍在飞行，
    // 返回后对已卸载组件 setState 虽被 React 18 静默，但可能写入陈旧数据。
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await getAiUsage();
      if (controller.signal.aborted) return;
      setUsage(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : '加载用量数据失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
    return () => {
      // 卸载时中止飞行中的请求，避免 setState 已卸载组件
      abortRef.current?.abort();
    };
  }, [loadUsage]);

  const timedOut = useLoadingTimeout(loading);

  if (loading) {
    return timedOut ? (
      <LoadingError message="加载时间较长，请检查网络后重试" onRetry={loadUsage} />
    ) : (
      <FullPageLoader message="正在加载用量数据…" />
    );
  }

  if (error) {
    return <LoadingError message={error} onRetry={loadUsage} />;
  }

  const avatar = getAvatarStyle(profile);

  return (
    <div className="space-y-6">
      {/* 用户身份卡片 */}
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.userId}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
              style={{ background: avatar.background }}
            >
              {avatar.initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-dark-1 dark:text-white truncate">UID: {profile.userId}</h2>
              {profile.nickname && (
                <span className="text-sm text-light-text-2 dark:text-dark-text-2">({profile.nickname})</span>
              )}
              {profile.planType && profile.planType !== 'free' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  {profile.planType}
                </span>
              )}
            </div>
            <p className="text-sm text-light-text-2 dark:text-dark-text-2 truncate">{maskEmail(profile.email)}</p>
            {profile.location && (
              <p className="text-xs text-light-text-2 dark:text-dark-text-2 mt-1">{profile.location}</p>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-light-text-2 dark:text-dark-text-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              注册于 {formatDate(profile.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ClickableStatCard
          icon={<FileText className="w-5 h-5" />}
          label="文档总数"
          color="text-blue-500"
          onClick={handleDocsClick}
        >
          <CountDisplay cloudCount={cloudDocCount} localCount={localDocCount} itemLabel="文档" />
        </ClickableStatCard>
        <ClickableStatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="图表总数"
          color="text-cyan-500"
          onClick={handleChartsClick}
        >
          <CountDisplay cloudCount={cloudChartCount} localCount={localChartCount} itemLabel="图表" />
        </ClickableStatCard>
        <ClickableStatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="AI 调用"
          color="text-emerald-500"
          onClick={handleAiHistoryClick}
        >
          <AnimatedNumber value={totalAiCalls} />
        </ClickableStatCard>
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="注册天数"
          value={profile.createdAt ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000) : 0}
          color="text-amber-500"
        />
        <StatCard
          icon={<Crown className="w-5 h-5" />}
          label="当前套餐"
          value={profile.planType || 'free'}
          color="text-purple-500"
          isText
        />
      </div>

      {/* AI 用量配额 */}
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-4">AI 用量配额</h3>
        {usage && usage.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {usage
              .filter((u) => u.type !== 'fix')
              .map((u) => (
              <UsageRing
                key={u.type}
                used={u.usedCount}
                total={u.limitCount}
                label={`${AI_TYPE_LABEL[u.type] || u.type} · ${u.period === 'day' ? '今日' : u.period === 'month' ? '本月' : u.period}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-light-text-2 dark:text-dark-text-2 text-center py-6">
            暂无用量数据
          </p>
        )}
      </div>

      {/* 每日 Token 消耗趋势折线图 */}
      <TokenStatsChart initialDays={30} />
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}

const StatCard = ({ icon, label, value, color, isText }: StatCardProps) => (
  <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl p-4">
    <div className={`flex items-center gap-2 mb-2 ${color}`}>
      {icon}
      <span className="text-xs text-light-text-2 dark:text-dark-text-2 font-medium">{label}</span>
    </div>
    <p className="text-xl font-bold text-dark-1 dark:text-white">
      {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
    </p>
  </div>
);

interface ClickableStatCardProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ClickableStatCard = ({ icon, label, color, onClick, children }: ClickableStatCardProps) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl p-4 text-left w-full cursor-pointer
      hover:shadow-md hover:border-primary/30 dark:hover:border-primary/50 hover:-translate-y-0.5
      active:scale-[0.98] active:shadow-sm
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 dark:focus:ring-offset-dark-1"
  >
    <div className={`flex items-center gap-2 mb-2 ${color}`}>
      {icon}
      <span className="text-xs text-light-text-2 dark:text-dark-text-2 font-medium">{label}</span>
    </div>
    {children}
  </button>
);

interface CountDisplayProps {
  cloudCount: number;
  localCount: number;
  itemLabel?: string;
}

const CountDisplay = ({ cloudCount, localCount, itemLabel = '项目' }: CountDisplayProps) => {
  const total = cloudCount + localCount;
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-xl font-bold text-dark-1 dark:text-white transition-all duration-300">
        {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1 text-xs">
        <span className="inline-flex items-center gap-0.5 text-sky-500 dark:text-sky-400" title={`云端${itemLabel}: ${cloudCount}`}>
          <Cloud className="w-3 h-3" />
          <span className="font-medium">{cloudCount}</span>
        </span>
        <span className="text-gray-400 dark:text-gray-500 font-normal">+</span>
        <span className="inline-flex items-center gap-0.5 text-orange-500 dark:text-orange-400" title={`本地${itemLabel}: ${localCount}`}>
          <HardDrive className="w-3 h-3" />
          <span className="font-medium">{localCount}</span>
        </span>
      </div>
    </div>
  );
};

interface AnimatedNumberProps {
  value: number;
}

const AnimatedNumber = ({ value }: AnimatedNumberProps) => (
  <p className="text-xl font-bold text-dark-1 dark:text-white transition-all duration-500 ease-out">
    {value.toLocaleString()}
  </p>
);
