# DiagramAI 后端 API 接口设计文档

> 版本: v1.0  
> 更新日期: 2026-06-14  
> 作者: DiagramAI Team  
> 基础路径: `/api/v1`

---

## 📋 目录

1. [API 概述](#1-api-概述)
2. [认证与授权](#2-认证与授权)
3. [用户认证 API](#3-用户认证-api)
4. [订阅/支付 API](#4-订阅支付-api)
5. [AI 生成/修复 API](#5-ai-生成修复-api)
6. [图表文档管理 API](#6-图表文档管理-api)
7. [图表模板 API](#7-图表模板-api)
8. [用户信息 API](#8-用户信息-api)
9. [通用规范与错误码](#9-通用规范与错误码)
10. [数据模型定义](#10-数据模型定义)

---

## 1. API 概述

### 1.1 设计原则

- **RESTful 风格**: 遵循 REST 架构设计原则
- **JSON 格式**: 所有请求和响应均使用 JSON 格式
- **版本控制**: 通过 URL 路径进行版本控制（`/api/v1/`）
- **HTTPS 协议**: 生产环境必须使用 HTTPS
- **统一响应格式**: 所有 API 采用统一的响应结构

### 1.2 技术栈建议

- **Web 框架**: FastAPI (Python) / NestJS (Node.js) / Gin (Go)
- **数据库**: PostgreSQL (推荐) / MySQL
- **缓存**: Redis (缓存热点数据、会话管理)
- **认证**: JWT (JSON Web Token)
- **支付**: Stripe / Alipay / WeChat Pay SDK
- **AI 服务**: OpenAI API / Claude API / 自建 LLM

### 1.3 统一响应格式

所有 API 响应采用以下格式：

```json
{
  "success": true,
  "code": 200,
  "message": "请求成功",
  "data": {
    // 具体数据对象
  },
  "timestamp": 1718345678901
}
```

**分页列表响应格式：**

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      // 数据项列表
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "timestamp": 1718345678901
}
```

**错误响应格式：**

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

### 1.4 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无返回内容） |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 无效或已过期） |
| 403 | 已认证但无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

---

## 2. 认证与授权

### 2.1 认证方式

采用 **JWT (JSON Web Token)** 进行无状态认证。

### 2.2 Token 使用方式

在需要认证的接口请求头中添加：

```
Authorization: Bearer <access_token>
```

### 2.3 Token 结构

```json
{
  "sub": "user_1234567890",
  "email": "user@example.com",
  "role": "user",
  "isSubscribed": true,
  "iat": 1718345678,
  "exp": 1718432078
}
```

### 2.4 Token 有效期

- **Access Token**: 24 小时
- **Refresh Token**: 30 天
- 建议实现 Token 黑名单机制（Redis）

### 2.5 权限等级

| 角色 | 权限范围 |
|------|---------|
| guest | 访问公开页面、基础编辑器功能 |
| free 用户 | 所有编辑器功能、保存文档、AI 生成每日限额 |
| pro 用户 | 所有 free 用户功能、无限制 AI 生成/修复、高级导出 |
| admin | 系统管理、用户管理、数据统计 |

---

## 3. 用户认证 API

### 3.1 用户注册

**POST** `/api/v1/auth/register`

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| email | string | ✅ | 用户邮箱 | 6-255 字符，有效邮箱格式 |
| password | string | ✅ | 密码 | 8-128 字符，至少包含字母和数字 |
| confirmPassword | string | ✅ | 确认密码 | 必须与 password 一致 |

**成功响应 (201 Created)：**

```json
{
  "success": true,
  "code": 201,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "isSubscribed": false,
      "subscriptionPlan": "free",
      "subscriptionExpiresAt": null,
      "createdAt": "2026-06-14T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "timestamp": 1718345678901
}
```

**可能的错误：**

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 参数验证失败（邮箱格式/密码强度） |
| 40901 | 409 | 邮箱已被注册 |
| 50001 | 500 | 服务器内部错误 |

---

### 3.2 用户登录

**POST** `/api/v1/auth/login`

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 用户邮箱 |
| password | string | ✅ | 密码 |

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "isSubscribed": true,
      "subscriptionPlan": "pro",
      "subscriptionExpiresAt": "2026-07-14T10:00:00.000Z",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-14T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "timestamp": 1718345678901
}
```

**可能的错误：**

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 参数验证失败 |
| 40101 | 401 | 邮箱或密码错误 |
| 42301 | 423 | 账户已被锁定（多次登录失败） |
| 50001 | 500 | 服务器内部错误 |

---

### 3.3 刷新 Token

**POST** `/api/v1/auth/refresh`

**请求头：** 不需要 Authorization，但需要 refresh token

**请求体：**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "Token 刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  },
  "timestamp": 1718345678901
}
```

**可能的错误：**

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40102 | 401 | Refresh Token 无效或已过期 |
| 40401 | 404 | 用户不存在 |
| 50001 | 500 | 服务器内部错误 |

---

### 3.4 用户登出

**POST** `/api/v1/auth/logout`

**请求头：** 需要 Authorization

**请求体：** （可选）

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": 1718345678901
}
```

**说明：** 服务端将当前 refresh token 加入黑名单

---

### 3.5 获取当前用户信息

**GET** `/api/v1/auth/me`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "user_1234567890",
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

---

### 3.6 修改密码

**PATCH** `/api/v1/auth/password`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmNewPassword": "NewPassword456!"
}
```

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "密码修改成功",
  "data": null,
  "timestamp": 1718345678901
}
```

---

### 3.7 发送重置密码邮件

**POST** `/api/v1/auth/password/forgot`

**请求体：**

```json
{
  "email": "user@example.com"
}
```

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "重置密码邮件已发送，请检查您的邮箱",
  "data": null,
  "timestamp": 1718345678901
}
```

**注意：** 无论邮箱是否存在，都应返回相同的响应以防止邮箱枚举攻击

---

### 3.8 重置密码

**POST** `/api/v1/auth/password/reset`

**请求体：**

```json
{
  "resetToken": "reset_token_abc123xyz",
  "newPassword": "NewPassword456!",
  "confirmNewPassword": "NewPassword456!"
}
```

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "密码重置成功",
  "data": null,
  "timestamp": 1718345678901
}
```

---

## 4. 订阅/支付 API

### 4.1 获取订阅状态

**GET** `/api/v1/subscription/status`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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
      "priority_support"
    ]
  },
  "timestamp": 1718345678901
}
```

**plan 字段枚举值：**

| 值 | 说明 |
|----|------|
| free | 免费版 |
| pro | Pro 版 |
| enterprise | 企业版（预留） |

---

### 4.2 获取订阅方案列表

**GET** `/api/v1/subscription/plans`

**（公开接口，无需认证）**

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| currency | string | ❌ | CNY | 货币代码 (CNY / USD / EUR) |
| interval | string | ❌ | monthly | 计费周期 (monthly / yearly) |

**成功响应 (200 OK)：**

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
        "description": "解锁 AI 高级功能",
        "features": [
          "包含免费版全部功能",
          "无限 AI 图表生成",
          "无限 AI 语法修复",
          "优先技术支持",
          "无广告体验",
          "高级导出格式",
          "无限文档保存",
          "AI 历史记录"
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

---

### 4.3 创建订阅

**POST** `/api/v1/subscription/create`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "planId": "pro_monthly",
  "paymentMethod": "stripe",
  "successUrl": "https://diagramai.com/subscribe/success",
  "cancelUrl": "https://diagramai.com/subscribe/cancel"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| planId | string | ✅ | 订阅方案 ID |
| paymentMethod | string | ✅ | 支付方式 (stripe / alipay / wechat) |
| successUrl | string | ✅ | 支付成功回调地址 |
| cancelUrl | string | ✅ | 取消支付回调地址 |

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "创建订阅成功",
  "data": {
    "subscriptionId": "sub_1234567890",
    "paymentSessionId": "cs_live_abc123xyz",
    "paymentUrl": "https://checkout.stripe.com/c/pay/cs_live_abc123xyz",
    "planId": "pro_monthly",
    "amount": 29.9,
    "currency": "CNY",
    "status": "pending_payment"
  },
  "timestamp": 1718345678901
}
```

**status 字段枚举值：**

| 值 | 说明 |
|----|------|
| pending_payment | 等待支付 |
| active | 已激活 |
| cancelled | 已取消 |
| expired | 已过期 |

---

### 4.4 支付成功回调（Webhook）

**POST** `/api/v1/subscription/webhook`

**（支付平台回调接口，内部使用）**

**请求体示例（Stripe）：**

```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_live_abc123xyz",
      "customer_email": "user@example.com",
      "amount_total": 2990,
      "currency": "cny",
      "subscription": "sub_123456"
    }
  }
}
```

**成功响应：** HTTP 200

---

### 4.5 取消订阅

**POST** `/api/v1/subscription/cancel`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "reason": "不需要了",
  "feedback": "希望以后有机会再使用"
}
```

**成功响应 (200 OK)：**

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

### 4.6 获取支付历史记录

**GET** `/api/v1/subscription/history`

**请求头：** 需要 Authorization

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 20 | 每页数量 |

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "pay_1234567890",
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

## 5. AI 生成/修复 API

### 5.1 AI 生成 Mermaid 图表代码

**POST** `/api/v1/ai/generate`

**请求头：** 需要 Authorization（free 用户每日有限额）

**请求体：**

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

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| description | string | ✅ | 图表描述文本 | 10-2000 字符 |
| chartType | string | ✅ | 图表类型 | flowchart / sequence / class / state / er / gantt / auto |
| options | object | ❌ | 生成选项 |

**chartType 枚举值：**

| 值 | 说明 |
|----|------|
| flowchart | 流程图 |
| sequence | 时序图 |
| class | 类图 |
| state | 状态图 |
| er | ER 图（实体关系图） |
| gantt | 甘特图 |
| auto | 自动识别（由 AI 自行判断最合适的类型） |

**成功响应 (200 OK)：**

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

**可能的错误：**

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 参数验证失败（描述过长/过短） |
| 40201 | 402 | AI 使用次数已达上限，请升级套餐 |
| 42901 | 429 | 请求过于频繁，请稍后重试 |
| 50301 | 503 | AI 服务暂时不可用 |

---

### 5.2 AI 修复 Mermaid 语法错误

**POST** `/api/v1/ai/fix`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "mermaidCode": "flowchart TD\n    A[开始 --> B[结束]",
  "errorMessage": "Parse error on line 2: ']' expected at column 8",
  "options": {
    "preserveStructure": true
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mermaidCode | string | ✅ | 需要修复的 Mermaid 代码 |
| errorMessage | string | ✅ | 错误信息（来自 mermaid 渲染器） |
| options | object | ❌ | 修复选项 |

**成功响应 (200 OK)：**

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

---

### 5.3 AI 生成历史记录

**GET** `/api/v1/ai/history`

**请求头：** 需要 Authorization

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | ❌ | all | 记录类型 (all / generate / fix) |
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 20 | 每页数量 |

**成功响应 (200 OK)：**

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

---

### 5.4 获取 AI 使用统计

**GET** `/api/v1/ai/usage`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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

**说明：** Pro 用户的 limit 字段为 null，表示无限制

---

## 6. 图表文档管理 API

### 6.1 创建新文档

**POST** `/api/v1/documents`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "title": "电商平台订单流程",
  "content": "flowchart TD\n    A[开始] --> B[结束]",
  "description": "描述电商平台订单购买的完整流程",
  "tags": ["电商", "流程图", "订单"]
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| title | string | ✅ | 文档标题 | 1-200 字符 |
| content | string | ✅ | Mermaid 代码内容 | 最大 50KB |
| description | string | ❌ | 文档描述 | 最大 500 字符 |
| tags | string[] | ❌ | 标签列表 | 每个标签最大 20 字符，最多 10 个 |

**成功响应 (201 Created)：**

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
    "userId": "user_1234567890",
    "createdAt": "2026-06-14T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 6.2 获取文档列表

**GET** `/api/v1/documents`

**请求头：** 需要 Authorization

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 20 | 每页数量 |
| search | string | ❌ | | 搜索关键词（标题/标签） |
| chartType | string | ❌ | | 图表类型筛选 |
| tag | string | ❌ | | 标签筛选 |
| sortBy | string | ❌ | updatedAt | 排序字段 (createdAt / updatedAt / title) |
| sortOrder | string | ❌ | desc | 排序方向 (asc / desc) |

**成功响应 (200 OK)：**

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

---

### 6.3 获取单个文档详情

**GET** `/api/v1/documents/:id`

**请求头：** 需要 Authorization（或公开文档无需认证）

**成功响应 (200 OK)：**

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
    "userId": "user_1234567890",
    "createdAt": "2026-06-10T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 6.4 更新文档

**PUT** `/api/v1/documents/:id`

**请求头：** 需要 Authorization

**请求体：**

```json
{
  "title": "电商平台订单流程（更新）",
  "content": "flowchart TD\n    A[开始] --> B{条件判断}\n    ...",
  "description": "更新后的描述",
  "tags": ["电商", "流程图", "订单", "更新"]
}
```

**成功响应 (200 OK)：**

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

---

### 6.5 部分更新文档（如仅更新内容）

**PATCH** `/api/v1/documents/:id`

**请求头：** 需要 Authorization

**请求体示例 1（仅更新内容）：**

```json
{
  "content": "flowchart TD\n    A[开始] --> B[新流程]"
}
```

**请求体示例 2（仅更新标题和标签）：**

```json
{
  "title": "新标题",
  "tags": ["新标签1", "新标签2"]
}
```

**说明：** PATCH 请求允许部分更新，只需传递需要更新的字段

---

### 6.6 删除文档

**DELETE** `/api/v1/documents/:id`

**请求头：** 需要 Authorization

**成功响应 (204 No Content)：**

```json
{
  "success": true,
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": 1718345678901
}
```

---

### 6.7 获取文档版本历史

**GET** `/api/v1/documents/:id/versions`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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

### 6.8 恢复到历史版本

**POST** `/api/v1/documents/:id/versions/:version/restore`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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

### 6.9 设置文档公开/私有

**PATCH** `/api/v1/documents/:id/public`

**请求头：** 需要 Authorization（Pro 用户功能）

**请求体：**

```json
{
  "isPublic": true
}
```

**成功响应 (200 OK)：**

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

---

### 6.10 获取公开文档

**GET** `/api/v1/documents/public/:shareToken`

**（公开接口，无需认证）**

**成功响应 (200 OK)：**

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

---

## 7. 图表模板 API

### 7.1 获取模板分类

**GET** `/api/v1/templates/categories`

**（公开接口）**

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "flowchart",
      "name": "流程图",
      "icon": "🔷",
      "description": "描述业务流程、算法逻辑",
      "templateCount": 25
    },
    {
      "id": "sequence",
      "name": "时序图",
      "icon": "📊",
      "description": "描述系统交互、接口调用",
      "templateCount": 18
    },
    {
      "id": "class",
      "name": "类图",
      "icon": "📦",
      "description": "面向对象设计",
      "templateCount": 12
    },
    {
      "id": "state",
      "name": "状态图",
      "icon": "🔄",
      "description": "描述状态流转",
      "templateCount": 10
    },
    {
      "id": "gantt",
      "name": "甘特图",
      "icon": "📅",
      "description": "项目排期、任务规划",
      "templateCount": 15
    },
    {
      "id": "er",
      "name": "ER 图",
      "icon": "🗄️",
      "description": "数据库设计、实体关系",
      "templateCount": 8
    }
  ],
  "timestamp": 1718345678901
}
```

---

### 7.2 获取模板列表

**GET** `/api/v1/templates`

**（公开接口）**

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| category | string | ❌ | | 分类筛选 |
| search | string | ❌ | | 搜索关键词 |
| sortBy | string | ❌ | popularity | 排序字段 (popularity / newest / name) |
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 20 | 每页数量 |

**成功响应 (200 OK)：**

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

### 7.3 获取单个模板详情

**GET** `/api/v1/templates/:id`

**（公开接口）**

**成功响应 (200 OK)：**

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
      {
        "id": "tpl_user_login_flow",
        "title": "用户登录流程",
        "category": "flowchart"
      },
      {
        "id": "tpl_payment_integration",
        "title": "支付系统集成时序图",
        "category": "sequence"
      }
    ],
    "useCount": 1568,
    "createdAt": "2026-05-01T10:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 7.4 使用模板创建新文档

**POST** `/api/v1/templates/:id/use`

**请求头：** 需要 Authorization

**成功响应 (201 Created)：**

```json
{
  "success": true,
  "code": 201,
  "message": "基于模板创建文档成功",
  "data": {
    "documentId": "doc_1234567890abcdef",
    "templateId": "tpl_ecommerce_order_flow",
    "title": "电商订单流程（副本）",
    "content": "flowchart TD\n    A[购物车] --> B[进入结算页]\n    ...",
    "createdAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

### 7.5 保存文档为模板（Pro 用户功能）

**POST** `/api/v1/documents/:id/save-as-template`

**请求头：** 需要 Authorization（Pro 用户）

**请求体：**

```json
{
  "title": "我的自定义订单流程",
  "description": "基于业务场景优化的订单处理流程",
  "category": "flowchart",
  "tags": ["自定义", "订单", "优化"],
  "isPublic": false
}
```

**成功响应 (201 Created)：**

```json
{
  "success": true,
  "code": 201,
  "message": "模板保存成功",
  "data": {
    "templateId": "tpl_custom_abc123",
    "title": "我的自定义订单流程",
    "isPublic": false,
    "createdAt": "2026-06-14T15:00:00.000Z"
  },
  "timestamp": 1718345678901
}
```

---

## 8. 用户信息 API

### 8.1 获取用户统计信息

**GET** `/api/v1/users/me/stats`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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

---

### 8.2 更新用户偏好设置

**PATCH** `/api/v1/users/me/preferences`

**请求头：** 需要 Authorization

**请求体：**

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

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| theme | string | ❌ | 主题 (light / dark) |
| defaultChartType | string | ❌ | 默认图表类型 |
| editorSettings | object | ❌ | 编辑器设置 |
| notificationSettings | object | ❌ | 通知设置 |

**成功响应 (200 OK)：**

```json
{
  "success": true,
  "code": 200,
  "message": "偏好设置已更新",
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

---

### 8.3 获取用户偏好设置

**GET** `/api/v1/users/me/preferences`

**请求头：** 需要 Authorization

**成功响应 (200 OK)：**

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

---

## 9. 通用规范与错误码

### 9.1 错误码定义

#### 通用错误码 (10000-19999)

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
| 10008 | 422 | 请求格式无效 |

#### 参数验证错误 (40000-40999)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40001 | 400 | 参数验证失败 |
| 40002 | 400 | 必填参数缺失 |
| 40003 | 400 | 参数格式错误 |
| 40004 | 400 | 参数值超出范围 |

#### 认证授权错误 (40100-40399)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40100 | 401 | 未提供认证令牌 |
| 40101 | 401 | 邮箱或密码错误 |
| 40102 | 401 | Refresh Token 无效或已过期 |
| 40103 | 401 | Access Token 无效或已过期 |
| 40104 | 401 | Token 格式错误 |
| 40105 | 401 | Token 已被撤销 |
| 40300 | 403 | 无权限执行此操作 |
| 40301 | 403 | 需要 Pro 订阅 |
| 42301 | 423 | 账户已被锁定 |

#### 资源错误 (40400-40999)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40400 | 404 | 资源不存在 |
| 40401 | 404 | 用户不存在 |
| 40402 | 404 | 文档不存在 |
| 40403 | 404 | 模板不存在 |
| 40900 | 409 | 资源冲突 |
| 40901 | 409 | 邮箱已被注册 |
| 40902 | 409 | 文档标题已存在 |

#### AI 服务错误 (50300-50399)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 50300 | 503 | AI 服务暂时不可用 |
| 50301 | 503 | AI 生成服务超时 |
| 50302 | 503 | AI 修复服务超时 |
| 50303 | 503 | AI 服务商返回错误 |

#### 订阅/支付错误 (40200-40299)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40200 | 402 | 需要订阅才能使用此功能 |
| 40201 | 402 | AI 使用次数已达上限 |
| 40202 | 402 | 订阅已过期 |
| 40203 | 402 | 支付失败 |
| 40204 | 402 | 无效的订阅方案 |

#### 文档管理错误 (40500-40599)

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| 40500 | 400 | 文档内容过大 |
| 40501 | 400 | 文档数量超出限制 |
| 40502 | 400 | 标签数量超出限制 |
| 40503 | 404 | 版本不存在 |
| 40504 | 400 | 无法恢复到当前版本 |

---

### 9.2 请求限流策略

| 接口类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 登录/注册 | 10 次/IP | 1 分钟 |
| 登录失败 | 5 次/IP 后触发验证 | - |
| AI 生成 | free: 5 次/日, pro: 无限制 | 24 小时 |
| AI 修复 | free: 10 次/日, pro: 无限制 | 24 小时 |
| 普通 API | 100 次/用户 | 1 分钟 |
| 文件导出 | 30 次/用户 | 1 小时 |

**超过限流的响应示例：**

```json
{
  "success": false,
  "code": 10002,
  "message": "请求过于频繁，请稍后重试",
  "error": {
    "retryAfterSeconds": 60
  },
  "timestamp": 1718345678901
}
```

**响应头：**

```
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718345738
```

---

### 9.3 分页参数规范

- **page**: 页码，从 1 开始，默认 1
- **pageSize**: 每页数量，默认 20，最大 100
- **totalItems**: 总条目数（在响应中返回）
- **totalPages**: 总页数（在响应中返回）

---

### 9.4 时间格式规范

- 所有时间字段使用 **ISO 8601** 格式
- 使用 **UTC** 时间（包含 Z 后缀）
- 示例: `2026-06-14T10:00:00.000Z`

---

### 9.5 ID 命名规范

| 资源类型 | 前缀 | 示例 |
|---------|------|------|
| 用户 | user_ | user_1234567890 |
| 文档 | doc_ | doc_abc123def456 |
| 模板 | tpl_ | tpl_ecommerce_order_flow |
| AI 生成记录 | gen_ | gen_abc123xyz789 |
| AI 修复记录 | fix_ | fix_xyz789abc123 |
| 分享令牌 | share_ | share_xyz789abc123 |
| 订阅 | sub_ | sub_1234567890 |
| 支付记录 | pay_ | pay_1234567890 |

---

### 9.6 图表类型枚举

| 值 | 中文名称 | 英文名称 |
|----|---------|---------|
| flowchart | 流程图 | Flowchart |
| sequence | 时序图 | Sequence Diagram |
| class | 类图 | Class Diagram |
| state | 状态图 | State Diagram |
| gantt | 甘特图 | Gantt Chart |
| er | ER图 | Entity Relationship Diagram |

---

## 10. 数据模型定义

### 10.1 User（用户）

```typescript
interface User {
  id: string;                      // 主键，user_ 前缀
  email: string;                   // 邮箱（唯一索引）
  passwordHash: string;            // 密码哈希（不返回给前端）
  isSubscribed: boolean;           // 是否为付费用户
  subscriptionPlan: 'free' | 'pro'; // 订阅方案
  subscriptionExpiresAt: Date | null; // 订阅到期时间
  preferences: UserPreferences;    // 用户偏好设置
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
  lastLoginAt: Date;               // 最后登录时间
}

interface UserPreferences {
  theme: 'light' | 'dark';
  defaultChartType: string;
  editorSettings: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
  };
  notificationSettings: {
    emailUpdates: boolean;
    productNews: boolean;
  };
}
```

---

### 10.2 Document（文档）

```typescript
interface Document {
  id: string;                      // 主键，doc_ 前缀
  userId: string;                  // 用户 ID（外键）
  title: string;                   // 标题
  content: string;                 // Mermaid 代码内容
  description: string;             // 描述
  tags: string[];                  // 标签数组
  chartType: ChartType;            // 图表类型
  version: number;                 // 当前版本号
  isPublic: boolean;               // 是否公开
  shareToken: string | null;       // 分享令牌
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

**索引建议：**
- `(userId, createdAt)` - 用户文档列表查询
- `(userId, chartType)` - 按图表类型筛选
- `(userId, title)` - 标题搜索
- `(isPublic, shareToken)` - 公开文档查询

---

### 10.3 DocumentVersion（文档版本）

```typescript
interface DocumentVersion {
  id: string;                      // 主键
  documentId: string;              // 文档 ID（外键）
  version: number;                 // 版本号
  title: string;                   // 当时的标题
  content: string;                 // 当时的内容
  changeSummary: string;           // 变更摘要
  createdAt: Date;                 // 创建时间
}
```

**保留策略：** 保留最近 30 个版本或最近 90 天的版本

---

###