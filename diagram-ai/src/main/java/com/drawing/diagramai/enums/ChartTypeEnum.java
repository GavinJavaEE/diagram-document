package com.drawing.diagramai.enums;

import lombok.Getter;

/**
 * 图表类型枚举
 */
@Getter
public enum ChartTypeEnum {

    FLOWCHART("flowchart", "流程图"),
    SEQUENCE("sequence", "时序图"),
    CLASS("class", "类图"),
    STATE("state", "状态图"),
    GANTT("gantt", "甘特图"),
    ER("er", "ER图"),
    AUTO("auto", "自动识别");

    private final String code;
    private final String label;

    ChartTypeEnum(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public static ChartTypeEnum of(String code) {
        if (code == null) {
            return FLOWCHART;
        }
        for (ChartTypeEnum e : values()) {
            if (e.getCode().equalsIgnoreCase(code)) {
                return e;
            }
        }
        return FLOWCHART;
    }
}
