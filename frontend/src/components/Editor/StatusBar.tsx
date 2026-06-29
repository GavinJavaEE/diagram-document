import { useEditorStore, getChartTypeInfo, useChartType } from '@/contexts/EditorContext';
import { Clock, FileText, Hash, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

export const StatusBar = () => {
  const { code, error } = useEditorStore();
  const currentChartType = useChartType();
  const chartInfo = getChartTypeInfo(currentChartType);

  const charCount = code.length;
  const lineCount = code.split('\n').length;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-light-2 dark:bg-dark-2 border-t border-light-3 dark:border-dark-3 text-xs text-gray-500 dark:text-gray-400 theme-transition">
      <div className="flex items-center gap-4">
        {error ? (
          <span className="flex items-center gap-1 text-error">
            <AlertTriangle className="w-3 h-3" />
            语法错误
          </span>
        ) : (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle className="w-3 h-3" />
            语法正确
          </span>
        )}
        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
          <Layers className="w-3 h-3" />
          <span>{chartInfo.icon} {chartInfo.label}</span>
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {lineCount} 行
        </span>
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          {charCount} 字符
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>Mermaid Editor</span>
      </div>
    </div>
  );
};
