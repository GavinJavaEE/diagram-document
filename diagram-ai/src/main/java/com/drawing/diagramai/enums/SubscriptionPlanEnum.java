package com.drawing.diagramai.enums;

import lombok.Getter;

/**
 * 订阅方案
 */
@Getter
public enum SubscriptionPlanEnum {

    FREE("free", "免费版", 0, 5, 10),
    PRO("pro", "Pro版", 2990, 0, 0),
    ENTERPRISE("enterprise", "企业版", 0, 0, 0);

    private final String code;
    private final String label;
    private final int priceCents;
    private final int dailyGenerateLimit;
    private final int dailyFixLimit;

    SubscriptionPlanEnum(String code, String label, int priceCents,
                          int dailyGenerateLimit, int dailyFixLimit) {
        this.code = code;
        this.label = label;
        this.priceCents = priceCents;
        this.dailyGenerateLimit = dailyGenerateLimit;
        this.dailyFixLimit = dailyFixLimit;
    }

    public static SubscriptionPlanEnum of(String code) {
        if (code == null) {
            return FREE;
        }
        for (SubscriptionPlanEnum e : values()) {
            if (e.getCode().equalsIgnoreCase(code)) {
                return e;
            }
        }
        return FREE;
    }
}
