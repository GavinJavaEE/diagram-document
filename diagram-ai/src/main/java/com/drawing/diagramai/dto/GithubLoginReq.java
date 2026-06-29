package com.drawing.diagramai.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * GitHub OAuth 登录请求（接收前端从 GitHub 回调获得的 code）
 */
@Data
public class GithubLoginReq {

    @NotBlank(message = "code 不能为空")
    private String code;
}
