package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemplateCategoryResp {
    private String categoryId;
    private String name;
    private String icon;
    private String description;
    private String mermaidType;
    private Integer sortOrder;
}
