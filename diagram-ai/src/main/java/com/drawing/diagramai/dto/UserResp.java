package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 当前登录用户信息
 */
@Data
@AllArgsConstructor
public class UserResp {

    private String userId;

    private String email;

    private String role;

    private String subscriptionPlan;

    private Boolean subscribed;
}
