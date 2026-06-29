package com.drawing.diagramai.dto;

import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.constraints.NotBlank;

@Data
public class AiGenerateReq {

    @NotBlank(message = "描述不能为空")
    @Length(min = 10, max = 2000, message = "描述长度必须在10-2000字符之间")
    private String description;

    @Length(max = 64, message = "图表类型不能超过64字符")
    private String chartType;

    private java.util.Map<String, Object> options;
}
