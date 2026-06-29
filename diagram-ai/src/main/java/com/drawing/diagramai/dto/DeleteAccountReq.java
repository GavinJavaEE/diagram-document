package com.drawing.diagramai.dto;

import lombok.Data;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;

/**
 * 注销账户请求
 *
 * 注销需校验邮箱验证码（scene = delete_account），且请求邮箱必须与当前登录用户邮箱一致，
 * 防止越权注销他人账户。
 */
@Data
public class DeleteAccountReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "验证码不能为空")
    private String verificationCode;
}
