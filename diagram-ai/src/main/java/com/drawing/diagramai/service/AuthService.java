package com.drawing.diagramai.service;

import com.drawing.diagramai.common.Context;
import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.common.util.EncryptedUtil;
import com.drawing.diagramai.common.util.MaskingUtils;
import com.drawing.diagramai.common.util.SendEmailUtil;
import com.drawing.diagramai.component.RedisComponent;
import com.drawing.diagramai.component.TokenComponent;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.dto.LoginReq;
import com.drawing.diagramai.dto.RegisterReq;
import com.drawing.diagramai.dto.SendVerificationCodeReq;
import com.drawing.diagramai.dto.UserResp;
import com.drawing.diagramai.entity.User;
import com.drawing.diagramai.enums.BizCodeEnum;
import com.drawing.diagramai.enums.UserDeletedEnum;
import com.drawing.diagramai.enums.UserLockedEnum;
import com.drawing.diagramai.repository.UserRepository;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 认证服务
 */
@Slf4j
@Service
public class AuthService {

    private static final String REDIS_TOKEN_PREFIX = "TOKEN";
    private static final long TOKEN_EXPIRE_SECONDS = 24 * 3600L;

    /** 验证码 Redis key 前缀 + TTL (秒) */
    private static final String REDIS_VERIFY_CODE_PREFIX = "VERIFY_EMAIL";
    private static final long VERIFY_CODE_EXPIRE_SECONDS = 10 * 60L;

    /** 验证码频控 key：同一邮箱 60 秒内不重复发送 */
    private static final String REDIS_VERIFY_RATE_PREFIX = "VERIFY_EMAIL_RATE";
    private static final long VERIFY_RATE_SECONDS = 60L;

    @Resource
    private UserRepository userRepository;

    @Resource
    private TokenComponent tokenComponent;

    @Resource
    private RedisComponent redisComponent;

    @Resource
    private com.drawing.diagramai.component.CookieManager cookieManager;

    private RestTemplate restTemplate;

    @PostConstruct
    public void init() {
        this.restTemplate = new RestTemplate();
    }

    // ------------------------------------------------------------
    // GitHub OAuth 配置
    // ------------------------------------------------------------
    @Value("${diagramai.github.client-id:}")
    private String githubClientId;

    @Value("${diagramai.github.client-secret:}")
    private String githubClientSecret;

    @Value("${diagramai.github.token-url:https://github.com/login/oauth/access_token}")
    private String githubTokenUrl;

    @Value("${diagramai.github.user-url:https://api.github.com/user}")
    private String githubUserUrl;

    @Value("${diagramai.github.user-emails-url:https://api.github.com/user/emails}")
    private String githubUserEmailsUrl;

    /**
     * GitHub OAuth 登录。
     *
     * 流程（skill-market 同款）：
     * 1. 用 code 向 GitHub 换 access_token
     * 2. 用 access_token 拉取用户信息（id, login, avatar_url, email 等）
     * 3. 如果邮箱私有，再拉取 user/emails 取 primary+verified 的邮箱
     * 4. 按 github_id 查库，存在则老用户；不存在按 email 查，存在则关联；否则创建新用户
     * 5. 更新登录态：生成 token → Redis → Cookie
     */
    @Transactional(rollbackFor = Exception.class)
    public UserResp githubLogin(String code, HttpServletResponse response) {
        if (StringUtils.isBlank(code)) {
            throw new BizException(BizCodeEnum._REGISTER_PARAMS_INVALID_);
        }

        if (StringUtils.isBlank(githubClientId) || StringUtils.isBlank(githubClientSecret)) {
            log.error("[GITHUB] client-id 或 client-secret 未配置");
            throw new BizException(BizCodeEnum._SERVER_BUSY_);
        }

        // 1. code -> access_token
        String accessToken = exchangeAccessToken(code);
        if (StringUtils.isBlank(accessToken)) {
            throw new BizException(BizCodeEnum._SERVER_BUSY_);
        }

        // 2. access_token -> user info
        JSONObject githubUser = fetchGithubUser(accessToken);
        String githubId = githubUser.getString("id");
        String githubLogin = githubUser.getString("login");
        String avatarUrl = githubUser.getString("avatar_url");
        String email = githubUser.getString("email");

        // 3. 邮箱私有 -> 拉 user/emails
        if (StringUtils.isBlank(email)) {
            email = fetchGithubPrimaryEmail(accessToken);
        }

        // 4. 查库：先 githubId 后 email
        User user = userRepository.findByGithubId(githubId).orElse(null);

        if (user == null && StringUtils.isNotBlank(email)) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                // 邮箱已注册但无 githubId -> 关联上
                user.setGithubId(githubId);
                if (StringUtils.isNotBlank(avatarUrl) && StringUtils.isBlank(user.getAvatarUrl())) {
                    user.setAvatarUrl(avatarUrl);
                }
                if (StringUtils.isBlank(user.getNickname())) {
                    user.setNickname(githubLogin);
                }
                log.info("[GITHUB] 邮箱匹配成功，关联 githubId. userId={}, email={}", user.getUserId(), email);
            }
        }

        if (user == null) {
            // 5. 新用户
            user = createGithubUser(githubId, githubLogin, email, avatarUrl);
            log.info("[GITHUB] 创建新用户. userId={}, githubLogin={}", user.getUserId(), githubLogin);
        }

        // 6. 锁定检查
        if (UserLockedEnum.of(user.getIsLocked()).isLocked()) {
            throw new BizException(BizCodeEnum._PROHIBIT_LOGIN_);
        }

        // 7. 更新登录信息
        user.setLoginCount((user.getLoginCount() == null ? 0 : user.getLoginCount()) + 1);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // 8. 生成 token 写 Redis + Cookie
        String token = tokenComponent.generateLoginToken(user.getUserId());
        String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, token);

        UserInfo userInfo = new UserInfo();
        userInfo.setUserId(user.getUserId());
        userInfo.setEmail(user.getEmail());
        userInfo.setRole(user.getRole());
        userInfo.setToken(token);

        redisComponent.setString(redisKey, JSON.toJSONString(userInfo), TOKEN_EXPIRE_SECONDS);
        cookieManager.writeLoginCookie(response, token);

        return toResp(user);
    }

    /**
     * code -> access_token
     */
    private String exchangeAccessToken(String code) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");

            JSONObject body = new JSONObject();
            body.put("client_id", githubClientId);
            body.put("client_secret", githubClientSecret);
            body.put("code", code);

            HttpEntity<String> entity = new HttpEntity<>(body.toJSONString(), headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    githubTokenUrl, HttpMethod.POST, entity, String.class);

            JSONObject json = JSON.parseObject(resp.getBody());
            String token = json.getString("access_token");
            if (StringUtils.isBlank(token)) {
                log.error("[GITHUB] access_token 为空. response={}", resp.getBody());
                return null;
            }
            return token;
        } catch (Exception e) {
            log.error("[GITHUB] 换取 access_token 失败. error={}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * access_token -> github user info
     */
    private JSONObject fetchGithubUser(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "token " + accessToken);
        headers.set("Accept", "application/json");

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<String> resp = restTemplate.exchange(
                githubUserUrl, HttpMethod.GET, entity, String.class);

        return JSON.parseObject(resp.getBody());
    }

    /**
     * 获取 GitHub 主邮箱（primary + verified）
     */
    private String fetchGithubPrimaryEmail(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "token " + accessToken);
            headers.set("Accept", "application/json");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> resp = restTemplate.exchange(
                    githubUserEmailsUrl, HttpMethod.GET, entity, String.class);

            JSONArray emails = JSON.parseArray(resp.getBody());
            if (emails == null || emails.isEmpty()) return null;

            // 优先 primary+verified
            for (int i = 0; i < emails.size(); i++) {
                JSONObject obj = emails.getJSONObject(i);
                if (Boolean.TRUE.equals(obj.getBoolean("primary"))
                        && Boolean.TRUE.equals(obj.getBoolean("verified"))) {
                    return obj.getString("email");
                }
            }
            // fallback 首个 verified
            for (int i = 0; i < emails.size(); i++) {
                JSONObject obj = emails.getJSONObject(i);
                if (Boolean.TRUE.equals(obj.getBoolean("verified"))) {
                    return obj.getString("email");
                }
            }
            return null;
        } catch (Exception e) {
            log.warn("[GITHUB] 获取 user/emails 失败. error={}", e.getMessage());
            return null;
        }
    }

    /**
     * 创建 GitHub 新用户。username 如与库中重复则加数字后缀。
     */
    private User createGithubUser(String githubId, String githubLogin, String email, String avatarUrl) {
        String username = githubLogin;
        String original = username;
        int suffix = 1;
        // 当前项目 username 不强制唯一，这里仅保证 nickname 在合理范围内不冲突
        // （email 是唯一键，githubId 也会作为唯一维度查库），所以这里不校验 username 冲突

        String businessUserId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        User user = new User();
        user.setUserId(businessUserId);
        user.setEmail(StringUtils.isNotBlank(email) ? email : (githubId + "@github.local"));
        // 占位密码，OAuth 用户不需要密码登录
        user.setPasswordHash("OAUTH_GITHUB");
        user.setNickname(username);
        user.setAvatarUrl(avatarUrl);
        user.setGithubId(githubId);
        user.setRole("user");
        user.setSubscriptionPlan("free");
        user.setIsSubscribed(0);
        user.setLoginCount(0);
        user.setIsLocked(UserLockedEnum.UNLOCKED.getCode());
        user.setIsDeleted(UserDeletedEnum.NOT_DELETED.getCode());
        return userRepository.save(user);
    }

    /**
     * 从当前请求的 Cookie + Redis 手动解析登录态。
     *
     * 适用场景：/send-verification-code 在拦截器白名单中（注册场景不需要登录），
     * 因此 RuntimeContext 中没有 UserInfo。注销场景需要登录态校验，
     * 在这里手动复用 LoginInterceptor 的解析逻辑。
     *
     * @return 当前登录用户信息；未登录或 token 失效返回 null
     */
    private UserInfo resolveCurrentUserFromCookie() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        String loginToken = cookieManager.readLoginToken(request);
        if (StringUtils.isBlank(loginToken)) {
            return null;
        }
        String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, loginToken);
        String userInfoJson = redisComponent.getString(redisKey);
        if (StringUtils.isBlank(userInfoJson)) {
            return null;
        }
        UserInfo userInfo = JSON.parseObject(userInfoJson, UserInfo.class);
        if (userInfo == null) {
            return null;
        }
        userInfo.setToken(loginToken);
        return userInfo;
    }

    /**
     * 发送邮箱验证码
     *
     * 按 scene 分支：
     *  - register       邮箱已存在（未删除）则拒绝发送
     *  - delete_account 必须当前登录用户本人邮箱 + 邮箱必须存在
     *
     * Redis key 约定（加 scene 维度避免不同场景互相覆盖）：
     *   DIAGRAM_VERIFY_EMAIL_RATE_<scene>_<email>  -> "1"   频控标记，60 秒
     *   DIAGRAM_VERIFY_EMAIL_<scene>_<email>       -> code  验证码，10 分钟
     */
    public void sendVerificationCode(SendVerificationCodeReq req) {
        String email = req.getEmail();
        String scene = req.getScene();
        if (StringUtils.isBlank(email)) {
            throw new BizException(BizCodeEnum._REGISTER_PARAMS_INVALID_);
        }

        // 1. 场景化校验
        String subject;
        String tag;
        String htmlBodyTemplate;
        if ("register".equals(scene)) {
            // 注册：同一邮箱不允许重复注册（已存在则拒绝发送）
            if (userRepository.findByEmail(email).isPresent()) {
                throw new BizException(BizCodeEnum._REGISTER_REPEAT_);
            }
            subject = "您的注册验证码";
            tag = "register";
            htmlBodyTemplate = Context.REGISTER_HTML_TEMPLATE;
        } else if ("delete_account".equals(scene)) {
            // 注销：必须当前登录用户本人邮箱 + 邮箱必须存在
            //
            // 注意：/send-verification-code 在拦截器白名单中（注册场景不需要登录），
            // 所以这里 RuntimeContext 没有 UserInfo，需要手动从 Cookie + Redis 解析登录态。
            UserInfo currentUser = resolveCurrentUserFromCookie();
            if (currentUser == null || StringUtils.isBlank(currentUser.getEmail())) {
                throw new BizException(BizCodeEnum._RE_LOGIN_);
            }
            if (!email.equals(currentUser.getEmail())) {
                // 防越权：只能给自己注销账户发验证码
                throw new BizException(BizCodeEnum._PARAMS_INVALID_);
            }
            if (!userRepository.findByEmail(email).isPresent()) {
                throw new BizException(BizCodeEnum._USER_IS_NOT_EXIST_);
            }
            subject = "注销账户验证码";
            tag = "delete_account";
            htmlBodyTemplate = Context.DELETE_ACCOUNT_HTML_TEMPLATE;
        } else {
            throw new BizException(BizCodeEnum._PARAMS_INVALID_);
        }

        // 2. 频控：60 秒内不允许重复发送
        String rateKey = redisComponent.getKeyStr(REDIS_VERIFY_RATE_PREFIX, scene, email);
        if (redisComponent.hasKey(rateKey)) {
            throw new BizException(BizCodeEnum._CAPTCHA_OVER_LIMIT_);
        }

        // 3. 生成 6 位纯数字验证码
        String code = RandomStringUtils.randomNumeric(6);

        // 4. 渲染模板
        String htmlBody = htmlBodyTemplate.replace("{{verification_code}}", code);

        // 5. 调用阿里云邮件推送
        try {
            String messageId = SendEmailUtil.send(email, subject, htmlBody, tag);
            log.info("[VERIFY_EMAIL] scene={}, email={}, messageId={}", scene, email, messageId);
        } catch (Exception e) {
            log.error("[VERIFY_EMAIL] send failed. scene={}, email={}, error={}", scene, email, e.getMessage(), e);
            throw new BizException(BizCodeEnum._SERVER_BUSY_);
        }

        // 6. 写 Redis：验证码 TTL 10 分钟 + 频控标记 60 秒
        String codeKey = redisComponent.getKeyStr(REDIS_VERIFY_CODE_PREFIX, scene, email);
        redisComponent.setString(codeKey, code, VERIFY_CODE_EXPIRE_SECONDS);
        redisComponent.setString(rateKey, "1", VERIFY_RATE_SECONDS);
    }

    /**
     * 用户注册
     */
    @Transactional(rollbackFor = Exception.class)
    public UserResp register(RegisterReq req) {
        if (StringUtils.isBlank(req.getEmail())
                || StringUtils.isBlank(req.getPassword())
                || StringUtils.isBlank(req.getConfirmPassword())
                || StringUtils.isBlank(req.getVerificationCode())) {
            throw new BizException(BizCodeEnum._REGISTER_PARAMS_INVALID_);
        }

        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new BizException(BizCodeEnum._PASSWORD_AGAIN_NOT_SAME_);
        }

        // 1. 邮箱唯一性检查
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BizException(BizCodeEnum._REGISTER_REPEAT_);
        }

        // 2. 校验验证码
        String codeKey = redisComponent.getKeyStr(REDIS_VERIFY_CODE_PREFIX, "register", req.getEmail());
        String storedCode = redisComponent.getString(codeKey);
        if (StringUtils.isBlank(storedCode)) {
            throw new BizException(BizCodeEnum._CAPTCHA_PARAMS_EXPIRED_);
        }
        if (!storedCode.equals(req.getVerificationCode().trim())) {
            throw new BizException(BizCodeEnum._CAPTCHA_CODE_NOT_SAME_);
        }

        // 3. 生成业务主键 & 密码加盐加密
        String businessUserId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String hashedPassword = EncryptedUtil.generate(req.getPassword(), req.getEmail());

        User user = new User();
        user.setUserId(businessUserId);
        user.setEmail(req.getEmail());
        user.setPasswordHash(hashedPassword);
        user.setRole("user");
        user.setSubscriptionPlan("free");
        user.setIsSubscribed(0);
        user.setLoginCount(0);
        user.setIsLocked(UserLockedEnum.UNLOCKED.getCode());
        user.setIsDeleted(UserDeletedEnum.NOT_DELETED.getCode());

        user = userRepository.save(user);

        // 4. 注册成功后销毁验证码，避免重复使用
        redisComponent.del(codeKey);
        redisComponent.del(redisComponent.getKeyStr(REDIS_VERIFY_RATE_PREFIX, "register", req.getEmail()));

        return toResp(user);
    }

    /**
     * 用户登录
     */
    @Transactional(rollbackFor = Exception.class)
    public UserResp login(LoginReq req, HttpServletResponse response) {
        if (StringUtils.isBlank(req.getEmail()) || StringUtils.isBlank(req.getPassword())) {
            throw new BizException(BizCodeEnum._PHONE_OR_PWD_WRONG_);
        }

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new BizException(BizCodeEnum._PHONE_OR_PWD_WRONG_));

        if (!EncryptedUtil.verify(req.getPassword(), user.getPasswordHash(), user.getEmail())) {
            throw new BizException(BizCodeEnum._PHONE_OR_PWD_WRONG_);
        }

        if (UserLockedEnum.of(user.getIsLocked()).isLocked()) {
            throw new BizException(BizCodeEnum._PROHIBIT_LOGIN_);
        }

        user.setLoginCount((user.getLoginCount() == null ? 0 : user.getLoginCount()) + 1);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = tokenComponent.generateLoginToken(user.getUserId());
        String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, token);

        UserInfo userInfo = new UserInfo();
        userInfo.setUserId(user.getUserId());
        userInfo.setEmail(user.getEmail());
        userInfo.setRole(user.getRole());
        userInfo.setToken(token);

        redisComponent.setString(redisKey, JSON.toJSONString(userInfo), TOKEN_EXPIRE_SECONDS);
        cookieManager.writeLoginCookie(response, token);

        return toResp(user);
    }

    /**
     * 退出登录
     *
     * /logout 接口已放开 LoginInterceptor（避免未登录用户残留 cookie 调用时触发 1002），
     * 因此 RuntimeContext 不会被拦截器设置，getUserInfoNotCheckLogin() 返回 null。
     * 必须自行从 cookie 读 token + 删 Redis + 清 Cookie，否则刷新页面会自动登录。
     */
    public void logout() {
        HttpServletRequest request = getCurrentRequest();
        HttpServletResponse response = getCurrentResponse();
        if (request == null) {
            return;
        }
        // 1. 从 cookie 读 token
        String loginToken = cookieManager.readLoginToken(request);
        if (StringUtils.isNotBlank(loginToken)) {
            // 2. 删 Redis 中的 token 记录
            String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, loginToken);
            redisComponent.del(redisKey);
        }
        // 3. 清除浏览器 Cookie：maxAge=0 立即失效
        if (response != null) {
            cookieManager.clearLoginCookie(response);
        }
    }

    /**
     * 获取当前登录用户（必须已登录，否则抛 RE_LOGIN）
     */
    public UserResp getCurrentUser() {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        return userRepository.findByUserId(userInfo.getUserId())
                .map(this::toResp)
                .orElseThrow(() -> new BizException(BizCodeEnum._USER_IS_NOT_EXIST_));
    }

    /**
     * 获取当前登录用户，未登录或登录过期返回 null。
     *
     * 配套 /me 接口放开登录拦截后的安全降级：
     * 应用启动探测登录态时调用，未登录返回 null，避免触发 1002 全局弹窗。
     */
    public UserResp getCurrentUserIfPresent() {
        // /me 接口已放开 LoginInterceptor，RuntimeContext 不会被拦截器设置，
        // 必须自行从 cookie 读 token + 查 Redis 恢复用户身份（逻辑同 LoginInterceptor.preHandle）。
        // 否则刷新页面调用 /me 时上下文为空，永远返回 null，导致登录态丢失。
        HttpServletRequest request = getCurrentRequest();
        if (request == null) {
            return null;
        }
        String loginToken = cookieManager.readLoginToken(request);
        if (StringUtils.isBlank(loginToken)) {
            return null;
        }
        String redisKey = redisComponent.getKeyStr(REDIS_TOKEN_PREFIX, loginToken);
        String userInfoString = redisComponent.getString(redisKey);
        if (StringUtils.isBlank(userInfoString)) {
            return null;
        }
        UserInfo userInfo = JSON.parseObject(userInfoString, UserInfo.class);
        if (userInfo == null || StringUtils.isBlank(userInfo.getUserId())) {
            return null;
        }
        return userRepository.findByUserId(userInfo.getUserId())
                .map(this::toResp)
                .orElse(null);
    }

    /**
     * 获取当前 HTTP 请求（/me 放开拦截器后，需通过 RequestContextHolder 取 request 读 cookie）。
     * 在无请求上下文的场景（如异步线程）返回 null。
     */
    private HttpServletRequest getCurrentRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest() : null;
        } catch (IllegalStateException e) {
            return null;
        }
    }

    /**
     * 获取当前 HTTP 响应（用于 logout 时清除 cookie）。
     * 在无请求上下文的场景返回 null。
     */
    private HttpServletResponse getCurrentResponse() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getResponse() : null;
        } catch (IllegalStateException e) {
            return null;
        }
    }

    private UserResp toResp(User user) {
        return new UserResp(
                user.getUserId(),
                MaskingUtils.maskEmail(user.getEmail()),
                user.getRole(),
                user.getSubscriptionPlan(),
                user.getIsSubscribed() != null && user.getIsSubscribed() == 1
        );
    }
}
