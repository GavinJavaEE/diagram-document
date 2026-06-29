package com.drawing.diagramai.common;

import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.enums.BizCodeEnum;

import java.util.Objects;

/**
 * 运行时上下文处理器
 *
 * @author 郑航
 */
public class RuntimeContextHelper {

    /**
     * 获取用户信息
     *
     * @return
     */
    public static UserInfo getUserInfo(){
        UserInfo userInfo = RuntimeContext.getUserInfo();
        if (Objects.isNull(userInfo)) {
            throw new BizException(BizCodeEnum._RE_LOGIN_);
        }
        return userInfo;
    }

    /**
     * 不校验是否登录获取登录信息
     *
     * @return
     */
    public static UserInfo getUserInfoNotCheckLogin(){
        return RuntimeContext.getUserInfo();
    }

    /**
     * 设置用户信心
     *
     * @param userInfo
     */
    public static void setUserInfo(UserInfo userInfo){
        RuntimeContext.setUserInfo(userInfo);
    }

    /**
     * 清空上下文
     */
    public static void clear(){
        RuntimeContext.clear();
    }
}
