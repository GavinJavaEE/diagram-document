import {
  Bold, Italic, Heading, List, ListOrdered, Code2, Table, GitBranch,
  Link as LinkIcon, Quote, Undo2, Redo2,
  type LucideIcon,
} from 'lucide-react';

/**
 * Markdown 编辑工具栏
 * 通过 onInsert 回调向编辑器插入语法标记。
 * 设计为受控组件：不持有状态，由父组件协调与 Monaco 编辑器交互。
 *
 * 分组：撤销重做 / 文字格式 / 段落 / 插入，组间用分隔线区分，降低认知负荷。
 * title 含快捷键提示（仅标注已绑定的 Ctrl+B/I/Z/Y）。
 */

export interface MdInsertAction {
  /** 插入类型，决定包装方式 */
  type:
    | 'wrap'        // 在选区两侧包裹前后缀（如 **加粗**）
    | 'linePrefix'  // 在每行行首加前缀（如 # 标题）
    | 'block';      // 插入整块多行模板（如表格、代码块）
  /** wrap: 前缀；linePrefix: 行首；block: 完整模板 */
  prefix?: string;
  /** wrap: 后缀 */
  suffix?: string;
  /** linePrefix: 每行前缀；block: 完整文本 */
  template?: string;
  /** 无选区时的占位文本 */
  placeholder?: string;
}

interface InsertButton {
  kind: 'insert';
  id: string;
  title: string;
  icon: LucideIcon;
  action: MdInsertAction;
}

interface CommandButton {
  kind: 'command';
  id: string;
  title: string;
  icon: LucideIcon;
  /** 调用撤销或重做回调 */
  command: 'undo' | 'redo';
}

type ToolbarItem = InsertButton | CommandButton;

interface ButtonGroup {
  label: string;
  items: ToolbarItem[];
}

// 按组分类：撤销重做 / 文字格式 / 段落 / 插入
const GROUPS: ButtonGroup[] = [
  {
    label: '撤销重做',
    items: [
      { kind: 'command', id: 'undo', title: '撤销 (Ctrl+Z)', icon: Undo2, command: 'undo' },
      { kind: 'command', id: 'redo', title: '重做 (Ctrl+Y)', icon: Redo2, command: 'redo' },
    ],
  },
  {
    label: '文字格式',
    items: [
      { kind: 'insert', id: 'bold', title: '加粗 (Ctrl+B)', icon: Bold, action: { type: 'wrap', prefix: '**', suffix: '**', placeholder: '加粗文本' } },
      { kind: 'insert', id: 'italic', title: '斜体 (Ctrl+I)', icon: Italic, action: { type: 'wrap', prefix: '*', suffix: '*', placeholder: '斜体文本' } },
      { kind: 'insert', id: 'code', title: '行内代码', icon: Code2, action: { type: 'wrap', prefix: '`', suffix: '`', placeholder: 'code' } },
    ],
  },
  {
    label: '段落',
    items: [
      { kind: 'insert', id: 'heading', title: '标题', icon: Heading, action: { type: 'linePrefix', prefix: '## ', placeholder: '标题' } },
      { kind: 'insert', id: 'quote', title: '引用', icon: Quote, action: { type: 'linePrefix', prefix: '> ', placeholder: '引用内容' } },
      { kind: 'insert', id: 'ul', title: '无序列表', icon: List, action: { type: 'linePrefix', prefix: '- ', placeholder: '列表项' } },
      { kind: 'insert', id: 'ol', title: '有序列表', icon: ListOrdered, action: { type: 'linePrefix', prefix: '1. ', placeholder: '列表项' } },
    ],
  },
  {
    label: '插入',
    items: [
      { kind: 'insert', id: 'link', title: '链接', icon: LinkIcon, action: { type: 'wrap', prefix: '[', suffix: '](https://)', placeholder: '链接文字' } },
      { kind: 'insert', id: 'codeblock', title: '代码块', icon: Code2, action: { type: 'block', template: '\n```\n代码\n```\n', placeholder: '代码' } },
      { kind: 'insert', id: 'mermaid', title: '插入 Mermaid 图表', icon: GitBranch, action: { type: 'block', template: '\n```mermaid\nflowchart TD\n  A[开始] --> B[结束]\n```\n', placeholder: 'mermaid' } },
      { kind: 'insert', id: 'table', title: '表格', icon: Table, action: { type: 'block', template: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| A | B | C |\n', placeholder: '表格' } },
    ],
  },
];

interface MarkdownToolbarProps {
  onInsert: (action: MdInsertAction) => void;
  /** 撤销按钮回调（由 MarkdownEditor 通过 Monaco editor ref 提供） */
  onUndo?: () => void;
  /** 重做按钮回调（由 MarkdownEditor 通过 Monaco editor ref 提供） */
  onRedo?: () => void;
}

export const MarkdownToolbar = ({ onInsert, onUndo, onRedo }: MarkdownToolbarProps) => {
  return (
    <div className="flex items-center gap-0.5 flex-wrap" role="toolbar" aria-label="Markdown 编辑工具栏">
      {GROUPS.map((group, gi) => (
        <div key={group.label} className="flex items-center">
          {/* 组间分隔线（首组前不放） */}
          {gi > 0 && (
            <div
              className="w-px h-5 bg-light-3 dark:bg-dark-3 mx-1"
              role="separator"
              aria-orientation="vertical"
            />
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const commonCls =
              'p-1.5 rounded hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';
            if (item.kind === 'command') {
              const handler = item.command === 'undo' ? onUndo : onRedo;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handler}
                  disabled={!handler}
                  className={commonCls}
                  title={item.title}
                  aria-label={item.title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onInsert(item.action)}
                className={commonCls}
                title={item.title}
                aria-label={item.title}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
