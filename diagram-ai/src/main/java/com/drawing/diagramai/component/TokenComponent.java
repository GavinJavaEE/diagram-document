package com.drawing.diagramai.component;

import com.drawing.diagramai.common.util.DateTimeUtil;
import com.drawing.diagramai.common.util.EncryptedUtil;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Date;

@Component
public class TokenComponent {

    /**
     * 生成登录token
     *
     * @param userId 用户号
     * @return
     */
    public String generateLoginToken(String userId) {
        // 生成日期
        String dateString = DateTimeUtil.dateConvertDefaultString(new Date());
        // base64
        String userIdEncode = Base64.getEncoder().encodeToString((userId + dateString).getBytes());
        // 加密
        return EncryptedUtil.encryptMD5(userIdEncode);
    }
}
