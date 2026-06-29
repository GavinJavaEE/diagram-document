package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateResp {
    private String recordId;
    private String mermaidCode;
    private String chartType;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer processingTimeMs;
}
