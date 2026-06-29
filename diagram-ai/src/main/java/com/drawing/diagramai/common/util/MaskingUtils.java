package com.drawing.diagramai.common.util;

import java.util.regex.Pattern;

/**
 * 脱敏工具类
 * 用于敏感信息的脱敏处理
 */
public class MaskingUtils {

    private static final Pattern API_KEY_PATTERN = Pattern.compile("sk-[a-zA-Z0-9-]+");

    /**
     * 脱敏 API Key（只保留前后 4 位）
     *
     * @param apiKey 原始 API Key
     * @return 脱敏后的 API Key
     */
    public static String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() <= 8) {
            return "******";
        }
        return apiKey.substring(0, 4) + "****" + apiKey.substring(apiKey.length() - 4);
    }

    /**
     * 脱敏日志
     *
     * @param message 原始消息
     * @return 脱敏后的消息
     */
    public static String maskLog(String message) {
        if (message == null) {
            return null;
        }
        // 替换 sk-... 格式的 Key
        return API_KEY_PATTERN.matcher(message).replaceAll("sk-******");
    }

    /**
     * 脱敏手机号（中间 4 位）
     *
     * @param phone 手机号
     * @return 脱敏后的手机号
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() != 11) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }

    /**
     * 脱敏邮箱（@ 前面只保留前 2 位）
     *
     * @param email 邮箱
     * @return 脱敏后的邮箱
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        int index = email.indexOf("@");
        String prefix = email.substring(0, index);
        String suffix = email.substring(index);
        if (prefix.length() <= 2) {
            return "**" + suffix;
        }
        return prefix.substring(0, 2) + "**" + suffix;
    }
}
