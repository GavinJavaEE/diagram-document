package com.drawing.diagramai.enums;

/**
 * 时间枚举
 * @author Json.Zheng
 * @date 2019/08/21
 * @version
 */
public enum DateTimeEnum {

    /*年-月-日-时-分-秒*/
    year_month_day_hour_min_sce("yyyy-MM-dd HH:mm:ss"),
    /*年-月-日-时-分*/
    year_month_day_hour_min("yyyy-MM-dd HH:mm"),
    /*年-月-日*/
    year_month_day("yyyy-MM-dd"),
    /*年月日时分秒*/
    yearmonthdayhourminsce("yyyyMMddHHmmss"),

    year年month月day日("yyyy年MM月dd日")
    ;

    private String formatType;

    private DateTimeEnum(String formatType){
        this.formatType = formatType;
    }

    public String getFormatType() {
        return formatType;
    }

    public void setFormatType(String formatType) {
        this.formatType = formatType;
    }
}