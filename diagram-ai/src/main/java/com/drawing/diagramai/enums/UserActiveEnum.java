package com.drawing.diagramai.enums;

import lombok.Getter;

/**
 * 用户激活状态（t_user.is_active）
 */
@Getter
public enum UserActiveEnum {

    INACTIVE(0, "未激活/已停用"),
    ACTIVE(1, "已激活");

    private final Integer code;
    private final String label;

    UserActiveEnum(Integer code, String label) {
        this.code = code;
        this.label = label;
    }

    public static UserActiveEnum of(Integer code) {
        if (code == null) {
            return INACTIVE;
        }
        for (UserActiveEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return INACTIVE;
    }

    /** 便捷判断 */
    public boolean isActive() {
        return this == ACTIVE;
    }
}
