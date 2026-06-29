package com.drawing.diagramai.inter;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.component.CookieManager;
import com.drawing.diagramai.component.RedisComponent;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.enums.BizCodeEnum;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * 登录拦截器
 */
@Component
public class LoginInterceptor implements HandlerInterceptor {

    private static final long TOKEN_EXPIRE_SECONDS = 3600L;
    
    /** Redis token key 前缀（与 AuthService 保持一致） */
    private static final String REDIS_TOKEN_PREFIX = "TOKEN";

    @Autowired
    private CookieManager cookieManager;

    @Autowired
    private RedisComponent redisComponent;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {
        //读取登录token
        String loginToken = cookieManager.readLoginToken(request);
        if (StringUtils.isBlank(loginToken)) {
            outputJson(response, JSONObject.toJSONString(ResponseUtil.whiteoutData(BizCodeEnum._RE_LOGIN_)));
            return false;
        }

        //读取redis中的用户缓存（统一key前缀格式）
        String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, loginToken);
        String userInfoString = redisComponent.getString(redisKey);
        if (StringUtils.isBlank(userInfoString)) {
            outputJson(response, JSONObject.toJSONString(ResponseUtil.whiteoutData(BizCodeEnum._RE_LOGIN_)));
            return false;
        }

        //解析用户信息
        UserInfo userInfo = JSON.parseObject(userInfoString, UserInfo.class);
        if (userInfo == null) {
            outputJson(response, JSONObject.toJSONString(ResponseUtil.whiteoutData(BizCodeEnum._RE_LOGIN_)));
            return false;
        }
        userInfo.setToken(loginToken);

        //设置上下文
        RuntimeContextHelper.setUserInfo(userInfo);

        //刷新登录缓存时效
        redisComponent.setString(redisKey, JSON.toJSONString(userInfo), TOKEN_EXPIRE_SECONDS);
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                           ModelAndView modelAndView) throws Exception {

    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                Exception ex) throws Exception {
        //清空上下文
        RuntimeContextHelper.clear();
    }

    /**
     * 响应
     */
    private void outputJson(HttpServletResponse resp, String result) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter pw = resp.getWriter();
        pw.write(result);
        pw.flush();
    }
}
