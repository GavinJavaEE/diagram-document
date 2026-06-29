package com.drawing.diagramai.controller;

import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.dto.GithubLoginReq;
import com.drawing.diagramai.dto.LoginReq;
import com.drawing.diagramai.dto.RegisterReq;
import com.drawing.diagramai.dto.SendVerificationCodeReq;
import com.drawing.diagramai.dto.UserResp;
import com.drawing.diagramai.service.AuthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;

/**
 * 认证控制器
 */
@RestController
@RequestMapping
public class AuthController {

    @Resource
    private AuthService authService;

    /**
     * 发送邮箱验证码
     */
    @PostMapping("/send-verification-code")
    public ResponseVo<Void> sendVerificationCode(@Valid @RequestBody SendVerificationCodeReq req) {
        authService.sendVerificationCode(req);
        return ResponseUtil.whenSuccessWhiteData(null);
    }

    /**
     * 注册（需携带邮箱验证码）
     */
    @PostMapping("/register")
    public ResponseVo<UserResp> register(@Valid @RequestBody RegisterReq req) {
        return ResponseUtil.whenSuccessWhiteData(authService.register(req));
    }

    /**
     * 登录
     */
    @PostMapping("/login")
    public ResponseVo<UserResp> login(@Valid @RequestBody LoginReq req, HttpServletResponse response) {
        return ResponseUtil.whenSuccessWhiteData(authService.login(req, response));
    }

    /**
     * GitHub OAuth 登录
     */
    @PostMapping("/login/github-callback")
    public ResponseVo<UserResp> githubLogin(@Valid @RequestBody GithubLoginReq req, HttpServletResponse response) {
        return ResponseUtil.whenSuccessWhiteData(authService.githubLogin(req.getCode(), response));
    }

    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public ResponseVo<Void> logout() {
        authService.logout();
        return ResponseUtil.whenSuccessWhiteData(null);
    }

    /**
     * 获取当前登录用户
     *
     * 接口已放开登录拦截：未登录或登录过期时返回 code='0000' + data=null，
     * 前端 initialize 静默处理为未登录态，不触发重新登录弹窗。
     * 仅当用户主动访问受保护资源时才会触发 1002。
     */
    @GetMapping("/me")
    public ResponseVo<UserResp> me() {
        return ResponseUtil.whenSuccessWhiteData(authService.getCurrentUserIfPresent());
    }
}
