package com.drawing.diagramai.common.util;

import com.alibaba.fastjson.JSON;
import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.enums.BizCodeEnum;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Objects;

/**
 * @version V1.1.0
 * @desc 响应体处理类
 * @date 2018/10/14 0:24
 */
public class ResponseUtil {

    /**
     * @desc 请求成功直接返回数据
     * @date 2019/8/17 11:46
     * @version V1.0.0
     */
    public static <R> ResponseVo<R> whenSuccessWhiteData(R data) {
        ResponseVo<R> responsePojo = new ResponseVo<>();
        responsePojo.setCode(BizCodeEnum._SUCCESS_.getCode());
        responsePojo.setMsg(BizCodeEnum._SUCCESS_.getDetail());
        responsePojo.setData(data);
        return responsePojo;
    }

    /**
     * @param exception 异常信息
     * @return ResponseVO
     * @desc 请求失败或者成功，不返回数据时
     * @date 2018/10/14 1:14
     * @version V1.0.0
     */
    public static ResponseVo whiteoutData(BizCodeEnum exception) {
        ResponseVo responsePojo = new ResponseVo();
        responsePojo.setCode(exception.getCode());
        responsePojo.setMsg(exception.getDetail());
        return responsePojo;
    }

    /**
     * @param
     * @return ResponsePojo
     * @desc 指定提示信息
     * @author Json.Zheng
     * @date 2019/8/22 22:59
     * @version V1.0.0
     */
    public static ResponseVo whiteoutDataMsg(BizCodeEnum exception, String message) {
        ResponseVo responsePojo = new ResponseVo();
        responsePojo.setCode(exception.getCode());
        responsePojo.setMsg(message);
        return responsePojo;
    }

    /**
     * 设置业务响应码、设置提示信息、设置响应数据
     *
     * @param code    响应码
     * @param message 提示信息
     * @param data    响应数据
     * @return
     */
    public static  <R> ResponseVo<R> setCodeAndMessageAndData(String code, String message, R data) {
        ResponseVo<R> responsePojo = new ResponseVo<>();
        responsePojo.setCode(code);
        responsePojo.setMsg(message);
        responsePojo.setData(data);
        return responsePojo;
    }

    /**
     * 响应
     * @param resp
     * @param responseVO
     * @throws IOException
     */
    public static void outputJson(HttpServletResponse resp, ResponseVo responseVO) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter pw = resp.getWriter();
        responseVO = Objects.isNull(responseVO) ? ResponseUtil.whiteoutData(BizCodeEnum._GLOBAL_EXCEPTION_) : responseVO;
        pw.write(JSON.toJSONString(responseVO));
        pw.flush();
    }
}
