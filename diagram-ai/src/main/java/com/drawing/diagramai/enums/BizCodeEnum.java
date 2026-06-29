package com.drawing.diagramai.enums;

/**
 * 业务错误
 *
 * @author 郑航
 */
public enum BizCodeEnum {

    //全局性响应
    _GLOBAL_EXCEPTION_("1001","unknown error"),
    _RE_LOGIN_("1002","need relogin"),
    _SERVER_BUSY_("1003","The server is busy. Please try again later"),
    _OSS_UPLOAD_FAILED_("1004","OSS upload failed"),
    _SUCCESS_("0000","request success"),
    _FAILED_("9999","request failed"),
    _OVER_FREQUENCY_("9998","over frequency"),
    _ILLEGAL_VISITS_("9997","illegal visits"),
    _PARAMS_INVALID_("9996","params invalid"),
    _RESOURCE_REMOVED_("9995","resource has been removed"),
    _SUBMIT_REPEAT_("9994","repeated submission"),
    //注册
    _REGISTER_PARAMS_INVALID_("1100","register params invalid"),
    _REGISTER_PHONE_INVALID_("1101","email number is invalid"),
    _PASSWORD_AGAIN_NOT_SAME_("1102","confirm password error"),
    _REGISTER_REPEAT_("1103","multiple registration"),
    //验证码
    _CAPTCHA_PARAMS_EXPIRED_("1201","The verification code has expired, please obtain it again."),
    _CAPTCHA_OVER_LIMIT_("1202","Request count exceeded limit, please try again later."),
    _CAPTCHA_INVALID_REQUEST_("1203","Invalid request, please retrieve the verification code again"),
    _CAPTCHA_CODE_NOT_SAME_("1204","The verification code is invalid, please obtain it again."),
    //用户
    _USER_IS_NOT_EXIST_("1300","user is not exist"),
    _PHONE_OR_PWD_WRONG_("1301","Wrong email/number or password."),
    _WAITE_ACTIVE_("1302","waiting for activation."),
    _PROHIBIT_LOGIN_("1303","Prohibit login."),
    //虚拟号
    _V_PHONE_APPLY_FAILED_("1401","virtual number apply failed."),
    _V_PHONE_CANT_CANCEL("1402","virtual number cant cancel."),
    _V_PHONE_EXPIRED_("1403","virtual number expired."),
    _V_PHONE_NO_NUMBERS_("1404","no virtual numbers ."),
    //钱包
    _WALLET_BALANCE_NOT_ENOUGH_("2001","wallet balance not enough"),
    ;

    /**
     * 	错误码
     */
    private String code;

    /**
     * 	描述细节
     */
    private String detail;

    private BizCodeEnum(String code, String detail) {
        this.code = code;
        this.detail = detail;
    }

    public String getCode() {
        return code;
    }

    public String getDetail() {
        return detail;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

}
