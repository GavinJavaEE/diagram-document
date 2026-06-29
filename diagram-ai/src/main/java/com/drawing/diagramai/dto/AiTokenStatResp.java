package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 每日 AI Token 使用量统计
 *
 * 用于个人中心堆叠面积图展示：按天聚合用户 AI 调用的 token 消耗与调用次数。
 * 即使某天无 AI 调用，也会返回该天各字段为 0 的占位记录，
 * 保证前端图表横轴连续无断点。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiTokenStatResp {
    /** 日期，格式 yyyy-MM-dd */
    private String date;

    /** 当日 token 总消耗（prompt + completion） */
    private Long totalTokens;

    /** 当日 AI 调用次数 */
    private Long callCount;

    /** 当日输入 token（prompt_tokens），模型计费的输入部分 */
    private Long promptTokens;

    /** 当日输出 token（completion_tokens），模型计费的输出部分 */
    private Long completionTokens;
}
