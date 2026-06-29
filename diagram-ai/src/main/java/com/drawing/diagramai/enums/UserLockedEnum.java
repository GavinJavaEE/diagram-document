package com.drawing.diagramai.enums;

import lombok.Getter;

/**
 * 用户锁定状态（t_user.is_locked）
 */
@Getter
public enum UserLockedEnum {

    UNLOCKED(0, "正常"),
    LOCKED(1, "已锁定/封号");

    private final Integer code;
    private final String label;

    UserLockedEnum(Integer code, String label) {
        this.code = code;
        this.label = label;
    }

    public static UserLockedEnum of(Integer code) {
        if (code == null) {
            return UNLOCKED;
        }
        for (UserLockedEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return UNLOCKED;
    }

    /** 便捷判断 */
    public boolean isLocked() {
        return this == LOCKED;
    }
}
