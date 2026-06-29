// Mermaid 语法补全建议
export interface CompletionItem {
  label: string;
  kind: 'keyword' | 'variable' | 'function' | 'constant' | 'type';
  insertText: string;
  documentation?: string;
}

// 流程图方向
const flowchartDirections = [
  { label: 'TD', kind: 'keyword' as const, insertText: 'TD', documentation: '从上到下 (Top-Down)' },
  { label: 'LR', kind: 'keyword' as const, insertText: 'LR', documentation: '从左到右 (Left-Right)' },
  { label: 'BT', kind: 'keyword' as const, insertText: 'BT', documentation: '从下到上 (Bottom-Top)' },
  { label: 'RL', kind: 'keyword' as const, insertText: 'RL', documentation: '从右到左 (Right-Left)' },
];

// 流程图节点类型
const flowchartNodes = [
  { label: '[]', kind: 'variable' as const, insertText: '[${1:节点文本}]', documentation: '矩形节点' },
  { label: '()', kind: 'variable' as const, insertText: '(${1:节点文本})', documentation: '圆角矩形节点' },
  { label: '{}', kind: 'variable' as const, insertText: '{${1:节点文本}}', documentation: '菱形判断节点' },
  { label: '[]', kind: 'variable' as const, insertText: '>${1:节点文本}]', documentation: '不对称形状节点' },
  { label: '(())', kind: 'variable' as const, insertText: '((${1:节点文本}))', documentation: '圆柱形节点' },
  { label: '[[ ]]', kind: 'variable' as const, insertText: '[[$1:节点文本]]', documentation: '子程序节点' },
  { label: '[/ ]', kind: 'variable' as const, insertText: '[/${1:节点文本}/]', documentation: '数据库节点' },
  { label: '[\\ ]', kind: 'variable' as const, insertText: '[\\${1:节点文本}\\]', documentation: '反向数据库节点' },
  { label: '{{ }}', kind: 'variable' as const, insertText: '{{${1:节点文本}}}', documentation: '六边形节点' },
];

// 流程图连线类型
const flowchartEdges = [
  { label: '-->', kind: 'keyword' as const, insertText: ' --> ', documentation: '实线箭头' },
  { label: '---', kind: 'keyword' as const, insertText: ' --- ', documentation: '实线' },
  { label: '-.->', kind: 'keyword' as const, insertText: ' -.-> ', documentation: '虚线箭头' },
  { label: '==>', kind: 'keyword' as const, insertText: ' ==> ', documentation: '粗实线箭头' },
  { label: '--|text|-->', kind: 'keyword' as const, insertText: ' -->|${1:标签}| ', documentation: '带标签的连线' },
];

// 时序图关键字
const sequenceKeywords = [
  { label: 'participant', kind: 'keyword' as const, insertText: 'participant ${1:参与者名称}', documentation: '定义参与者' },
  { label: 'actor', kind: 'keyword' as const, insertText: 'actor ${1:角色名称}', documentation: '定义角色' },
  { label: 'rect', kind: 'keyword' as const, insertText: 'rect rgb(${1:颜色})', documentation: '定义彩色矩形区域' },
];

// 时序图消息类型
const sequenceMessages = [
  { label: '->>', kind: 'keyword' as const, insertText: '->> ', documentation: '实线消息' },
  { label: '-->>', kind: 'keyword' as const, insertText: '-->> ', documentation: '虚线消息' },
  { label: '-x', kind: 'keyword' as const, insertText: '-x ', documentation: '实线异步消息' },
  { label: '--x', kind: 'keyword' as const, insertText: '--x ', documentation: '虚线异步消息' },
  { label: '->', kind: 'keyword' as const, insertText: '-> ', documentation: '实线无箭头' },
  { label: '-->', kind: 'keyword' as const, insertText: '-->', documentation: '虚线无箭头' },
];

// 类图关键字
const classKeywords = [
  { label: 'class', kind: 'keyword' as const, insertText: 'class ${1:类名} {', documentation: '定义类' },
  { label: 'interface', kind: 'keyword' as const, insertText: 'interface ${1:接口名} {', documentation: '定义接口' },
  { label: 'abstract', kind: 'keyword' as const, insertText: 'abstract class ${1:类名} {', documentation: '定义抽象类' },
];

// 类图关系
const classRelationships = [
  { label: '<|--', kind: 'keyword' as const, insertText: ' <|-- ', documentation: '继承关系' },
  { label: '<|..', kind: 'keyword' as const, insertText: ' <|.. ', documentation: '实现关系' },
  { label: '*--', kind: 'keyword' as const, insertText: ' *-- ', documentation: '组合关系' },
  { label: 'o--', kind: 'keyword' as const, insertText: ' o-- ', documentation: '聚合关系' },
  { label: '--> ', kind: 'keyword' as const, insertText: ' --> ', documentation: '关联关系' },
  { label: '..>', kind: 'keyword' as const, insertText: ' ..> ', documentation: '依赖关系' },
];

// 状态图关键字
const stateKeywords = [
  { label: '[*]', kind: 'constant' as const, insertText: '[*]', documentation: '初始/结束状态' },
  { label: 'state', kind: 'keyword' as const, insertText: 'state ${1:状态名} {', documentation: '定义复合状态' },
];

// 甘特图关键字
const ganttKeywords = [
  { label: 'title', kind: 'keyword' as const, insertText: 'title ${1:标题}', documentation: '设置标题' },
  { label: 'dateFormat', kind: 'keyword' as const, insertText: 'dateFormat ${1:YYYY-MM-DD}', documentation: '设置日期格式' },
  { label: 'section', kind: 'keyword' as const, insertText: 'section ${1:阶段名称}', documentation: '定义阶段' },
  { label: 'excludes', kind: 'keyword' as const, insertText: 'excludes ${1:日期}', documentation: '排除日期' },
];

// ER 图关键字
const erKeywords = [
  { label: 'entity', kind: 'keyword' as const, insertText: '${1:实体名} {', documentation: '定义实体' },
  { label: 'PK', kind: 'constant' as const, insertText: 'PK', documentation: '主键' },
  { label: 'FK', kind: 'constant' as const, insertText: 'FK', documentation: '外键' },
];

// ER 图关系
const erRelationships = [
  { label: '||--o{', kind: 'keyword' as const, insertText: ' ||--o{ ', documentation: '一对多关系' },
  { label: '||--||', kind: 'keyword' as const, insertText: ' ||--|| ', documentation: '一对一关系' },
  { label: '}o--||', kind: 'keyword' as const, insertText: ' }o--|| ', documentation: '多对一关系' },
  { label: '}o--o{', kind: 'keyword' as const, insertText: ' }o--o{ ', documentation: '多对多关系' },
];

// 图表类型定义
const diagramTypes = [
  { label: 'flowchart TD', kind: 'keyword' as const, insertText: 'flowchart TD', documentation: '流程图 - 从上到下' },
  { label: 'flowchart LR', kind: 'keyword' as const, insertText: 'flowchart LR', documentation: '流程图 - 从左到右' },
  { label: 'sequenceDiagram', kind: 'keyword' as const, insertText: 'sequenceDiagram', documentation: '时序图' },
  { label: 'classDiagram', kind: 'keyword' as const, insertText: 'classDiagram', documentation: '类图' },
  { label: 'stateDiagram-v2', kind: 'keyword' as const, insertText: 'stateDiagram-v2', documentation: '状态图' },
  { label: 'erDiagram', kind: 'keyword' as const, insertText: 'erDiagram', documentation: 'ER图' },
  { label: 'gantt', kind: 'keyword' as const, insertText: 'gantt', documentation: '甘特图' },
  { label: 'pie', kind: 'keyword' as const, insertText: 'pie', documentation: '饼图' },
];

// 通用关键字
const commonKeywords = [
  { label: '%%', kind: 'keyword' as const, insertText: '%% ${1:注释}', documentation: '注释' },
];

// 根据图表类型获取补全建议
export const getCompletions = (chartType: string, lineText: string): CompletionItem[] => {
  const completions: CompletionItem[] = [];
  const trimmedLine = lineText.trim().toLowerCase();
  const firstChar = trimmedLine.charAt(0);
  
  // 始终提供图表类型建议（当输入首字母时）
  if (trimmedLine === '' || 
      firstChar === 'f' || firstChar === 's' || firstChar === 'c' ||
      firstChar === 'g' || firstChar === 'e' || firstChar === 'p' || firstChar === 't') {
    completions.push(...diagramTypes);
  }
  
  // 添加通用关键字
  completions.push(...commonKeywords);
  
  // 如果图表类型未知，返回基础补全
  if (chartType === 'unknown') {
    completions.push(...flowchartEdges);
    return completions;
  }
  
  // 根据图表类型添加特定补全
  switch (chartType.toLowerCase()) {
    case 'flowchart':
    case 'graph':
      // 如果是第一行且包含 flowchart 或 graph，添加方向选项
      if (lineText.includes('flowchart') || lineText.includes('graph')) {
        completions.push(...flowchartDirections);
      }
      // 检查是否需要节点补全
      if (lineText.match(/^\s*[A-Za-z]\s*$/)) {
        completions.push(...flowchartNodes);
      }
      // 添加连线类型
      completions.push(...flowchartEdges);
      break;
      
    case 'sequencediagram':
      completions.push(...sequenceKeywords);
      completions.push(...sequenceMessages);
      break;
      
    case 'classdiagram':
      completions.push(...classKeywords);
      completions.push(...classRelationships);
      break;
      
    case 'statediagram':
    case 'state-diagram-v2':
      completions.push(...stateKeywords);
      completions.push(...flowchartEdges);
      break;
      
    case 'gantt':
      completions.push(...ganttKeywords);
      break;
      
    case 'erdiagram':
      completions.push(...erKeywords);
      completions.push(...erRelationships);
      break;
      
    default:
      // 默认添加所有类型的基础补全
      completions.push(...flowchartDirections);
      completions.push(...flowchartEdges);
  }
  
  return completions;
};

// 获取当前行的上下文信息
export const getLineContext = (code: string, lineNumber: number): {
  chartType: string;
  lineText: string;
  previousLine: string;
} => {
  const lines = code.split('\n');
  const lineText = lines[lineNumber - 1] || '';
  const previousLine = lines[lineNumber - 2] || '';
  
  // 检测图表类型
  let chartType = 'unknown';
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
      chartType = 'flowchart';
      break;
    } else if (trimmed.startsWith('sequencediagram')) {
      chartType = 'sequencediagram';
      break;
    } else if (trimmed.startsWith('classdiagram')) {
      chartType = 'classdiagram';
      break;
    } else if (trimmed.startsWith('statediagram') || trimmed.startsWith('state-diagram')) {
      chartType = 'statediagram';
      break;
    } else if (trimmed.startsWith('gantt')) {
      chartType = 'gantt';
      break;
    } else if (trimmed.startsWith('erdiagram')) {
      chartType = 'erdiagram';
      break;
    }
  }
  
  return { chartType, lineText, previousLine };
};