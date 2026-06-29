package com.drawing.diagramai.inter;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.concurrent.TimeUnit;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    int limit() default 100;

    int period() default 60;

    TimeUnit timeUnit() default TimeUnit.SECONDS;

    String message() default "请求过于频繁，请稍后再试";

    RateLimitType type() default RateLimitType.USER;

    enum RateLimitType {
        IP,
        USER,
        IP_AND_USER,
        AI_QUOTA_DAILY,
        CUSTOM
    }

    String customKey() default "";

    AiQuotaType aiQuotaType() default AiQuotaType.GENERATE;

    enum AiQuotaType {
        GENERATE,
        FIX,
        UPDATE
    }
}
