package com.drawing.diagramai.dto;

import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import java.util.List;

@Data
public class AiUpdateReq {

    @NotBlank(message = "Mermaid代码不能为空")
    private String mermaidCode;

    @NotBlank(message = "消息不能为空")
    @Length(max = 2000, message = "消息不能超过2000字符")
    private String message;

    @Valid
    private List<ChatMessage> history;

    private java.util.Map<String, Object> options;

    /**
     * 可选：当前 Mermaid 代码的语法错误信息（来自前端预览区解析结果）。
     * 非空时将由 LLM 作为修复上下文使用，提升修正针对性。
     */
    @Length(max = 2000, message = "错误信息不能超过2000字符")
    private String errorMessage;
}
