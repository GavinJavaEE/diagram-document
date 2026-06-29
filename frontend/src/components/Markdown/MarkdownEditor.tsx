import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { MarkdownToolbar, type MdInsertAction } from './MarkdownToolbar';
import { useThemeStore } from '@/contexts/ThemeContext';

/**
 * Markdown 编辑器
 * - 基于 Monaco（项目已集成 @monaco-editor/react），使用内置 markdown 语言
 * - 工具栏通过 executeEdits / 逐行前缀插入语法
 * - 受控：value/onChange 由父组件管理
 * - 主题跟随系统：浅色用 'light'，暗色用 'vs-dark'，避免编辑区/预览区视觉割裂
 * - 编辑器内绑定 Ctrl+B/I（加粗/斜体）与 Ctrl+S（保存）快捷键
 *
 * 注：不直接 import 'monaco-editor' 类型（非项目直接依赖），
 *     monaco 命名空间通过 OnMount 回调参数获取，类型用内联推断。
 */
interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  /** Ctrl+S 触发的保存回调（与全局 Ctrl+S 拦截等价，Monaco 焦点下也能命中） */
  onSave?: () => void;
}

// 从 OnMount 提取 editor 与 monaco 命名空间的类型
type EditorInstance = Parameters<OnMount>[0];
type MonacoNamespace = Parameters<OnMount>[1];

// 复用的快捷键动作定义（与工具栏按钮保持一致）
const BOLD_ACTION: MdInsertAction = { type: 'wrap', prefix: '**', suffix: '**', placeholder: '加粗文本' };
const ITALIC_ACTION: MdInsertAction = { type: 'wrap', prefix: '*', suffix: '*', placeholder: '斜体文本' };

export const MarkdownEditor = ({ value, onChange, onSave }: MarkdownEditorProps) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const { theme } = useThemeStore();

  // 将 handleInsert 提升到组件作用域，便于快捷键与工具栏共用
  const handleInsert = (action: MdInsertAction) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const selection = editor.getSelection();
    if (!model || !selection) return;

    if (action.type === 'wrap') {
      const selected = model.getValueInRange(selection);
      const placeholder = action.placeholder || '';
      const text = selected || placeholder;
      const newText = `${action.prefix || ''}${text}${action.suffix || ''}`;
      editor.executeEdits('md-toolbar', [
        { range: selection, text: newText, forceMoveMarkers: true },
      ]);

      // 无选区：选中占位文本，便于直接替换输入
      if (!selected) {
        const start = selection.getStartPosition();
        const prefixLen = (action.prefix || '').length;
        editor.setSelection(
          new monaco.Range(
            start.lineNumber,
            start.column + prefixLen,
            start.lineNumber,
            start.column + prefixLen + placeholder.length,
          ),
        );
      }
      editor.focus();
      return;
    }

    if (action.type === 'linePrefix') {
      const prefix = action.prefix || '';
      const startLine = selection.startLineNumber;
      const endLine = selection.endLineNumber;
      const ops = [];
      for (let ln = startLine; ln <= endLine; ln++) {
        ops.push({
          range: new monaco.Range(ln, 1, ln, 1),
          text: prefix,
          forceMoveMarkers: true,
        });
      }
      editor.executeEdits('md-toolbar', ops);
      editor.setSelection(
        new monaco.Range(
          startLine,
          1 + prefix.length,
          endLine,
          model.getLineContent(endLine).length + 1 + prefix.length,
        ),
      );
      editor.focus();
      return;
    }

    // type === 'block'
    const template = action.template || '';
    const pos = selection.getStartPosition();
    editor.executeEdits('md-toolbar', [
      {
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: template,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = editor.getModel();
    if (model) model.updateOptions({ tabSize: 2 });

    // Monaco 默认不带 Markdown 快捷键，这里补齐加粗/斜体（与工具栏动作一致）
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => handleInsert(BOLD_ACTION));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => handleInsert(ITALIC_ACTION));
    // Ctrl+S：拦截浏览器原生保存，触发上层保存逻辑（onSave 可选）
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave());
    }

    editor.focus();
  };

  // 撤销 / 重做：暴露给工具栏按钮使用，无历史时 Monaco 内部自动 no-op
  const handleUndo = () => {
    editorRef.current?.trigger('md-toolbar', 'undo', null);
    editorRef.current?.focus();
  };
  const handleRedo = () => {
    editorRef.current?.trigger('md-toolbar', 'redo', null);
    editorRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-light-1 dark:bg-dark-1">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3">
        <MarkdownToolbar
          onInsert={handleInsert}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          language="markdown"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            lineHeight: 26,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              verticalSliderSize: 8,
              horizontalSliderSize: 8,
              useShadows: false,
            },
          }}
        />
      </div>
    </div>
  );
};
