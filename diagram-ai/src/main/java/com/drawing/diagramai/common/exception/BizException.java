package com.drawing.diagramai.common.exception;

import com.drawing.diagramai.enums.BizCodeEnum;
import org.apache.commons.lang3.StringUtils;

/**
 * 业务自定义异常
 *
 * @author 郑航
 */
public class BizException extends RuntimeException {

    private static final long serialVersionUID = 4152348643756514111L;

    /**
     * 错误码
     */
    private String code;

    /**
     * 错误信息
     */
    private String message;

    /**
     * 响应数据
     */
    private Object data;

    public BizException() {
        super();
    }

    public BizException(BizCodeEnum bizCodeEnum) {
        this.code = bizCodeEnum.getCode();
        this.message = bizCodeEnum.getDetail();
    }

    public BizException(BizCodeEnum bizCodeEnum, String diyMessage) {
        this.code = bizCodeEnum.getCode();
        this.message = StringUtils.isBlank(diyMessage) ? bizCodeEnum.getDetail() : diyMessage;
    }

    public BizException(BizCodeEnum bizCodeEnum, Object o) {
        this.code = bizCodeEnum.getCode();
        this.message = bizCodeEnum.getDetail();
        this.data = o;
    }

    public BizException(BizCodeEnum bizCodeEnum, String diyMessage, Object o) {
        this.code = bizCodeEnum.getCode();
        this.message = StringUtils.isBlank(diyMessage) ? bizCodeEnum.getDetail() : diyMessage;
        this.data = o;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    @Override
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
}
