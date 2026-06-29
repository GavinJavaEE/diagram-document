package com.drawing.diagramai.dto;

import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.constraints.NotBlank;

@Data
public class AiFixReq {

    @NotBlank(message = "Mermaid代码不能为空")
    private String mermaidCode;

    @Length(max = 2000, message = "错误信息不能超过2000字符")
    private String errorMessage;

    private java.util.Map<String, Object> options;
}
