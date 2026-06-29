package com.drawing.diagramai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiRecordResp {
    private String recordId;
    private String type;
    private String chartType;
    private String prompt;
    private String resultCode;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer processingTimeMs;
    private String provider;
    private Integer isSuccess;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private LocalDateTime createdAt;
}
