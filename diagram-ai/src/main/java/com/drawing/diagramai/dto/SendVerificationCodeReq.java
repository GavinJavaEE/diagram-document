package com.drawing.diagramai.dto;

import lombok.Data;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;

/**
 * 发送邮箱验证码请求
 *
 * scene 标识验证码用途，决定服务端校验逻辑与 Redis key 命名空间：
 *  - register       注册场景：邮箱已存在（未删除）则拒绝发送
 *  - delete_account 注销场景：必须当前登录用户本人邮箱 + 邮箱必须存在
 */
@Data
public class SendVerificationCodeReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "场景不能为空")
    @Pattern(regexp = "register|delete_account", message = "不支持的验证码场景")
    private String scene;
}
