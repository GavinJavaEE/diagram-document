package com.drawing.diagramai.component;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;

/**
 * Cookie管理工具
 */
@Component
public class CookieManager {

    private static final String AUTH_LOGIN = "AUTH_LOGIN";

    @Value("${server.servlet.context-path:/}")
    private String contextPath;

    /**
     * 写入登录cookie
     *
     * @param response
     * @param value
     */
    public void writeLoginCookie(HttpServletResponse response, String value) {
        Cookie cookie = new Cookie(AUTH_LOGIN, value);
        cookie.setMaxAge(24 * 3600);
        cookie.setHttpOnly(true);
        cookie.setPath(contextPath);
        response.addCookie(cookie);
    }

    /**
     * 读取登录token
     *
     * @param request
     * @return
     */
    public String readLoginToken(HttpServletRequest request) {
        Cookie[] cookieArr = request.getCookies();
        if (cookieArr == null) {
            return null;
        }
        List<Cookie> cookies = Arrays.asList(cookieArr);
        Cookie cookie = cookies.stream().filter(x -> AUTH_LOGIN.equals(x.getName())).findFirst().orElse(null);
        if (cookie == null) {
            return "";
        }
        return cookie.getValue();
    }

    /**
     * 清除登录cookie（maxAge=0 立即失效）
     *
     * @param response
     */
    public void clearLoginCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(AUTH_LOGIN, "");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setPath(contextPath);
        response.addCookie(cookie);
    }
}
