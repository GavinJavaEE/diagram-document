interface UsageRingProps {
  /** 已使用量 */
  used: number;
  /** 总配额 */
  total: number;
  /** 环形半径（px） */
  size?: number;
  /** 描述文案，如 "生成 / 今日" */
  label?: string;
}

/**
 * 纯 SVG 环形配额进度条。
 *
 * 设计取舍：不引图表库（避免 bundle 膨胀），用原生 SVG path 绘制。
 * - 配额未用满：primary 色
 * - 用量 ≥ 80%：amber 警示
 * - 用量 ≥ 100%：error 色
 * - total = 0（无配额限制）：整环 primary 色 + ∞ 文案
 */
export const UsageRing = ({ used, total, size = 96, label }: UsageRingProps) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const unlimited = !total || total <= 0;
  const ratio = unlimited ? 1 : Math.min(used / total, 1);
  const dashOffset = c * (1 - ratio);

  const color = unlimited
    ? 'stroke-primary'
    : ratio >= 1
      ? 'stroke-error'
      : ratio >= 0.8
        ? 'stroke-amber-500'
        : 'stroke-primary';

  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* 背景环 */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-light-3 dark:stroke-dark-3"
          />
          {/* 进度环 */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={`${color} transition-[stroke-dashoffset] duration-500`}
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-dark-1 dark:text-white">
            {unlimited ? '∞' : used}
          </span>
          {!unlimited && (
            <span className="text-[10px] text-light-text-2 dark:text-dark-text-2">/ {total}</span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs text-light-text-2 dark:text-dark-text-2 text-center">{label}</span>
      )}
    </div>
  );
};
