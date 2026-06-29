# Markdown 文档功能 — 开发步骤

## 阶段总览

| 阶段 | 目标 | 交付物 |
|---|---|---|
| **P0** | 编辑+预览骨架（纯前端） | 可输入 MD、实时预览、mermaid 块渲染 |
| **P1** | 持久化 + 导航接入 | 文档列表、保存、自动保存、Header 入口 |
| **P2** | 与 Mermaid 协同 | EditorPage→文档、AISidebar 改 MD 内图表 |
| **P3** | 分享 + 导出 | 分享页、导出 MD/PDF |

---

## P0：编辑 + 预览骨架（纯前端，无后端）

### 步骤 0.1 安装依赖
```bash
npm install markdown-it
npm install -D @types/markdown-it
```
- 仅此一个新依赖，Monaco/Mermaid 已具备
- 不引入 KaTeX（避免耦合 mermaid 内部依赖；公式渲染留作 P3 可选）

### 步骤 0.2 创建目录结构
```
src/
├── pages/
│   └── MarkdownEditorPage.tsx        # 主页面（骨架先建空壳）
├── components/
│   └── Markdown/
│       ├── MarkdownEditor.tsx         # Monaco MD 编辑器
│       ├── MarkdownPreview.tsx        # 渲染预览
│       ├── MarkdownToolbar.tsx        # 编辑工具栏（加粗/标题/代码块...）
│       └── index.ts
└── services/
    └── markdown.ts                     # markdown-it 实例 + mermaid 集成
```

### 步骤 0.3 封装 markdown 渲染服务 `services/markdown.ts`
- 创建 markdown-it 实例（`html: false` 默认安全转义）
- 渲染流程：`md.render()` → 得到 HTML → 查找所有 `<pre><code class="language-mermaid">` → 调用已有 `renderMermaid` 替换为 SVG
- 导出 `renderMarkdown(content: string): Promise<string>`（因 mermaid 渲染异步）
- 复用 `services/mermaid.ts` 的 `initMermaid('strict')` + `renderMermaid`

### 步骤 0.4 实现 `MarkdownEditor.tsx`
- 基于 `@monaco-editor/react`（已有），注册 `markdown` 语言
- 参照 `CodeEditor.tsx` 的 OnMount 模式：保存 editor 实例 ref
- 工具栏按钮通过 `editor.executeEdits` 插入语法（加粗 `**`、标题 `#`、代码块 ```` ``` ````）
- Mermaid 块插入按钮：插入 ```` ```mermaid\n\n``` ```` 模板

### 步骤 0.5 实现 `MarkdownPreview.tsx`
- 接收 `content` prop
- `useEffect` + debounce 300ms（参考 Preview.tsx 的 DEBOUNCE_MS）调用 `renderMarkdown`
- 渲染结果用 `dangerouslySetInnerHTML`（已转义 + mermaid 已渲染）
- 应用 prose 排版样式（手写 CSS，避免引入 Tailwind Typography）

### 步骤 0.6 实现 `MarkdownToolbar.tsx`
- 编辑工具组：加粗、斜体、标题、链接、列表、代码块、表格、Mermaid 图表
- 预览工具组：导出 MD（P3）、同步滚动开关
- 复用 Preview.tsx 的下拉菜单模式（已验证）

### 步骤 0.7 组装 `MarkdownEditorPage.tsx`
- 复用 EditorPage 的分屏布局：左编辑 / 右预览
- 复用 `useResponsiveLayout`：窄屏 Tab 切换（编辑/预览）
- 顶部 `<Header />` + 状态栏（字数、保存状态）
- 本地 state：`content` / `title`，无持久化

### 步骤 0.8 路由注册
- `App.tsx` 新增懒加载：`const MarkdownEditorPage = lazy(...)`
- 路由 `/docs/new` → `<MarkdownEditorPage />`
- 验证：`tsc --noEmit` + `vite build`

**P0 完成标准**：访问 `/docs/new` 可输入 Markdown，右侧实时预览，```` ```mermaid ```` 块渲染成图。

---

## P1：持久化 + 导航接入

### 步骤 1.1 后端 API 扩展
需后端配合新增（若后端未就绪，前端先 Mock）：
- `GET /api/v1/docs` 列表
- `POST /api/v1/docs` 新建
- `GET/PUT/DELETE /api/v1/docs/:id`

### 步骤 1.2 前端 API 封装 `services/docsApi.ts`
- 仿 `services/api.ts` 的 `request` 封装（已含超时/取消）
- 定义类型 `DocMeta` / `DocResp` 放入 `types/index.ts`

### 步骤 1.3 状态管理 `contexts/DocContext.tsx`
- zustand + persist（参照 AIContext 模式）
- 字段：`docs[]`、`currentDocId`、`content`、`title`、`isDirty`、`lastSaved`
- 方法：`loadList`、`loadDoc`、`createDoc`、`saveDoc`、`deleteDoc`

### 步骤 1.4 文档列表侧栏 `components/Markdown/DocSidebar.tsx`
- 左侧可折叠列表：标题 + 更新时间 + 新建按钮
- 参照 AISidebar 的折叠/展开交互

### 步骤 1.5 自动保存
- MarkdownEditorPage 内 `useEffect` 监听 content 变化，debounce 3s 调 `saveDoc`
- `isDirty` 驱动标题栏「●未保存」标记
- `beforeunload` 拦截未保存离开

### 步骤 1.6 路由扩展
- `/docs` → 文档列表页 `DocsPage.tsx`
- `/docs/:id` → MarkdownEditorPage（loadDoc）

### 步骤 1.7 导航入口
- `Header.tsx`：`hidden md:flex` 区块加「文档」链接 → `/docs`
- `HomePage.tsx`：`features` 数组新增「Markdown 文档」卡片

**P1 完成标准**：可创建、保存、列表管理 MD 文档，刷新不丢数据。

---

## P2：与 Mermaid 协同

### 步骤 2.1 EditorPage → 文档
- EditorPage 顶部加「保存为文档」按钮
- 点击：调 `createDoc({ content: '```mermaid\n' + code + '\n```' })` → 跳转 `/docs/:id`

### 步骤 2.2 文档内 AI 修改图表
- MarkdownPreview 中 mermaid 块支持右键「用 AI 修改」
- 唤起 `AISidebar`（已有），传入该代码块内容
- AI 返回新代码后，定位 MD 中对应代码块并替换

### 步骤 2.3 双向同步
- 文档内 mermaid 块修改后，预览区增量重渲染该块（不全文重渲）

**P2 完成标准**：图表与文档双向打通，可在文档内直接用 AI 改图。

---

## P3：分享 + 导出

### 步骤 3.1 分享功能
- 文档页加「分享」按钮 → `setDocPublic(id, true)` 返回 token
- 新增 `MarkdownSharePage.tsx`：只读预览，`initMermaid('strict')` 防注入
- 路由 `/docs/:id/share/:token`

### 步骤 3.2 导出 MD
- 工具栏「导出 MD」→ Blob 下载 `.md` 文件

### 步骤 3.3 导出 PDF（可选）
- 评估 `print()` + print CSS 方案，或引入 html2pdf（视需求决定）

**P3 完成标准**：可分享只读文档，可导出 MD 文件。

---

## 贯穿性工作

| 事项 | 时机 |
|---|---|
| TypeScript 类型完整 | 每步同步 |
| `tsc --noEmit` 校验 | 每步结束 |
| `vite build` 验证 | P0/P1/P3 结束 |
| 错误处理（try-catch + Toast） | 涉及网络/渲染处 |
| 响应式适配（窄屏 Tab） | 复用 useResponsiveLayout |
| 主题适配（dark mode） | 所有样式加 `dark:` 变体 |

---

## 风险与决策点

1. **markdown-it HTML 开关**：编辑场景可开 `html: true`（信任作者），分享场景必须关（防 XSS）→ 需两个实例
2. **Monaco MD 补全**：P0 先不做智能补全，仅语法高亮；补全留 P2
3. **长文档性能**：> 5000 行时考虑虚拟滚动，P0 先不处理
4. **后端未就绪**：P1 可先用 localStorage Mock，后端就绪后切换
