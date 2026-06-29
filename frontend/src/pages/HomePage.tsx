import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Code2,
  Sparkles,
  ArrowRight,
  BarChart3,
  Layers,
  ChevronRight,
  FileText,
  Wand2,
  Share2,
  ArrowUp,
  Check,
  Cloud,
  HardDrive,
  Github,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { Header } from '@/components/Layout/Header';
import { Link } from 'react-router-dom';
import { chartShowcases as chartTypes } from '@/data/chartShowcases';

export const HomePage = () => {
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    const nodes = revealRefs.current.filter(Boolean) as HTMLElement[];
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const SCROLL_THRESHOLD = 200;
    const onScroll = () => {
      setShowScrollTop(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const setRef = (index: number) => (el: HTMLElement | null) => {
    revealRefs.current[index] = el;
  };

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNewChart = () => {
    window.open('/editor', '_blank', 'noopener,noreferrer');
  };

  const handleNewDoc = () => {
    window.open('/docs/new', '_blank', 'noopener,noreferrer');
  };

  const features = [
    {
      icon: Code2,
      title: 'Mermaid 图表编辑',
      description: '代码驱动绘图，实时预览，语法高亮与自动格式化，支持 PNG/SVG/PDF 导出。',
    },
    {
      icon: FileText,
      title: 'Markdown 文档',
      description: '所见即所得的文档编辑器，内嵌 Mermaid 代码块实时渲染，图文混排。',
    },
    {
      icon: Wand2,
      title: 'AI 辅助创作',
      description: '用自然语言描述即可生成图表，对话式修改调整，降低学习门槛。',
    },
    {
      icon: Share2,
      title: '分享与导出',
      description: '开启公开访问生成只读链接，支持导出 PDF、Markdown 源文件。',
    },
  ];

  const workflow = [
    {
      step: '1',
      title: '编写代码',
      icon: Code2,
      description: '用 Mermaid 语法编写图表，或在 Markdown 文档中混排文字与图表，编辑器实时预览。',
    },
    {
      step: '2',
      title: 'AI 辅助',
      icon: Sparkles,
      description: '用自然语言描述需求，AI 帮你生成或修改图表，语法错误自动提示。',
    },
    {
      step: '3',
      title: '分享导出',
      icon: Share2,
      description: '一键开启公开链接分享给他人，或导出为 PDF、PNG、SVG 等格式归档。',
    },
  ];

  const localFeatures = [
    '打开网站即可使用，无需注册账号',
    '数据存储在浏览器 IndexedDB，不上传服务器',
    '断网也能正常编辑和查看',
    '自动保存，关闭浏览器不丢失',
    '本地最多 50 篇图表 + 50 篇文档',
  ];

  const cloudFeatures = [
    '多设备同步，换电脑也能继续编辑',
    'AI 辅助生成与修改图表（对话式）',
    '一键生成公开链接，分享给他人',
    '云端存储空间更大（不受本地限额）',
    'GitHub 快捷登录，注册只需几秒',
  ];

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-white dark:bg-dark-1">
        <Header />

        {/* ============ Hero：本地优先 + 云端可选 ============ */}
        <section className="relative pt-20 pb-16 px-4 overflow-hidden">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 dark:bg-primary/30 rounded-full blob animate-blob-pulse" />
            <div
              className="absolute top-32 right-10 w-96 h-96 bg-purple-500/15 dark:bg-purple-500/25 rounded-full blob animate-blob-pulse"
              style={{ animationDelay: '2s' }}
            />
            <div
              className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blob animate-blob-pulse"
              style={{ animationDelay: '4s' }}
            />
          </div>

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 animate-bounce-light">
              <Sparkles className="w-4 h-4 animate-pulse" />
              本地优先 · 云端可选 的图表文档工具
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-dark-1 dark:text-white mb-6 tracking-tight leading-tight">
              用代码画图表，用文档写想法
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent animate-gradient font-extrabold">
                数据存本地，隐私有保障
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              基于 Mermaid 的在线图表编辑器，配合 Markdown 文档实现图文混排。
              无需注册即可使用，数据存在你的浏览器里；登录后可云端同步、分享与 AI 辅助。
            </p>

            {/* 信任徽章 */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-sm text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                无需注册
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                数据本地存储
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                实时预览
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                支持深色模式
              </span>
            </div>

            {/* 双入口 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleNewChart}
                className="group w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                <Code2 className="w-5 h-5" />
                开始绘图
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
              <button
                onClick={handleNewDoc}
                className="group w-full sm:w-auto px-8 py-3.5 bg-light-1 dark:bg-dark-2 text-dark-1 dark:text-white rounded-xl font-semibold transition-all duration-300 hover:bg-light-2 dark:hover:bg-dark-3 flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md border border-light-3/60 dark:border-dark-3/60"
              >
                <FileText className="w-5 h-5" />
                新建文档
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 演示窗口：编辑器分屏 */}
          <div className="mt-16 max-w-4xl mx-auto relative perspective-1000">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-purple-500/15 to-cyan-500/20 blur-2xl animate-window-glow pointer-events-none" />
            <div className="absolute -inset-2 rounded-[1.5rem] bg-gradient-to-tr from-primary/15 via-purple-500/10 to-cyan-500/15 blur-lg pointer-events-none opacity-70" />

            <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-dark-1 shadow-[0_30px_80px_-15px_rgba(79,70,229,0.35)] animate-window-rise preserve-3d group">
              <div className="animate-window-float">
                <div className="bg-light-2/90 dark:bg-dark-2/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2 border-b border-light-3/70 dark:border-dark-3/70">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-error/90 shadow-sm dot-pulse" />
                    <div
                      className="w-3 h-3 rounded-full bg-warning/90 shadow-sm dot-pulse"
                      style={{ animationDelay: '0.25s' }}
                    />
                    <div
                      className="w-3 h-3 rounded-full bg-success/90 shadow-sm dot-pulse"
                      style={{ animationDelay: '0.5s' }}
                    />
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      flowchart.mmd
                    </span>
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded font-mono">
                      LIVE
                    </span>
                  </div>
                  <div className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    已保存
                  </div>
                </div>

                <div className="grid md:grid-cols-2 min-h-[300px]">
                  {/* 左侧：Mermaid 代码 */}
                  <div className="p-5 bg-slate-50/80 dark:bg-dark-2/60 overflow-auto border-r border-light-3/50 dark:border-dark-3/50">
                    <div className="text-[12px] text-gray-400 dark:text-gray-500 mb-3 font-mono flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary/60" />
                      Mermaid 代码
                    </div>
                    <pre className="text-left text-[13px] font-mono text-gray-700 dark:text-gray-300 leading-relaxed">
                      <div className="code-line" style={{ animationDelay: '0.3s' }}>
                        <span className="text-primary font-semibold">flowchart</span>{' '}
                        <span className="text-primary font-semibold">TD</span>
                      </div>
                      <div className="code-line" style={{ animationDelay: '0.5s' }}>
                        <span className="text-gray-400">&nbsp;&nbsp;// 用户登录流程</span>
                      </div>
                      <div className="code-line animate-code-highlight" style={{ animationDelay: '0.8s' }}>
                        &nbsp;&nbsp;<span className="text-primary">A</span>[<span className="text-cyan-600 dark:text-cyan-400">开始</span>]
                        <span className="text-gray-400"> --&gt; </span>
                        <span className="text-primary">B</span>
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">{'{已登录?}'}</span>
                      </div>
                      <div className="code-line" style={{ animationDelay: '1.1s' }}>
                        &nbsp;&nbsp;<span className="text-primary">B</span>
                        <span className="text-gray-400"> --&gt;|</span><span className="text-emerald-600 dark:text-emerald-400">是</span><span className="text-gray-400">| </span>
                        <span className="text-primary">C</span>[<span className="text-cyan-600 dark:text-cyan-400">进入首页</span>]
                      </div>
                      <div className="code-line" style={{ animationDelay: '1.4s' }}>
                        &nbsp;&nbsp;<span className="text-primary">B</span>
                        <span className="text-gray-400"> --&gt;|</span><span className="text-red-500">否</span><span className="text-gray-400">| </span>
                        <span className="text-primary">D</span>[<span className="text-amber-600 dark:text-amber-400">跳转登录</span>]
                      </div>
                      <div className="code-line" style={{ animationDelay: '1.7s' }}>
                        &nbsp;&nbsp;<span className="text-primary">D</span>
                        <span className="text-gray-400"> --&gt; </span>
                        <span className="text-primary">E</span>[<span className="text-violet-600 dark:text-violet-400 font-semibold">OAuth 授权</span>]
                      </div>
                      <div className="code-line" style={{ animationDelay: '2.0s' }}>
                        &nbsp;&nbsp;<span className="text-primary">E</span>
                        <span className="text-gray-400"> --&gt; </span>
                        <span className="text-primary">C</span>
                      </div>
                    </pre>
                  </div>

                  {/* 右侧：Mermaid 渲染 */}
                  <div className="p-6 bg-white dark:bg-dark-1 flex flex-col items-center justify-center gap-4">
                    <svg viewBox="0 0 340 260" className="w-full max-w-[300px]">
                      <defs>
                        <marker id="h-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                        </marker>
                        <marker id="h-arrow-g" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                        </marker>
                        <marker id="h-arrow-r" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                        </marker>
                      </defs>
                      <g className="animate-node-activate" style={{ animationDelay: '0.9s' }}>
                        <rect x="130" y="10" width="80" height="36" rx="8" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="170" y="32" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">开始</text>
                      </g>
                      <line x1="170" y1="46" x2="170" y2="72" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#h-arrow)" className="animate-line-draw" style={{ animationDelay: '1.0s' }} />
                      <g className="animate-node-activate" style={{ animationDelay: '1.2s' }}>
                        <polygon points="170,72 220,98 170,124 120,98" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="1.5" />
                        <text x="170" y="102" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">已登录?</text>
                      </g>
                      <path d="M 220 90 Q 280 60 300 60 Q 320 60 320 80 L 320 100" fill="none" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#h-arrow-g)" className="animate-line-draw" style={{ animationDelay: '1.4s' }} />
                      <text x="290" y="54" fill="#10b981" fontSize="9" fontWeight="600">是</text>
                      <g className="animate-node-activate" style={{ animationDelay: '1.6s' }}>
                        <rect x="240" y="100" width="80" height="36" rx="8" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="280" y="122" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">进入首页</text>
                      </g>
                      <path d="M 120 105 Q 60 130 60 160 Q 60 180 100 180" fill="none" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#h-arrow-r)" className="animate-line-draw" style={{ animationDelay: '1.8s' }} />
                      <text x="40" y="150" fill="#ef4444" fontSize="9" fontWeight="600">否</text>
                      <g className="animate-node-activate" style={{ animationDelay: '2.0s' }}>
                        <rect x="100" y="180" width="80" height="36" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                        <text x="140" y="202" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">跳转登录</text>
                      </g>
                      <line x1="220" y1="198" x2="260" y2="136" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" markerEnd="url(#h-arrow)" className="animate-line-draw" style={{ animationDelay: '2.2s' }} />
                      <g className="animate-node-activate" style={{ animationDelay: '2.2s' }}>
                        <rect x="140" y="230" width="90" height="30" rx="6" fill="white" stroke="#8b5cf6" strokeWidth="1.2" />
                        <text x="185" y="249" textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="700">✨ OAuth 授权</text>
                      </g>
                    </svg>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      实时预览已连接
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 双模式存储：核心卖点 ============ */}
        <section id="modes" className="py-20 px-4 bg-light-1 dark:bg-dark-2 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 reveal" ref={setRef(0)}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 text-sm font-medium mb-5">
                <HardDrive className="w-4 h-4" />
                Dual Mode · 双模式存储
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-dark-1 dark:text-white mb-4">
                数据存在哪里，你说了算
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                打开就能用，数据默认存在本地浏览器；需要多端同步和分享时，登录即可升级到云端。
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 reveal" ref={setRef(1)}>
              {/* 本地模式 */}
              <div className="group relative p-7 bg-white dark:bg-dark-1 rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/40 hover:border-amber-500 dark:hover:border-amber-400 transition-colors card-lift">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <HardDrive className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-1 dark:text-white">本地模式</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">默认模式 · 无需注册</p>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-amber-500">
                    免登录
                  </span>
                </div>
                <ul className="space-y-2.5 mb-5">
                  {localFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleNewChart}
                  className="w-full py-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/50 font-semibold text-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  立即开始使用（免登录）
                </button>
              </div>

              {/* 云端模式 */}
              <div className="group relative p-7 bg-white dark:bg-dark-1 rounded-2xl border-2 border-emerald-400/60 dark:border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors card-lift">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-1 dark:text-white">云端模式</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">登录后解锁</p>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-emerald-500">
                    登录可用
                  </span>
                </div>
                <ul className="space-y-2.5 mb-5">
                  {cloudFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className="block w-full py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50 font-semibold text-sm text-center hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  登录解锁云端能力
                </Link>
              </div>
            </div>

            {/* 无缝升级流程 */}
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap reveal" ref={setRef(2)}>
              {[
                { icon: HardDrive, label: '本地创作', active: true },
                { label: '→' },
                { icon: Github, label: '一键登录' },
                { label: '→' },
                { icon: Cloud, label: '云端同步' },
                { label: '→' },
                { icon: Share2, label: '分享协作' },
              ].map((step, i) => {
                if (step.label === '→') {
                  return (
                    <span key={i} className="text-gray-300 dark:text-gray-600 text-lg font-light hidden sm:block">
                      →
                    </span>
                  );
                }
                const Icon = step.icon!;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      step.active
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-light-3 dark:border-dark-3 text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-1'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {step.label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ Features：四大能力 ============ */}
        <section id="features" className="py-20 px-4 bg-white dark:bg-dark-1 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 reveal" ref={setRef(3)}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-5">
                <Sparkles className="w-4 h-4 animate-pulse" />
                核心功能
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-dark-1 dark:text-white mb-4">
                专注创作的四大能力
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                从画图到写文档，从 AI 辅助到分享导出，覆盖完整链路
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`card-lift group p-6 bg-light-1 dark:bg-dark-2 rounded-xl border border-light-3 dark:border-dark-3 reveal reveal-delay-${(index % 4) + 1}`}
                  ref={setRef(index + 4)}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:animate-float group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <feature.icon className="w-5 h-5 text-primary group-hover:animate-pulse" />
                  </div>
                  <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Chart types：图表类型 ============ */}
        <section id="chart-types" className="py-20 px-4 bg-light-1 dark:bg-dark-2 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 reveal" ref={setRef(8)}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-full text-purple-600 dark:text-purple-400 text-sm font-medium mb-5">
                <Layers className="w-4 h-4 animate-pulse" />
                Chart Types
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-dark-1 dark:text-white mb-4">
                支持丰富的图表类型
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                覆盖流程图、时序图、类图、饼图等主流图表，满足文档与技术场景
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-1000">
              {chartTypes.map((chart, index) => (
                <div
                  key={chart.key}
                  className={`card-lift group bg-white dark:bg-dark-1 rounded-2xl border border-light-3 dark:border-dark-3 overflow-hidden flex flex-col reveal reveal-delay-${(index % 3) + 1}`}
                  ref={setRef(index + 9)}
                >
                  <div className="relative h-36 bg-gradient-to-br from-light-2 to-white dark:from-dark-2 dark:to-dark-1 border-b border-light-3 dark:border-dark-3 overflow-hidden">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-tr from-primary/10 to-transparent" />
                    <div className="relative h-full flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-500">
                      {chart.visualSvg}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-2 group-hover:text-primary transition-colors">
                      {chart.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex-1">
                      {chart.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {chart.useCases.slice(0, 2).map((useCase) => (
                        <span
                          key={useCase}
                          className="px-2 py-0.5 text-[11px] bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={handleNewChart}
                      className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:gap-2 transition-all"
                    >
                      立即体验
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Workflow：三步工作流 ============ */}
        <section id="workflow" className="py-20 px-4 bg-white dark:bg-dark-1 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 reveal" ref={setRef(15)}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-5">
                <BarChart3 className="w-4 h-4 animate-pulse" />
                Workflow
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-dark-1 dark:text-white mb-4">
                从创作到分享，简单三步
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                无需复杂配置，开箱即用的创作体验
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-primary/20" />

              {workflow.map((item, index) => (
                <div
                  key={item.step}
                  className={`card-lift relative p-8 bg-light-1 dark:bg-dark-2 rounded-xl border border-light-3 dark:border-dark-3 text-center reveal reveal-delay-${index + 1}`}
                  ref={setRef(index + 16)}
                >
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-dark-1 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="py-20 px-4 bg-gradient-to-r from-primary to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white/20 rounded-full animate-spin-slow" />
            <div
              className="absolute bottom-10 right-10 w-48 h-48 border-2 border-white/10 rounded-full animate-spin-slow"
              style={{ animationDirection: 'reverse', animationDuration: '25s' }}
            />
            <div className="absolute top-1/4 right-1/4 w-20 h-20 bg-white/10 rounded-full blob animate-blob-pulse" />
            <div
              className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-white/5 rounded-full blob animate-blob-pulse"
              style={{ animationDelay: '1.5s' }}
            />
          </div>
          <div className="max-w-4xl mx-auto text-center relative z-10 reveal" ref={setRef(19)}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              现在就开始画你的第一张图
            </h2>
            <p className="text-white/80 mb-10 text-base">
              无需注册，打开即用。数据存在本地，隐私有保障。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleNewChart}
                className="group w-full sm:w-auto px-8 py-3 bg-white text-primary rounded-xl font-semibold transition-all duration-300 hover:bg-light-1 hover:shadow-2xl hover:shadow-white/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Code2 className="w-5 h-5" />
                开始绘图
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleNewDoc}
                className="group w-full sm:w-auto px-8 py-3 bg-white/15 text-white rounded-xl font-semibold transition-all duration-300 hover:bg-white/25 border border-white/30 hover:border-white/50 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                新建文档
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============ Footer ============ */}
        <footer className="py-12 px-4 bg-slate-900 text-slate-400">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-white">DiagramAI</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  基于 Mermaid 的在线图表编辑器与 Markdown 文档工具，本地优先、云端可选，让创作更自由。
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">产品</h4>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={handleNewChart}
                      className="text-slate-500 hover:text-slate-300 transition-colors text-sm"
                    >
                      图表编辑器
                    </button>
                  </li>
                  <li>
                    <Link to="/charts" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                      我的图表
                    </Link>
                  </li>
                  <li>
                    <Link to="/docs" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                      我的文档
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleNewDoc}
                      className="text-slate-500 hover:text-slate-300 transition-colors text-sm"
                    >
                      新建文档
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">账户</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                      登录
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                      注册
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
                      个人中心
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800 text-center text-slate-500 text-xs space-y-1.5">
              <p>© 2026 DiagramAI · 本地数据使用 IndexedDB 存储 · 云端数据加密传输</p>
              <p>
                友情链接：
                <a
                  href="https://www.aiskillfy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-200 transition-colors ml-1"
                >
                  AI Skillify
                </a>
              </p>
            </div>
          </div>
        </footer>

        {/* 回到顶部 */}
        <button
          onClick={scrollToTop}
          title="回到顶部"
          aria-label="回到顶部"
          className={`fixed right-4 bottom-6 z-40 w-10 h-10 rounded-full bg-white/85 dark:bg-dark-2/85 backdrop-blur-md border border-light-3/60 dark:border-dark-3/60 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-light-2 dark:hover:bg-dark-3 active:scale-95 transition-all duration-300 ease-out ${
            showScrollTop
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};
