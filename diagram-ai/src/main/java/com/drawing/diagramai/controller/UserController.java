package com.drawing.diagramai.controller;

import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.dto.DeleteAccountReq;
import com.drawing.diagramai.dto.UserProfileResp;
import com.drawing.diagramai.dto.UserProfileUpdateReq;
import com.drawing.diagramai.inter.RateLimit;
import com.drawing.diagramai.service.UserService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

    @Resource
    private UserService userService;

    @GetMapping("/profile")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<UserProfileResp> getProfile() {
        return ResponseUtil.whenSuccessWhiteData(userService.getProfile());
    }

    @PutMapping("/profile")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<UserProfileResp> updateProfile(@Valid @RequestBody UserProfileUpdateReq req) {
        return ResponseUtil.whenSuccessWhiteData(userService.updateProfile(req));
    }

    /**
     * 注销账户（逻辑删除）
     *
     * 请求体携带邮箱 + 邮箱验证码（scene=delete_account）。
     * 服务端会校验请求邮箱 = 当前登录用户邮箱，防越权注销他人账户。
     */
    @DeleteMapping("/account")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<Void> deleteAccount(@Valid @RequestBody DeleteAccountReq req) {
        userService.deleteAccount(req);
        return ResponseUtil.whenSuccessWhiteData(null);
    }
}
