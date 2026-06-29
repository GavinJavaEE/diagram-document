import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Code2, Wand2, Sparkles, AlertTriangle, Check, Clock, ChevronRight, ChevronUp, Eye, Zap, FileCode, Layers, Minimize2, Send, X } from 'lucide-react';
import { useThemeStore } from '@/contexts/ThemeContext';

/**
 * ============================================================
 *  AI 交互布局方案 —— 线框预览页
 *  方案 A：居中模态窗 (Spotlight / Notion AI 风格)
 *  方案 B：左侧嵌入三栏 (IDE Explorer 风格)
 *  方案 C：底部抽屉 (Copilot / Cursor 风格)
 * ============================================================
 */

/* ========= 通用小型组件 ========= */

const SectionTitle = ({ num, name, subtitle }: { num: string; name: string; subtitle: string }) => (
  <div className="mb-6">
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-bold text-primary">方案 {num}</span>
      <h2 className="text-2xl font-bold text-dark-1 dark:text-white">{name}</h2>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
  </div>
);

const Badge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }) => {
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/30',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    danger: 'bg-error/10 text-error border-error/30',
    neutral: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${toneMap[tone]}`}>
      {children}
    </span>
  );
};

/* ========== 方案 A：居中模态窗 ========== */

const SchemeAModal = () => {
  const [stage, setStage] = useState<'idle' | 'generating' | 'done'>('idle');
  const [fixStage, setFixStage] = useState<'idle' | 'detect' | 'done'>('idle');
  const [activeTab, setActiveTab] = useState<'generate' | 'fix'>('generate');
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="relative bg-white dark:bg-dark-2 rounded-2xl border border-light-3 dark:border-dark-3 overflow-hidden shadow-2xl">
      {/* 模拟编辑器背景（灰掉） */}
      <div className="relative h-[560px] bg-light-1 dark:bg-dark-1 opacity-40">
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/80 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-dark-1 dark:text-white">DiagramAI</span>
          </div>
          <span className="text-xs text-gray-400">[ 编辑器背景 - 已灰掉 ]</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-light-2 dark:bg-dark-3" />
            <div className="w-16 h-6 rounded bg-light-2 dark:bg-dark-3 text-xs flex items-center justify-center text-gray-400">登录</div>
          </div>
        </div>
        <div className="flex h-[calc(100%-48px)] gap-2 p-2">
          <div className="flex-1 rounded bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3" />
          <div className="flex-1 rounded bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3" />
        </div>
      </div>

      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      {/* 居中模态卡片 */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-[760px] bg-white dark:bg-dark-2 rounded-2xl shadow-2xl border border-light-3 dark:border-dark-3 overflow-hidden animate-fade-in">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-light-3 dark:border-dark-3 bg-gradient-to-r from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
                {activeTab === 'generate' ? <Wand2 className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark-1 dark:text-white">
                  {activeTab === 'generate' ? 'AI 生成 Mermaid 图表' : 'AI 语法修复'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeTab === 'generate' ? '用自然语言描述，AI 帮你生成专业图表' : '自动检测语法错误并生成修复建议'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'generate' ? 'fix' : 'generate')}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-light-2 dark:hover:bg-dark-3"
              >
                切换到 {activeTab === 'generate' ? '修复' : '生成'}
              </button>
              <div className="w-8 h-8 rounded-lg hover:bg-light-2 dark:hover:bg-dark-3 flex items-center justify-center text-gray-400 cursor-not-allowed">
                <X className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 内容区 */}
          <div className="p-6 space-y-5 max-h-[420px] overflow-y-auto">
            {activeTab === 'generate' ? (
              <>
                {/* 图表类型 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">选择图表类型</label>
                  <div className="flex flex-wrap gap-2">
                    {['流程图', '时序图', '甘特图', 'ER 图', '类图', '状态图'].map((t, i) => (
                      <button
                        key={t}
                        onClick={() => {}}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          i === 0
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                            : 'bg-white dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 快捷提示 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">快捷提示</label>
                  <div className="flex flex-wrap gap-2">
                    {['订单流程', '审批流', 'API 调用', '微服务交互', '项目排期', 'MVC 架构'].map((p) => (
                      <button
                        key={p}
                        onClick={() => {}}
                        className="px-2.5 py-1 rounded-full text-xs bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors border border-light-3 dark:border-dark-3"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 输入框 */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">描述你的需求</label>
                  <textarea
                    placeholder="例如：电商平台订单购买流程，从购物车到结算到支付到发货到完成..."
                    className="w-full min-h-[100px] p-3 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 text-sm text-dark-1 dark:text-white placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none theme-transition"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-400">按 Enter 发送 · Shift+Enter 换行</div>
                  <button
                    onClick={() => {
                      setStage('generating');
                      setTimeout(() => {
                        setStage('done');
                        setShowResult(true);
                      }, 1200);
                    }}
                    disabled={stage !== 'idle'}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {stage === 'generating' ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        AI 正在思考...
                      </>
                    ) : stage === 'done' ? (
                      <>
                        <Check className="w-4 h-4" />
                        已生成！
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        生成图表
                      </>
                    )}
                  </button>
                </div>

                {/* 结果预览区 */}
                {showResult && (
                  <div className="mt-4 border-t border-light-3 dark:border-dark-3 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-dark-1 dark:text-white">生成结果</span>
                      <Badge tone="success"><Check className="w-3 h-3" /> 已就绪</Badge>
                    </div>
                    <div className="p-3 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 text-xs font-mono text-gray-700 dark:text-gray-300 leading-relaxed">
                      <div>flowchart TD</div>
                      <div>&nbsp;&nbsp;A[购物车] --&gt; B[结算]</div>
                      <div>&nbsp;&nbsp;B --&gt; C[支付]</div>
                      <div>&nbsp;&nbsp;C --&gt; D[发货]</div>
                      <div>&nbsp;&nbsp;D --&gt; E[完成]</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
                        应用到编辑器
                      </button>
                      <button
                        onClick={() => {
                          setShowResult(false);
                          setStage('idle');
                        }}
                        className="px-4 py-2 rounded-xl bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-light-3 dark:hover:bg-dark-2 transition-colors"
                      >
                        再试一次
                      </button>
                    </div>
                  </div>
                )}

                {/* 历史记录 */}
                <div className="border-t border-light-3 dark:border-dark-3 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">最近生成</span>
                    <button className="text-xs text-primary hover:underline">查看全部</button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      '电商平台订单购买流程',
                      '员工请假审批流程',
                      '用户登录接口时序',
                    ].map((text, idx) => (
                      <button
                        key={idx}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-light-2 dark:hover:bg-dark-3 text-left text-sm text-gray-600 dark:text-gray-300 group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{text}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* AI 修复内容 */}
                <div className="p-3 rounded-xl bg-error/5 dark:bg-error/10 border border-error/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-error" />
                    <span className="text-sm font-semibold text-error">检测到 3 处语法问题</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    AI 已分析当前编辑器中的代码，发现可能存在的语法错误。点击下方按钮查看修复建议。
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { line: 3, msg: '节点定义缺少括号或标签', severity: 'error' as const },
                    { line: 7, msg: '箭头连接方向可能不正确', severity: 'warning' as const },
                    { line: 12, msg: '缺少必需的图表结束标记', severity: 'error' as const },
                  ].map((err, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3">
                      <Badge tone={err.severity === 'error' ? 'danger' : 'warning'}>
                        第 {err.line} 行
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{err.msg}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-400">将生成修复建议并展示 Diff 对比</div>
                  <button
                    onClick={() => {
                      setFixStage('detect');
                      setTimeout(() => setFixStage('done'), 1200);
                    }}
                    disabled={fixStage !== 'idle'}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {fixStage === 'detect' ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        正在修复...
                      </>
                    ) : fixStage === 'done' ? (
                      <>
                        <Check className="w-4 h-4" />
                        已生成修复！
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        一键修复
                      </>
                    )}
                  </button>
                </div>

                {fixStage === 'done' && (
                  <div className="border-t border-light-3 dark:border-dark-3 pt-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-semibold text-error mb-1 block">修复前</span>
                        <div className="p-3 rounded-xl bg-light-1 dark:bg-dark-1 border border-error/30 text-xs font-mono text-gray-500 leading-relaxed">
                          <div className="line-through">A --&gt; B</div>
                          <div className="line-through">B --&gt; C</div>
                          <div className="line-through text-error">C --&gt; D;</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 block">修复后</span>
                        <div className="p-3 rounded-xl bg-light-1 dark:bg-dark-1 border border-emerald-500/30 text-xs font-mono text-emerald-700 dark:text-emerald-300 leading-relaxed">
                          <div>A[起点] --&gt; B[步骤1]</div>
                          <div>B --&gt; C[步骤2]</div>
                          <div>C --&gt; D[结束]</div>
                        </div>
                      </div>
                    </div>
                    <button className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                      应用修复结果
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部权限提示 */}
          <div className="px-6 py-3 bg-light-1 dark:bg-dark-1 border-t border-light-3 dark:border-dark-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>登录后即可使用 AI 功能</span>
            </div>
            <Link to="/login" className="text-xs text-primary hover:underline font-medium">
              立即登录 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========== 方案 B：左侧嵌入三栏 ========== */

const SchemeBThreeCol = () => {
  const [activeColTab, setActiveColTab] = useState<'generate' | 'fix'>('generate');
  const [aiOpen, setAiOpen] = useState(true);
  const [generating, setGenerating] = useState(false);

  return (
    <div className="bg-white dark:bg-dark-2 rounded-2xl border border-light-3 dark:border-dark-3 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-dark-1 dark:text-white">DiagramAI</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="primary">编辑器页面 · 三栏布局</Badge>
          <div className="w-7 h-7 rounded-lg bg-light-2 dark:bg-dark-3 flex items-center justify-center text-gray-400">
            <Sun className="w-4 h-4" />
          </div>
          <div className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium">登录</div>
        </div>
      </div>

      {/* 三栏主内容 */}
      <div className="flex h-[560px] bg-light-1 dark:bg-dark-1">
        {/* 左栏：AI 面板 */}
        {aiOpen && (
          <div className="w-[360px] flex flex-col bg-white dark:bg-dark-2 border-r border-light-3 dark:border-dark-3 animate-slide-in-right" style={{ animationName: 'slideInLeft' }}>
            {/* AI 面板顶部 Tab */}
            <div className="flex items-center gap-1 p-2 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3">
              <button
                onClick={() => setActiveColTab('generate')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeColTab === 'generate'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-light-2 dark:hover:bg-dark-3'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                AI 生成
              </button>
              <button
                onClick={() => setActiveColTab('fix')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeColTab === 'fix'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-light-2 dark:hover:bg-dark-3'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 修复
              </button>
              <button
                onClick={() => setAiOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
                title="收起"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI 面板内容 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeColTab === 'generate' ? (
                <>
                  {/* 图表类型 */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">图表类型</label>
                    <div className="flex flex-wrap gap-1">
                      {['流程图', '时序图', '甘特图', 'ER', '类图', '状态图'].map((t, i) => (
                        <button
                          key={t}
                          className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                            i === 0
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 快捷提示 */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">快捷提示</label>
                    <div className="flex flex-wrap gap-1">
                      {['订单流程', '审批流', 'API 调用'].map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full text-[10px] bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 border border-light-3 dark:border-dark-3">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 输入框 */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">描述需求</label>
                    <textarea
                      placeholder="描述你想要的图表..."
                      className="w-full min-h-[70px] p-2.5 rounded-lg bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 text-xs text-dark-1 dark:text-white placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none theme-transition"
                    />
                    <button
                      onClick={() => {
                        setGenerating(true);
                        setTimeout(() => setGenerating(false), 1200);
                      }}
                      disabled={generating}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 text-white text-xs font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
                    >
                      {generating ? (
                        <>
                          <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3" />
                          生成图表
                        </>
                      )}
                    </button>
                  </div>

                  {/* 生成结果小卡片 */}
                  {!generating && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">最近生成</span>
                        <button className="text-[10px] text-primary hover:underline">应用</button>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-dark-1 text-[10px] font-mono text-gray-600 dark:text-gray-300 leading-relaxed">
                        <div>flowchart TD</div>
                        <div>&nbsp;&nbsp;A --&gt; B</div>
                        <div>&nbsp;&nbsp;B --&gt; C</div>
                      </div>
                    </div>
                  )}

                  {/* 历史记录 */}
                  <div className="pt-2 border-t border-light-3 dark:border-dark-3">
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">历史记录</span>
                    <div className="space-y-1">
                      {['订单购买流程', '请假审批流程', '登录接口时序'].map((t, i) => (
                        <button key={i} className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-light-2 dark:hover:bg-dark-3 text-xs text-gray-600 dark:text-gray-300 text-left group transition-colors">
                          <span className="truncate">{t}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-lg bg-error/5 dark:bg-error/10 border border-error/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-error" />
                      <span className="text-xs font-semibold text-error">检测到 3 处问题</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">AI 已发现代码中的语法错误</p>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { line: 3, msg: '节点定义格式错误', severity: 'error' as const },
                      { line: 7, msg: '箭头连接方向错误', severity: 'warning' as const },
                      { line: 12, msg: '缺少图表结束标记', severity: 'error' as const },
                    ].map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          err.severity === 'error' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          L{err.line}
                        </span>
                        <span className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">{err.msg}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <Sparkles className="w-3 h-3" />
                    一键修复
                  </button>
                </>
              )}
            </div>

            {/* AI 面板底部 */}
            <div className="px-3 py-2 border-t border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-1 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                <Zap className="w-2.5 h-2.5 inline text-primary" /> Pro 功能
              </span>
              <span className="text-[10px] text-gray-400">v1.0 · Mock</span>
            </div>
          </div>
        )}

        {/* 如果 AI 面板收起，显示一个展开按钮 */}
        {!aiOpen && (
          <button
            onClick={() => setAiOpen(true)}
            className="w-10 flex items-center justify-center bg-white dark:bg-dark-2 border-r border-light-3 dark:border-dark-3 text-gray-400 hover:text-primary hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        )}

        {/* 中栏：代码编辑器 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-1 border-r border-light-3 dark:border-dark-3 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <FileCode className="w-3.5 h-3.5" />
              <span className="font-medium">代码编辑器</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge tone="primary"><Layers className="w-2.5 h-2.5" /> 流程图</Badge>
            </div>
          </div>
          <div className="flex-1 p-3 font-mono text-xs leading-relaxed overflow-y-auto">
            <div className="space-y-0.5">
              <div className="text-gray-400">1 │ flowchart TD</div>
              <div className="text-gray-700 dark:text-gray-300">2 │ &nbsp;&nbsp;A[购物车] --&gt; B[结算]</div>
              <div className="text-gray-700 dark:text-gray-300">3 │ &nbsp;&nbsp;B --&gt; C[支付]</div>
              <div className="text-gray-700 dark:text-gray-300">4 │ &nbsp;&nbsp;C --&gt; D[发货]</div>
              <div className="text-gray-700 dark:text-gray-300">5 │ &nbsp;&nbsp;D --&gt; E[完成]</div>
              <div className="text-gray-400">6 │</div>
              <div className="text-gray-400">7 │ </div>
            </div>
          </div>
        </div>

        {/* 右栏：预览 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-medium">图表预览</span>
            </div>
            <Badge tone="success"><Check className="w-2.5 h-2.5" /> 渲染正常</Badge>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-light-1 dark:bg-dark-1">
            {/* 简易流程图形 */}
            <div className="space-y-2">
              {[
                { label: '购物车', color: 'from-blue-400 to-blue-500' },
                { label: '结算', color: 'from-purple-400 to-purple-500' },
                { label: '支付', color: 'from-pink-400 to-pink-500' },
                { label: '完成', color: 'from-emerald-400 to-emerald-500' },
              ].map((n, idx, arr) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`px-5 py-2 rounded-lg bg-gradient-to-br ${n.color} text-white text-xs font-semibold shadow-md`}>
                    {n.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="w-0.5 h-3 bg-gray-300 dark:bg-gray-600 my-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-light-2 dark:bg-dark-2 border-t border-light-3 dark:border-dark-3">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          <span>三栏布局</span>
          <span>•</span>
          <span>AI 面板 360px</span>
          <span>•</span>
          <span>代码编辑器 50%</span>
          <span>•</span>
          <span>预览 50%</span>
        </div>
        <span className="text-[10px] text-gray-400">方案 B · IDE 风格</span>
      </div>
    </div>
  );
};

/* ========== 方案 C：底部抽屉 ========== */

const SchemeCBottomDrawer = () => {
  const [drawerStage, setDrawerStage] = useState<'collapsed' | 'input' | 'result'>('input');
  const [drawerTab, setDrawerTab] = useState<'generate' | 'fix'>('generate');
  const [sending, setSending] = useState(false);

  return (
    <div className="bg-white dark:bg-dark-2 rounded-2xl border border-light-3 dark:border-dark-3 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-dark-1 dark:text-white">DiagramAI</span>
        </div>
        <Badge tone="primary">编辑器页面 · 底部抽屉</Badge>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-light-2 dark:bg-dark-3 flex items-center justify-center text-gray-400">
            <Sun className="w-4 h-4" />
          </div>
          <div className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium">登录</div>
        </div>
      </div>

      {/* 主区域：上下两栏 */}
      <div className="flex h-[420px] bg-light-1 dark:bg-dark-1 p-2 gap-2">
        {/* 左：代码 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-2 rounded-lg border border-light-3 dark:border-dark-3 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-light-2 dark:bg-dark-3 border-b border-light-3 dark:border-dark-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">代码编辑器</span>
            <Badge tone="primary">流程图</Badge>
          </div>
          <div className="flex-1 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto">
            <div className="space-y-0.5">
              <div className="text-gray-400">1 │ flowchart TD</div>
              <div className="text-gray-700 dark:text-gray-300">2 │ &nbsp;&nbsp;A[购物车] --&gt; B[结算]</div>
              <div className="text-gray-700 dark:text-gray-300">3 │ &nbsp;&nbsp;B --&gt; C[支付]</div>
              <div className="text-gray-700 dark:text-gray-300">4 │ &nbsp;&nbsp;C --&gt; D[发货]</div>
              <div className="text-gray-700 dark:text-gray-300">5 │ &nbsp;&nbsp;D --&gt; E[完成]</div>
              <div className="text-gray-400">6 │</div>
              <div className="text-gray-400">7 │</div>
              <div className="text-gray-400">8 │</div>
            </div>
          </div>
        </div>
        {/* 右：预览 */}
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-2 rounded-lg border border-light-3 dark:border-dark-3 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-light-2 dark:bg-dark-3 border-b border-light-3 dark:border-dark-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">图表预览</span>
            <Badge tone="success"><Check className="w-2.5 h-2.5" /> 渲染正常</Badge>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="space-y-2">
              {[
                { label: '购物车', color: 'from-blue-400 to-blue-500' },
                { label: '结算', color: 'from-purple-400 to-purple-500' },
                { label: '完成', color: 'from-emerald-400 to-emerald-500' },
              ].map((n, idx, arr) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`px-4 py-1.5 rounded-lg bg-gradient-to-br ${n.color} text-white text-[11px] font-semibold shadow-md`}>
                    {n.label}
                  </div>
                  {idx < arr.length - 1 && <div className="w-0.5 h-2.5 bg-gray-300 dark:bg-gray-600 my-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部抽屉 */}
      <div className="bg-white dark:bg-dark-2 border-t border-light-3 dark:border-dark-3">
        {drawerStage === 'collapsed' ? (
          <button
            onClick={() => setDrawerStage('input')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-light-1 dark:hover:bg-dark-1 transition-colors border-t border-light-3 dark:border-dark-3"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="font-medium">点击展开 AI 助手</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            {/* 抽屉顶部 Tab + 收起 */}
            <div className="flex items-center justify-between px-3 py-2 bg-light-1 dark:bg-dark-1 border-b border-light-3 dark:border-dark-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDrawerTab('generate')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    drawerTab === 'generate'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-dark-2'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  AI 生成
                </button>
                <button
                  onClick={() => setDrawerTab('fix')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    drawerTab === 'fix'
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-dark-2'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI 修复
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Badge tone="primary"><Zap className="w-2.5 h-2.5" /> Pro</Badge>
                <button
                  onClick={() => setDrawerStage('collapsed')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-dark-2 transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 抽屉内容 */}
            <div className="px-4 py-3">
              {drawerTab === 'generate' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-medium">类型：</span>
                    {['流程图', '时序图', '甘特图', 'ER 图'].map((t, i) => (
                      <button key={t} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        i === 0
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-dark-1 text-gray-500 dark:text-gray-400 border-light-3 dark:border-dark-3 hover:border-primary hover:text-primary'
                      }`}>
                        {t}
                      </button>
                    ))}
                    <span className="text-[10px] text-gray-400 font-medium ml-3">快捷：</span>
                    {['订单流程', '审批流', 'API 调用'].map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded-full text-[10px] bg-light-2 dark:bg-dark-3 text-gray-500 dark:text-gray-400 border border-light-3 dark:border-dark-3">
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        placeholder="💭 描述你想要的图表... (Enter 发送，Shift+Enter 换行)"
                        rows={2}
                        className="w-full px-3 py-2 pr-12 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 text-xs text-dark-1 dark:text-white placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none theme-transition"
                      />
                      <button
                        onClick={() => {
                          setSending(true);
                          setTimeout(() => {
                            setSending(false);
                            setDrawerStage('result');
                          }, 1000);
                        }}
                        disabled={sending}
                        className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-gradient-to-br from-primary to-purple-500 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
                      >
                        {sending ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {drawerStage === 'result' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-500/20 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ AI 已生成流程图</span>
                          <div className="flex gap-1.5">
                            <button className="text-[10px] px-2 py-1 rounded-md bg-primary text-white font-medium hover:bg-primary-dark transition-colors">应用</button>
                            <button className="text-[10px] px-2 py-1 rounded-md bg-light-2 dark:bg-dark-3 text-gray-500 dark:text-gray-400 hover:bg-light-3 dark:hover:bg-dark-2 transition-colors">再试</button>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-dark-1 text-[10px] font-mono text-gray-600 dark:text-gray-300 leading-relaxed">
                          flowchart TD &nbsp;&nbsp;A[购物车] --&gt; B[结算] --&gt; C[支付] --&gt; D[完成]
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-error/5 dark:bg-error/10 border border-error/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3 h-3 text-error" />
                        <span className="text-xs font-semibold text-error">3 处语法问题</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">点击右侧按钮生成修复建议</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3">
                      <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">问题摘要</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-0.5">
                        <div>• 第 3 行：节点格式</div>
                        <div>• 第 7 行：箭头方向</div>
                        <div>• 第 12 行：缺少标记</div>
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5" />
                    一键修复
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-light-2 dark:bg-dark-3 border-t border-light-3 dark:border-dark-3">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          <span>底部抽屉式 · Copilot 风格</span>
          <span>•</span>
          <span>抽屉高度 180-400px 可调</span>
        </div>
        <span className="text-[10px] text-gray-400">方案 C</span>
      </div>
    </div>
  );
};

/* ========== 页面入口 ========== */

export const AIWireframePage = () => {
  const { theme, toggleTheme } = useThemeStore();
  const [activeScheme, setActiveScheme] = useState<'A' | 'B' | 'C' | 'ALL'>('ALL');

  const schemeMeta = {
    A: { name: '居中模态窗', desc: 'Notion AI / Linear Magic 风格 · 聚焦感强', icon: Wand2, color: 'from-primary to-purple-500' },
    B: { name: '左侧嵌入三栏', desc: 'IDE Explorer 风格 · 代码/AI/预览协同', icon: Layers, color: 'from-blue-500 to-cyan-500' },
    C: { name: '底部抽屉式', desc: 'GitHub Copilot / Cursor 风格 · 不打断阅读', icon: FileCode, color: 'from-emerald-500 to-teal-500' },
  };

  return (
    <div className="min-h-screen bg-light-1 dark:bg-dark-1 theme-transition">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-dark-2/80 backdrop-blur border-b border-light-3 dark:border-dark-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-lg group-hover:shadow-primary/40 transition-shadow">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-dark-1 dark:text-white">DiagramAI · 交互方案</span>
              <span className="text-[10px] text-gray-400">AI 功能线框预览 · 请选择您喜欢的方案</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/editor" className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors">
              返回编辑器
            </Link>
          </div>
        </div>

        {/* 方案切换 Tab */}
        <div className="max-w-7xl mx-auto px-6 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveScheme('ALL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeScheme === 'ALL'
                  ? 'bg-dark-1 dark:bg-white text-white dark:text-dark-1 shadow-lg'
                  : 'bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-2'
              }`}
            >
              <span className="text-xs opacity-70">全部对比</span>
              <span>ALL</span>
            </button>
            {(['A', 'B', 'C'] as const).map((k) => {
              const Icon = schemeMeta[k].icon;
              return (
                <button
                  key={k}
                  onClick={() => setActiveScheme(k)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    activeScheme === k
                      ? `bg-gradient-to-r ${schemeMeta[k].color} text-white shadow-lg`
                      : 'bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs opacity-70">方案</span>
                  <span>{k}</span>
                  <span className="text-xs opacity-70 font-normal">· {schemeMeta[k].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-16">
        {/* 说明区域 */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-dark-1 dark:text-white mb-2">三种 AI 交互布局方案 · 可视化对比</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            点击顶部 Tab 切换不同方案，或选择「ALL」查看全部方案并列对比。每个方案均为可点击的线框预览，支持深色/浅色主题切换。
          </p>
        </div>

        {/* 方案卡片网格 - 当选择ALL或单个方案时显示对应内容 */}
        {(activeScheme === 'ALL' ? (['A', 'B', 'C'] as const) : [activeScheme]).map((scheme) => {
          const meta = schemeMeta[scheme];
          const Icon = meta.icon;
          return (
            <div key={scheme} id={`scheme-${scheme}`} className="space-y-4">
              <SectionTitle num={scheme} name={meta.name} subtitle={meta.desc} />

              {/* 方案简介+优势 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                {scheme === 'A' && (
                  <>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">视觉体验</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐⭐ 最充裕</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">760px 宽卡片，空间充足，信息密度舒适</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">上下文保留</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐ 基本不可见</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">背景被遮罩灰掉，用户专注于 AI 对话</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">操作流畅度</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐ 线性单向</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">输入 → 生成 → 应用 的闭环清晰明了</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">开发难度</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐ 简单</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">改动最小，复用现有 Drawer 组件改造即可</p>
                    </div>
                  </>
                )}
                {scheme === 'B' && (
                  <>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">协同体验</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐⭐ 最佳</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">AI ↔ 代码 ↔ 预览三栏同时可见，零切换成本</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">空间布局</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐ 中等</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">360px AI 面板，代码+预览各占剩余，平衡</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">可扩展性</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐ 很好</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">可常驻展开，未来可添加更多工具面板</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">大屏友好度</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐⭐ 最佳</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">1440p+ 宽屏下三栏布局体验最为惊艳</p>
                    </div>
                  </>
                )}
                {scheme === 'C' && (
                  <>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">阅读保留</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐ 优秀</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">代码和预览始终可见，不打断主阅读流</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">交互自然度</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐ 聊天式</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">用户已习惯"底部输入+上方结果"对话模式</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">小屏适配</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐ 中等</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">抽屉高度可调配，小屏可展开至屏幕 60% 高</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
                      <div className="text-xs text-primary font-bold mb-1">可扩展对话</div>
                      <div className="text-sm text-dark-1 dark:text-white font-semibold mb-1">⭐⭐⭐⭐⭐ 最佳</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">天然适合多轮对话，未来可扩展为完整 AI 助手</p>
                    </div>
                  </>
                )}
              </div>

              {/* 线框图 */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-5xl">
                  {scheme === 'A' && <SchemeAModal />}
                  {scheme === 'B' && <SchemeBThreeCol />}
                  {scheme === 'C' && <SchemeCBottomDrawer />}
                </div>
                <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: '#7b68ee' }} />
                  <span>方案 {scheme} · {schemeMeta[scheme].name}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* 底部总结对比 */}
        <div className="mt-10 p-6 rounded-2xl bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-dark-1 dark:text-white">如何选择？</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">根据产品定位、用户场景和设备情况选择最合适的交互方案</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              {
                scheme: '方案 A · 居中模态窗',
                recommend: '产品新手上路 / 一次性 AI 操作场景',
                best: '空间充足，信息呈现舒适、聚焦',
                caution: '会中断用户当前的编辑器操作',
              },
              {
                scheme: '方案 B · 左侧嵌入三栏',
                recommend: '面向开发者/重度用户 / 宽屏优先',
                best: 'AI、代码、预览三者协同，零上下文切换',
                caution: '窄屏略显拥挤，需要精心布局',
              },
              {
                scheme: '方案 C · 底部抽屉',
                recommend: '聊天式 AI 助手 / 多轮对话场景',
                best: '不干扰主阅读流，可折叠可扩展',
                caution: '与代码编辑区域的交互需要精心设计',
              },
            ].map((item) => (
              <div key={item.scheme} className="p-4 rounded-xl bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3">
                <div className="text-sm font-bold text-primary mb-1.5">{item.scheme}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">适合：</span>{item.recommend}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1.5">
                  ✓ {item.best}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ {item.caution}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            💡 混合方案：桌面端采用 方案 B（左侧嵌入三栏）+ 移动端降级为 方案 A（居中模态） 往往是最佳组合
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 py-6 border-t border-light-3 dark:border-dark-3 bg-white dark:bg-dark-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <span>DiagramAI · AI 交互线框预览 · v1.0</span>
          <Link to="/editor" className="hover:text-primary transition-colors">返回编辑器 →</Link>
        </div>
      </div>
    </div>
  );
};