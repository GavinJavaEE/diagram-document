import { useCallback, useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { AiTokenStatResp } from '@/types';
import { getAiTokenStats } from '@/services/api';
import { FullPageLoader, LoadingError, useLoadingTimeout } from '@/components/Common/Loading';

interface TokenStatsChartProps {
  /** 初始统计天数 */
  initialDays?: 7 | 30 | 90;
}

const DAYS_OPTIONS: Array<{ value: 7 | 30 | 90; label: string }> = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
];

// SVG 画布尺寸（viewBox），width=100% 自适应容器
const VIEW_W = 640;
const VIEW_H = 240;
const PAD_L = 48; // y 轴标签留白
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32; // x 轴标签留白

// 堆叠层颜色：输入（prompt）绿色、输出（completion）红色
// 绿色 = 用户输入的"原料"，红色 = AI 输出的"消耗"，符合直觉的语义配色
const COLOR_PROMPT = 'rgb(34,197,94)'; // green-500
const COLOR_COMPLETION = 'rgb(239,68,68)'; // red-500

/**
 * 每日 Token 消耗趋势堆叠面积图（个人中心）。
 *
 * 纯 SVG 手绘，不引入图表库依赖：
 * - 堆叠面积图：底层输入 token（prompt），上层输出 token（completion），顶部线即总量
 * - hover 精准对齐：用 getScreenCTM().inverse() 做屏幕坐标→viewBox 坐标的精确映射，
 *   彻底解决 preserveAspectRatio="meet" 留白导致的 hover 偏移问题
 * - 宽幅 hit 区域：每个数据点占据等宽透明条带，hover 容易命中无需精确瞄准
 * - tooltip 智能定位：左右边界自动翻转，避免溢出容器
 * - 支持 7/30/90 天切换，内置 AbortController 卸载竞态保护
 */
export const TokenStatsChart = ({ initialDays = 30 }: TokenStatsChartProps) => {
  const [days, setDays] = useState<7 | 30 | 90>(initialDays);
  const [data, setData] = useState<AiTokenStatResp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    try {
      const resp = await getAiTokenStats(d);
      if (controller.signal.aborted) return;
      setData(resp);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : '加载 Token 统计失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
    return () => abortRef.current?.abort();
  }, [days, load]);

  const timedOut = useLoadingTimeout(loading);

  const switchDays = (d: 7 | 30 | 90) => {
    if (d === days) return;
    setHoverIndex(null);
    setDays(d);
  };

  const stats = computeStats(data);
  const chart = buildChartPath(data, stats.maxTotal);

  /**
   * 精准 hover：用 SVG 标准的 getScreenCTM().inverse() 将屏幕坐标转换为 viewBox 坐标。
   * 无论 preserveAspectRatio 如何缩放/留白，映射都精确无误——这是修复 hover 偏移的关键。
   * 再用「最近数据点」策略定位索引，配合等宽 hit 条带让命中更宽松。
   */
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    // 屏幕坐标 → viewBox 坐标（精确映射，不受 meet 留白影响）
    const svgX = (e.clientX - ctm.e) / ctm.a;
    const plotW = VIEW_W - PAD_L - PAD_R;
    const relX = svgX - PAD_L;
    if (relX < -plotW / data.length / 2 || relX > plotW + plotW / data.length / 2) {
      setHoverIndex(null);
      return;
    }
    // 等宽条带命中：每个数据点占据 plotW/data.length 宽度的 hit 区
    const idx = Math.round((relX / plotW) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base font-semibold text-dark-1 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          每日 Token 消耗趋势
        </h3>
        <div className="flex items-center gap-1 bg-light-2 dark:bg-dark-3 rounded-lg p-0.5">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => switchDays(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                days === opt.value
                  ? 'bg-white dark:bg-dark-1 text-primary shadow-sm'
                  : 'text-light-text-2 dark:text-dark-text-2 hover:text-dark-1 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        timedOut ? (
          <LoadingError message="加载时间较长，请重试" onRetry={() => load(days)} />
        ) : (
          <FullPageLoader message="正在加载 Token 统计…" />
        )
      ) : error ? (
        <LoadingError message={error} onRetry={() => load(days)} />
      ) : !data || data.length === 0 || stats.totalTokens === 0 ? (
        <p className="text-sm text-light-text-2 dark:text-dark-text-2 text-center py-12">
          暂无 Token 消耗数据
        </p>
      ) : (
        <>
          {/* 汇总数据 + 图例 */}
          <div className="flex items-center gap-4 mb-3 flex-wrap text-xs text-light-text-2 dark:text-dark-text-2">
            <span>
              区间合计 <strong className="text-dark-1 dark:text-white">{stats.totalTokens.toLocaleString()}</strong> tokens
            </span>
            <span>
              日均 <strong className="text-dark-1 dark:text-white">{stats.avgTokens.toLocaleString()}</strong> tokens
            </span>
            <span>
              调用 <strong className="text-dark-1 dark:text-white">{stats.totalCalls.toLocaleString()}</strong> 次
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_PROMPT }} />
              输入 {stats.totalPrompt.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_COMPLETION }} />
              输出 {stats.totalCompletion.toLocaleString()}
            </span>
          </div>

          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              width="100%"
              height={VIEW_H}
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
              className="block"
            >
              <defs>
                <linearGradient id="tokenPromptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_PROMPT} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={COLOR_PROMPT} stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="tokenCompletionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_COMPLETION} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={COLOR_COMPLETION} stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* y 轴网格线 + 刻度 */}
              {chart.yTicks.map((t, i) => (
                <g key={`y-${i}`}>
                  <line
                    x1={PAD_L}
                    y1={t.y}
                    x2={VIEW_W - PAD_R}
                    y2={t.y}
                    stroke="currentColor"
                    className="text-light-3 dark:text-dark-3"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD_L - 6}
                    y={t.y + 3}
                    textAnchor="end"
                    className="fill-light-text-2 dark:fill-dark-text-2"
                    fontSize="10"
                  >
                    {formatTick(t.value)}
                  </text>
                </g>
              ))}

              {/* 堆叠面积：底层输入 token（prompt） */}
              {chart.promptAreaPath && <path d={chart.promptAreaPath} fill="url(#tokenPromptGrad)" />}
              {/* 堆叠面积：上层输出 token（completion），堆叠在 prompt 之上 */}
              {chart.completionAreaPath && <path d={chart.completionAreaPath} fill="url(#tokenCompletionGrad)" />}

              {/* 堆叠分界线（prompt 顶部）+ 总量线（completion 顶部） */}
              <polyline
                points={chart.promptLinePoints}
                fill="none"
                stroke={COLOR_PROMPT}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.8"
              />
              <polyline
                points={chart.completionLinePoints}
                fill="none"
                stroke={COLOR_COMPLETION}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* x 轴日期刻度（稀疏显示，避免重叠） */}
              {chart.xTicks.map((t, i) => (
                <text
                  key={`x-${i}`}
                  x={t.x}
                  y={VIEW_H - PAD_B + 14}
                  textAnchor="middle"
                  className="fill-light-text-2 dark:fill-dark-text-2"
                  fontSize="10"
                >
                  {t.label}
                </text>
              ))}

              {/* hover 指示线 + 数据点高亮 */}
              {hoverIndex !== null && chart.promptPoints[hoverIndex] && (
                <g>
                  <line
                    x1={chart.promptPoints[hoverIndex].x}
                    y1={PAD_T}
                    x2={chart.promptPoints[hoverIndex].x}
                    y2={VIEW_H - PAD_B}
                    stroke={COLOR_PROMPT}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.5"
                  />
                  {/* 输入 token 数据点 */}
                  <circle
                    cx={chart.promptPoints[hoverIndex].x}
                    cy={chart.promptPoints[hoverIndex].y}
                    r="3.5"
                    fill={COLOR_PROMPT}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  {/* 输出 token 数据点（堆叠顶） */}
                  <circle
                    cx={chart.completionPoints[hoverIndex].x}
                    cy={chart.completionPoints[hoverIndex].y}
                    r="3.5"
                    fill={COLOR_COMPLETION}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* 透明 hit 区域：覆盖整个绘图区，确保 hover 命中无死角 */}
              <rect
                x={PAD_L}
                y={PAD_T}
                width={VIEW_W - PAD_L - PAD_R}
                height={VIEW_H - PAD_T - PAD_B}
                fill="transparent"
              />
            </svg>

            {/* tooltip（HTML 叠加，避免 SVG 文字变形），智能定位避免溢出 */}
            {hoverIndex !== null && data[hoverIndex] && chart.promptPoints[hoverIndex] && (
              <div
                className="absolute pointer-events-none bg-dark-1 dark:bg-dark-3 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-10"
                style={{
                  left: `${(chart.promptPoints[hoverIndex].x / VIEW_W) * 100}%`,
                  top: 0,
                  // 右半部分向左展开，避免溢出容器右边界
                  transform: `translateX(${chart.promptPoints[hoverIndex].x > VIEW_W / 2 ? '-105%' : '5%'})`,
                }}
              >
                <div className="font-medium mb-1">{formatDate(data[hoverIndex].date)}</div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_PROMPT }} />
                  <span className="text-gray-300">输入</span>
                  <span className="ml-auto font-medium">{data[hoverIndex].promptTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_COMPLETION }} />
                  <span className="text-gray-300">输出</span>
                  <span className="ml-auto font-medium">{data[hoverIndex].completionTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                  <span className="text-gray-300">合计</span>
                  <span className="ml-auto font-semibold">{data[hoverIndex].totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span>调用</span>
                  <span className="ml-auto">{data[hoverIndex].callCount} 次</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ==================== 计算辅助 ====================

interface Stats {
  totalTokens: number;
  avgTokens: number;
  totalCalls: number;
  totalPrompt: number;
  totalCompletion: number;
  /** 堆叠顶最大值（单日 totalTokens 最大），用于 y 轴定标 */
  maxTotal: number;
}

function computeStats(data: AiTokenStatResp[] | null): Stats {
  if (!data || data.length === 0) {
    return { totalTokens: 0, avgTokens: 0, totalCalls: 0, totalPrompt: 0, totalCompletion: 0, maxTotal: 0 };
  }
  let totalTokens = 0;
  let totalCalls = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;
  let maxTotal = 0;
  for (const d of data) {
    totalTokens += d.totalTokens;
    totalCalls += d.callCount;
    totalPrompt += d.promptTokens;
    totalCompletion += d.completionTokens;
    if (d.totalTokens > maxTotal) maxTotal = d.totalTokens;
  }
  return {
    totalTokens,
    avgTokens: Math.round(totalTokens / data.length),
    totalCalls,
    totalPrompt,
    totalCompletion,
    maxTotal,
  };
}

interface ChartPath {
  promptLinePoints: string;
  completionLinePoints: string;
  promptAreaPath: string | null;
  completionAreaPath: string | null;
  promptPoints: Array<{ x: number; y: number }>;
  completionPoints: Array<{ x: number; y: number }>;
  yTicks: Array<{ y: number; value: number }>;
  xTicks: Array<{ x: number; label: string }>;
}

function buildChartPath(data: AiTokenStatResp[] | null, maxTotal: number): ChartPath {
  const empty: ChartPath = {
    promptLinePoints: '',
    completionLinePoints: '',
    promptAreaPath: null,
    completionAreaPath: null,
    promptPoints: [],
    completionPoints: [],
    yTicks: [],
    xTicks: [],
  };
  if (!data || data.length === 0) return empty;

  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const baseline = VIEW_H - PAD_B;

  // y 轴上限用堆叠顶（单日 totalTokens 最大值）定标
  const yMax = niceMax(maxTotal);
  const yTickCount = 4;

  // 输入 token 数据点（底层）：y = baseline - (prompt / yMax) * plotH
  const promptPoints = data.map((d, i) => {
    const x = PAD_L + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const ratio = yMax === 0 ? 0 : d.promptTokens / yMax;
    const y = baseline - ratio * plotH;
    return { x, y };
  });

  // 输出 token 数据点（堆叠在 prompt 之上）：y = promptY - (completion / yMax) * plotH
  const completionPoints = data.map((d, i) => {
    const x = promptPoints[i].x;
    const ratio = yMax === 0 ? 0 : d.completionTokens / yMax;
    const y = promptPoints[i].y - ratio * plotH;
    return { x, y };
  });

  const promptLinePoints = promptPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const completionLinePoints = completionPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // 底层面积：baseline → promptPoints → baseline
  const promptAreaPath =
    promptPoints.length > 0
      ? `M ${promptPoints[0].x} ${baseline} L ${promptPoints
          .map((p) => `${p.x} ${p.y}`)
          .join(' L ')} L ${promptPoints[promptPoints.length - 1].x} ${baseline} Z`
      : null;

  // 上层面积：promptPoints → completionPoints → 回到 promptPoints（堆叠）
  const completionAreaPath =
    completionPoints.length > 0
      ? `M ${promptPoints[0].x} ${promptPoints[0].y} L ${promptPoints
          .map((p) => `${p.x} ${p.y}`)
          .join(' L ')} L ${completionPoints
          .slice()
          .reverse()
          .map((p) => `${p.x} ${p.y}`)
          .join(' L ')} Z`
      : null;

  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const value = (yMax / yTickCount) * i;
    const y = baseline - (i / yTickCount) * plotH;
    return { y, value };
  });

  // x 轴刻度：稀疏显示 5-6 个，避免密集日期重叠
  const tickCount = Math.min(6, data.length);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
    const x = promptPoints[idx].x;
    return { x, label: formatAxisDate(data[idx].date) };
  });

  return {
    promptLinePoints,
    completionLinePoints,
    promptAreaPath,
    completionAreaPath,
    promptPoints,
    completionPoints,
    yTicks,
    xTicks,
  };
}

/** 将 maxTotal 向上取整到 1/2/5×10^n 系列的合理刻度 */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const normalized = value / base;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function formatTick(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(Math.round(value));
}

function formatAxisDate(s: string): string {
  // yyyy-MM-dd → MM/dd
  const parts = s.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : s;
}

function formatDate(s: string): string {
  // yyyy-MM-dd → M月d日
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}
