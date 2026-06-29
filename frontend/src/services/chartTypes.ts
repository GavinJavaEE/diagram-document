import type { TemplateCategoryResp } from '@/types';

/**
 * 默认图表类型列表（前端内置，覆盖 Mermaid 常用 6 种类型）
 *
 * 历史上此处会请求 /api/v1/templates/categories 做动态覆盖，但：
 * - detectChartType 仅能识别这 6 种类型，服务端新增类型前端无法消费
 * - 图表类型徽章的颜色始终来自硬编码 DEFAULT_CHART_TYPE_INFO
 * - 快速开始栏模板画廊使用独立的 chartShowcases.tsx 数据
 * 因此该接口请求无实际价值，已移除，统一使用以下硬编码数据。
 */
export const getDefaultChartTypes = (): TemplateCategoryResp[] => [
  { categoryId: 'flowchart', name: '流程图', icon: '🔷', description: '描述业务流程、算法逻辑', mermaidType: 'flowchart', sortOrder: 1 },
  { categoryId: 'sequence', name: '时序图', icon: '📊', description: '描述系统交互、接口调用', mermaidType: 'sequenceDiagram', sortOrder: 2 },
  { categoryId: 'class', name: '类图', icon: '📦', description: '面向对象设计', mermaidType: 'classDiagram', sortOrder: 3 },
  { categoryId: 'state', name: '状态图', icon: '🔄', description: '描述状态流转', mermaidType: 'stateDiagram-v2', sortOrder: 4 },
  { categoryId: 'gantt', name: '甘特图', icon: '📅', description: '项目排期、任务规划', mermaidType: 'gantt', sortOrder: 5 },
  { categoryId: 'er', name: 'ER 图', icon: '🗄️', description: '数据库设计、实体关系', mermaidType: 'erDiagram', sortOrder: 6 },
];

/**
 * 根据 categoryId 获取 Mermaid 类型名
 */
export const getMermaidType = (categoryId: string): string | undefined => {
  return getDefaultChartTypes().find(c => c.categoryId === categoryId)?.mermaidType;
};

/**
 * 根据 categoryId 获取图表分类信息
 * 注意：与 EditorContext.getChartTypeInfo（UI 元信息）语义不同，故重命名以避免歧义
 */
export const getChartCategory = (categoryId: string): TemplateCategoryResp | undefined => {
  return getDefaultChartTypes().find(c => c.categoryId === categoryId);
};
