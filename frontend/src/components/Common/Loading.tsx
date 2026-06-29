import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * 统一加载状态组件库
 *
 * 设计目标：
 * - 全站数据加载/操作处理场景共用一致的视觉样式
 * - 骨架屏（Skeleton）提升列表/卡片类页面的感知性能
 * - 超时机制：加载超过阈值时切换为友好提示 + 重试入口
 * - 仅使用 CSS 动画（animate-pulse/animate-spin），避免 JS 动画循环带来的性能开销
 *
 * 使用方式：
 *   const timedOut = useLoadingTimeout(isLoading);
 *   {isLoading ? <DocCardSkeleton /> : timedOut ? <LoadingError onRetry={...} /> : <Content />}
 */

// ==================== 基础 Spinner ====================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

/** 基础旋转图标，用于按钮内联 / 小区域加载 */
export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => (
  <Loader2 className={`${sizeMap[size]} animate-spin ${className}`} />
);

// ==================== 全屏加载 ====================

interface FullPageLoaderProps {
  /** 加载提示文案，不传则仅显示 spinner */
  message?: string;
}

/** 全屏加载层：用于页面级数据拉取（路由进入、文档加载等） */
export const FullPageLoader = ({ message }: FullPageLoaderProps) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-light-1 dark:bg-dark-1 gap-3">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    {message && (
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{message}</p>
    )}
  </div>
);

// ==================== 骨架屏 ====================

interface SkeletonProps {
  className?: string;
}

/** 通用骨架块：animate-pulse 提供呼吸效果，GPU 友好 */
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`bg-light-3 dark:bg-dark-3 rounded animate-pulse ${className}`} />
);

/** 文档卡片骨架：匹配 DocsPage 卡片布局，提升列表加载时的感知性能 */
export const DocCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="flex justify-end mt-4 gap-1">
      <Skeleton className="h-6 w-14 rounded" />
      <Skeleton className="h-6 w-6 rounded" />
    </div>
  </div>
);

// ==================== 加载失败 / 超时 ====================

interface LoadingErrorProps {
  /** 错误/超时提示文案 */
  message?: string;
  /** 重试回调；不传则不显示重试按钮 */
  onRetry?: () => void;
  /** 重试按钮文案 */
  retryLabel?: string;
  /** 是否正在重试中（按钮显示 spinner） */
  retrying?: boolean;
}

/** 加载失败/超时统一提示：图标 + 文案 + 重试按钮 */
export const LoadingError = ({
  message = '加载失败，请稍后重试',
  onRetry,
  retryLabel = '重试',
  retrying = false,
}: LoadingErrorProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {retrying ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
        {retryLabel}
      </button>
    )}
  </div>
);

// ==================== 超时检测 Hook ====================

/**
 * 加载超时检测：isLoading 为 true 超过 timeoutMs 后返回 timedOut=true。
 *
 * - isLoading 切回 false 时自动重置（下次加载重新计时）
 * - 默认 15s，覆盖大多数接口的正常响应周期；AI 类长请求不应使用此 hook
 *
 * @example
 * const timedOut = useLoadingTimeout(isLoading, 15000);
 * {isLoading && !timedOut && <DocCardSkeleton />}
 * {isLoading && timedOut && <LoadingError message="加载时间较长" onRetry={reload} />}
 */
export const useLoadingTimeout = (isLoading: boolean, timeoutMs = 15000): boolean => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    // 进入加载态：重置超时标记并启动计时器
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return timedOut;
};

// ==================== 平滑过渡容器 ====================

interface FadeInProps {
  children: ReactNode;
  /** 延迟显示（ms），用于骨架屏切换到内容时的轻微缓冲，避免闪烁 */
  delay?: number;
}

/** 内容加载完成后的淡入过渡，消除骨架屏到内容的突兀切换 */
export const FadeIn = ({ children, delay = 0 }: FadeInProps) => {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  );
};
