# 文档编辑页面优化评估报告

> 评估范围：`/docs/:id` 文档编辑页面（MarkdownEditorPage 及其子组件、相关 CSS）
> 评估时间：2026-06-25
> 涉及文件：
> - [MarkdownEditorPage.tsx](../frontend/src/pages/MarkdownEditorPage.tsx)
> - [MarkdownEditor.tsx](../frontend/src/components/Markdown/MarkdownEditor.tsx)
> - [MarkdownToolbar.tsx](../frontend/src/components/Markdown/MarkdownToolbar.tsx)
> - [MarkdownPreview.tsx](../frontend/src/components/Markdown/MarkdownPreview.tsx)
> - [DocSidebar.tsx](../frontend/src/components/Markdown/DocSidebar.tsx)
> - [index.css](../frontend/src/index.css#L137-L336)

---

## 1. 样式优化（可读性）

### ✅ 良好
- `markdown-body` 行高 1.7、字号 15px、字重正常，整体可读性达标
- 标题层级 h1-h4 字号梯度合理（1.9em / 1.5em / 1.25em / 1.05em），h1/h2 带 border-bottom 区分明显
- 代码块 / 行内代码 / 引用 / 表格 颜色对比度满足 WCAG AA

### ⚠️ 问题
| # | 问题 | 位置 | 现状 | 影响 |
|---|---|---|---|---|
| 1.1 | **编辑器字号偏小** | MarkdownEditor.tsx#L128 | `fontSize: 14` | 中文 Markdown 14px 偏吃力，长文易疲劳 |
| 1.2 | **编辑器行高未配置** | 同上 | 默认 1.5 | Monaco 默认行高对中文偏紧，长段落阅读吃力 |
| 1.3 | **编辑器强制 vs-dark 主题** | MarkdownEditor.tsx#L127 | `theme="vs-dark"` 硬编码 | 浅色模式下编辑区黑底，预览区白底，割裂感强，违背系统主题一致性 |
| 1.4 | **h5/h6 样式缺失** | index.css#L175-L176 | 只到 h4 | 文档用 h5/h6 时无字号差异，层级断裂 |
| 1.5 | **标题上边距过大** | index.css#L161 | `margin-top: 1.8em` | 文档首段后第一个标题间距过大，节奏松散 |

### 建议
- 编辑器 `fontSize: 16`、新增 `lineHeight: 26`（中文友好）
- 主题改为跟随系统：`theme={theme === 'dark' ? 'vs-dark' : 'light'}`
- 补 h5 (1em)、h6 (0.85em) 样式
- 标题 `margin-top: 1.4em`，首个标题用 `:first-child` 重置为 0

---

## 2. 布局优化

### ✅ 良好
- 宽屏分隔栏拖拽 + 窄屏 Tab 切换，响应式骨架正确
- 分隔栏 resizer CSS 视觉反馈完善（hover 变色 + 高度变化）
- `MIN_PERCENTAGE = 25` 防止任一侧被压扁

### ⚠️ 问题
| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| 2.1 | **分隔栏多了一个 3px 空隙 div** | MarkdownEditorPage.tsx#L514 `<div className="w-3" />` | 分隔条左右各留空，视觉断裂；应是分隔栏自带 padding |
| 2.2 | **标题栏拥挤** | MarkdownEditorPage.tsx#L341-L437 | 8 个元素挤在一行（侧栏开关/标题/字数/状态/保存/PDF/分享下拉），窄屏溢出 |
| 2.3 | **窄屏缺工具栏** | MarkdownEditorPage.tsx#L478-L499 | 窄屏下 MarkdownEditor 自带工具栏会换行，按钮太密 |
| 2.4 | **侧栏无宽度记忆** | MarkdownEditorPage.tsx#L43 `panelPercent` 默认 50 | 拖拽后刷新丢失，用户体验差 |
| 2.5 | **侧栏列表无搜索** | DocSidebar.tsx | 文档多于 20 篇时查找困难 |

### 建议
- 删除多余 `<div className="w-3" />`，分隔栏 6px 已含间距
- 标题栏分组：左侧（开关 + 标题）+ 右侧（状态 + 操作组），操作组用 `gap-1` 收紧；窄屏隐藏字数/行数
- `panelPercent` 持久化到 localStorage
- DocSidebar 顶部加搜索框（前端过滤）

---

## 3. 颜色搭配

### ✅ 良好
- 暗色/浅色双主题完整覆盖 markdown-body 各元素
- 主色 `#4F46E5` 与状态色（warning/error/success）语义清晰

### ⚠️ 问题
| # | 问题 | 影响 |
|---|---|---|
| 3.1 | **编辑器与预览背景色不统一**（见 1.3） | 浅色模式下编辑器黑底 vs 预览白底，割裂 |
| 3.2 | **编辑器 toolbar 无边框分隔** | 工具栏与编辑区视觉粘连，层次不清 |
| 3.3 | **保存按钮在 dirty 时无强调** | 保存按钮永远是主色填充，未保存时缺乏视觉提醒 |

### 建议
- 编辑器主题跟随系统主题
- 工具栏下方加 `border-b border-light-3`（已有，但浅色下对比度低，建议 `border-b-2`）
- 未保存时保存按钮加 `ring-2 ring-primary/40 animate-pulse-once`

---

## 4. 交互体验

### ✅ 良好
- Monaco 原生撤销/重做（Ctrl+Z / Ctrl+Y）流畅
- 工具栏三种插入模式（wrap/linePrefix/block）设计合理
- 自动保存 3s debounce + 手动保存 Ctrl+S 双通道
- 重名冲突的 Modal 交互完整（覆盖/重命名/取消 + 二次确认）

### ⚠️ 问题
| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| 4.1 | **无快捷键提示** | 工具栏按钮只有 `title` | 用户不知道 Ctrl+B 等快捷键是否可用 |
| 4.2 | **无编辑器快捷键绑定** | MarkdownEditor.tsx#L33 | Monaco 默认不带 Markdown 快捷键，Ctrl+B 不触发加粗 |
| 4.3 | **标题输入框无 Ctrl+S 拦截** | MarkdownEditorPage.tsx#L359 | 焦点在标题输入框时按 Ctrl+S 可能触发浏览器原生保存 |
| 4.4 | **工具栏无分组分隔线** | MarkdownToolbar.tsx#L119 | 11 个按钮平铺，加粗/斜体/标题/列表/代码/表格混在一起，认知负荷高 |
| 4.5 | **右键菜单单一** | MarkdownPreview.tsx#L215 | mermaid 块只有"用 AI 修改"，缺"复制源码""下载 SVG"等常用操作 |
| 4.6 | **无图片插入功能** | 工具栏 | Markdown 文档常需插图，当前只能手写 `![](url)` |
| 4.7 | **无撤销/重做按钮** | 工具栏 | 移动端无键盘，无法撤销 |

### 建议（优先级排序）
- **P0**：编辑器绑定 Ctrl+B/I（加粗/斜体）→ Monaco `addCommand`
- **P0**：全局 Ctrl+S 拦截（含标题输入框焦点时）
- **P1**：工具栏分组（文字格式 / 段落 / 插入 / 撤销重做）+ 分隔线
- **P1**：工具栏按钮 title 加快捷键提示（"加粗 (Ctrl+B)"）
- **P2**：右键菜单扩展（用 AI 修改 / 复制源码 / 下载 SVG / 查看全屏）
- **P2**：图片插入按钮（粘贴板上传或 URL 输入弹窗）

---

## 5. 功能完整性

### ✅ 已有
- 基础格式：加粗/斜体/标题/引用/有序无序列表/链接/行内代码/代码块/表格/Mermaid
- 导出：MD 文件下载、打印 PDF
- 分享：公开/私有切换 + 链接复制
- AI 协同：mermaid 块右键 AI 修改

### ⚠️ 缺失
| # | 缺失功能 | 优先级 | 理由 |
|---|---|---|---|
| 5.1 | **图片插入/上传** | P1 | 图文混排是文档核心场景 |
| 5.2 | **撤销/重做按钮** | P1 | 移动端必备 |
| 5.3 | **查找替换** | P1 | 长文必备（Monaco 自带 Ctrl+F，但需在工具栏露出入口） |
| 5.4 | **字数统计详情** | P2 | 当前只显示字符数，应区分"字符/单词/行数/预计阅读时间" |
| 5.5 | **大纲目录** | P2 | 长文导航，点击跳转 |
| 5.6 | **版本历史** | P2 | 后端已有 `DocumentVersionResp`，前端未消费 |
| 5.7 | **拖拽上传 .md 文件** | P3 | 快速导入已有文档 |
| 5.8 | **快捷键面板** | P3 | `?` 或按钮唤出快捷键速查表 |

---

## 6. 性能优化

### ✅ 良好
- 预览 300ms debounce + `cancelled` 标志防竞态
- Monaco `automaticLayout: true` 自动适配容器尺寸
- 分隔栏拖拽用 `requestAnimationFrame` 节流
- `beforeunload` 用 ref 同步读取 isDirty，避免闭包陷阱

### ⚠️ 问题
| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| 6.1 | **Mermaid 渲染无 Web Worker** | markdown.ts | 大型图表渲染阻塞主线程，输入卡顿 |
| 6.2 | **预览 HTML 全量替换** | MarkdownPreview.tsx#L60 `setHtml(result)` | 每次输入都全量重渲染 DOM，长文档闪烁 |
| 6.3 | **Monaco 未配置按需加载语言** | main.tsx | 5 个 worker 全部内联，首屏多下载 2-3MB |
| 6.4 | **目录列表无虚拟滚动** | DocSidebar.tsx | 文档 >100 篇时列表渲染卡顿 |
| 6.5 | **Mermaid SVG 未缓存** | markdown.ts | 同一图表反复渲染浪费 CPU |

### 建议
- **P0**：Monaco worker 改回 `?worker`（非 inline），用之前排查过的稳定配置；首屏不加载 worker
- **P1**：预览增量更新——用 `requestIdleCallback` 分块渲染，或 diff DOM（复杂度高，建议先用 CSS `transition: opacity` 淡化闪烁）
- **P2**：DocSidebar 用 `react-window` 虚拟滚动
- **P2**：Mermaid 渲染结果按 `code+theme` 做 Map 缓存

---

## 总体优化优先级

| 优先级 | 项 | 工作量 | 收益 |
|---|---|---|---|
| **P0** | 编辑器主题跟随系统（1.3） | 小 | 视觉一致性大幅提升 |
| **P0** | 编辑器字号 16 + 行高 26（1.1/1.2） | 小 | 长文编辑舒适度 |
| **P0** | Ctrl+B/I 快捷键 + Ctrl+S 全局拦截（4.2/4.3） | 中 | 编辑效率核心 |
| **P0** | 删除多余分隔栏空隙（2.1） | 极小 | 视觉细节 |
| **P1** | 工具栏分组 + 分隔线（4.4） | 小 | 认知负荷降低 |
| **P1** | 分隔比例 localStorage 持久化（2.4） | 小 | 用户体验 |
| **P1** | 标题栏窄屏布局优化（2.2） | 中 | 移动端可用性 |
| **P1** | 撤销/重做按钮（5.2） | 小 | 移动端必备 |
| **P1** | 图片插入（5.1） | 中 | 功能完整性 |
| **P2** | DocSidebar 搜索 + 虚拟滚动（2.5/6.4） | 中 | 文档多时体验 |
| **P2** | 大纲目录（5.5） | 中 | 长文导航 |
| **P2** | 右键菜单扩展（4.5） | 小 | 高频操作 |
| **P2** | Mermaid 渲染缓存（6.5） | 中 | 输入流畅度 |
| **P3** | 版本历史 UI（5.6） | 大 | 数据安全 |
| **P3** | 拖拽导入 .md（5.7） | 中 | 导入效率 |

---

## 推荐实施路径

P0 四项工作量都不大但收益显著，建议优先实施。特别是**编辑器主题跟随系统**——当前浅色模式下编辑器黑底、预览白底，视觉割裂非常明显，这是用户最直观能感受到的问题。

后续按 P1 → P2 → P3 顺序推进，每阶段完成后做一次回归验证。
