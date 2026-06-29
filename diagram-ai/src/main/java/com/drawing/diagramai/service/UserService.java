package com.drawing.diagramai.service;

import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.component.RedisComponent;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.entity.User;
import com.drawing.diagramai.enums.BizCodeEnum;
import com.drawing.diagramai.enums.UserActiveEnum;
import com.drawing.diagramai.enums.UserDeletedEnum;
import com.drawing.diagramai.repository.AiRecordRepository;
import com.drawing.diagramai.repository.DocumentRepository;
import com.drawing.diagramai.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;

@Slf4j
@Service
public class UserService {

    /** Redis token key 前缀（与 AuthService 保持一致） */
    private static final String REDIS_TOKEN_PREFIX = "TOKEN";
    /** 验证码相关 key 前缀（与 AuthService 保持一致） */
    private static final String REDIS_VERIFY_CODE_PREFIX = "VERIFY_EMAIL";
    private static final String REDIS_VERIFY_RATE_PREFIX = "VERIFY_EMAIL_RATE";
    /** 注销验证码 scene */
    private static final String SCENE_DELETE_ACCOUNT = "delete_account";

    @Resource
    private UserRepository userRepository;

    @Resource
    private DocumentRepository documentRepository;

    @Resource
    private AiRecordRepository aiRecordRepository;

    @Resource
    private RedisComponent redisComponent;

    public UserProfileResp getProfile() {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BizException(BizCodeEnum._USER_IS_NOT_EXIST_));

        // totalDocuments：只统计 Markdown 文档（chart_type='markdown'），与「我的文档」页面口径一致
        int totalDocuments = documentRepository.countByUserIdAndChartType(userId, "markdown");
        // totalCharts：统计 Mermaid 图表（排除 markdown，兼容 NULL/空值旧数据）
        int totalCharts = documentRepository.countChartsByUserId(userId);
        int totalAiCalls = aiRecordRepository.countByUserId(userId);

        UserProfileResp resp = new UserProfileResp();
        resp.setUserId(user.getUserId());
        resp.setEmail(user.getEmail());
        resp.setNickname(user.getNickname());
        resp.setAvatarUrl(user.getAvatarUrl());
        resp.setPhone(user.getPhone());
        resp.setLocation(user.getLocation());
        resp.setIsSubscribed(user.getIsSubscribed());
        resp.setPlanType(user.getSubscriptionPlan());
        resp.setSubscriptionEndAt(user.getSubscriptionExpiresAt());
        resp.setTotalDocuments(totalDocuments);
        resp.setTotalCharts(totalCharts);
        resp.setTotalAiCalls(totalAiCalls);
        resp.setCreatedAt(user.getCreatedAt());
        resp.setUpdatedAt(user.getUpdatedAt());
        return resp;
    }

    @Transactional(rollbackFor = Exception.class)
    public UserProfileResp updateProfile(UserProfileUpdateReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BizException(BizCodeEnum._USER_IS_NOT_EXIST_));

        if (StringUtils.isNotBlank(req.getNickname())) {
            user.setNickname(req.getNickname());
        }
        if (StringUtils.isNotBlank(req.getAvatarUrl())) {
            user.setAvatarUrl(req.getAvatarUrl());
        }
        if (StringUtils.isNotBlank(req.getPhone())) {
            user.setPhone(req.getPhone());
        }
        if (StringUtils.isNotBlank(req.getLocation())) {
            user.setLocation(req.getLocation());
        }

        user = userRepository.save(user);
        return getProfile();
    }

    /**
     * 注销账户（逻辑删除）。
     *
     * 步骤：
     * 1. 校验请求邮箱 = 当前登录用户邮箱（防越权注销他人账户）
     * 2. 校验邮箱验证码（scene = delete_account）
     * 3. 设置 is_deleted = 1 + is_active = 0，@Where(is_deleted=0) 让该用户后续无法被 JPA 查到，
     *    自然无法登录（findByEmail 查不到 → 抛 PHONE_OR_PWD_WRONG）、无法用同邮箱重新注册
     *    （findByEmail 查不到 → 通过唯一性检查），邮箱也可被新账号注册（联合唯一索引 only 限定 is_deleted=0）
     * 4. 销毁验证码 + 频控标记
     * 5. 销毁当前登录 token，立即下线
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteAccount(DeleteAccountReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        if (userInfo == null || StringUtils.isBlank(userInfo.getUserId())) {
            throw new BizException(BizCodeEnum._RE_LOGIN_);
        }

        // 1. 防越权：请求邮箱必须等于当前登录用户邮箱
        if (!req.getEmail().equals(userInfo.getEmail())) {
            throw new BizException(BizCodeEnum._PARAMS_INVALID_);
        }

        // 2. 校验验证码
        String codeKey = redisComponent.getKeyStr(REDIS_VERIFY_CODE_PREFIX, SCENE_DELETE_ACCOUNT, req.getEmail());
        String storedCode = redisComponent.getString(codeKey);
        if (StringUtils.isBlank(storedCode)) {
            throw new BizException(BizCodeEnum._CAPTCHA_PARAMS_EXPIRED_);
        }
        if (!storedCode.equals(req.getVerificationCode().trim())) {
            throw new BizException(BizCodeEnum._CAPTCHA_CODE_NOT_SAME_);
        }

        // 3. 逻辑删除
        User user = userRepository.findByUserId(userInfo.getUserId())
                .orElseThrow(() -> new BizException(BizCodeEnum._USER_IS_NOT_EXIST_));
        user.setIsDeleted(UserDeletedEnum.DELETED.getCode());
        user.setIsActive(UserActiveEnum.INACTIVE.getCode());
        userRepository.save(user);

        // 4. 销毁验证码 + 频控标记
        redisComponent.del(codeKey);
        redisComponent.del(redisComponent.getKeyStr(REDIS_VERIFY_RATE_PREFIX, SCENE_DELETE_ACCOUNT, req.getEmail()));

        // 5. 销毁登录 token，立即下线
        if (StringUtils.isNotBlank(userInfo.getToken())) {
            redisComponent.del(redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, userInfo.getToken()));
        }
    }
}
