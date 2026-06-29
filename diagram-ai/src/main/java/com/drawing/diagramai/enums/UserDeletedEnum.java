package com.drawing.diagramai.enums;

import lombok.Getter;

/**
 * 用户逻辑删除状态（t_user.is_deleted）
 *
 * 配合实体上的 @Where(clause = "is_deleted = 0") 使用：
 *  - NOT_DELETED：正常账号，JPA 查询可见
 *  - DELETED：已注销账号，JPA 查询自动过滤，无法登录；联合唯一索引 (email, is_deleted) 允许同邮箱重新注册
 */
@Getter
public enum UserDeletedEnum {

    NOT_DELETED(0, "正常"),
    DELETED(1, "已注销");

    private final Integer code;
    private final String label;

    UserDeletedEnum(Integer code, String label) {
        this.code = code;
        this.label = label;
    }

    public static UserDeletedEnum of(Integer code) {
        if (code == null) {
            return NOT_DELETED;
        }
        for (UserDeletedEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return NOT_DELETED;
    }

    /** 便捷判断 */
    public boolean isDeleted() {
        return this == DELETED;
    }
}
