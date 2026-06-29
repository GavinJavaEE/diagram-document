package com.drawing.diagramai.common.util;

import org.apache.commons.codec.binary.Hex;

import java.security.MessageDigest;
import java.util.Random;

/**
 * 密码加盐加密
 *
 * @author Json
 * @date 2019-08-04
 */
public class EncryptedUtil {

    /**
     * 加盐字符串，长度必须为16位。
     */
    private final static String salt = "TaddGGDSJDBabushkas=";

    private final static char[] charArray = {'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'};

    /**
     * 生成含有加盐的密码
     */
    public static String generate(String password) {
        return generate(password, null);
    }

    /**
     * MD5 32位小写加密
     *
     * @param content
     * @return
     */
    public static String encryptMD5(String content) {
        return md5Hex(content);
    }

    /**
     * 生成含有加盐的密码
     */
    public static String generate(String password, String userName) {
        String salt = getSalt(userName);
        password = md5Hex(password + salt);
        char[] cs1 = password.toCharArray();
        char[] cs2 = salt.toCharArray();
        char[] cs = new char[48];
        for (int i = 0; i < 48; i += 3) {
            cs[i] = cs1[i / 3 * 2];
            cs[i + 1] = cs2[i / 3];
            cs[i + 2] = cs1[i / 3 * 2 + 1];
        }
        return new String(cs).toUpperCase();
    }

    private static String getSalt(String salt) {
        if (salt == null || salt.length() == 0) {
            return EncryptedUtil.salt;
        }
        if (salt.length() <= 16) {
            return getStringLen8(salt) + EncryptedUtil.salt.substring(7, 15);
        } else {
            return salt.substring(4, 12) + EncryptedUtil.salt.substring(2, 10);
        }
    }

    public static String getStringLen8(String salt) {
        if (salt.length() == 8) {
            return salt;
        }
        if (salt.length() > 8) {
            return salt.substring(1, 9);
        } else {
            return getStringLen8(salt + salt);
        }
    }

    /**
     * 校验密码是否正确
     */
    public static boolean verify(String password, String md5) {
        char[] cs = md5.toLowerCase().toCharArray();
        char[] cs1 = new char[32];
        char[] cs2 = new char[16];
        for (int i = 0; i < 48; i += 3) {
            cs1[i / 3 * 2] = cs[i];
            cs1[i / 3 * 2 + 1] = cs[i + 2];
            cs2[i / 3] = cs[i + 1];
        }
        String salt = new String(cs2);
        return md5Hex(password + salt).equals(new String(cs1));
    }

    /**
     * 校验密码是否正确
     * @param password
     * @param md5
     * @param salt
     * @return
     */
    public static boolean verify(String password, String md5, String salt) {
        return generate(password, salt).equals(md5);
    }

    /**
     * 获取十六进制字符串形式的MD5摘要
     */
    private static String md5Hex(String src) {
        try {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            byte[] bs = md5.digest(src.getBytes());
            return new String(new Hex().encode(bs));
        } catch (Exception e) {
            return null;
        }
    }

    public static String getRandomChar(){
        Random rand = new Random();
        int randomNum = rand.nextInt(26) + 1; // 生成1到26之间的随机数
        return String.valueOf(charArray[randomNum]);
    }
}
