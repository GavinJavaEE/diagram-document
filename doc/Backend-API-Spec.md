# DiagramAI 后端 API 接口梳理文档

> 版本: v1.0  
> 更新日期: 2026-06-14  
> 适用对象: 后端开发工程师  
> 基础路径: `/api/v1`

---

## 目录

1. [API 概述与设计原则](#1-api-概述与设计原则)
2. [用户认证 API](#2-用户认证-api)
3. [订阅与支付 API](#3-订阅与支付-api)
4. [AI 生成与修复 API](#4-ai-生成与修复-api)
5. [图表文档管理 API](#5-图表文档管理-api)
6. [图表模板 API](#6-图表模板-api)
7. [用户偏好与统计 API](#7-用户偏好与统计-api)
8. [统一错误码表](#8-统一错误码表)
9. [数据模型参考](#9-数据模型参考)

---

## 1. API 概述与设计原则

### 1.1 设计原则

| 原则 | 说明 |
|-----|------|
| RESTful | 资源为中心，使用标准 HTTP 方法 |
| JSON | 所有请求体与响应体均为 JSON 格式 |
| 版本化 | 通过 URL 路径进行版本控制 `/api/v1/...` |
| HTTPS | 生产环境强制使用 HTTPS |
| Token 机制 | 服务端存储 Token 记录并关联用户，使用 Bearer 模式传递身份 |
| 统一响应 | 所有接口使用一致的响应结构（见 1.2） |
| 幂等性 | GET/PUT/DELETE 保证幂等；POST 创建需返回唯一 ID |

### 1.2 统一响应格式

**成功响应（HTTP 200 / 201 / 204）：**

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { /* 具体业务数据 */ },
  "timestamp": 1718345678901
}
```

**分页列表响应（HTTP 200）：**

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [ /* 数据项数组 */ ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "timestamp": 1718345678901
}
```

**错误响应（HTTP 4xx / 5xx）：**

```json
{
  "success": false,
  "code": 40001,
  "message": "参数验证失败",
  "error": {
    "field": "email",
    "detail": "邮箱格式不正确"
  },
  "timestamp": 1718345678901
}
```

> **前端提示**: `code` 字段用于前端精确匹配错误类型；`message` 可直接展示给用户；`error` 是可选的详细错误信息。

### 1.3 认证方式

**Token 类型**: 自定义 Token（后端使用自定义算法生成并存储）

**Token 传递**: 请求头中携带（Bearer 模式）

```
Authorization: Bearer <access_token>
```

**后端 Token 存储表（AccessToken）结构**:

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| token | string | ✅ | Token 字符串（自定义算法生成，唯一索引） |
| userId | string | ✅ | 关联用户 ID（外键 → users.id） |
| email | string | ✅ | 用户邮箱快照 |
| isSubscribed | boolean | ✅ | 当前订阅状态快照 |
| subscriptionPlan | string | ✅ | 订阅方案快照：`free` / `pro` |
| subscriptionExpiresAt | datetime | ❌ | 订阅到期时间快照 |
| ip | string | ✅ | 登录时的客户端 IP |
| userAgent | string | ✅ | 登录时的 User-Agent |
| createdAt | datetime | ✅ | Token 创建时间 |
| expiresAt | datetime | ✅ | Token 到期时间（默认创建后 24 小时） |
| lastUsedAt | datetime | ✅ | 最近一次使用时间（每次请求更新） |
| isRevoked | boolean | ✅ | 是否已被撤销（默认 false） |
| revokedReason | string | ❌ | 撤销原因（如 `logout` / `password_change`） |

**Token 生成流程（后端侧）**:
1. 用户登录成功（邮箱+密码校验通过）
2. 使用自定义算法生成随机字符串 Token（长度建议 48-64 位）
3. 向 `access_tokens` 表插入一条新记录（包含 userId、订阅状态快照、IP、UA、过期时间）
4. 返回 Token 字符串给前端

**Token 校验流程（后端每次请求）**:
1. 从请求头 `Authorization: Bearer <token>` 提取 Token
2. 查询数据库：`WHERE token = ? AND isRevoked = false AND expiresAt > NOW()`
3. 若记录存在 → 更新 `lastUsedAt` → 通过校验，将用户信息注入到请求上下文
4. 若记录不存在或已过期 → 返回 40105 错误

**Token 刷新机制（可选）**:
- 不强制区分 Access/Refresh Token，单 Token 即可
- 如需长会话：可在 Token 接近过期（如剩余 < 2 小时）时自动生成新 Token 并通过响应头 `X-New-Authorization-Token: <new_token>` 返回给前端
- 或：提供显式刷新接口（见 2.3）

**Token 撤销场景**:
- 用户主动登出（设置 `isRevoked = true`）
- 用户修改密码（撤销该用户所有 Token）
- 管理员强制下线
- Token 自身过期（由 `expiresAt` 控制）

**前端存储建议**:
- 优先存储到 `localStorage`（跨浏览器会话，用户手动登出才清理）
- 或 `sessionStorage`（仅当前浏览器会话，关闭标签后自动失效）
- **不要存储在普通 Cookie（非 httpOnly）** 中避免 XSS 风险（如使用 Cookie 需配合 httpOnly + Secure + SameSite）

**索引建议**:
- `token` 唯一索引（主键查询）
- `userId` + `createdAt` 复合索引（查询用户的登录历史/强制下线）
- `expiresAt` 索引（定期清理过期 Token 的定时任务）
- `isRevoked` + `expiresAt` 复合索引

**有效期**:

| Token 类型 | 有效期 | 说明 |
|-----------|--------|------|
| 自定义 Token | 24 小时（建议） | 用户登录后持续使用；每次请求自动续期或保持原始到期时间 |

**权限分级**（后端根据 Token 关联的 userId 从数据库实时获取最新权限，不依赖 snapshot）:

| 角色 | 能力 |
|-----|------|
| 未登录访客 | 使用编辑器基础功能（无保存）、浏览公开文档与模板 |
| 免费用户 | 保存文档、每日 5 次 AI 生成、每日 10 次 AI 修复 |
| Pro 订阅用户 | 无限次 AI 生成与修复、文档公开分享、保存自定义模板 |
| 管理员 | 用户管理、模板管理、数据统计 |

### 1.4 请求限流策略

| 操作 | 免费用户 | Pro 用户 | 未登录 |
|------|---------|---------|--------|
| 登录请求 | 10 次/分钟/IP | 10 次/分钟/IP | 10 次/分钟/IP |
| AI 生成 | 5 次/日 | 不限 | 不允许 |
| AI 修复 | 10 次/日 | 不限 | 不允许 |
| 文档保存 | 100 次/日 | 不限 | 不允许 |
| 普通查询 | 100 次/分钟 | 300 次/分钟 | 50 次/分钟 |

**超过限流响应**:

```json
{
  "success": false,
  "code": 42901,
  "message": "请求过于频繁，请稍后重试",
  "error": { "retryAfterSeconds": 60 },
  "timestamp": 1718345678901
}
```

响应头同时包含：
```
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718345738
```

### 1.5 HTTP 方法使用规范

| 方法 | 用途 | 成功状态码 |
|-----|------|-----------|
| GET | 查询资源 / 列表 | 200 |
| POST | 创建资源 / 提交操作 | 201 / 200 |
| PUT | 整体更新资源 | 200 |
| PATCH | 部分更新资源 | 200 |
| DELETE | 删除资源 | 200 / 204 |

### 1.6 分页参数规范

**请求参数（Query）**:

| 参数 | 类型 | 默认值 | 范围 |
|-----|------|--------|------|
| page | number | 1 | >= 1 |
| pageSize | number | 20 | 1-100 |

**响应字段**: 见 1.2 中的分页列表响应。

### 1.7 时间格式规范

- 所有时间字段使用 **ISO 8601** 格式
- 使用 **UTC** 时间（包含 `Z` 后缀）
- 示例: `2026-06-14T10:00:00.000Z`

---

## 2. 用户认证 API

### 2.1 用户注册

**POST** `/api/v1/auth/register`

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

| 字段 | 类型 | 必填 | 约束 |
|-----|------|------|------|
| email | string | ✅ | 6-255 字符，有效邮箱格式 |
| password | string | ✅ | 8-128 字符，至少包含字母和数字 |
| confirmPassword | string | ✅ | 必须与 password 一致 |

**成功响应 (201 Created)**:

```json
{
  "success": true,
  "code": 201,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_1234567890abcdef",
      "email": "user@example.com",
      "isSubscribed": false,
      "subscriptionPlan": "free",
      "subscriptionExpiresAt": null,
      "createdAt": "2026-06-14T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    },
    "accessToken": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    "expiresIn": 86400,
    "expiresAt": "2026-06-15T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**后端要点**: 注册成功后立即生成并插入一条 `access_tokens` 记录，返回给前端，让用户注册后直接进入已登录状态。

**可能的错误码**:
- `40001` 参数验证失败
- `40901` 邮箱已被注册
- `50001` 服务器内部错误

---

### 2.2 用户登录

**POST** `/api/v1/auth/login`

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_1234567890abcdef",
      "email": "user@example.com",
      "isSubscribed": true,
      "subscriptionPlan": "pro",
      "subscriptionExpiresAt": "2026-07-14T10:00:00.000Z",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    },
    "accessToken": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    "expiresIn": 86400,
    "expiresAt": "2026-06-15T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**说明**:
- `accessToken` 是后端自定义算法生成的随机字符串 Token
- `expiresIn` 为有效期秒数（86400 = 24 小时）
- `expiresAt` 为 ISO 8601 UTC 时间，明确告知前端何时过期（便于前端判断是否需要提前刷新）

**后端要点**:
- 插入一条 `access_tokens` 记录（含 userId、订阅快照、IP、UA、expiresAt）
- 如该用户已有较多 Token，可清理最早的（防止无限增长）

**可能的错误码**:
- `40001` 参数验证失败
- `40101` 邮箱或密码错误
- `42301` 账户已被锁定（多次登录失败）

---

### 2.3 刷新 Token（延长会话）

**POST** `/api/v1/auth/refresh`

**请求头**: 需要 Authorization（使用当前有效的 Token）

**请求体**: 无（由请求头中的 Token 即可定位用户）

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "Token 刷新成功",
  "data": {
    "accessToken": "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9u8t7s6",
    "expiresIn": 86400,
    "expiresAt": "2026-06-15T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**后端处理流程**:
1. 验证当前 Token 有效（未撤销、未过期）
2. 生成新的 Token，插入新的 `access_tokens` 记录
3. 撤销旧 Token（可选：立即撤销 `isRevoked = true`，或保留原 Token 至其自然过期）
4. 返回新 Token

**可能的错误码**:
- `40105` 当前 Token 无效或已过期（前端应跳转登录页）

---

### 2.4 用户登出

**POST** `/api/v1/auth/logout`

**请求头**: 需要 Authorization

**请求体**: 无（由请求头 Token 即可定位待撤销记录）

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": 1718345678901
}
```

**后端要点**: 将请求头中的 Token 对应的数据库记录标记为 `isRevoked = true`，同时记录 `revokedReason = 'logout'`。

---

### 2.5 获取当前用户信息

**GET** `/api/v1/auth/me`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "user_1234567890abcdef",
    "email": "user@example.com",
    "isSubscribed": true,
    "subscriptionPlan": "pro",
    "subscriptionExpiresAt": "2026-07-14T10:00:00.000Z",
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**前端使用场景**:
- Header 组件显示用户登录状态
- 页面刷新后恢复用户会话
- 订阅状态检查

---

### 2.6 修改密码

**PATCH** `/api/v1/auth/password`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmNewPassword": "NewPassword456!"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "密码修改成功",
  "data": null,
  "timestamp": 1718345678901
}
```

**后端要点**: 密码修改成功后，**需撤销该用户所有现存 Token**（将该用户 userId 对应的所有 `access_tokens` 记录标记为 `isRevoked = true`，`revokedReason = 'password_change'`）。前端应在响应后自动跳转至登录页，用户需重新登录获取新 Token。

**可能的错误码**:
- `40103` 当前密码不正确
- `40001` 新密码不符合强度要求

---

### 2.7 发送重置密码邮件

**POST** `/api/v1/auth/password/forgot`

**请求体**:

```json
{
  "email": "user@example.com"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "重置密码邮件已发送，请检查您的邮箱",
  "data": null,
  "timestamp": 1718345678901
}
```

> **安全要点**: 无论邮箱是否存在，都应返回相同的响应，防止邮箱枚举攻击。

---

### 2.8 重置密码

**POST** `/api/v1/auth/password/reset`

**请求体**:

```json
{
  "resetToken": "reset_token_abc123xyz789",
  "newPassword": "NewPassword456!",
  "confirmNewPassword": "NewPassword456!"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "密码重置成功",
  "data": null,
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40104` 重置令牌无效或已过期
- `40105` 重置令牌已被使用

---

## 3. 订阅与支付 API

### 3.1 获取订阅状态

**GET** `/api/v1/subscription/status`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "plan": "pro",
    "isSubscribed": true,
    "expiresAt": "2026-07-14T10:00:00.000Z",
    "daysRemaining": 30,
    "features": [
      "ai_generate_unlimited",
      "ai_fix_unlimited",
      "advanced_export",
      "public_share",
      "custom_templates"
    ]
  },
  "timestamp": 1718345678901
}
```

**plan 枚举值**: `free` | `pro` | `enterprise`

**前端使用场景**:
- Header 显示用户订阅状态
- Subscribe 页面显示当前方案
- AI 面板检查是否允许无限制生成

---

### 3.2 获取订阅方案列表

**GET** `/api/v1/subscription/plans`

**（公开接口，无需认证）**

**查询参数**:

| 参数 | 类型 | 默认值 | 可选值 |
|-----|------|--------|--------|
| currency | string | CNY | CNY / USD / EUR |
| interval | string | monthly | monthly / yearly |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "currency": "CNY",
    "interval": "monthly",
    "plans": [
      {
        "id": "free",
        "name": "免费版",
        "price": 0,
        "priceDisplay": "¥0",
        "originalPrice": null,
        "originalPriceDisplay": null,
        "discountPercent": null,
        "description": "适合个人使用的基础功能",
        "features": [
          "Mermaid 图表编辑",
          "实时预览",
          "PNG/SVG 导出",
          "深色/浅色主题",
          "保存最多 10 个文档",
          "每日 5 次 AI 生成"
        ],
        "highlighted": false
      },
      {
        "id": "pro_monthly",
        "name": "Pro 月付",
        "price": 29.9,
        "priceDisplay": "¥29.9",
        "originalPrice": 49.9,
        "originalPriceDisplay": "¥49.9",
        "discountPercent": null,
        "description": "解锁 AI 高级功能",
        "features": [
          "包含免费版全部功能",
          "无限 AI 图表生成",
          "无限 AI 语法修复",
          "优先技术支持",
          "无广告体验",
          "高级导出格式",
          "无限文档保存",
          "AI 历史记录",
          "文档公开分享",
          "自定义模板"
        ],
        "highlighted": true
      },
      {
        "id": "pro_yearly",
        "name": "Pro 年付",
        "price": 299,
        "priceDisplay": "¥299",
        "originalPrice": 599,
        "originalPriceDisplay": "¥599",
        "discountPercent": 50,
        "description": "年付更优惠，相当于 ¥24.9/月",
        "features": [
          "包含月付版全部功能",
          "节省约 50%",
          "优先客服响应"
        ],
        "highlighted": false
      }
    ]
  },
  "timestamp": 1718345678901
}
```

**前端使用场景**: Subscribe 页面展示所有可选方案。

---

### 3.3 创建订阅（发起支付）

**POST** `/api/v1/subscription/create`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "planId": "pro_monthly",
  "paymentMethod": "stripe",
  "successUrl": "https://diagramai.com/subscribe/success",
  "cancelUrl": "https://diagramai.com/subscribe/cancel"
}
```

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| planId | string | ✅ | 订阅方案 ID，来自 3.2 接口 |
| paymentMethod | string | ✅ | `stripe` / `alipay` / `wechat` |
| successUrl | string | ✅ | 支付成功回调地址 |
| cancelUrl | string | ✅ | 取消支付回调地址 |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "创建订阅成功",
  "data": {
    "subscriptionId": "sub_1234567890abcdef",
    "paymentSessionId": "cs_live_abc123xyz789",
    "paymentUrl": "https://checkout.stripe.com/c/pay/cs_live_abc123xyz789",
    "planId": "pro_monthly",
    "amount": 29.9,
    "currency": "CNY",
    "status": "pending_payment"
  },
  "timestamp": 1718345678901
}
```

**status 枚举值**: `pending_payment` | `active` | `cancelled` | `expired`

**前端使用场景**: 用户选择方案后跳转到支付页面。

---

### 3.4 支付成功回调（Webhook）

**POST** `/api/v1/subscription/webhook`

**（内部接口，由支付平台调用）**

**请求体示例（Stripe）**:

```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_live_abc123xyz789",
      "customer_email": "user@example.com",
      "amount_total": 2990,
      "currency": "cny",
      "subscription": "sub_1234567890abcdef",
      "metadata": {
        "userId": "user_1234567890abcdef",
        "planId": "pro_monthly"
      }
    }
  }
}
```

**成功响应**: HTTP 200（空响应即可）

**后端要点**:
- 校验签名（Stripe Signing Secret）
- 更新用户订阅状态
- 记录支付历史

---

### 3.5 取消订阅

**POST** `/api/v1/subscription/cancel`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "reason": "暂时不需要了",
  "feedback": "希望以后有机会再使用"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "订阅已取消，您仍可使用至当前计费周期结束",
  "data": {
    "plan": "pro",
    "currentPeriodEnd": "2026-07-14T10:00:00.000Z",
    "willCancelAtPeriodEnd": true
  },
  "timestamp": 1718345678901
}
```

---

### 3.6 获取支付历史记录

**GET** `/api/v1/subscription/history`

**请求头**: 需要 Authorization

**查询参数**:

| 参数 | 类型 | 默认值 |
|-----|------|--------|
| page | number | 1 |
| pageSize | number | 20 |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "pay_1234567890abcdef",
        "planId": "pro_monthly",
        "amount": 29.9,
        "currency": "CNY",
        "status": "success",
        "paymentMethod": "stripe",
        "invoiceUrl": "https://pay.stripe.com/invoices/inv_abc123",
        "billingPeriodStart": "2026-06-14T10:00:00.000Z",
        "billingPeriodEnd": "2026-07-14T10:00:00.000Z",
        "createdAt": "2026-06-14T10:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "timestamp": 1718345678901
}
```

---

## 4. AI 生成与修复 API

### 4.1 AI 生成 Mermaid 图表代码

**POST** `/api/v1/ai/generate`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "description": "电商平台订单购买流程：购物车 → 结算 → 支付 → 发货 → 完成",
  "chartType": "flowchart",
  "options": {
    "includeChineseLabels": true,
    "style": "professional"
  }
}
```

| 字段 | 类型 | 必填 | 约束 |
|-----|------|------|------|
| description | string | ✅ | 10-2000 字符 |
| chartType | string | ✅ | `flowchart` / `sequence` / `class` / `state` / `er` / `gantt` / `auto` |
| options | object | ❌ | 生成选项 |

**chartType = auto** 时由后端 AI 自行判断最合适的图表类型。

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "生成成功",
  "data": {
    "mermaidCode": "flowchart TD\n    A[开始] --> B{条件判断}\n    B -->|是| C[处理数据]\n    B -->|否| D[跳过处理]\n    C --> E[完成]\n    D --> E\n    style A fill:#f9f9f9,stroke:#333\n    style E fill:#4ade80,stroke:#22c55e",
    "chartType": "flowchart",
    "promptTokens": 120,
    "completionTokens": 85,
    "totalTokens": 205,
    "generationId": "gen_abc123xyz789",
    "processingTimeMs": 1850
  },
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40001` 参数验证失败（描述过长/过短）
- `40201` AI 使用次数已达上限，请升级套餐
- `42901` 请求过于频繁
- `50301` AI 服务暂时不可用

**前端使用场景**:
- AI 侧边栏 / AI 生成面板：用户输入描述后点击"生成"
- 生成后自动将 `mermaidCode` 填入编辑器（通过 `useEditorStore.setCode`）
- 将本次生成记录加入历史列表

---

### 4.2 AI 修复 Mermaid 语法错误

**POST** `/api/v1/ai/fix`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "mermaidCode": "flowchart TD\n    A[开始 --> B[结束]",
  "errorMessage": "Parse error on line 2: ']' expected at column 8",
  "options": {
    "preserveStructure": true
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| mermaidCode | string | ✅ | 需要修复的 Mermaid 代码 |
| errorMessage | string | ✅ | 错误信息（来自 Mermaid 渲染器） |
| options | object | ❌ | 修复选项 |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "修复成功",
  "data": {
    "originalCode": "flowchart TD\n    A[开始 --> B[结束]",
    "fixedCode": "flowchart TD\n    A[开始] --> B[结束]",
    "errors": [
      {
        "line": 2,
        "message": "缺少 ']' 结束标签",
        "severity": "error",
        "fixed": true
      }
    ],
    "fixSummary": [
      "在第 2 行 '开始' 后添加了缺失的 ']' 结束标签"
    ],
    "diff": "@@ -1,2 +1,2 @@\n flowchart TD\n-    A[开始 --> B[结束]\n+    A[开始] --> B[结束]",
    "promptTokens": 220,
    "completionTokens": 95,
    "totalTokens": 315,
    "generationId": "fix_abc123xyz789",
    "processingTimeMs": 1250
  },
  "timestamp": 1718345678901
}
```

**severity 枚举值**: `error` | `warning`

**前端使用场景**:
- AI 修复面板：编辑器有错误时，用户点击"AI 修复"
- 用户可查看修复前后对比（`originalCode` vs `fixedCode`）
- 用户确认后点击"应用修复"将 `fixedCode` 填入编辑器

---

### 4.3 获取 AI 生成历史记录

**GET** `/api/v1/ai/history`

**请求头**: 需要 Authorization

**查询参数**:

| 参数 | 类型 | 默认值 | 可选值 |
|-----|------|--------|--------|
| type | string | all | `all` / `generate` / `fix` |
| page | number | 1 | >= 1 |
| pageSize | number | 20 | 1-100 |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "gen_abc123xyz789",
        "type": "generate",
        "prompt": "电商平台订单购买流程",
        "mermaidCode": "flowchart TD\n    A[开始] --> B{条件判断}\n    ...",
        "chartType": "flowchart",
        "createdAt": "2026-06-14T10:00:00.000Z"
      },
      {
        "id": "fix_xyz789abc123",
        "type": "fix",
        "prompt": "修复语法错误",
        "mermaidCode": "flowchart TD\n    A[开始] --> B[结束]\n    ...",
        "chartType": "flowchart",
        "createdAt": "2026-06-14T09:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  },
  "timestamp": 1718345678901
}
```

**前端使用场景**: AI 面板中展示历史记录，用户可点击某条记录恢复当时生成的代码。

---

### 4.4 获取 AI 使用统计

**GET** `/api/v1/ai/usage`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "periodStart": "2026-06-14T00:00:00.000Z",
    "periodEnd": "2026-06-15T00:00:00.000Z",
    "generate": {
      "used": 3,
      "limit": 5,
      "remaining": 2,
      "resetAt": "2026-06-15T00:00:00.000Z"
    },
    "fix": {
      "used": 2,
      "limit": 10,
      "remaining": 8,
      "resetAt": "2026-06-15T00:00:00.000Z"
    },
    "totalTokensUsed": 1250,
    "totalProcessingTimeMs": 8500
  },
  "timestamp": 1718345678901
}
```

> **Pro 用户**: `limit` 字段为 `null`，表示无限制。`remaining` 为 `null`。

**前端使用场景**:
- AI 面板显示今日使用量与剩余量
- 超过 `limit` 时禁用生成按钮并引导升级订阅

---

## 5. 图表文档管理 API

### 5.1 创建新文档

**POST** `/api/v1/documents`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "title": "电商平台订单流程",
  "content": "flowchart TD\n    A[开始] --> B[结束]",
  "description": "描述电商平台订单购买的完整流程",
  "tags": ["电商", "流程图", "订单"]
}
```

| 字段 | 类型 | 必填 | 约束 |
|-----|------|------|------|
| title | string | ✅ | 1-200 字符 |
| content | string | ✅ | Mermaid 代码，最大 50KB |
| description | string | ❌ | 文档描述，最大 500 字符 |
| tags | string[] | ❌ | 标签列表，每个标签最大 20 字符，最多 10 个 |

**成功响应 (201 Created)**:

```json
{
  "success": true,
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "doc_1234567890abcdef",
    "title": "电商平台订单流程",
    "content": "flowchart TD\n    A[开始] --> B[结束]",
    "description": "描述电商平台订单购买的完整流程",
    "tags": ["电商", "流程图", "订单"],
    "chartType": "flowchart",
    "version": 1,
    "isPublic": false,
    "userId": "user_1234567890abcdef",
    "createdAt": "2026-06-14T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**后端要点**:
- `chartType` 由后端根据 `content` 自动检测（参考前端 `detectChartType`）
- 每次创建/更新文档时自动创建版本历史
- 免费用户文档数量上限：10 个

---

### 5.2 获取文档列表

**GET** `/api/v1/documents`

**请求头**: 需要 Authorization

**查询参数**:

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |
| search | string | - | 搜索关键词（标题/标签） |
| chartType | string | - | 图表类型筛选 |
| tag | string | - | 标签筛选 |
| sortBy | string | updatedAt | `createdAt` / `updatedAt` / `title` |
| sortOrder | string | desc | `asc` / `desc` |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "doc_1234567890abcdef",
        "title": "电商平台订单流程",
        "chartType": "flowchart",
        "description": "描述电商平台订单购买的完整流程",
        "tags": ["电商", "流程图", "订单"],
        "previewContent": "flowchart TD\n    A[开始] --> B[...",
        "version": 3,
        "isPublic": false,
        "publicUrl": null,
        "createdAt": "2026-06-10T10:00:00.000Z",
        "updatedAt": "2026-06-14T10:00:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  },
  "timestamp": 1718345678901
}
```

**前端使用场景**: "我的文档"页面列表展示。

---

### 5.3 获取单个文档详情

**GET** `/api/v1/documents/:id`

**请求头**: 需要 Authorization（公开文档无需认证）

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "doc_1234567890abcdef",
    "title": "电商平台订单流程",
    "content": "flowchart TD\n    A[开始] --> B{条件判断}\n    B -->|是| C[处理数据]\n    B -->|否| D[结束]\n    C --> D",
    "description": "描述电商平台订单购买的完整流程",
    "tags": ["电商", "流程图", "订单"],
    "chartType": "flowchart",
    "version": 3,
    "isPublic": false,
    "publicUrl": null,
    "shareToken": null,
    "userId": "user_1234567890abcdef",
    "createdAt": "2026-06-10T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40402` 文档不存在
- `40300` 无权限访问该文档（非所有者且文档私有）

---

### 5.4 更新文档（整体更新）

**PUT** `/api/v1/documents/:id`

**请求头**: 需要 Authorization

**请求体**:

```json
{
  "title": "电商平台订单流程（更新）",
  "content": "flowchart TD\n    A[开始] --> B{条件判断}\n    ...",
  "description": "更新后的描述",
  "tags": ["电商", "流程图", "订单", "更新"]
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "doc_1234567890abcdef",
    "title": "电商平台订单流程（更新）",
    "content": "flowchart TD\n    A[开始] --> B{条件判断}\n    ...",
    "description": "更新后的描述",
    "tags": ["电商", "流程图", "订单", "更新"],
    "chartType": "flowchart",
    "version": 4,
    "isPublic": false,
    "createdAt": "2026-06-10T10:00:00.000Z",
    "updatedAt": "2026-06-14T12:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**后端要点**: 每次更新 `version` 自增 +1，并记录版本历史。

---

### 5.5 部分更新文档（仅更新内容）

**PATCH** `/api/v1/documents/:id`

**请求头**: 需要 Authorization

**请求体示例 1（仅更新内容）**:

```json
{
  "content": "flowchart TD\n    A[开始] --> B[新流程]"
}
```

**请求体示例 2（仅更新标题和标签）**:

```json
{
  "title": "新标题",
  "tags": ["新标签1", "新标签2"]
}
```

**说明**: PATCH 允许部分更新，只需传递需要更新的字段。响应格式同 PUT。

---

### 5.6 删除文档

**DELETE** `/api/v1/documents/:id`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": 1718345678901
}
```

**前端提示**: 删除前应二次确认。

---

### 5.7 获取文档版本历史

**GET** `/api/v1/documents/:id/versions`

**请求头**: 需要 Authorization

**查询参数**: 标准分页参数

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "version": 4,
        "title": "电商平台订单流程（更新）",
        "previewContent": "flowchart TD\n    A[开始] --> B[...",
        "changeSummary": "更新了标题和部分内容",
        "createdAt": "2026-06-14T12:00:00.000Z"
      },
      {
        "version": 3,
        "title": "电商平台订单流程",
        "previewContent": "flowchart TD\n    A[开始] --> B[...",
        "changeSummary": "添加了条件判断分支",
        "createdAt": "2026-06-13T10:00:00.000Z"
      }
    ],
    "total": 4,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "timestamp": 1718345678901
}
```

---

### 5.8 获取指定版本的完整内容

**GET** `/api/v1/documents/:id/versions/:version`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "version": 3,
    "title": "电商平台订单流程",
    "content": "flowchart TD\n    A[开始] --> B[结束]",
    "description": "历史版本描述",
    "tags": ["电商", "流程图"],
    "chartType": "flowchart",
    "createdAt": "2026-06-13T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 5.9 恢复到历史版本

**POST** `/api/v1/documents/:id/versions/:version/restore`

**请求头**: 需要 Authorization

**请求体**（可选）:

```json
{
  "restoreReason": "误操作后需恢复"
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "版本恢复成功",
  "data": {
    "id": "doc_1234567890abcdef",
    "version": 5,
    "restoredFromVersion": 3,
    "updatedAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 5.10 设置文档公开/私有

**PATCH** `/api/v1/documents/:id/public`

**请求头**: 需要 Authorization（**Pro 用户功能**）

**请求体**:

```json
{
  "isPublic": true
}
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "文档已公开",
  "data": {
    "id": "doc_1234567890abcdef",
    "isPublic": true,
    "publicUrl": "https://diagramai.com/view/doc_1234567890abcdef",
    "shareToken": "share_xyz789abc123",
    "updatedAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40202` 需要 Pro 订阅才能使用公开分享功能

---

### 5.11 获取公开文档（通过分享令牌）

**GET** `/api/v1/documents/public/:shareToken`

**（公开接口，无需认证）**

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "doc_1234567890abcdef",
    "title": "电商平台订单流程",
    "content": "flowchart TD\n    A[开始] --> B[结束]",
    "description": "描述电商平台订单购买的完整流程",
    "chartType": "flowchart",
    "tags": ["电商", "流程图", "订单"],
    "ownerName": "user@ex***.com",
    "createdAt": "2026-06-10T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40404` 分享令牌无效或文档已取消公开

**前端使用场景**: 分享链接打开的只读预览页面。

---

## 6. 图表模板 API

### 6.1 获取模板分类

**GET** `/api/v1/templates/categories`

**（公开接口）**

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    { "categoryId": "flowchart", "name": "流程图", "icon": "🔷", "description": "描述业务流程、算法逻辑", "mermaidType": "flowchart", "sortOrder": 1 },
    { "categoryId": "sequence", "name": "时序图", "icon": "📊", "description": "描述系统交互、接口调用", "mermaidType": "sequenceDiagram", "sortOrder": 2 },
    { "categoryId": "class", "name": "类图", "icon": "📦", "description": "面向对象设计", "mermaidType": "classDiagram", "sortOrder": 3 },
    { "categoryId": "state", "name": "状态图", "icon": "🔄", "description": "描述状态流转", "mermaidType": "stateDiagram-v2", "sortOrder": 4 },
    { "categoryId": "gantt", "name": "甘特图", "icon": "📅", "description": "项目排期、任务规划", "mermaidType": "gantt", "sortOrder": 5 },
    { "categoryId": "er", "name": "ER 图", "icon": "🗄️", "description": "数据库设计、实体关系", "mermaidType": "erDiagram", "sortOrder": 6 }
  ],
  "timestamp": 1718345678901
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `categoryId` | string | 分类标识（用于 API 查询参数） |
| `name` | string | 中文名称 |
| `icon` | string | 图标 emoji |
| `description` | string | 描述信息 |
| `mermaidType` | string | **Mermaid 内部类型名**（前端渲染时使用） |
| `sortOrder` | number | 排序序号 |

---

### 6.2 获取模板列表

**GET** `/api/v1/templates`

**（公开接口，登录用户额外看到自己保存的私有模板）**

**查询参数**:

| 参数 | 类型 | 默认值 |
|-----|------|--------|
| category | string | - |
| search | string | - |
| sortBy | string | popularity | `popularity` / `newest` / `name` |
| page | number | 1 |
| pageSize | number | 20 |

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "tpl_ecommerce_order_flow",
        "title": "电商订单流程",
        "category": "flowchart",
        "description": "标准电商平台订单处理流程",
        "tags": ["电商", "订单", "流程"],
        "previewCode": "flowchart TD\n    A[购物车] --> B[...",
        "isPublic": true,
        "useCount": 1568,
        "createdAt": "2026-05-01T10:00:00.000Z"
      }
    ],
    "total": 88,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "timestamp": 1718345678901
}
```

---

### 6.3 获取单个模板详情

**GET** `/api/v1/templates/:id`

**（公开接口，私有模板需所有者认证）**

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "tpl_ecommerce_order_flow",
    "title": "电商订单流程",
    "category": "flowchart",
    "description": "标准电商平台订单处理流程，包含购物车、结算、支付、发货、完成等完整流程",
    "content": "flowchart TD\n    A[购物车] --> B[进入结算页]\n    B --> C{是否登录?}\n    C -->|否| D[用户登录]\n    D --> E[填写收货地址]\n    C -->|是| E\n    E --> F[选择支付方式]\n    F --> G[发起支付]\n    G --> H{支付成功?}\n    H -->|是| I[创建订单]\n    H -->|否| J[支付失败提示]\n    J --> F\n    I --> K[通知商家发货]\n    K --> L[用户收货确认]\n    L --> M[订单完成]",
    "tags": ["电商", "订单", "流程"],
    "relatedTemplates": [
      { "id": "tpl_user_login_flow", "title": "用户登录流程", "category": "flowchart" },
      { "id": "tpl_payment_integration", "title": "支付系统集成时序图", "category": "sequence" }
    ],
    "useCount": 1568,
    "createdAt": "2026-05-01T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 6.4 使用模板创建新文档

**POST** `/api/v1/templates/:id/use`

**请求头**: 需要 Authorization

**请求体**（可选，允许自定义标题）:

```json
{
  "customTitle": "我的项目订单流程"
}
```

**成功响应 (201 Created)**:

```json
{
  "success": true,
  "code": 201,
  "message": "基于模板创建文档成功",
  "data": {
    "documentId": "doc_1234567890abcdef",
    "templateId": "tpl_ecommerce_order_flow",
    "title": "我的项目订单流程",
    "content": "flowchart TD\n    A[购物车] --> B[进入结算页]\n    ...",
    "createdAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**后端要点**: 将模板的 `useCount` 计数 +1。

---

### 6.5 保存文档为模板

**POST** `/api/v1/documents/:id/save-as-template`

**请求头**: 需要 Authorization（**Pro 用户功能**）

**请求体**:

```json
{
  "title": "我的自定义订单流程",
  "description": "基于业务场景优化的订单处理流程",
  "category": "flowchart",
  "tags": ["自定义", "订单", "优化"],
  "isPublic": false
}
```

**成功响应 (201 Created)**:

```json
{
  "success": true,
  "code": 201,
  "message": "模板保存成功",
  "data": {
    "templateId": "tpl_custom_abc123xyz789",
    "title": "我的自定义订单流程",
    "isPublic": false,
    "createdAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**可能的错误码**:
- `40202` 需要 Pro 订阅才能保存自定义模板

---

## 7. 用户偏好与统计 API

### 7.1 获取用户统计信息

**GET** `/api/v1/users/me/stats`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "documents": {
      "total": 25,
      "public": 3,
      "byChartType": {
        "flowchart": 12,
        "sequence": 5,
        "class": 2,
        "state": 1,
        "gantt": 3,
        "er": 2
      }
    },
    "aiUsage": {
      "totalGenerations": 156,
      "totalFixes": 45,
      "totalTokensUsed": 58900,
      "lastUsedAt": "2026-06-14T10:00:00.000Z"
    },
    "templates": {
      "saved": 5,
      "used": 12
    },
    "storage": {
      "usedBytes": 2456789,
      "limitBytes": 104857600,
      "percentUsed": 2.3
    },
    "account": {
      "createdAt": "2026-05-01T10:00:00.000Z",
      "lastLoginAt": "2026-06-14T08:00:00.000Z",
      "totalLoginCount": 128
    }
  },
  "timestamp": 1718345678901
}
```

**前端使用场景**: 用户个人中心"我的统计"页面。

---

### 7.2 获取用户偏好设置

**GET** `/api/v1/users/me/preferences`

**请求头**: 需要 Authorization

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "theme": "dark",
    "defaultChartType": "flowchart",
    "editorSettings": {
      "fontSize": 14,
      "tabSize": 2,
      "wordWrap": true,
      "minimap": false
    },
    "notificationSettings": {
      "emailUpdates": true,
      "productNews": false
    },
    "updatedAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

**theme 枚举值**: `light` | `dark`

**前端使用场景**:
- Header 主题切换组件读取当前主题
- 编辑器加载时恢复用户设置

---

### 7.3 更新用户偏好设置

**PATCH** `/api/v1/users/me/preferences`

**请求头**: 需要 Authorization

**请求体**（只需传递要更新的字段）:

```json
{
  "theme": "dark",
  "defaultChartType": "flowchart",
  "editorSettings": {
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true,
    "minimap": false
  },
  "notificationSettings": {
    "emailUpdates": true,
    "productNews": false
  }
}
```

**成功响应 (200 OK)**: 格式同 7.2。

**后端要点**: 支持增量更新，未传递的字段保持原值。

---

## 8. 统一错误码表

### 8.1 通用错误（10000-19999）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 10000 | 500 | 服务器内部错误 |
| 10001 | 503 | 服务暂时不可用 |
| 10002 | 429 | 请求过于频繁（限流） |
| 10003 | 404 | API 端点不存在 |
| 10004 | 405 | HTTP 方法不允许 |
| 10005 | 406 | 不支持的 Accept 格式 |
| 10006 | 408 | 请求超时 |
| 10007 | 413 | 请求体过大 |
| 10008 | 422 | 请求格式无效（JSON 解析失败） |

### 8.2 参数验证错误（40000-40099）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 参数验证失败 |
| 40002 | 400 | 必填参数缺失 |
| 40003 | 400 | 参数格式错误 |
| 40004 | 400 | 参数值超出范围 |

### 8.3 认证授权错误（40100-40399）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40100 | 401 | 未提供认证令牌（请求头缺少 `Authorization: Bearer <token>`） |
| 40101 | 401 | 邮箱或密码错误 |
| 40102 | 401 | Token 格式错误（缺少 `Bearer` 前缀或长度异常） |
| 40103 | 401 | 当前密码不正确 |
| 40104 | 401 | 重置密码令牌无效或已过期 |
| 40105 | 401 | Token 不存在、已过期或已被撤销（前端应跳转登录页） |
| 40300 | 403 | 无权限执行此操作（如免费用户使用 Pro 功能） |
| 40301 | 403 | 需要 Pro 订阅（请升级套餐） |
| 42301 | 423 | 账户已被锁定（多次登录失败） |

### 8.4 资源错误（40400-40999）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40400 | 404 | 资源不存在 |
| 40401 | 404 | 用户不存在 |
| 40402 | 404 | 文档不存在 |
| 40403 | 404 | 模板不存在 |
| 40404 | 404 | 分享令牌无效或文档已取消公开 |
| 40405 | 404 | 版本不存在 |
| 40900 | 409 | 资源冲突 |
| 40901 | 409 | 邮箱已被注册 |
| 40902 | 409 | 文档标题已存在（同用户下） |

### 8.5 订阅/支付错误（40200-40299）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40200 | 402 | 需要订阅才能使用此功能 |
| 40201 | 402 | AI 使用次数已达上限，请升级套餐 |
| 40202 | 402 | 订阅已过期 |
| 40203 | 402 | 支付失败 |
| 40204 | 402 | 无效的订阅方案 |

### 8.6 AI 服务错误（50300-50399）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 50300 | 503 | AI 服务暂时不可用 |
| 50301 | 503 | AI 生成超时 |
| 50302 | 503 | AI 修复超时 |
| 50303 | 503 | AI 服务商返回错误 |

### 8.7 文档管理错误（40500-40599）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40500 | 400 | 文档内容过大 |
| 40501 | 400 | 文档数量超出限制 |
| 40502 | 400 | 标签数量超出限制 |
| 40503 | 400 | 无法恢复到当前版本（已是最新） |

---

## 9. 数据模型参考

### 9.1 User（用户表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`user_` 前缀，UUID |
| email | string | ✅ | 邮箱（唯一索引，忽略大小写比较） |
| passwordHash | string | ✅ | 密码哈希（bcrypt，不返回给前端） |
| isSubscribed | boolean | ✅ | 当前是否为有效订阅用户 |
| subscriptionPlan | string | ✅ | `free` / `pro` / `enterprise` |
| subscriptionExpiresAt | datetime | ❌ | 订阅到期时间 |
| preferences | JSON | ✅ | 用户偏好设置（见 9.5） |
| createdAt | datetime | ✅ | 创建时间 |
| updatedAt | datetime | ✅ | 更新时间 |
| lastLoginAt | datetime | ✅ | 最后登录时间 |
| loginCount | number | ✅ | 总登录次数 |

**索引建议**:
- `email` 唯一索引
- `isSubscribed` + `subscriptionPlan` 复合索引
- `createdAt` 时间索引

---

### 9.2 Document（文档表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`doc_` 前缀 |
| userId | string | ✅ | 用户 ID（外键） |
| title | string | ✅ | 标题（1-200 字符） |
| content | text | ✅ | Mermaid 代码内容 |
| description | string | ❌ | 描述（最大 500 字符） |
| tags | string[] | ✅ | 标签数组（最多 10 个） |
| chartType | string | ✅ | 自动检测的图表类型 |
| version | number | ✅ | 当前版本号（自增） |
| isPublic | boolean | ✅ | 是否公开（默认 false） |
| shareToken | string | ❌ | 公开分享令牌 |
| createdFromTemplateId | string | ❌ | 由哪个模板创建（可选） |
| createdAt | datetime | ✅ | 创建时间 |
| updatedAt | datetime | ✅ | 更新时间 |

**索引建议**:
- `userId` + `updatedAt` 复合索引（列表查询高频）
- `userId` + `chartType` 复合索引
- `userId` + `isPublic` 复合索引
- `shareToken` 唯一索引（公开分享查询）
- `tags` GIN 索引（PostgreSQL）
- 全文搜索索引: `title` + `description` + `tags`

---

### 9.3 DocumentVersion（文档版本表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键 |
| documentId | string | ✅ | 文档 ID（外键） |
| version | number | ✅ | 版本号（1, 2, 3...） |
| title | string | ✅ | 该版本的标题快照 |
| content | text | ✅ | 该版本的内容快照 |
| description | string | ❌ | 描述快照 |
| tags | string[] | ✅ | 标签快照 |
| changeSummary | string | ❌ | 变更摘要（可选） |
| restoredFromVersion | number | ❌ | 是否由其他版本恢复而来 |
| createdAt | datetime | ✅ | 该版本创建时间 |

**索引建议**:
- `documentId` + `version` 唯一复合索引
- `documentId` + `createdAt` 复合索引

**存储策略**: 
- 版本内容完整存储（不做 diff），简化恢复逻辑
- 可设置每文档最多保留 50 个版本，超出自动清理最旧版本

---

### 9.4 AIGenerationRecord（AI 生成记录表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`gen_` 或 `fix_` 前缀 |
| userId | string | ✅ | 用户 ID（外键） |
| type | string | ✅ | `generate` / `fix` |
| prompt | text | ✅ | 用户输入的描述 |
| inputCode | text | ❌ | 输入的代码（fix 类型时必填） |
| outputCode | text | ✅ | 生成/修复后的代码 |
| chartType | string | ✅ | 图表类型 |
| promptTokens | number | ✅ | 提示词 token 数 |
| completionTokens | number | ✅ | 完成 token 数 |
| totalTokens | number | ✅ | 总 token 数 |
| processingTimeMs | number | ✅ | 处理耗时（毫秒） |
| model | string | ✅ | 使用的 AI 模型 |
| provider | string | ✅ | AI 服务商 |
| createdAt | datetime | ✅ | 创建时间 |

**索引建议**:
- `userId` + `createdAt` 复合索引（历史查询）
- `userId` + `type` + `createdAt` 复合索引
- `createdAt` 时间索引（用于每日限额统计）

---

### 9.5 UserPreferences（用户偏好）

（作为 User 表中的 JSON 字段，或独立表）

```json
{
  "theme": "dark",
  "defaultChartType": "flowchart",
  "editorSettings": {
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true,
    "minimap": false
  },
  "notificationSettings": {
    "emailUpdates": true,
    "productNews": false
  }
}
```

---

### 9.6 Subscription（订阅表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`sub_` 前缀 |
| userId | string | ✅ | 用户 ID（外键） |
| planId | string | ✅ | 方案 ID |
| status | string | ✅ | `pending_payment` / `active` / `cancelled` / `expired` |
| amount | decimal | ✅ | 金额 |
| currency | string | ✅ | 货币代码 |
| paymentMethod | string | ✅ | `stripe` / `alipay` / `wechat` |
| paymentSessionId | string | ✅ | 支付会话 ID |
| externalSubscriptionId | string | ❌ | 外部订阅 ID（如 Stripe sub ID） |
| billingPeriodStart | datetime | ✅ | 计费周期开始 |
| billingPeriodEnd | datetime | ✅ | 计费周期结束 |
| cancelledAt | datetime | ❌ | 取消时间 |
| cancelReason | string | ❌ | 取消原因 |
| cancelFeedback | text | ❌ | 取消反馈 |
| createdAt | datetime | ✅ | 创建时间 |

---

### 9.7 PaymentRecord（支付记录表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`pay_` 前缀 |
| userId | string | ✅ | 用户 ID |
| subscriptionId | string | ✅ | 订阅 ID |
| amount | decimal | ✅ | 金额 |
| currency | string | ✅ | 货币代码 |
| status | string | ✅ | `success` / `failed` / `refunded` |
| paymentMethod | string | ✅ | 支付方式 |
| externalPaymentId | string | ❌ | 外部支付 ID |
| invoiceUrl | string | ❌ | 发票链接 |
| createdAt | datetime | ✅ | 创建时间 |

---

### 9.8 Template（模板表）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| id | string | ✅ | 主键，`tpl_` 前缀 |
| ownerUserId | string | ❌ | 所有者用户 ID（系统模板为 null） |
| title | string | ✅ | 模板标题 |
| description | string | ✅ | 模板描述 |
| category | string | ✅ | 分类（flowchart, sequence 等） |
| content | text | ✅ | Mermaid 模板代码 |
| tags | string[] | ✅ | 标签 |
| isPublic | boolean | ✅ | 是否公开（系统模板 true，用户自定义默认 false） |
| isOfficial | boolean | ✅ | 是否为官方/系统模板 |
| useCount | number | ✅ | 使用次数统计 |
| createdFromDocumentId | string | ❌ | 由哪个文档保存而来 |
| createdAt | datetime | ✅ | 创建时间 |
| updatedAt | datetime | ✅ | 更新时间 |

**索引建议**:
- `category` + `useCount` 复合索引（热门模板排序）
- `isPublic` + `isOfficial` 复合索引
- `ownerUserId` 索引（用户查看自己保存的模板）
- `tags` GIN 索引

---

### 9.9 AccessToken（访问令牌表）

用于存储用户的登录 Token，支持登出撤销、修改密码时批量失效。

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| token | string | ✅ | Token 字符串（自定义算法生成，**唯一索引**，主键） |
| userId | string | ✅ | 关联用户 ID（外键 → users.id） |
| email | string | ✅ | 用户邮箱快照（便于排查问题） |
| isSubscribed | boolean | ✅ | 订阅状态快照 |
| subscriptionPlan | string | ✅ | 订阅方案快照 |
| subscriptionExpiresAt | datetime | ❌ | 订阅到期时间快照 |
| ip | string | ✅ | 登录时的客户端 IP（便于风控/安全审计） |
| userAgent | string | ✅ | 登录时的浏览器/客户端 UA（便于风控） |
| createdAt | datetime | ✅ | Token 创建时间 |
| expiresAt | datetime | ✅ | Token 过期时间（建议 createdAt + 24h） |
| lastUsedAt | datetime | ✅ | 最近一次被请求使用的时间（每次请求更新） |
| isRevoked | boolean | ✅ | 是否已被撤销（默认 `false`） |
| revokedReason | string | ❌ | 撤销原因：`logout` / `password_change` / `admin_force` / `manual_refresh` |

**存储建议**:
- **主存储**：关系型数据库表（MySQL / PostgreSQL），可查询历史登录记录、支持管理员强制下线
- **缓存加速**（可选）：在 Redis 中缓存一份 `token → userId` 映射（TTL 与 Token 有效期同步），避免每次请求都查库
- **定时清理**：每日定时删除已过期（`expiresAt < NOW()`）超过 7 天的记录，避免表膨胀

**关键索引**:
- `token` 唯一索引（主键查询，性能要求高）
- `userId, createdAt` 复合索引（查询某用户的全部登录历史）
- `userId, isRevoked, expiresAt` 复合索引（修改密码时快速定位该用户的所有有效 Token）
- `expiresAt` 索引（定时清理任务）

**Token 生成算法建议**:
- 使用 `crypto.randomBytes(48)` 生成 48 字节随机数，再转十六进制字符串（长度 96），足够防碰撞
- 或使用 `crypto.randomUUID()` 替换自定义前缀（如 `at_` + UUID）
- **无需签名**：Token 不携带自描述信息，所有状态由服务端数据库裁决，安全性更高（Token 泄露可立即撤销）

---

## 附录 A：前端 API 调用流程示例

### A.1 用户登录流程

```
前端 (LoginForm)
   │ POST /api/v1/auth/login
   ▼
后端
   │ 校验密码 → 生成随机字符串 Token → 写入 access_tokens 表
   ▼
前端接收 { user, accessToken, expiresAt }
   │ 1. 保存 accessToken 到 localStorage
   │ 2. 同时保存 expiresAt，用于判断是否过期/提前刷新
   │ 3. 更新 useAuthStore.user（设置登录状态）
   │ 4. 跳转至编辑器或首页
   ▼
后续请求自动携带 Authorization: Bearer <accessToken>

```
前端 Token 自动刷新建议:
   │ 每次请求前检查 expiresAt
   │ 若距离过期 < 30 分钟 → 后台发起 POST /api/v1/auth/refresh
   │ 用新 Token 替换 localStorage 中的旧 Token
   │ 若刷新失败（返回 40105）→ 清理本地 Token 并跳转登录页
```

### A.2 AI 生成流程

```
用户输入描述 → 点击生成
   │ POST /api/v1/ai/generate
   ▼
后端
   │ 检查订阅配额（每日次数）
   │ 调用 AI 服务商 (OpenAI / 自建 LLM)
   │ 记录 AI 生成记录
   ▼
前端接收 { mermaidCode, chartType }
   │ 1. 调用 useEditorStore.setCode(code) 填入编辑器
   │ 2. 更新历史列表
   │ 3. 更新使用计数展示
```

### A.3 保存文档流程

```
用户编辑代码 → 点击"保存"
   │ POST /api/v1/documents (首次保存)
   │   或 PUT /api/v1/documents/:id (已有文档更新)
   ▼
后端
   │ 校验文档数量限制（免费用户 10 个）
   │ 自动检测 chartType
   │ 创建/更新文档 + 创建版本记录
   ▼
前端接收 { id, version, updatedAt }
   │ 1. 显示"保存成功"提示
   │ 2. 更新 UI 展示当前版本号
```

---

## 附录 B：ID 命名规范速查表

| 资源类型 | 前缀 | 示例 |
|---------|------|------|
| 用户 | `user_` | `user_2a4f6b8c0d1e` |
| 文档 | `doc_` | `doc_8f1e2b3c4a5d` |
| 模板 | `tpl_` | `tpl_ecommerce_order_flow` |
| AI 生成记录 | `gen_` | `gen_8c2a4f6b8e0d` |
| AI 修复记录 | `fix_` | `fix_1a3b5c7d9e2f` |
| 分享令牌 | `share_` | `share_4f6b8c0d2a4e` |
| 订阅 | `sub_` | `sub_9d1c3b5a7e2f` |
| 支付记录 | `pay_` | `pay_7b3a9c1e5d2f` |

---

**文档结束**
