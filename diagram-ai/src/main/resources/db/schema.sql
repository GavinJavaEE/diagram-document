-- ============================================================
-- File: src/main/resources/db/schema.sql
-- 数据库: MySQL 8.0+  /  InnoDB  /  utf8mb4
-- 应用  : DiagramAI
-- 说明  : 初始化 schema。生产环境请另行建表并使用 flyway。
-- 约定  :
--   · 所有表名使用 t_ 前缀；字段使用 snake_case
--   · 主键 BIGINT 自增；业务主键 id VARCHAR(32) 使用 user_/doc_/tpl_ 前缀
--   · 逻辑删除使用 is_deleted(TINYINT DEFAULT 0)
--   · 时间字段 DATETIME；使用 createdAt/updatedAt 保持与 JSON 响应兼容
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- ------------------------------------------------------------
-- 1. 用户
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_user;
CREATE TABLE t_user (
    id                       BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    user_id                  VARCHAR(32)     NOT NULL                      COMMENT '业务主键 user_xxx',
    email                    VARCHAR(128)    NOT NULL                      COMMENT '邮箱',
    password_hash            VARCHAR(255)    NOT NULL                      COMMENT '密码哈希(bcrypt)',
    role                     VARCHAR(16)     NOT NULL DEFAULT 'user'       COMMENT '角色 guest/user/pro/admin',
    is_subscribed            TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '是否订阅 pro',
    subscription_plan        VARCHAR(16)     NOT NULL DEFAULT 'free'       COMMENT '订阅方案 free/pro/enterprise',
    subscription_expires_at  DATETIME        NULL                          COMMENT '订阅到期时间',
    preferences              JSON            NULL                          COMMENT '用户偏好（JSON）',
    github_id                VARCHAR(64)     NULL                          COMMENT 'GitHub 用户唯一 ID（OAuth 登录）',
    login_count              INT             NOT NULL DEFAULT 0             COMMENT '登录次数',
    last_login_at            DATETIME        NULL                          COMMENT '最近登录',
    is_locked                TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '是否锁定',
    is_deleted               TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_id          (user_id),
    UNIQUE KEY uk_email_is_deleted (email, is_deleted),
    KEY idx_user_sub_plan          (subscription_plan, is_subscribed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';


-- ------------------------------------------------------------
-- 3. 文档
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_document;
CREATE TABLE t_document (
    id               BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    document_id      VARCHAR(32)     NOT NULL                      COMMENT '业务主键 doc_xxx',
    user_id          VARCHAR(32)     NOT NULL                      COMMENT '所属用户',
    title            VARCHAR(200)    NOT NULL                      COMMENT '标题',
    content          MEDIUMTEXT      NOT NULL                      COMMENT 'Mermaid 代码内容（最大 50KB）',
    description      VARCHAR(500)    NULL                          COMMENT '描述',
    tags             VARCHAR(512)    NULL                          COMMENT '标签，逗号分隔（最多 10 个，每标签 20 字符）',
    chart_type       VARCHAR(32)     NOT NULL DEFAULT 'flowchart'  COMMENT '图表类型 flowchart/sequence/...',
    version          INT             NOT NULL DEFAULT 1             COMMENT '当前版本号',
    is_public        TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '是否公开',
    share_token      VARCHAR(32)     NULL                          COMMENT '分享令牌 share_xxx',
    bytes_size       INT             NOT NULL DEFAULT 0             COMMENT '内容字节数（用于存储配额统计）',
    is_deleted       TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_document_id  (document_id),
    KEY idx_user_created       (user_id, created_at),
    KEY idx_user_chart         (user_id, chart_type),
    KEY idx_user_title         (user_id, title),
    KEY idx_public_share       (is_public, share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图表文档表';


-- ------------------------------------------------------------
-- 4. 文档版本历史
--    保留策略: 最近 30 个版本或最近 90 天 (由应用层实现)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_document_version;
CREATE TABLE t_document_version (
    id               BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    document_id      VARCHAR(32)     NOT NULL                      COMMENT '业务 doc id',
    version          INT             NOT NULL                      COMMENT '版本号',
    title            VARCHAR(200)    NOT NULL                      COMMENT '当时的标题',
    content          MEDIUMTEXT      NOT NULL                      COMMENT '当时的内容',
    change_summary   VARCHAR(500)    NULL                          COMMENT '变更摘要',
    user_id          VARCHAR(32)     NOT NULL                      COMMENT '所属用户（冗余，用于快速查询/权限）',
    is_deleted       TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_doc_version  (document_id, version),
    KEY idx_doc_created        (document_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本历史';


-- ------------------------------------------------------------
-- 5. 模板分类（基础表，可由运维/脚本预填）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_template_category;
CREATE TABLE t_template_category (
    id               BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    category_id      VARCHAR(32)     NOT NULL                      COMMENT '分类 id flowchart/sequence/...',
    name             VARCHAR(64)     NOT NULL                      COMMENT '名称',
    icon             VARCHAR(16)     NULL                          COMMENT '图标 emoji',
    description      VARCHAR(255)    NULL                          COMMENT '描述',
    mermaid_type     VARCHAR(64)     NOT NULL                      COMMENT 'Mermaid 内部类型名（如 flowchart, stateDiagram-v2）',
    sort_order       INT             NOT NULL DEFAULT 0             COMMENT '排序',
    is_enabled       TINYINT(1)      NOT NULL DEFAULT 1             COMMENT '是否启用',
    is_deleted       TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板分类表';


-- ------------------------------------------------------------
-- 6. 模板
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_template;
CREATE TABLE t_template (
    id               BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    template_id      VARCHAR(64)     NOT NULL                      COMMENT '业务主键 tpl_xxx',
    title            VARCHAR(200)    NOT NULL                      COMMENT '模板标题',
    category         VARCHAR(32)     NOT NULL                      COMMENT '分类 id',
    description      VARCHAR(500)    NULL                          COMMENT '描述',
    content          MEDIUMTEXT      NOT NULL                      COMMENT '模板 Mermaid 代码',
    tags             VARCHAR(512)    NULL                          COMMENT '标签，逗号分隔',
    is_public        TINYINT(1)      NOT NULL DEFAULT 1             COMMENT '是否公开',
    owner_user_id    VARCHAR(32)     NULL                          COMMENT '创建者；系统模板为 NULL',
    use_count        INT             NOT NULL DEFAULT 0             COMMENT '被使用次数（排序用 popularity）',
    is_deleted       TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_template_id (template_id),
    KEY idx_category_sort   (category, use_count),
    KEY idx_created         (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图表模板表';


-- ------------------------------------------------------------
-- 7. 订阅记录
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_subscription;
CREATE TABLE t_subscription (
    id                   BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    subscription_id      VARCHAR(32)     NOT NULL                      COMMENT 'sub_xxx',
    user_id              VARCHAR(32)     NOT NULL                      COMMENT '业务 user id',
    plan                 VARCHAR(16)     NOT NULL DEFAULT 'pro'        COMMENT '方案 pro/enterprise',
    status               VARCHAR(24)     NOT NULL DEFAULT 'pending_payment'  COMMENT '状态 pending_payment/active/cancelled/expired',
    will_cancel_at_end   TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '到期后是否不再续费',
    billing_period_start DATETIME        NULL                          COMMENT '计费开始',
    billing_period_end   DATETIME        NULL                          COMMENT '计费结束',
    cancel_reason        VARCHAR(500)    NULL                          COMMENT '取消原因',
    cancel_feedback      VARCHAR(1000)   NULL                          COMMENT '取消反馈',
    payment_session_id   VARCHAR(64)     NULL                          COMMENT '支付会话（stripe sessionId 等）',
    is_deleted           TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_subscription_id (subscription_id),
    KEY idx_user_status          (user_id, status),
    KEY idx_payment_session      (payment_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅记录';


-- ------------------------------------------------------------
-- 8. 支付记录
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_payment;
CREATE TABLE t_payment (
    id                   BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    payment_id           VARCHAR(32)     NOT NULL                      COMMENT 'pay_xxx',
    user_id              VARCHAR(32)     NOT NULL                      COMMENT '业务 user id',
    subscription_id      VARCHAR(32)     NULL                          COMMENT '订阅 id',
    plan                 VARCHAR(16)     NOT NULL DEFAULT 'pro'        COMMENT '订阅方案',
    amount               DECIMAL(10,2)   NOT NULL                      COMMENT '金额',
    currency             VARCHAR(8)      NOT NULL DEFAULT 'CNY'        COMMENT '货币 CNY/USD/EUR',
    status               VARCHAR(24)     NOT NULL DEFAULT 'pending'    COMMENT '状态 pending/success/failed/refund',
    payment_method       VARCHAR(24)     NOT NULL DEFAULT 'stripe'     COMMENT '支付方式 stripe/alipay/wechat',
    invoice_url          VARCHAR(512)    NULL                          COMMENT '发票链接',
    third_party_tx_id    VARCHAR(128)    NULL                          COMMENT '第三方交易号',
    billing_period_start DATETIME        NULL,
    billing_period_end   DATETIME        NULL,
    is_deleted           TINYINT(1)     NOT NULL DEFAULT 0,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_id (payment_id),
    KEY idx_user_created    (user_id, created_at),
    KEY idx_third_party     (third_party_tx_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录';


-- ------------------------------------------------------------
-- 9. AI 生成 / 修复 记录（合并一张表，通过 type 区分）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_ai_record;
CREATE TABLE t_ai_record (
    id                    BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    record_id             VARCHAR(32)     NOT NULL                      COMMENT 'gen_xxx / fix_xxx',
    user_id               VARCHAR(32)     NOT NULL                      COMMENT '业务 user id',
    type                  VARCHAR(16)     NOT NULL                      COMMENT '类型 generate/fix',
    chart_type            VARCHAR(32)     NULL                          COMMENT '图表类型（generate 必填，fix 可空）',
    prompt                TEXT            NULL                          COMMENT '描述/输入（generate 时为描述；fix 时为原始代码）',
    error_message         TEXT            NULL                          COMMENT '修复场景的错误信息',
    result_code           MEDIUMTEXT      NULL                          COMMENT 'AI 返回的 mermaid 代码',
    prompt_tokens         INT             NOT NULL DEFAULT 0             COMMENT 'prompt tokens',
    completion_tokens     INT             NOT NULL DEFAULT 0             COMMENT 'completion tokens',
    total_tokens          INT             NOT NULL DEFAULT 0             COMMENT '总 tokens',
    processing_time_ms    INT             NOT NULL DEFAULT 0             COMMENT '处理耗时 ms',
    provider              VARCHAR(32)     NULL                          COMMENT 'AI 服务商 openai/anthropic/...',
    is_success            TINYINT(1)      NOT NULL DEFAULT 1             COMMENT '是否成功',
    is_deleted            TINYINT(1)      NOT NULL DEFAULT 0             COMMENT '逻辑删除',
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_record_id   (record_id),
    KEY idx_user_type_created (user_id, type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 生成/修复记录';


-- ------------------------------------------------------------
-- 10. AI 使用配额 / 限流（可替代 Redis 场景）
--    以 (user_id, period_start, type) 为唯一维度记录每日用量
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_ai_usage;
CREATE TABLE t_ai_usage (
    id              BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    user_id         VARCHAR(32)     NOT NULL                      COMMENT '业务 user id',
    type            VARCHAR(16)     NOT NULL                      COMMENT 'generate/fix',
    period_start    DATETIME        NOT NULL                      COMMENT '计费周期起点（通常是当日 00:00 UTC）',
    period_end      DATETIME        NOT NULL                      COMMENT '计费周期结束',
    used_count      INT             NOT NULL DEFAULT 0             COMMENT '已使用次数',
    limit_count     INT             NOT NULL DEFAULT 0             COMMENT '限额（pro 为 0 代表无限）',
    total_tokens    INT             NOT NULL DEFAULT 0             COMMENT '累计 token',
    is_deleted      TINYINT(1)     NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_period (user_id, type, period_start),
    KEY idx_period_end        (period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 每日使用量';


-- ------------------------------------------------------------
-- 11. Webhook / 支付回调事件（幂等）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS t_webhook_event;
CREATE TABLE t_webhook_event (
    id                    BIGINT          NOT NULL AUTO_INCREMENT       COMMENT '主键',
    event_id              VARCHAR(128)    NOT NULL                      COMMENT '第三方事件 id（去重用）',
    source                VARCHAR(32)     NOT NULL                      COMMENT '来源 stripe/alipay/wechat',
    raw_payload           TEXT            NULL                          COMMENT '原始 payload',
    status                VARCHAR(24)     NOT NULL DEFAULT 'pending'    COMMENT '处理状态 pending/success/failed',
    fail_reason           VARCHAR(500)    NULL,
    retry_count           INT             NOT NULL DEFAULT 0,
    is_deleted            TINYINT(1)     NOT NULL DEFAULT 0,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Webhook 事件表';


-- ------------------------------------------------------------
-- 预置数据: 模板分类
-- ------------------------------------------------------------
INSERT INTO t_template_category (category_id, name, icon, description, mermaid_type, sort_order) VALUES
    ('flowchart', '流程图', '🔷', '描述业务流程、算法逻辑', 'flowchart',          1),
    ('sequence',  '时序图', '📊', '描述系统交互、接口调用', 'sequenceDiagram',    2),
    ('class',     '类图',   '📦', '面向对象设计',            'classDiagram',       3),
    ('state',     '状态图', '🔄', '描述状态流转',            'stateDiagram-v2',    4),
    ('gantt',     '甘特图', '📅', '项目排期、任务规划',       'gantt',              5),
    ('er',        'ER图',  '🗄️', '数据库设计、实体关系',    'erDiagram',          6);


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 迁移脚本：t_user.email 单字段唯一索引 -> (email, is_deleted) 联合唯一索引
-- 适用场景：用户注销采用逻辑删除，已注销(is_deleted=1)的账号应允许同邮箱重新注册
-- 执行前请备份 t_user 表
-- ============================================================

-- 1. 历史数据修复：如果同一邮箱存在多条 is_deleted=1 的记录（理论上不应有，但保险起见）
--    保留最近一条已注销记录，其余物理删除，避免联合唯一索引建立失败
DELETE u1 FROM t_user u1
INNER JOIN t_user u2
  ON u1.email = u2.email
 AND u1.is_deleted = 1
 AND u2.is_deleted = 1
 AND u1.id < u2.id;

-- 2. 删除旧的 email 单字段唯一索引
ALTER TABLE t_user DROP INDEX uk_email;

-- 3. 建立新的 (email, is_deleted) 联合唯一索引
--    语义：同一邮箱在未注销状态(is_deleted=0)下唯一，注销后(is_deleted=1)可被新账号注册覆盖
ALTER TABLE t_user
    ADD UNIQUE KEY uk_email_is_deleted (email, is_deleted);
