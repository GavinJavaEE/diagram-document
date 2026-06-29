import { useState, useEffect, useRef } from 'react';
import { Wand2, MessageSquare, X, Clock, ArrowRight, Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAIStore, GenerateRecord, chartTypeLabel, ChatRecord } from '@/contexts/AIContext';
import { ChartType } from '@/contexts/EditorContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useActiveSettings } from '@/contexts/SettingsContext';
import { useReLoginStore } from '@/components/Common/reLoginStore';

import { getCurrentUser } from '@/services/api';

type AITab = 'generate' | 'chat';

const quickPrompts: Record<ChartType, { label: string; text: string }[]> = {
  flowchart: [
    { label: '订单流程', text: '电商平台订单购买流程：购物车 → 结算 → 支付 → 发货 → 完成' },
    { label: '审批流', text: '员工请假审批流程：提交申请 → 主管审批 → HR 备案 → 完成' },
    { label: '用户注册', text: '用户注册流程：填写手机号 → 获取验证码 → 设置密码 → 注册成功，验证码错误可重试' },
  ],
  sequence: [
    { label: 'API 调用', text: '用户登录接口时序：客户端 → 网关 → 认证服务 → 数据库' },
    { label: '微服务交互', text: '订单微服务与库存微服务的消息交互流程' },
    { label: '支付回调', text: '第三方支付完成后回调通知商户的交互流程：支付平台 → 商户后端 → 更新订单 → 通知用户' },
  ],
  gantt: [
    { label: '项目排期', text: '从需求分析到上线发布的完整项目时间计划，包含设计、开发、测试、上线四个阶段' },
    { label: '产品迭代', text: '一个两周的敏捷迭代计划：需求评审、开发、联调、测试、发布' },
  ],
  er: [
    { label: '电商数据', text: '电商系统核心实体：用户、订单、商品、库存之间的关系' },
    { label: '权限模型', text: 'RBAC 权限模型：用户、角色、权限三张表及其关联关系' },
  ],
  class: [
    { label: 'MVC 架构', text: '典型 MVC 三层架构：Controller → Service → Repository' },
    { label: '支付策略', text: '支付策略模式：一个 Payment 接口，多个实现类（微信支付、支付宝、银行卡）' },
  ],
  state: [
    { label: '订单状态', text: '订单状态流转：待支付 → 已支付 → 待发货 → 已发货 → 已完成' },
    { label: '任务状态', text: '任务状态机：待领取 → 进行中 → 已完成，进行中可暂停，暂停后可恢复' },
  ],
  unknown: [
    { label: '简单流程', text: '一个简单的三步流程示例' },
    { label: '决策树', text: '用户登录的决策逻辑：账号是否存在 → 密码是否正确 → 是否需要二次验证' },
  ],
};

const chartTypeOptions: ChartType[] = ['flowchart', 'sequence', 'gantt', 'er', 'class', 'state'];

const formatTime = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
};

const formatPreview = (code: string): string => {
  const lines = code.split('\n').slice(0, 3);
  return lines.join('\n') + (code.split('\n').length > 3 ? '\n...' : '');
};

interface AISidebarProps {
  isOpen: boolean;
}

export const AISidebar = ({ isOpen }: AISidebarProps) => {
  const { user } = useAuthStore();
  const { showError } = useToast();
  const { isNarrowScreen, mode } = useResponsiveLayout();
  // 从用户设置读取侧栏位置与宽度（实时预览 + 手动持久化）
  const { aiSidebarPosition: position, aiSidebarWidth: sidebarWidth, defaultAITab } = useActiveSettings();
  // 中屏(768-1280)场景下若用户设置宽度过大，自动夹紧到 320px 避免挤压编辑区
  const effectiveWidth = mode === 'COLLAPSIBLE_AI' ? Math.min(sidebarWidth, 320) : sidebarWidth;
  const {
    generateCode,
    selectedChartType,
    setSelectedChartType,
    generateHistory,
    loadFromHistory,
    sidebarActiveTab,
    setSidebarActiveTab,
    closeSidebar,
    chatMessages,
    chatSending,
    sendMessage,
    clearChat,
  } = useAIStore();

  const [activeTab, setActiveTab] = useState<AITab>(
    // 优先尊重主动指定的 tab（如「用 AI 修复」打开 chat），否则用用户设置的默认 tab
    sidebarActiveTab === 'chat' || (sidebarActiveTab !== 'generate' && defaultAITab === 'chat') ? 'chat' : 'generate',
  );
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // 聊天输入
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(sidebarActiveTab === 'chat' ? 'chat' : 'generate');
  }, [sidebarActiveTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatSending, activeTab]);

  // 权限门禁：仅需登录
  const isLocked = !user;

  const handleTabChange = (tab: AITab) => {
    setActiveTab(tab);
    setSidebarActiveTab(tab);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      await generateCode(prompt);
      setPrompt('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 生成失败，请稍后重试';
      if (msg.includes('登录已过期') || msg.includes('need relogin')) {
        // request 拦截器已触发全局重新登录弹窗。
        // 此处尝试 getCurrentUser 静默恢复（token 滑动过期场景）：成功则关弹窗并重试。
        try {
          const userData = await getCurrentUser();
          useAuthStore.setState({
            user: { id: userData.userId, email: userData.email },
            isAuthenticated: true,
            isLoading: false,
          });
          // 恢复成功：关闭全局弹窗，重试原请求
          useReLoginStore.getState().close();
          await generateCode(prompt);
          setPrompt('');
        } catch {
          // 恢复失败：全局弹窗保持显示，由用户选择重新登录或停留，不重复 showError
        }
      } else {
        showError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickPrompt = (text: string) => {
    setPrompt(text);
  };

  const handleLoadHistory = (record: GenerateRecord) => {
    loadFromHistory(record);
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatInput('');
    try {
      await sendMessage(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 处理失败，请稍后重试';
      if (msg.includes('登录已过期') || msg.includes('need relogin')) {
        // request 拦截器已触发全局重新登录弹窗。
        // 此处尝试 getCurrentUser 静默恢复（token 滑动过期场景）：成功则关弹窗并重试。
        try {
          const userData = await getCurrentUser();
          useAuthStore.setState({
            user: { id: userData.userId, email: userData.email },
            isAuthenticated: true,
            isLoading: false,
          });
          useReLoginStore.getState().close();
          await sendMessage(text);
        } catch {
          // 恢复失败：全局弹窗保持显示，由用户选择重新登录或停留，不重复 showError
        }
      } else {
        showError(msg);
      }
    }
  };

  // 移动端：全屏弹窗模式
  if (isNarrowScreen) {
    if (!isOpen) return null;

    return (
      <>
        {/* 遮罩层 */}
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-sm animate-fade-in"
          onClick={closeSidebar}
        />

        {/* 全屏面板 */}
        <div className="fixed inset-0 z-50 animate-slide-in-right flex flex-col bg-white dark:bg-dark-1">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-light-3 dark:border-dark-3 bg-light-1/50 dark:bg-dark-1/50">
            <div className="flex gap-1">
              <button
                onClick={() => handleTabChange('generate')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'generate'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-dark-2'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                AI 生成
              </button>
              <button
                onClick={() => handleTabChange('chat')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-purple-500 hover:bg-white dark:hover:bg-dark-2'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                AI 对话
              </button>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 rounded-lg hover:bg-light-2 dark:hover:bg-dark-3 text-gray-400 hover:text-dark-1 dark:hover:text-white transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'generate' ? (
              <div className="p-3 space-y-3">
                {!user && (
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border border-primary/30 dark:border-primary/40 rounded-xl">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 dark:bg-primary/30 flex items-center justify-center flex-shrink-0">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark-1 dark:text-white text-xs mb-0.5">登录后使用 AI 生成</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">保存生成历史记录，解锁全部 AI 能力</p>
                        <Link
                          to="/login"
                          onClick={closeSidebar}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          去登录 <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    图表类型
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      key="auto"
                      onClick={() => setSelectedChartType('unknown')}
                      disabled={isLocked}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                        selectedChartType === 'unknown'
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="让AI根据描述自动选择图表类型"
                    >
                      🤖 AI 自动
                    </button>
                    {chartTypeOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedChartType(type)}
                        disabled={isLocked}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                          selectedChartType === type
                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                            : 'bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {chartTypeLabel[type]}
                        {selectedChartType === type && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChartType('unknown');
                            }}
                            className="w-3 h-3 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-[10px] cursor-pointer"
                            title="清空选择"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedChartType !== 'unknown' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      💡 快捷提示
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(quickPrompts[selectedChartType] || quickPrompts.flowchart).map((qp, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(qp.text)}
                          disabled={isLocked}
                          className={`px-2 py-1 text-[11px] rounded-lg border border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {qp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    描述你想要的图表
                  </label>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={`例如：${(quickPrompts[selectedChartType] || quickPrompts.flowchart)[0]?.text}`}
                      disabled={isLocked}
                      rows={4}
                      className="w-full px-3 py-2.5 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-xs leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="absolute bottom-2 right-2.5 text-[10px] text-gray-400 dark:text-gray-500">
                      {prompt.length} / 500
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLocked || !prompt.trim() || generating}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-purple-500 hover:from-primary-dark hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-dark-3 dark:disabled:to-dark-3 text-white rounded-xl font-medium text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI 生成中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      生成 {chartTypeLabel[selectedChartType]} 代码
                    </>
                  )}
                </button>

                {generateHistory.length > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        最近生成
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{generateHistory.length} 条</span>
                    </div>
                    <div className="space-y-1.5">
                      {generateHistory.slice(0, 5).map((record) => (
                        <button
                          key={record.id}
                          onClick={() => handleLoadHistory(record)}
                          disabled={isLocked}
                          className={`w-full text-left p-2.5 bg-light-1 dark:bg-dark-1 hover:bg-light-2 dark:hover:bg-dark-3 border border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50 rounded-xl transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-dark-1 dark:text-white line-clamp-1">
                              {record.prompt}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:bg-primary/20 text-[10px] font-medium">
                              {chartTypeLabel[record.chartType]}
                            </span>
                            <span>·</span>
                            <span>{formatTime(record.timestamp)}</span>
                          </div>
                          <pre className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-500 bg-light-2 dark:bg-dark-3 p-2 rounded-lg overflow-hidden max-h-10 leading-relaxed font-mono">
                            {formatPreview(record.code)}
                          </pre>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-light-3 dark:border-dark-3">
                  <span className="text-amber-500">⚠️</span>
                  <span>AI 生成结果仅供参考，请手动核对后使用</span>
                </div>
              </div>
            ) : (
              <ChatPanel
                user={user}
                isLocked={isLocked}
                messages={chatMessages}
                sending={chatSending}
                input={chatInput}
                setInput={setChatInput}
                onSend={handleSendChat}
                onClear={clearChat}
                messagesEndRef={messagesEndRef}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  // 桌面端：侧边栏模式，根据用户设置的位置（left/right/bottom）适配方向
  const isBottom = position === 'bottom';
  const borderClass = isBottom
    ? 'border-t border-light-3 dark:border-dark-3'
    : position === 'right'
      ? 'border-l border-light-3 dark:border-dark-3'
      : 'border-r border-light-3 dark:border-dark-3';

  return (
    <div
      className={`bg-white dark:bg-dark-2 ${borderClass} flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out`}
      style={
        isBottom
          ? {
              width: '100%',
              height: isOpen ? `${effectiveWidth}px` : '0px',
              transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
              opacity: isOpen ? 1 : 0,
              flexShrink: 0,
            }
          : {
              width: isOpen ? `${effectiveWidth}px` : '0px',
              transform: isOpen ? 'translateX(0)' : position === 'right' ? 'translateX(100%)' : 'translateX(-100%)',
              opacity: isOpen ? 1 : 0,
              flexShrink: 0,
            }
      }
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-light-3 dark:border-dark-3 bg-light-1/50 dark:bg-dark-1/50">
        <div className="flex gap-1">
          <button
            onClick={() => handleTabChange('generate')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'generate'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white dark:hover:bg-dark-2'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            AI 生成
          </button>
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-purple-500 hover:bg-white dark:hover:bg-dark-2'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI 对话
          </button>
        </div>
        <button
          onClick={closeSidebar}
          className="p-2 rounded-lg hover:bg-light-2 dark:hover:bg-dark-3 text-gray-400 hover:text-dark-1 dark:hover:text-white transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'generate' ? (
          <div className="p-3 space-y-3">
            {!user && (
              <div className="p-3 bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border border-primary/30 dark:border-primary/40 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 dark:bg-primary/30 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-1 dark:text-white text-xs mb-0.5">登录后使用 AI 生成</p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">保存生成历史记录，解锁全部 AI 能力</p>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      去登录 <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                图表类型
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  key="auto"
                  onClick={() => setSelectedChartType('unknown')}
                  disabled={isLocked}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                    selectedChartType === 'unknown'
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                      : 'bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="让AI根据描述自动选择图表类型"
                >
                  🤖 AI 自动
                </button>
                {chartTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedChartType(type)}
                    disabled={isLocked}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                      selectedChartType === type
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                        : 'bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50'
                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {chartTypeLabel[type]}
                    {selectedChartType === type && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChartType('unknown');
                        }}
                        className="w-3 h-3 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-[10px] cursor-pointer"
                        title="清空选择"
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedChartType !== 'unknown' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                💡 快捷提示
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(quickPrompts[selectedChartType] || quickPrompts.flowchart).map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(qp.text)}
                    disabled={isLocked}
                    className={`px-2 py-1 text-[11px] rounded-lg border border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                描述你想要的图表
              </label>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 leading-relaxed">
                用大白话描述即可，AI 会自动转换成图表。例如"用户下单后扣库存，库存不足则提示"
              </p>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`例如：${(quickPrompts[selectedChartType] || quickPrompts.flowchart)[0]?.text}`}
                  disabled={isLocked}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-xs leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute bottom-2 right-2.5 text-[10px] text-gray-400 dark:text-gray-500">
                  {prompt.length} / 500
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLocked || !prompt.trim() || generating}
              className="w-full py-2.5 bg-gradient-to-r from-primary to-purple-500 hover:from-primary-dark hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-dark-3 dark:disabled:to-dark-3 text-white rounded-xl font-medium text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  生成 {chartTypeLabel[selectedChartType]} 代码
                </>
              )}
            </button>

            {generateHistory.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    最近生成
                  </label>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{generateHistory.length} 条</span>
                </div>
                <div className="space-y-1.5">
                  {generateHistory.slice(0, 5).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleLoadHistory(record)}
                      disabled={isLocked}
                      className={`w-full text-left p-2.5 bg-light-1 dark:bg-dark-1 hover:bg-light-2 dark:hover:bg-dark-3 border border-light-3 dark:border-dark-3 hover:border-primary/40 dark:hover:border-primary/50 rounded-xl transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-dark-1 dark:text-white line-clamp-1">
                          {record.prompt}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:bg-primary/20 text-[10px] font-medium">
                          {chartTypeLabel[record.chartType]}
                        </span>
                        <span>·</span>
                        <span>{formatTime(record.timestamp)}</span>
                      </div>
                      <pre className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-500 bg-light-2 dark:bg-dark-3 p-2 rounded-lg overflow-hidden max-h-10 leading-relaxed font-mono">
                        {formatPreview(record.code)}
                      </pre>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-light-3 dark:border-dark-3">
              <span className="text-amber-500">⚠️</span>
              <span>AI 生成结果仅供参考，请手动核对后使用</span>
            </div>
          </div>
        ) : (
          <ChatPanel
            user={user}
            isLocked={isLocked}
            messages={chatMessages}
            sending={chatSending}
            input={chatInput}
            setInput={setChatInput}
            onSend={handleSendChat}
            onClear={clearChat}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>
    </div>
  );
};

interface ChatPanelProps {
  user: { id: string; email: string } | null;
  isLocked: boolean;
  messages: ChatRecord[];
  sending: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onClear: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatPanel = ({
  user,
  isLocked,
  messages,
  sending,
  input,
  setInput,
  onSend,
  onClear,
  messagesEndRef,
}: ChatPanelProps) => {
  if (!user) {
    return (
      <div className="p-3">
        <div className="p-3 bg-gradient-to-br from-purple-500/10 to-primary/10 dark:from-purple-500/20 dark:to-primary/20 border border-purple-500/30 dark:border-purple-500/40 rounded-xl">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-dark-1 dark:text-white text-xs mb-0.5">登录后使用 AI 对话</p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">在对话中直接让 AI 修改当前流程图</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                去登录 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const quickChats = [
    '给当前流程图增加一个异常处理分支',
    '把所有节点名称改为英文',
    '增加一个开始和结束节点',
    '简化当前图表，去掉冗余节点',
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center mb-3 shadow-lg shadow-purple-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-semibold text-dark-1 dark:text-white mb-1">AI 对话编辑</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
              直接用自然语言告诉 AI 如何修改当前的流程图
            </p>
            <div className="flex flex-col gap-1.5 w-full">
              {quickChats.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="w-full text-left px-2.5 py-2 text-[11px] rounded-lg border border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 hover:border-purple-500/50 hover:text-purple-500 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-light-1 dark:bg-dark-1 text-dark-1 dark:text-white border border-light-3 dark:border-dark-3 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && (
        <div className="px-3 pt-1">
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-error transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            清空对话
          </button>
        </div>
      )}

      <div className="p-3 border-t border-light-3 dark:border-dark-3">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="告诉 AI 如何修改当前图表…（Enter 发送，Shift+Enter 换行）"
            disabled={isLocked || sending}
            rows={2}
            className="w-full px-3 py-2 pr-9 bg-light-1 dark:bg-dark-1 border border-light-3 dark:border-dark-3 rounded-xl text-dark-1 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all text-xs leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={onSend}
            disabled={isLocked || sending || !input.trim()}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-dark-3 text-white transition-colors disabled:cursor-not-allowed"
            title="发送"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISidebar;
