import {
  Settings as SettingsIcon,
  X,
  RotateCcw,
  Check,
  Eraser,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Eye,
  Code2,
  Columns2,
} from 'lucide-react';
import { useSettingsStore } from '@/contexts/SettingsContext';
import type {
  AISidebarPosition,
  ViewMode,
  ChartTheme,
  DefaultAITab,
} from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * 设置 Drawer：右侧滑出面板。
 *
 * UX 机制：
 * - 实时预览：修改 draft 时编辑器立即响应（通过 useActiveSettings）
 * - 手动持久化：点"保存"才将 draft 提交到 settings 并关闭 Drawer
 * - 草稿保留：点"×"或遮罩关闭时不保存，draft 保留供下次恢复
 * - "放弃改动"：draft 回滚到 settings（清空未保存改动）
 * - "重置默认"：draft 设为默认值（需再点保存才生效）
 */
export const SettingsDrawer = () => {
  const {
    isDrawerOpen,
    draft,
    closeDrawer,
    updateDraft,
    saveDraft,
    resetDraft,
    resetToDefault,
  } = useSettingsStore();
  const { showSuccess } = useToast();

  const handleSave = () => {
    saveDraft();
    showSuccess('设置已保存');
  };

  // AI 侧栏位置选项
  const positionOptions: { value: AISidebarPosition; label: string; icon: React.ReactNode }[] = [
    { value: 'left', label: '左侧', icon: <PanelLeft className="w-4 h-4" /> },
    { value: 'right', label: '右侧', icon: <PanelRight className="w-4 h-4" /> },
    { value: 'bottom', label: '底部', icon: <PanelBottom className="w-4 h-4" /> },
  ];

  // 视图模式选项
  const viewModeOptions: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'split', label: '分屏', icon: <Columns2 className="w-4 h-4" /> },
    { value: 'code-only', label: '仅代码', icon: <Code2 className="w-4 h-4" /> },
    { value: 'preview-only', label: '仅预览', icon: <Eye className="w-4 h-4" /> },
  ];

  // 图表主题选项
  const chartThemeOptions: { value: ChartTheme; label: string; color: string }[] = [
    { value: 'default', label: '默认', color: 'bg-blue-400' },
    { value: 'forest', label: '森林', color: 'bg-green-400' },
    { value: 'neutral', label: '中性', color: 'bg-gray-400' },
    { value: 'dark', label: '暗色', color: 'bg-slate-700' },
  ];

  // AI Tab 选项
  const aiTabOptions: { value: DefaultAITab; label: string }[] = [
    { value: 'generate', label: 'AI 生成' },
    { value: 'chat', label: 'AI 对话' },
  ];

  return (
    <>
      {/* 遮罩：点击关闭（不保存，草稿保留） */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[90] backdrop-blur-sm animate-fade-in"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer 主体 */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-dark-1 z-[100] shadow-2xl flex flex-col transition-transform duration-300 ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-light-3 dark:border-dark-3 shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-dark-1 dark:text-white">设置</h2>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
            title="关闭（不保存，草稿保留）"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0">
          {/* ◆ 编辑器布局 */}
          <Section title="编辑器布局">
            <Field label="AI 侧栏位置">
              <SegmentedControl
                value={draft.aiSidebarPosition}
                onChange={(v) => updateDraft({ aiSidebarPosition: v as AISidebarPosition })}
                options={positionOptions}
              />
            </Field>

            <RangeField
              label="侧栏宽度"
              value={draft.aiSidebarWidth}
              min={280}
              max={480}
              unit="px"
              onChange={(v) => updateDraft({ aiSidebarWidth: v })}
            />

            <RangeField
              label="代码区占比"
              value={draft.codePreviewRatio}
              min={30}
              max={70}
              unit="%"
              onChange={(v) => updateDraft({ codePreviewRatio: v })}
            />

            <Field label="默认视图模式">
              <SegmentedControl
                value={draft.defaultViewMode}
                onChange={(v) => updateDraft({ defaultViewMode: v as ViewMode })}
                options={viewModeOptions}
              />
            </Field>
          </Section>

          {/* ◆ 外观 */}
          <Section title="外观">
            <Field label="图表配色主题">
              <div className="grid grid-cols-2 gap-2">
                {chartThemeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateDraft({ chartTheme: opt.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      draft.chartTheme === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-light-3 dark:border-dark-3 text-gray-600 dark:text-gray-300 hover:bg-light-2 dark:hover:bg-dark-2'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ◆ 编辑器 */}
          <Section title="编辑器">
            <RangeField
              label="字体大小"
              value={draft.editorFontSize}
              min={12}
              max={20}
              unit="px"
              onChange={(v) => updateDraft({ editorFontSize: v })}
            />

            <ToggleField
              label="自动换行"
              checked={draft.editorWordWrap}
              onChange={(v) => updateDraft({ editorWordWrap: v })}
            />

            <ToggleField
              label="显示行号"
              checked={draft.editorLineNumbers}
              onChange={(v) => updateDraft({ editorLineNumbers: v })}
            />
          </Section>

          {/* ◆ AI */}
          <Section title="AI 助手">
            <Field label="默认打开的 Tab">
              <SegmentedControl
                value={draft.defaultAITab}
                onChange={(v) => updateDraft({ defaultAITab: v as DefaultAITab })}
                options={aiTabOptions}
              />
            </Field>
          </Section>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-light-3 dark:border-dark-3 shrink-0">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
            title="将草稿重置为默认值（需保存才生效）"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置默认
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
              title="放弃当前草稿改动，回滚到已保存状态"
            >
              <Eraser className="w-3.5 h-3.5" />
              放弃改动
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              <Check className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

/* ---------- 子组件 ---------- */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
      {title}
    </h3>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm text-gray-600 dark:text-gray-300">{label}</label>
    {children}
  </div>
);

interface SegOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const SegmentedControl = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SegOption[];
}) => (
  <div className="flex gap-1 p-1 bg-light-2 dark:bg-dark-2 rounded-lg">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === opt.value
            ? 'bg-white dark:bg-dark-1 text-primary shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white'
        }`}
      >
        {opt.icon}
        {opt.label}
      </button>
    ))}
  </div>
);

const RangeField = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600 dark:text-gray-300">{label}</label>
      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary cursor-pointer"
    />
  </div>
);

const ToggleField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <label className="text-sm text-gray-600 dark:text-gray-300">{label}</label>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-light-3 dark:bg-dark-3'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);
