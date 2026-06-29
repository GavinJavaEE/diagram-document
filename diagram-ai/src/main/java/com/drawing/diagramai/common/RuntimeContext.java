package com.drawing.diagramai.common;

import com.drawing.diagramai.domain.UserInfo;

/**
 * 运行时上下文
 */
public class RuntimeContext {

    /**
     * 上下文登录信息
     */
    private static final ThreadLocal<UserInfo> runtime_context = new ThreadLocal<>();

    /**
     * 设置登录信息
     *
     * @param userInfo
     */
    protected static void setUserInfo(UserInfo userInfo){
        runtime_context.set(userInfo);
    }

    /**
     * 获取登录信息
     *
     * @return
     */
    protected static UserInfo getUserInfo(){
        return runtime_context.get();
    }

    /**
     * 清空上下文
     */
    protected static void clear(){
        runtime_context.remove();
    }
}
