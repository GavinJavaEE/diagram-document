package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiFixResp {
    private String recordId;
    private String originalCode;
    private String fixedCode;
    private List<String> fixSummary;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer processingTimeMs;
}
