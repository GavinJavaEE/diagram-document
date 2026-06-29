package com.drawing.diagramai.inter;

import com.alibaba.fastjson.JSON;
import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.component.RedisComponent;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.entity.User;
import com.drawing.diagramai.enums.BizCodeEnum;
import com.drawing.diagramai.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final String RATE_LIMIT_PREFIX = "rate_limit:";

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private RedisComponent redisComponent;

    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        if ("OPTIONS".equals(request.getMethod())) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RateLimit rateLimit = handlerMethod.getMethodAnnotation(RateLimit.class);

        if (rateLimit == null) {
            return true;
        }

        String key = buildKey(request, rateLimit);

        long periodSeconds = rateLimit.timeUnit().toSeconds(rateLimit.period());
        int limit = rateLimit.limit();

        if (rateLimit.type() == RateLimit.RateLimitType.AI_QUOTA_DAILY) {
            return checkAiQuota(request, response, rateLimit);
        }

        boolean allowed = checkRateLimit(key, limit, periodSeconds);

        long remaining = getRemaining(key, limit);
        long resetTime = System.currentTimeMillis() / 1000 + periodSeconds;

        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, remaining - 1)));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetTime));

        if (!allowed) {
            log.warn("触发限流: key={}, limit={}, period={}s", key, limit, periodSeconds);
            response.setHeader("Retry-After", String.valueOf(periodSeconds));
            response.setStatus(429);
            sendErrorResponse(response, rateLimit.message(), periodSeconds);
            return false;
        }

        return true;
    }

    private boolean checkAiQuota(HttpServletRequest request, HttpServletResponse response, RateLimit rateLimit) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        if (userInfo == null || userInfo.getUserId() == null) {
            return true;
        }

        User user = userRepository.findByUserId(userInfo.getUserId()).orElse(null);
        if (user == null) {
            return true;
        }

        boolean isPro = user.getIsSubscribed() != null && user.getIsSubscribed() == 1;
        if (isPro) {
            return true;
        }

        String dateKey = LocalDate.now().toString();
        String aiType;
        int dailyLimit;
        switch (rateLimit.aiQuotaType()) {
            case FIX:
                aiType = "fix";
                dailyLimit = 20;
                break;
            case UPDATE:
                aiType = "update";
                dailyLimit = 20;
                break;
            case GENERATE:
            default:
                aiType = "generate";
                dailyLimit = 10;
                break;
        }
        String key = RATE_LIMIT_PREFIX + "ai:" + aiType + ":" + user.getUserId() + ":" + dateKey;

        long periodSeconds = TimeUnit.DAYS.toSeconds(1);
        boolean allowed = checkRateLimit(key, dailyLimit, periodSeconds);

        long remaining = getRemaining(key, dailyLimit);
        long resetTime = LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0)
                .atZone(ZoneId.systemDefault()).toEpochSecond();

        response.setHeader("X-RateLimit-Limit", String.valueOf(dailyLimit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, remaining - 1)));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetTime));

        if (!allowed) {
            log.warn("AI配额超限: userId={}, type={}, limit={}/day", user.getUserId(), aiType, dailyLimit);
            response.setHeader("Retry-After", String.valueOf(TimeUnit.HOURS.toSeconds(1)));
            response.setStatus(429);
            try {
                sendErrorResponse(response, "今日AI使用次数已达上限，请升级Pro版或明日再试", TimeUnit.HOURS.toSeconds(1));
            } catch (java.io.IOException e) {
                log.error("发送限流响应失败", e);
            }
            return false;
        }

        return true;
    }

    private String buildKey(HttpServletRequest request, RateLimit rateLimit) {
        String clientIp = getClientIp(request);
        String userId = null;
        try {
            UserInfo userInfo = RuntimeContextHelper.getUserInfo();
            if (userInfo != null) {
                userId = userInfo.getUserId();
            }
        } catch (Exception e) {
        }

        switch (rateLimit.type()) {
            case IP:
                return RATE_LIMIT_PREFIX + "ip:" + clientIp + ":" + request.getRequestURI();
            case USER:
                if (userId == null) {
                    return RATE_LIMIT_PREFIX + "ip:" + clientIp + ":" + request.getRequestURI();
                }
                return RATE_LIMIT_PREFIX + "user:" + userId + ":" + request.getRequestURI();
            case IP_AND_USER:
                if (userId != null) {
                    return RATE_LIMIT_PREFIX + "user:" + userId + ":" + request.getRequestURI();
                }
                return RATE_LIMIT_PREFIX + "ip:" + clientIp + ":" + request.getRequestURI();
            case CUSTOM:
                return RATE_LIMIT_PREFIX + "custom:" + rateLimit.customKey() + ":" +
                        (userId != null ? userId : clientIp);
            default:
                return RATE_LIMIT_PREFIX + "ip:" + clientIp + ":" + request.getRequestURI();
        }
    }

    private boolean checkRateLimit(String key, int limit, long periodSeconds) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, periodSeconds, TimeUnit.SECONDS);
        } else {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            if (ttl <= 0) {
                redisTemplate.expire(key, periodSeconds, TimeUnit.SECONDS);
            }
        }
        return count == null || count <= limit;
    }

    private long getRemaining(String key, int limit) {
        String current = redisTemplate.opsForValue().get(key);
        if (current == null) {
            return limit;
        }
        try {
            long used = Long.parseLong(current);
            return Math.max(0, limit - used + 1);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private void sendErrorResponse(HttpServletResponse response, String message, long retryAfterSeconds) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        PrintWriter pw = response.getWriter();
        pw.write(JSON.toJSONString(ResponseUtil.whiteoutData(BizCodeEnum._OVER_FREQUENCY_)));
        pw.flush();
    }
}
