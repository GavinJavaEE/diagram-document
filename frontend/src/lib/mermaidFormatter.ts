// Mermaid 代码格式化工具

export interface FormatOptions {
  indentSize?: number;
  useTabs?: boolean;
  maxLineLength?: number;
}

const defaultOptions: FormatOptions = {
  indentSize: 4,
  useTabs: false,
  maxLineLength: 80,
};

// 获取缩进字符串
const getIndent = (level: number, options: FormatOptions): string => {
  const indentChar = options.useTabs ? '\t' : ' ';
  return indentChar.repeat(level * options.indentSize!);
};

// 检测图表类型
const detectChartType = (code: string): string => {
  const trimmed = code.trim().toLowerCase();
  if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) return 'flowchart';
  if (trimmed.startsWith('sequencediagram')) return 'sequence';
  if (trimmed.startsWith('classdiagram')) return 'class';
  if (trimmed.startsWith('statediagram') || trimmed.startsWith('state-diagram')) return 'state';
  if (trimmed.startsWith('gantt')) return 'gantt';
  if (trimmed.startsWith('erdiagram')) return 'er';
  return 'unknown';
};

// 格式化流程图
const formatFlowchart = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  const indent = getIndent(1, options);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理流程图声明行
    if (line.startsWith('flowchart') || line.startsWith('graph')) {
      formatted.push(line);
      continue;
    }
    
    // 处理节点定义（包含 [ 或 ( 或 {）
    if (line.includes('[') || line.includes('(') || line.includes('{')) {
      // 检查是否是单行节点定义
      if (line.includes('-->') || line.includes('---')) {
        // 连线和节点在同一行
        formatted.push(indent + line);
      } else {
        // 单独的节点定义
        formatted.push(indent + line);
      }
    } else {
      // 其他情况保持原样
      formatted.push(indent + line);
    }
  }
  
  return formatted;
};

// 格式化时序图
const formatSequence = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  const indent = getIndent(1, options);
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理时序图声明
    if (line.startsWith('sequenceDiagram')) {
      formatted.push(line);
      continue;
    }
    
    // participant 和 actor 顶格
    if (line.startsWith('participant') || line.startsWith('actor')) {
      formatted.push(line);
      continue;
    }
    
    // rect 语句顶格
    if (line.startsWith('rect')) {
      formatted.push(line);
      continue;
    }
    
    // 消息缩进
    if (line.includes('->') || line.includes('--')) {
      formatted.push(indent + line);
      continue;
    }
    
    // 其他情况保持原样
    formatted.push(line);
  }
  
  return formatted;
};

// 格式化类图
const formatClass = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理类图声明
    if (line.startsWith('classDiagram')) {
      formatted.push(line);
      continue;
    }
    
    // 检查是否是类定义开始
    if (line.includes('class ') && line.endsWith('{')) {
      formatted.push(line);
      indentLevel++;
      continue;
    }
    
    // 检查是否是接口定义开始
    if (line.includes('interface ') && line.endsWith('{')) {
      formatted.push(line);
      indentLevel++;
      continue;
    }
    
    // 检查是否是结束括号
    if (line === '}') {
      indentLevel = Math.max(0, indentLevel - 1);
      formatted.push(getIndent(indentLevel, options) + line);
      continue;
    }
    
    // 类内部成员缩进
    if (indentLevel > 0) {
      formatted.push(getIndent(indentLevel, options) + line);
    } else {
      // 类之间的关系
      formatted.push(line);
    }
  }
  
  return formatted;
};

// 格式化状态图
const formatState = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理状态图声明
    if (line.startsWith('stateDiagram') || line.startsWith('state-diagram')) {
      formatted.push(line);
      continue;
    }
    
    // 检查是否是复合状态开始
    if (line.includes('state ') && line.endsWith('{')) {
      formatted.push(line);
      indentLevel++;
      continue;
    }
    
    // 检查是否是结束括号
    if (line === '}') {
      indentLevel = Math.max(0, indentLevel - 1);
      formatted.push(getIndent(indentLevel, options) + line);
      continue;
    }
    
    // 状态转换
    if (line.includes('-->') || line.includes('[*]')) {
      formatted.push(getIndent(indentLevel, options) + line);
    } else {
      formatted.push(getIndent(indentLevel, options) + line);
    }
  }
  
  return formatted;
};

// 格式化甘特图
const formatGantt = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理甘特图声明
    if (line.startsWith('gantt')) {
      formatted.push(line);
      continue;
    }
    
    // section 开始
    if (line.startsWith('section')) {
      formatted.push(line);
      indentLevel = 1;
      continue;
    }
    
    // 检查是否是新的 section 或结束
    if (line.startsWith('title') || line.startsWith('dateFormat') || 
        line.startsWith('excludes') || line.startsWith('section')) {
      indentLevel = 0;
      formatted.push(line);
      if (line.startsWith('section')) {
        indentLevel = 1;
      }
      continue;
    }
    
    // 任务缩进
    formatted.push(getIndent(indentLevel, options) + line);
  }
  
  return formatted;
};

// 格式化 ER 图
const formatER = (lines: string[], options: FormatOptions): string[] => {
  const formatted: string[] = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line || line.startsWith('%%')) {
      formatted.push(line);
      continue;
    }
    
    // 处理 ER 图声明
    if (line.startsWith('erDiagram')) {
      formatted.push(line);
      continue;
    }
    
    // 检查是否是实体定义开始
    const entityMatch = line.match(/^(\w+)\s*\{/);
    if (entityMatch) {
      formatted.push(line);
      indentLevel++;
      continue;
    }
    
    // 检查是否是结束括号
    if (line === '}') {
      indentLevel = Math.max(0, indentLevel - 1);
      formatted.push(getIndent(indentLevel, options) + line);
      continue;
    }
    
    // 实体属性缩进
    if (indentLevel > 0) {
      formatted.push(getIndent(indentLevel, options) + line);
    } else {
      // 实体关系
      formatted.push(line);
    }
  }
  
  return formatted;
};

// 主格式化函数
export const formatMermaid = (code: string, options: FormatOptions = {}): string => {
  const mergedOptions = { ...defaultOptions, ...options };
  const lines = code.split('\n');
  const chartType = detectChartType(code);
  
  let formattedLines: string[];
  
  switch (chartType) {
    case 'flowchart':
      formattedLines = formatFlowchart(lines, mergedOptions);
      break;
    case 'sequence':
      formattedLines = formatSequence(lines, mergedOptions);
      break;
    case 'class':
      formattedLines = formatClass(lines, mergedOptions);
      break;
    case 'state':
      formattedLines = formatState(lines, mergedOptions);
      break;
    case 'gantt':
      formattedLines = formatGantt(lines, mergedOptions);
      break;
    case 'er':
      formattedLines = formatER(lines, mergedOptions);
      break;
    default:
      // 默认情况下尝试流程图格式化
      formattedLines = formatFlowchart(lines, mergedOptions);
  }
  
  return formattedLines.join('\n');
};

// 简化的格式化函数（使用默认选项）
export const formatMermaidSimple = (code: string): string => {
  return formatMermaid(code);
};