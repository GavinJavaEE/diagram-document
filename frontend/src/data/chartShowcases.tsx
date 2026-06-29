import type { ReactNode } from 'react';

/**
 * 首页图表类型展示数据。
 * 从 HomePage.tsx 抽离，便于维护与复用，降低组件文件体积。
 * 注意：visualSvg 为 JSX，故文件使用 .tsx 扩展。
 */

/** 图表场景分类：帮助非技术用户按使用场景快速定位模板 */
export type ChartCategory = 'flow' | 'architecture' | 'planning';

export interface ChartType {
  key: string;
  title: string;
  description: string;
  useCases: string[];
  accent: string;
  lightAccent: string;
  codeSample: string;
  visualSvg: ReactNode;
  /** 场景分类：flow=流程类 / architecture=架构类 / planning=规划类 */
  category: ChartCategory;
}

/** 场景分类的中文标签，供 QuickStartPanel 筛选 Tab 使用 */
export const chartCategoryLabels: Record<ChartCategory, string> = {
  flow: '流程',
  architecture: '架构',
  planning: '规划',
};

export const chartShowcases: ChartType[] = [
  {
    key: 'flowchart',
    title: '流程图',
    description: '用简洁的节点和箭头描述逻辑流程、决策路径与操作步骤，最经典的图表类型。',
    useCases: ['业务流程设计', '算法逻辑梳理', '决策路径分析', '功能模块拆分'],
    accent: 'bg-primary',
    lightAccent: 'bg-primary/10 text-primary',
    category: 'flow',
    codeSample: `flowchart TD
  A[开始] --> B{条件判断}
  B -->|是| C[处理数据]
  B -->|否| D[跳过]
  C --> E[结束]
  D --> E`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <defs>
          <marker id="arrow-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        <rect x="20" y="20" width="60" height="28" rx="6" fill="#4F46E5" stroke="#3730A3" strokeWidth="1.5" />
        <text x="50" y="38" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">开始</text>
        <polygon points="100,34 132,60 100,86" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
        <text x="116" y="63" textAnchor="middle" fill="white" fontSize="10" fontWeight="500">判断</text>
        <rect x="150" y="20" width="40" height="28" rx="6" fill="#10B981" stroke="#059669" strokeWidth="1.5" />
        <text x="170" y="38" textAnchor="middle" fill="white" fontSize="10" fontWeight="500">处理</text>
        <rect x="150" y="80" width="40" height="28" rx="6" fill="#6B7280" stroke="#4B5563" strokeWidth="1.5" />
        <text x="170" y="98" textAnchor="middle" fill="white" fontSize="10" fontWeight="500">跳过</text>
        <rect x="20" y="100" width="60" height="24" rx="5" fill="#3B82F6" stroke="#2563EB" strokeWidth="1.5" />
        <text x="50" y="116" textAnchor="middle" fill="white" fontSize="10" fontWeight="500">结束</text>
        <line x1="80" y1="34" x2="100" y2="60" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow-a)" />
        <line x1="132" y1="50" x2="150" y2="34" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow-a)" />
        <line x1="132" y1="70" x2="150" y2="94" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow-a)" />
        <line x1="190" y1="94" x2="190" y2="112" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="190" y1="112" x2="80" y2="112" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow-a)" />
      </svg>
    ),
  },
  {
    key: 'sequence',
    title: '时序图',
    description: '清晰展示多个参与者之间的消息交互顺序，是描述分布式系统和协作流程的利器。',
    useCases: ['API 调用时序', '系统交互分析', '用户操作流程', '微服务通信'],
    accent: 'bg-success',
    lightAccent: 'bg-success/10 text-success',
    category: 'architecture',
    codeSample: `sequenceDiagram
  participant 用户
  participant 前端
  participant 后端
  用户->>前端: 点击按钮
  前端->>后端: 发送请求
  后端-->>前端: 返回数据
  前端-->>用户: 展示结果`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="10" y="15" width="40" height="22" rx="4" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.2" />
        <text x="30" y="30" textAnchor="middle" fill="#4F46E5" fontSize="10" fontWeight="500">用户</text>
        <rect x="80" y="15" width="40" height="22" rx="4" fill="#DCFCE7" stroke="#4ADE80" strokeWidth="1.2" />
        <text x="100" y="30" textAnchor="middle" fill="#16A34A" fontSize="10" fontWeight="500">前端</text>
        <rect x="150" y="15" width="40" height="22" rx="4" fill="#FEF3C7" stroke="#FBBF24" strokeWidth="1.2" />
        <text x="170" y="30" textAnchor="middle" fill="#D97706" fontSize="10" fontWeight="500">后端</text>
        <line x1="30" y1="37" x2="30" y2="125" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="100" y1="37" x2="100" y2="125" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="170" y1="37" x2="170" y2="125" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="30" y1="50" x2="96" y2="50" stroke="#4F46E5" strokeWidth="1.4" markerEnd="url(#arrow-seq-1)" />
        <defs><marker id="arrow-seq-1" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#4F46E5" /></marker></defs>
        <line x1="100" y1="68" x2="166" y2="68" stroke="#16A34A" strokeWidth="1.4" markerEnd="url(#arrow-seq-2)" />
        <defs><marker id="arrow-seq-2" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#16A34A" /></marker></defs>
        <line x1="170" y1="86" x2="104" y2="86" stroke="#D97706" strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#arrow-seq-3)" />
        <defs><marker id="arrow-seq-3" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#D97706" /></marker></defs>
        <line x1="100" y1="104" x2="34" y2="104" stroke="#4F46E5" strokeWidth="1.4" strokeDasharray="4,3" markerEnd="url(#arrow-seq-4)" />
        <defs><marker id="arrow-seq-4" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="#4F46E5" /></marker></defs>
        <rect x="30" y="118" width="140" height="2" fill="#CBD5E1" opacity="0.3" />
      </svg>
    ),
  },
  {
    key: 'gantt',
    title: '甘特图',
    description: '项目管理的经典工具，以时间轴展示任务排期、依赖关系与进度里程碑，让计划一目了然。',
    useCases: ['项目排期规划', '任务进度跟踪', '里程碑管理', '资源分配优化'],
    accent: 'bg-warning',
    lightAccent: 'bg-warning/10 text-warning',
    category: 'planning',
    codeSample: `gantt
  title 项目排期
  dateFormat YYYY-MM-DD
  section 设计
  需求分析 :a1, 2026-01-01, 7d
  UI设计  :a2, after a1, 5d
  section 开发
  前端开发 :b1, after a2, 14d`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <g fontSize="9" fill="#64748B">
          <text x="6" y="28">需求</text>
          <text x="6" y="52">设计</text>
          <text x="6" y="76">前端</text>
          <text x="6" y="100">后端</text>
          <text x="6" y="124">测试</text>
        </g>
        <line x1="40" y1="15" x2="40" y2="130" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="90" y1="15" x2="90" y2="130" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="140" y1="15" x2="140" y2="130" stroke="#E2E8F0" strokeWidth="1" />
        <g fontSize="8" fill="#94A3B8" textAnchor="middle">
          <text x="65" y="12">Week 1</text>
          <text x="115" y="12">Week 2</text>
          <text x="165" y="12">Week 3</text>
        </g>
        <rect x="42" y="20" width="50" height="12" rx="3" fill="#4F46E5" />
        <rect x="94" y="44" width="40" height="12" rx="3" fill="#F59E0B" />
        <rect x="94" y="68" width="70" height="12" rx="3" fill="#10B981" />
        <rect x="100" y="92" width="70" height="12" rx="3" fill="#06B6D4" />
        <rect x="150" y="116" width="35" height="12" rx="3" fill="#EC4899" />
        <rect x="42" y="20" width="25" height="12" rx="3" fill="#3730A3" opacity="0.6" />
        <rect x="94" y="68" width="30" height="12" rx="3" fill="#059669" opacity="0.6" />
        <rect x="100" y="92" width="40" height="12" rx="3" fill="#0891B2" opacity="0.6" />
      </svg>
    ),
  },
  {
    key: 'er',
    title: 'ER 图',
    description: '实体关系图，描述数据库表结构、字段关联与外键约束，是数据建模的标准工具。',
    useCases: ['数据库设计', '数据模型分析', '表结构文档', '系统架构梳理'],
    accent: 'bg-info',
    lightAccent: 'bg-info/10 text-info',
    category: 'architecture',
    codeSample: `erDiagram
  USER ||--o{ ORDER : has
  USER {
    string id PK
    string name
    string email
  }
  ORDER {
    string id PK
    string user_id FK
    decimal total
  }`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="10" y="20" width="80" height="100" rx="6" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="1.5" />
        <rect x="10" y="20" width="80" height="20" rx="6" fill="#38BDF8" />
        <rect x="10" y="20" width="80" height="20" fill="#38BDF8" />
        <text x="50" y="34" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">USER</text>
        <line x1="10" y1="48" x2="90" y2="48" stroke="#BAE6FD" strokeWidth="1" />
        <g fontSize="9" fill="#0369A1">
          <text x="18" y="62">id (PK)</text>
          <text x="18" y="78">name</text>
          <text x="18" y="94">email</text>
          <text x="18" y="110">created_at</text>
        </g>
        <rect x="110" y="30" width="80" height="80" rx="6" fill="#FEF2F2" stroke="#F87171" strokeWidth="1.5" />
        <rect x="110" y="30" width="80" height="20" rx="6" fill="#F87171" />
        <rect x="110" y="30" width="80" height="20" fill="#F87171" />
        <text x="150" y="44" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">ORDER</text>
        <line x1="110" y1="58" x2="190" y2="58" stroke="#FECACA" strokeWidth="1" />
        <g fontSize="9" fill="#B91C1C">
          <text x="118" y="72">id (PK)</text>
          <text x="118" y="88">user_id (FK)</text>
          <text x="118" y="104">total</text>
        </g>
        <line x1="90" y1="70" x2="108" y2="70" stroke="#64748B" strokeWidth="1.4" />
        <text x="99" y="66" textAnchor="middle" fill="#64748B" fontSize="8">has</text>
        <circle cx="90" cy="70" r="3" fill="#38BDF8" />
        <circle cx="90" cy="70" r="1.5" fill="white" />
        <circle cx="108" cy="70" r="3" fill="#F87171" />
      </svg>
    ),
  },
  {
    key: 'class',
    title: '类图',
    description: '面向对象设计的核心图表，展示类、属性、方法及其继承、关联、依赖关系。',
    useCases: ['软件架构设计', '类层次结构', '接口定义', '组件依赖分析'],
    accent: 'bg-purple-500',
    lightAccent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    category: 'architecture',
    codeSample: `classDiagram
  class Animal {
    +String name
    +int age
    +eat()
    +sleep()
  }
  class Dog {
    +bark()
  }
  Animal <|-- Dog`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <rect x="30" y="15" width="140" height="45" rx="6" fill="#F3E8FF" stroke="#A855F7" strokeWidth="1.5" />
        <text x="100" y="30" textAnchor="middle" fill="#7E22CE" fontSize="11" fontWeight="600">Animal</text>
        <line x1="30" y1="40" x2="170" y2="40" stroke="#D8B4FE" strokeWidth="1" />
        <g fontSize="9" fill="#6B21A8">
          <text x="38" y="52">+ name: String</text>
          <text x="38" y="65">+ age: int</text>
        </g>
        <polygon points="100,72 92,80 108,80" fill="white" stroke="#A855F7" strokeWidth="1.5" />
        <line x1="100" y1="80" x2="100" y2="92" stroke="#A855F7" strokeWidth="1.5" />
        <rect x="50" y="92" width="100" height="38" rx="6" fill="#FAE8FF" stroke="#D946EF" strokeWidth="1.5" />
        <text x="100" y="107" textAnchor="middle" fill="#A21CAF" fontSize="11" fontWeight="600">Dog</text>
        <line x1="50" y1="117" x2="150" y2="117" stroke="#F5D0FE" strokeWidth="1" />
        <g fontSize="9" fill="#86198F">
          <text x="58" y="128">+ bark(): void</text>
        </g>
      </svg>
    ),
  },
  {
    key: 'state',
    title: '状态图',
    description: '描述系统或对象在生命周期中的状态变迁，触发事件与条件转移清晰可见。',
    useCases: ['状态机建模', 'UI 状态管理', '工作流引擎', '游戏状态逻辑'],
    accent: 'bg-rose-500',
    lightAccent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    category: 'flow',
    codeSample: `stateDiagram-v2
  [*] --> 待机
  待机 --> 运行: 启动
  运行 --> 暂停: 暂停
  暂停 --> 运行: 继续
  运行 --> 待机: 停止
  待机 --> [*]`,
    visualSvg: (
      <svg viewBox="0 0 200 140" className="w-full h-full">
        <circle cx="100" cy="70" r="36" fill="#FFF1F2" stroke="#F43F5E" strokeWidth="1.8" />
        <text x="100" y="74" textAnchor="middle" fill="#BE123C" fontSize="12" fontWeight="600">运行</text>
        <circle cx="35" cy="40" r="24" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.8" />
        <text x="35" y="44" textAnchor="middle" fill="#92400E" fontSize="10" fontWeight="600">待机</text>
        <circle cx="165" cy="40" r="24" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.8" />
        <text x="165" y="44" textAnchor="middle" fill="#166534" fontSize="10" fontWeight="600">暂停</text>
        <circle cx="100" cy="122" r="10" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
        <circle cx="100" cy="122" r="5" fill="white" />
        <line x1="55" y1="48" x2="80" y2="62" stroke="#F43F5E" strokeWidth="1.4" markerEnd="url(#arrow-st-1)" />
        <defs><marker id="arrow-st-1" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="#F43F5E" /></marker></defs>
        <line x1="145" y1="48" x2="120" y2="62" stroke="#22C55E" strokeWidth="1.4" markerEnd="url(#arrow-st-2)" />
        <defs><marker id="arrow-st-2" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="#22C55E" /></marker></defs>
        <line x1="120" y1="78" x2="145" y2="52" stroke="#22C55E" strokeWidth="1.4" markerEnd="url(#arrow-st-3)" />
        <defs><marker id="arrow-st-3" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="#22C55E" /></marker></defs>
        <line x1="80" y1="78" x2="55" y2="52" stroke="#F59E0B" strokeWidth="1.4" markerEnd="url(#arrow-st-4)" />
        <defs><marker id="arrow-st-4" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="#F59E0B" /></marker></defs>
        <line x1="35" y1="68" x2="95" y2="115" stroke="#1E293B" strokeWidth="1.4" markerEnd="url(#arrow-st-5)" />
        <defs><marker id="arrow-st-5" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6" fill="#1E293B" /></marker></defs>
      </svg>
    ),
  },
];
