import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useEditorStore, getChartTypeInfo, useChartType } from '@/contexts/EditorContext';
import { useThemeStore } from '@/contexts/ThemeContext';
import { Code2, Copy, Trash2, Check, Wand2, ArrowUpDown, FileText, Loader2, HardDrive, Cloud } from 'lucide-react';
import { useAIStore } from '@/contexts/AIContext';
import { useDocStore } from '@/contexts/DocContext';
import { useLocalDocStore } from '@/contexts/LocalDocContext';
import { useAuthStore } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useActiveSettings } from '@/contexts/SettingsContext';
import { Dialog } from '@/components/Common/Dialog';
import { getCompletions, getLineContext } from '@/lib/mermaidAutocomplete';
import { formatMermaidSimple } from '@/lib/mermaidFormatter';

// 在模块级别注册 Mermaid 语言，确保只注册一次
let mermaidLanguageRegistered = false;

export const registerMermaidLanguage = (monacoInstance: typeof monaco) => {
  if (mermaidLanguageRegistered) return;
  
  // 注册 Mermaid 语言
  monacoInstance.languages.register({ id: 'mermaid' });
  
  // 定义 Mermaid 语言的词法规则
  monacoInstance.languages.setMonarchTokensProvider('mermaid', {
    tokenizer: {
      root: [
        [/flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|c4model|userJourney|kanban|gitgraph|calendar|bpmn|blockDiagram|architectureDiagram|gauge|vega|vegaLite|network|userstory|zenuml|wireframe|xyChart|wbs|treemap|pieChart|quadrant|sankey|causalLoop|faultTree|mindmap|tree|workBreakdown|csp|contribution|classDiagram|componentDiagram|deploymentDiagram|packageDiagram|profileDiagram|objectDiagram|useCaseDiagram|activityDiagram|stateDiagram|sequenceDiagram|communicationDiagram|interactionOverviewDiagram|timingDiagram|bpmnDiagram|ganttDiagram|pieDiagram|quadrantDiagram|sankeyDiagram|c4Diagram|gitGraphDiagram|mindmapDiagram|timelineDiagram|treemapDiagram|workBreakdownDiagram|cspDiagram|contributionDiagram|architectureDiagram|blockDiagram|gaugeDiagram|vegaDiagram|vegaLiteDiagram|networkDiagram|userstoryDiagram|zenumlDiagram|wireframeDiagram|xyChartDiagram|wbsDiagram|causalLoopDiagram|faultTreeDiagram|treeDiagram|ishikawaDiagram|wardleyDiagram|erDiagram|stateDiagram-v2|pie|gantt|erDiagram|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie/i, 'keyword'],
        [/participant|actor|class|interface|abstract|state|section|title|dateFormat|excludes|entity|note|loop|alt|opt|par|critical|group|else|end|break|activate|deactivate|rect|style|linkStyle|classDef|click|def|as|is|of|in|and|or|not|for|while|loop|repeat|until|elseif|case|switch|default|try|catch|finally|throw|return|continue|break|function|procedure|method|property|attribute|extends|implements|interface|enum|typedef|namespace|package|module|import|export|requires|provides|uses|creates|destroys|has|knows|contains|covers|includes|extends|realizes|aggregates|composes|associates|depends|generalizes|specializes|instantiates|classifies|subclassifies|realizes|implements|defines|specifies|refines|traces|copies|consistsOf|hasMember|hasStructure|hasBehavior|hasFeature|hasConstraint|hasInstance|hasProperty|hasOperation|hasParameter|hasReturnType|hasException|hasPrecondition|hasPostcondition|hasInvariant|hasTrigger|hasEffect|hasGuard|hasBody|hasValue|hasInitialValue|hasDefaultValue|hasEnumerationLiteral|hasSuperclass|hasSubclass|hasInterface|hasRealization|hasAssociation|hasAggregation|hasComposition|hasDependency|hasGeneralization|hasSpecialization|hasInstantiation|hasClassification|hasSubclassification|hasRealization|hasImplementation|hasDefinition|hasSpecification|hasRefinement|hasTrace|hasCopy|hasConsistsOf|hasMember|hasStructure|hasBehavior|hasFeature|hasConstraint|hasInstance|hasProperty|hasOperation|hasParameter|hasReturnType|hasException|hasPrecondition|hasPostcondition|hasInvariant|hasTrigger|hasEffect|hasGuard|hasBody|hasValue|hasInitialValue|hasDefaultValue|hasEnumerationLiteral|hasSuperclass|hasSubclass|hasInterface|hasRealization|hasAssociation|hasAggregation|hasComposition|hasDependency|hasGeneralization|hasSpecialization|hasInstantiation|hasClassification|hasSubclassification|hasRealization|hasImplementation|hasDefinition|hasSpecification|hasRefinement|hasTrace|hasCopy/i, 'keyword'],
        [/->>|-->>|-x|--x|->|-->|<--|\|\|--o\{|\|\|--\|\||\}o--\|\||\}o--o\{|<\|--|<\|..|\*--|o--|\.\.|==>|-.->|\.\.>/, 'operator'],
        [/\[\*\]/, 'constant'],
        [/\[\w+\]/, 'string'],
        [/\(\w+\)/, 'string'],
        [/\{[\s\S]*?\}/, 'string'],
        [/%%.*$/, 'comment'],
        [/\b[A-Za-z]+\b/, 'variable'],
      ],
    },
  });
  
  // 注册补全提供者
  monacoInstance.languages.registerCompletionItemProvider('mermaid', {
    provideCompletionItems: (model, position) => {
      const { chartType, lineText } = getLineContext(model.getValue(), position.lineNumber);
      const completions = getCompletions(chartType, lineText);
      
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );
      
      return {
        suggestions: completions.map((item) => ({
          label: item.label,
          kind: item.kind === 'keyword' ? monacoInstance.languages.CompletionItemKind.Keyword :
                item.kind === 'variable' ? monacoInstance.languages.CompletionItemKind.Variable :
                item.kind === 'function' ? monacoInstance.languages.CompletionItemKind.Function :
                item.kind === 'constant' ? monacoInstance.languages.CompletionItemKind.Constant :
                monacoInstance.languages.CompletionItemKind.Class,
          insertText: item.insertText,
          range: range,
          documentation: {
            value: item.documentation || '',
          },
          sortText: `0${item.label}`,
          filterText: item.label,
        })),
      };
    },
    triggerCharacters: ['f', 's', 'c', 'g', 'e', 'p', '-', '>', '|', ' ', '\t'],
  });
  
  mermaidLanguageRegistered = true;
};

export const CodeEditor = () => {
  const { code, setCode, errors, highlightedNodeId } = useEditorStore();
  const currentChartType = useChartType();
  const { theme } = useThemeStore();
  // 读取用户编辑器设置（字体大小 / 自动换行 / 行号），实时预览 + 手动持久化
  const { editorFontSize, editorWordWrap, editorLineNumbers } = useActiveSettings();
  const {
    openSidebar,
    closeSidebar,
  } = useAIStore();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const cloudSaveAsDoc = useDocStore((s) => s.saveAsDocFromChart);
  const localSaveAsDoc = useLocalDocStore((s) => s.saveAsDocFromChart);
  const { user } = useAuthStore();
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [savingAsDoc, setSavingAsDoc] = useState(false);
  const [showSaveAsDocDialog, setShowSaveAsDocDialog] = useState(false);
  const decorationRef = useRef<string[]>([]);
  // 节点高亮装饰 ID（独立于错误高亮，避免互相清除）
  const nodeHighlightRef = useRef<string[]>([]);

  const chartInfo = getChartTypeInfo(currentChartType);

  // 语法补全处理
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.focus();

    // 使用编辑器的 monaco 实例注册 Mermaid 语言
    registerMermaidLanguage(monaco);
  };

  // 错误高亮处理
  useEffect(() => {
    if (!editorRef.current) return;

    // 清除之前的装饰
    decorationRef.current.forEach((id) => {
      editorRef.current.deltaDecorations(id, []);
    });
    decorationRef.current = [];

    // 如果有错误，添加高亮装饰
    if (errors && errors.length > 0) {
      const errorLines = errors.map((e) => e.line).filter((line) => line > 0);
      if (errorLines.length > 0) {
        const decorations = errorLines.map((line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'editor-error-line',
            glyphMarginClassName: 'editor-error-glyph',
            hoverMessage: {
              value: errors.find((e) => e.line === line)?.message || '语法错误',
            },
          },
        }));

        const decoId = editorRef.current.deltaDecorations([], decorations);
        decorationRef.current.push(decoId);
      }
    }
  }, [errors]);

  // 节点点选高亮（包5 只读高亮版）：Preview 点击 SVG 节点 → 高亮代码中对应行并滚动
  useEffect(() => {
    if (!editorRef.current) return;
    // 清除上一次的节点高亮装饰
    nodeHighlightRef.current.forEach((id) => {
      editorRef.current.deltaDecorations(id, []);
    });
    nodeHighlightRef.current = [];
    if (!highlightedNodeId) return;

    // 在代码中按行搜索节点 ID（用单词边界匹配，避免子串误匹配，如 A 不应匹配 AB）
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapeRegExp(highlightedNodeId)}\\b`);
    const lines = code.split('\n');
    const matchedLines: number[] = [];
    lines.forEach((line, idx) => {
      if (regex.test(line)) matchedLines.push(idx + 1);
    });
    if (matchedLines.length === 0) return;

    const decorations = matchedLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'editor-node-highlight',
      },
    }));
    const decoId = editorRef.current.deltaDecorations([], decorations);
    nodeHighlightRef.current.push(decoId);
    // 滚动到第一个匹配行，让用户立即看到对应代码
    editorRef.current.revealLineInCenter(matchedLines[0]);
  }, [highlightedNodeId, code]);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        model.updateOptions({ tabSize: 2 });
      }
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleClear = () => {
    // 二次确认：避免误触导致代码丢失，且不影响自动保存的草稿恢复
    if (!code) return;
    if (!window.confirm('确定要清空当前图表代码吗？此操作不可撤销。')) return;
    setCode('');
  };

  // 格式化代码
  const handleFormat = async () => {
    if (!code.trim()) return;
    setFormatting(true);
    try {
      const formatted = formatMermaidSimple(code);
      setCode(formatted);
      showSuccess('代码已格式化');
    } catch (err) {
      console.error('Format failed:', err);
    } finally {
      setFormatting(false);
    }
  };

  // 保存为 Markdown 文档：将当前 mermaid 代码包装为 ```mermaid 块并落库，
  // 跳转到 /docs/:id 继续在文档内编辑（P2：与 Mermaid 协同）
  // 跳转前关闭 AI 侧栏，避免状态残留到文档页（两个页面共享同一 AI store）
  //
  // 存储策略：
  // - 非登录：自动保存至本地存储（确保数据不丢失）
  // - 已登录：弹窗让用户选择「本地」或「云端」
  const handleSaveAsDoc = async () => {
    if (!code.trim() || savingAsDoc) return;
    // 非登录用户直接存本地
    if (!user) {
      await doSaveAsDoc('local');
      return;
    }
    // 登录用户弹窗选择存储位置
    setShowSaveAsDocDialog(true);
  };

  // 实际执行保存：target 区分本地/云端，返回文档 ID 后跳转编辑页
  const doSaveAsDoc = async (target: 'local' | 'cloud') => {
    if (!code.trim() || savingAsDoc) return;
    setSavingAsDoc(true);
    setShowSaveAsDocDialog(false);
    try {
      const saveFn = target === 'cloud' ? cloudSaveAsDoc : localSaveAsDoc;
      const docId = await saveFn(code);
      showSuccess(`已保存为文档（${target === 'cloud' ? '云端' : '本地'}存储）`);
      closeSidebar();
      navigate(`/docs/${docId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存文档失败');
    } finally {
      setSavingAsDoc(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-light-1 dark:bg-dark-1">
      {/* 工具栏 - 支持响应式换行和收缩 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-light-2 dark:bg-dark-2 border-b border-light-3 dark:border-dark-3 theme-transition">
        {/* 左侧：图表类型状态指示器 - 支持响应式隐藏，避免与右侧按钮重叠 */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink overflow-hidden">
          {/* 代码图标和标签 - 极窄时只显示图标 */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="hidden sm:inline text-sm font-medium text-dark-1 dark:text-white whitespace-nowrap">代码</span>
          </div>

          {/* 图表类型指示器 - 根据宽度逐步隐藏内容 */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-light-3 dark:border-dark-3 min-w-0">
            <div
              key={currentChartType}
              className={
                'flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-300 ' +
                chartInfo.accent
              }
            >
              <span className="text-sm">{chartInfo.icon}</span>
              <span className="hidden lg:inline whitespace-nowrap">{chartInfo.label}</span>
            </div>
          </div>

          {/* 小宽度时的简化版本 - 仅显示图标徽章，确保不与按钮重叠 */}
          <div className="md:hidden flex items-center gap-1 pl-2 border-l border-light-3 dark:border-dark-3">
            <div
              key={currentChartType}
              className={
                'flex items-center justify-center w-6 h-6 rounded-md text-sm border transition-all duration-300 ' +
                chartInfo.accent
              }
              title={chartInfo.label}
            >
              {chartInfo.icon}
            </div>
          </div>
        </div>

        {/* 右侧：工具栏 - 优先保证显示空间，允许换行 */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap justify-end flex-1 sm:flex-none min-w-0">
          {/* AI 助手按钮 - 在较窄宽度下只显示图标，优先保证显示空间 */}
          <div className="flex items-center gap-0.5 px-0.5 sm:px-1 flex-shrink-0">
            <button
              onClick={() => openSidebar('generate')}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 text-primary hover:from-primary/20 hover:to-purple-500/20 border border-primary/30 dark:border-primary/40 transition-all duration-200"
              title="AI 助手 - 生成图表代码或与AI对话"
            >
              <Wand2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">AI 助手</span>
            </button>
          </div>

          <div className="w-px h-5 sm:h-6 bg-light-3 dark:bg-dark-3 mx-0.5 sm:mx-1 hidden lg:block" />

          {/* 次要按钮组：复制 / 格式化 / 加载 / 清空 - 窄宽度优先保证空间 */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-success transition-colors flex-shrink-0"
              title={copied ? '已复制' : '复制代码'}
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleFormat}
              disabled={formatting || !code.trim()}
              className="p-1.5 rounded-lg hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-info transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="格式化代码"
            >
              {formatting ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <ArrowUpDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-light-3 dark:hover:bg-dark-3 text-gray-500 dark:text-gray-400 hover:text-error transition-colors flex-shrink-0"
              title="清空"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* 保存为文档：将当前图表作为 mermaid 块写入新 MD 文档（P2 协同入口） */}
          <div className="w-px h-5 sm:h-6 bg-light-3 dark:bg-dark-3 mx-0.5 sm:mx-1 hidden lg:block" />
          <button
            onClick={handleSaveAsDoc}
            disabled={savingAsDoc || !code.trim()}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium bg-light-1 dark:bg-dark-1 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/40 border border-light-3 dark:border-dark-3 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title={user ? '保存为 Markdown 文档（可选择本地或云端存储）' : '保存为 Markdown 文档（本地存储）'}
          >
            {savingAsDoc ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline whitespace-nowrap">存为文档</span>
            {user ? (
              <Cloud className="w-3 h-3 text-emerald-500 hidden lg:inline" />
            ) : (
              <HardDrive className="w-3 h-3 text-blue-500 hidden lg:inline" />
            )}
          </button>
        </div>
      </div>

      {/* Monaco 编辑器 */}
      <div className="flex-1 relative bg-light-1 dark:bg-dark-1">
        <Editor
          height="100%"
          language="mermaid"
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: false },
            fontSize: editorFontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: editorLineNumbers ? 'on' : 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            lineHeight: 1.6,
            wordWrap: editorWordWrap ? 'on' : 'off',
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            // 启用代码补全
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            suggest: {
              showIcons: true,
              filterGraceful: true,
            },
          }}
        />
      </div>

      {/* 存储位置选择弹窗：仅登录态下点击「存为文档」时显示 */}
      <Dialog
        open={showSaveAsDocDialog}
        title="选择存储位置"
        description="请选择文档的保存位置，登录后可使用云端存储以便跨设备访问。"
        onClose={() => setShowSaveAsDocDialog(false)}
        maxWidth="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {/* 本地存储选项 */}
          <button
            type="button"
            onClick={() => doSaveAsDoc('local')}
            disabled={savingAsDoc}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-light-3 dark:border-dark-3 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="font-semibold text-dark-1 dark:text-white">本地存储</span>
            </div>
            <p className="text-xs text-light-text-2 dark:text-dark-text-2 leading-relaxed">
              保存在当前浏览器，免登录即用，不跨设备同步。
            </p>
          </button>

          {/* 云端存储选项 */}
          <button
            type="button"
            onClick={() => doSaveAsDoc('cloud')}
            disabled={savingAsDoc}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-light-3 dark:border-dark-3 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Cloud className="w-5 h-5" />
              </div>
              <span className="font-semibold text-dark-1 dark:text-white">云端存储</span>
            </div>
            <p className="text-xs text-light-text-2 dark:text-dark-text-2 leading-relaxed">
              保存在云端，支持跨设备访问、分享与协作。
            </p>
          </button>
        </div>
        {savingAsDoc && (
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-light-text-2 dark:text-dark-text-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在保存…
          </div>
        )}
      </Dialog>
    </div>
  );
};
