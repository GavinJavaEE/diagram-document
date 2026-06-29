package com.drawing.diagramai.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class ChatMessage {

    @NotBlank(message = "角色不能为空")
    private String role;

    @NotBlank(message = "内容不能为空")
    private String content;
}
