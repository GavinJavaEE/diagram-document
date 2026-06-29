import { useState } from 'react';
import { LayoutTemplate, Settings } from 'lucide-react';
import { chartShowcases, chartCategoryLabels, type ChartCategory } from '@/data/chartShowcases';
import { useEditorStore } from '@/contexts/EditorContext';
import { useToast } from '@/contexts/ToastContext';
import { useSettingsStore } from '@/contexts/SettingsContext';

/**
 * 绘图编辑器「快速开始」面板。
 *
 * 解决从首页硬切到全屏编辑器的突兀感：进入编辑器后顶部即有引导内容。
 * - 场景分类筛选：按「全部 / 流程 / 架构 / 规划」过滤模板，帮助非技术用户按场景定位
 * - 模板画廊：横向滚动的图表类型按钮，点击加载示例代码到编辑器
 *
 * 布局：始终一行高度（约 40px），不挤压编辑区。
 * 模板与 AI 是协同关系（点模板作为起点 → 让 AI 在此基础上优化），因此始终显示。
 */
export const QuickStartPanel = () => {
  const loadTemplateCode = useEditorStore((s) => s.loadTemplate);
  const openSettings = useSettingsStore((s) => s.openDrawer);
  const { showSuccess } = useToast();
  const [activeCategory, setActiveCategory] = useState<ChartCategory | 'all'>('all');

  const loadTemplate = (codeSample: string, title: string) => {
    // 使用 loadTemplate 而非 setCode：仅加载到编辑器作为起点，
    // 不触发 isDirty/自动保存，避免用户连续切换模板时产生大量空白文档
    loadTemplateCode(codeSample);
    showSuccess(`已加载「${title}」模板`);
  };

  // 按选中分类过滤模板
  const filteredShowcases =
    activeCategory === 'all'
      ? chartShowcases
      : chartShowcases.filter((c) => c.category === activeCategory);

  // 分类选项：全部 + 3 个场景
  const categoryOptions: { value: ChartCategory | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    ...(Object.keys(chartCategoryLabels) as ChartCategory[]).map((key) => ({
      value: key,
      label: chartCategoryLabels[key],
    })),
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-light-3 dark:border-dark-3 bg-white dark:bg-dark-1">
      <span className="flex items-center gap-1 text-xs font-medium text-light-text-2 dark:text-dark-text-2 shrink-0">
        <LayoutTemplate className="w-3.5 h-3.5" />
        快速开始
      </span>

      {/* 场景分类筛选 Tab：帮助非技术用户按使用场景定位模板 */}
      <div className="flex items-center gap-0.5 shrink-0">
        {categoryOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveCategory(opt.value)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              activeCategory === opt.value
                ? 'bg-primary/10 text-primary'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-light-3 dark:bg-dark-3 shrink-0" />

      {/* 模板画廊：横向滚动，点击加载示例代码 */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
        {filteredShowcases.map((c) => (
          <button
            key={c.key}
            onClick={() => loadTemplate(c.codeSample, c.title)}
            className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors"
            title={c.description}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* 偏好设置：从预览区工具栏迁移至此，与模板按钮风格一致，常驻最右侧 */}
      <button
        onClick={openSettings}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-light-2 dark:bg-dark-2 text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors"
        title="偏好设置"
      >
        <Settings className="w-3.5 h-3.5" />
        设置
      </button>
    </div>
  );
};
