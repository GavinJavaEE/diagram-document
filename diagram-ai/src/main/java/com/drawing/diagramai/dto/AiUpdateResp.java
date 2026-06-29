package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiUpdateResp {
    private String recordId;
    private String reply;
    private String mermaidCode;
    private boolean updated;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer processingTimeMs;
}
