package com.drawing.diagramai.enums;

/**
 * 通用状态枚举（订阅、支付、webhook）
 */
public final class CommonStatus {

    private CommonStatus() {
    }

    /** 订阅状态 */
    public static final String SUB_PENDING = "pending_payment";
    public static final String SUB_ACTIVE = "active";
    public static final String SUB_CANCELLED = "cancelled";
    public static final String SUB_EXPIRED = "expired";

    /** 支付状态 */
    public static final String PAY_PENDING = "pending";
    public static final String PAY_SUCCESS = "success";
    public static final String PAY_FAILED = "failed";
    public static final String PAY_REFUND = "refund";

    /** AI 记录类型 */
    public static final String AI_GENERATE = "generate";
    public static final String AI_FIX = "fix";
}
