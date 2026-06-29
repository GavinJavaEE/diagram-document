# 飞书化文档重写方案

> 评估范围：将现有 Monaco + Markdown 双栏编辑器重写为飞书式 Block-based WYSIWYG 协同文档
> 输出时间：2026-06-25
> 预计总工作量：5.8 人月（2 人全职约 3 个月）

---

## 一、现状盘点与目标差距

### 当前架构
- **编辑器**：Monaco + 双栏 Markdown 预览（用户必须懂 Markdown 语法）
- **数据模型**：`Document.content` 存 Markdown 字符串，`DocumentVersion` 存快照
- **协同**：单人编辑，无实时通道
- **Block**：仅 mermaid 块有特殊右键 AI 处理
- **后端**：Spring Boot REST + MySQL + Redis（仅缓存），无 WebSocket

### 飞书化目标
| 维度 | 目标 |
|---|---|
| 编辑模型 | Block-based WYSIWYG，所见即所得，用户无需懂任何语法 |
| 协同 | 多人实时共编，光标/选区可见，离线自动合并 |
| Block 生态 | 段落/标题/列表/代码/表格/图片/分割线/引用/mermaid/UML/脑图/公式/附件 |
| 操作体验 | `/` 命令菜单、块拖拽重排、悬浮工具栏、行级评论 |
| 版本管理 | Op 级历史回溯、版本对比、一键回滚 |
| 现有能力保留 | AI 生成/修改 mermaid、分享公开链接、导出 MD/PDF |

---

## 二、技术选型

### 前端

| 模块 | 选型 | 理由 |
|---|---|---|
| 编辑器内核 | **Tiptap v2**（基于 ProseMirror） | React 生态最成熟的块级 WYSIWYG 框架，官方协同方案 Hocuspocus，自定义 Node/Mark 成本低 |
| 协同算法 | **Yjs**（CRDT） | 去中心化合并、离线强一致、与 Tiptap 官方集成（`y-prosemirror`） |
| 协同传输 | **y-websocket**（客户端）+ **Hocuspocus Server**（Node 服务端） | 见下方"协同通道决策" |
| 脑图 Block | **markmap-lib** | 将 Markdown 思维大纲渲染为脑图，轻量 |
| 公式 Block | **KaTeX** | 比 MathJax 快 5 倍 |
| UML Block | 复用 **mermaid** classDiagram/sequenceDiagram | 已有依赖 |
| 状态管理 | 现有 Zustand | 无需更换 |

### 协同通道决策（关键）

| 方案 | 优势 | 劣势 | 推荐 |
|---|---|---|---|
| **A. Hocuspocus (Node.js)** | 与 Yjs 官方配套，开箱即用，支持 Redis 持久化、权限 hook | 后端引入 Node 服务，技术栈分裂（Java + Node） | ⭐⭐⭐ |
| **B. 自建 Spring WebSocket + y-sync** | 技术栈统一，复用现有 Java 鉴权/Redis | 需自己实现 Yjs update 广播、awareness、持久化，工作量大 | ⭐⭐ |
| **C. y-webrtc (P2P)** | 无后端服务 | 无法持久化、跨网络不可靠、无法做权限 | ⭐ |

**推荐方案 A**：新增一个轻量 Node 服务（仅处理协同），与现有 Spring Boot 通过 Redis Pub/Sub 通信做权限校验和事件通知。理由：Hocuspocus 是 Yjs 官方推荐的服务端，Redis 持久化/权限 hook/onAuthenticate 回调都开箱即用，自建 Spring 版本相当于重造轮子且容易出 bug。

### 后端

| 模块 | 选型 |
|---|---|
| WebSocket 服务 | **Node.js + @hocuspocus/server**（独立进程，端口 9092） |
| 协同持久化 | Redis（Yjs doc state）+ 定时落库 MySQL |
| 权限校验 | Hocuspocus `onAuthenticate` hook → 调 Spring Boot REST 验 token + 文档权限 |
| 文档快照 | 保留现有 `Document` + `DocumentVersion`，content 字段改存 Tiptap JSON |
| Op 日志 | 新增 `t_document_op` 表（追加写，用于版本回溯） |
| 评论 | 新增 `t_comment` 表 |

### 数据库变更

```sql
-- 1. 文档表：content 改为 Tiptap JSON（兼容期保留 markdown_content）
ALTER TABLE t_document ADD COLUMN content_json MEDIUMTEXT COMMENT 'Tiptap JSON';
ALTER TABLE t_document ADD COLUMN cover_url VARCHAR(500);
ALTER TABLE t_document ADD COLUMN collaborator_user_ids VARCHAR(2000) COMMENT 'JSON 数组';

-- 2. Op 日志表（新增）
CREATE TABLE t_document_op (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  op_type VARCHAR(20) NOT NULL COMMENT 'update/awareness',
  op_payload MEDIUMTEXT COMMENT 'Yjs update 二进制 base64',
  created_at DATETIME NOT NULL,
  INDEX idx_doc_created (document_id, created_at)
);

-- 3. 评论表（新增）
CREATE TABLE t_comment (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  block_id VARCHAR(64) NOT NULL COMMENT '被评论的 Block ID',
  content TEXT NOT NULL,
  resolved TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_doc_block (document_id, block_id)
);

-- 4. 协作者权限表（新增）
CREATE TABLE t_document_collaborator (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  permission VARCHAR(20) NOT NULL COMMENT 'owner/editor/commenter/viewer',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_doc_user (document_id, user_id)
);
```

---

## 三、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       浏览器（前端）                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tiptap Editor (ProseMirror)                            │ │
│  │  ├─ 自定义 Block: mermaid/uml/mindmap/formula/image     │ │
│  │  ├─ y-prosemirror (Yjs Plugin)                         │ │
│  │  ├─ / 命令菜单 (Suggestion)                             │ │
│  │  ├─ 悬浮工具栏 (BubbleMenu)                             │ │
│  │  └─ 块拖拽 (dragHandle)                                 │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │ y-websocket (WSS)                       │
│                   │ awareness (光标/在线状态)                 │
└───────────────────┼─────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌──────────────────┐    ┌──────────────────────┐
│  Hocuspocus      │    │  Spring Boot (9091)  │
│  Server (9092)   │    │  REST API            │
│  (Node.js)       │    │  - Auth              │
│                  │    │  - Document CRUD     │
│  - onAuthenticate│◄──►│  - AI (Doubao)       │
│  - onChange      │    │  - Share/Export      │
│  - 持久化到 Redis │    │  - Comment           │
│  - 定时落库 MySQL │    │  - Version           │
└──────────────────┘    └──────────────────────┘
        │                        │
        ▼                        ▼
┌──────────────────────────────────────────────────┐
│  Redis (Yjs state)  │  MySQL (snapshot/op/log)  │
└──────────────────────────────────────────────────┘
```

---

## 四、阶段划分

### 阶段 0：基础设施准备（0.5 人月）

**后端**
- 新增 Node Hocuspocus 服务脚手架（`collab-server/` 目录）
- Hocuspocus 配置：Redis 持久化（`@hocuspocus/extension-redis`）、onAuthenticate 钩子
- Spring Boot 新增 `GET /internal/check-doc-permission` 内部接口供 Hocuspocus 调用
- DDL 执行：新增 `t_document_op`、`t_comment`、`t_document_collaborator`，`t_document` 加列
- Spring Boot 新增 WebSocket 配置类（用于 awareness 广播的备用通道，非必需）

**前端**
- 依赖安装：`@tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs y-prosemirror y-websocket`
- 移除 Monaco 依赖（编辑器页）/ 保留 mermaid 依赖
- 路由调整：`/docs/new` `/docs/:id` 指向新 `BlockEditorPage`

**交付物**：可启动的空 Tiptap 编辑器，双服务（Spring + Node）能跑

### 阶段 1：Block 系统核心（1.5 人月）

**基础 Block**（Tiptap 内置 Extension）
- 段落 Paragraph
- 标题 Heading（h1-h6）
- 列表 BulletList / OrderedList / TaskList
- 代码块 CodeBlock（用 highlight.js 替代 Monaco，轻量）
- 引用 Blockquote
- 分割线 HorizontalRule
- 表格 Table
- 链接 Link
- 加粗/斜体/下划线/删除线/行内代码

**自定义 Block**（需开发）
- `MermaidBlock`：NodeView 组件，内嵌现有 Mermaid 渲染逻辑 + 右键 AI 菜单（迁移现有能力）
- `UmlBlock`：复用 Mermaid classDiagram，UI 上独立入口
- `MindmapBlock`：markmap-lib 渲染
- `FormulaBlock`：KaTeX 渲染
- `ImageBlock`：支持上传（接现有 OSS 或本地 `/upload`）+ URL + 拖拽粘贴
- `DividerBlock`：增强分割线（飞书样式）

**交互**
- `/` 命令菜单（`@tiptap/suggestion`）：输入 `/` 弹出 Block 类型列表
- 悬浮工具栏（BubbleMenu）：选中文本显示加粗/斜体/链接/颜色
- 块拖拽手柄：块左侧 `⋮⋮` 图标，拖拽重排
- 块右侧 `+` 按钮：在下方插入新块

**数据**
- `Document.content_json` 存 Tiptap JSON
- 双向转换器：`markdownToTiptapJSON` / `tiptapJSONToMarkdown`（用 `@tiptap/extension-markdown` 或 `prosemirror-markdown`）
- 存量 Markdown 文档迁移脚本（一次性 job）

**交付物**：单人可用的飞书式 WYSIWYG 编辑器，旧 Markdown 文档可自动转换为 Block 文档

### 阶段 2：协同编辑（1.5 人月）

**前端**
- `useYjsDocument(documentId)` Hook：建立 WebSocket 连接、绑定 Yjs doc 到 Tiptap
- 协同光标扩展（`@tiptap/extension-collaboration-cursor`）：显示协作者光标颜色 + 名字
- 在线协作者列表（右上角头像组）
- 断线重连 + 离线编辑缓存（IndexedDB，`y-indexeddb`）

**后端（Hocuspocus）**
- `onAuthenticate`：校验 JWT + 调 Spring REST 校验文档权限
- `onConnect`：记录在线用户，广播 awareness
- `onChange`：累积 Yjs update，每 N 秒或 M 字节落库 `t_document_op`
- 定时快照任务：每 5 分钟把 Yjs state dump 到 `DocumentVersion`
- 水平扩展：多实例时用 Redis Pub/Sub 转发跨实例广播

**后端（Spring）**
- `POST /documents/:id/collaborators`：邀请协作者
- `GET /documents/:id/collaborators`：协作者列表
- `PATCH /documents/:id/collaborators/:userId`：修改权限
- `DELETE /documents/:id/collaborators/:userId`：移除协作者
- WebSocket 心跳/重连协议设计

**交付物**：多人可同时编辑同一文档，光标可见，离线合并正确

### 阶段 3：评论与 @ 提及（0.5 人月）

- 行级评论：选中块 → 右键/侧边按钮 → 评论侧边栏
- 评论支持 `@用户`，触发邮件/站内通知
- 评论解决（resolved）+ 线程回复
- `t_comment` CRUD 接口

**交付物**：飞书式评论体验

### 阶段 4：版本历史（0.5 人月）

- 版本时间线 UI：左侧时间轴，右侧预览
- 版本对比：diff 两个版本的 Tiptap JSON（用 `prosemirror-diff`）
- 一键回滚：把指定版本的 state 作为新版本写入
- 后端：`GET /documents/:id/versions` 已存在，补 `POST /documents/:id/versions/:v/restore`

**交付物**：可查看历史版本、对比差异、回滚

### 阶段 5：AI 能力迁移与增强（0.5 人月）

- 现有「右键 mermaid 块 → AI 修改」迁移到新 MermaidBlock NodeView
- 新增「AI 续写」：块末尾按 `Tab` 或 `/ai` 唤起，AI 续写内容
- 新增「AI 润色」：选中段落 → BubbleMenu → 润色
- 新增「AI 生成脑图」：输入主题 → markmap 结构生成
- 复用现有 Doubao 接口，prompt 适配 Block JSON 输入输出

**交付物**：AI 能力在新编辑器完整可用，且有增强

### 阶段 6：分享/导出适配（0.3 人月）

- 分享页 `/docs/:id/share/:token` 改为渲染 Tiptap JSON 只读视图
- 导出 Markdown：用 `tiptapJSONToMarkdown` 转换后下载
- 打印 PDF：复用现有 print CSS，针对 Block 结构微调
- 新增导出 HTML（Tiptap → HTML 直接序列化）

**交付物**：分享与导出在新格式下完整可用

### 阶段 7：迁移与上线（0.5 人月）

- 存量文档批量迁移脚本：`Document.content` (Markdown) → `content_json` (Tiptap JSON)
- 兼容期：编辑器优先读 `content_json`，回退读 `content`
- 灰度发布：先对新文档启用 Block 编辑器，旧文档保留 Monaco 双栏
- 全量切换：验证无问题后，下线 Monaco 编辑器
- 监控：Hocuspocus 连接数、Yjs doc 内存、Op 落库延迟

**交付物**：平滑迁移，无数据丢失

---

## 五、工作量汇总

| 阶段 | 内容 | 人月 |
|---|---|---|
| 0 | 基础设施 | 0.5 |
| 1 | Block 系统核心 | 1.5 |
| 2 | 协同编辑 | 1.5 |
| 3 | 评论与 @ 提及 | 0.5 |
| 4 | 版本历史 | 0.5 |
| 5 | AI 能力迁移 | 0.5 |
| 6 | 分享导出适配 | 0.3 |
| 7 | 迁移与上线 | 0.5 |
| **合计** | | **5.8 人月** |

按 2 人全职推进，约 3 个月完成。

---

## 六、风险与对策

| 风险 | 等级 | 对策 |
|---|---|---|
| Yjs 大文档性能（>100KB） | 高 | 定期快照压缩、IndexedDB 分片、懒加载历史 Op |
| Hocuspocus 单点故障 | 中 | 多实例部署 + Redis Pub/Sub 转发 + Nginx 负载均衡 |
| 离线合并边缘 case | 中 | 阶段 2 充分压测（断网/重连/并发改同一段） |
| 技术栈分裂（Java + Node） | 中 | Node 服务仅做协同透传，业务逻辑仍在 Java，限制蔓延 |
| 存量文档迁移失败 | 中 | 兼容期双格式共存，迁移脚本先在影子库跑，对比差异 |
| Tiptap 版本升级 breaking change | 低 | 锁定 Tiptap v2.x，升级走灰度 |
| mermaid 块在协同下的冲突 | 中 | mermaid 代码作为 Node text 存，Yjs 自动合并；AI 修改时加乐观锁 |

---

## 七、关键决策点（待确认）

1. **协同通道**：采用方案 A（新增 Node Hocuspocus 服务）？还是坚持纯 Java 技术栈走方案 B（自建 Spring WebSocket，工作量大但栈统一）？
2. **存量文档**：是否需要兼容期？还是一刀切迁移（风险高但干净）？
3. **Node 服务部署**：现有部署环境是否支持新增 Node 进程？资源是否够？
4. **协作者权限模型**：是否需要飞书式的"组织/团队"概念？还是仅文档级协作者邀请即可？
5. **评论**：是否需要邮件/站内通知系统？还是仅文档内评论？
6. **脑图/UML**：是否必须？若可砍掉可省 0.3 人月

确认后，可基于本方案拆解阶段 0 + 阶段 1 的详细开发步骤文档。
