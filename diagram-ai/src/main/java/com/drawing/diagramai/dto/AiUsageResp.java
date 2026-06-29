package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiUsageResp {
    private String type;
    private Integer usedCount;
    private Integer limitCount;
    private Integer remainingCount;
    private String period;
}
