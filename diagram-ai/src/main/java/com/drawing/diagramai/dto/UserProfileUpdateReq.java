package com.drawing.diagramai.dto;

import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
public class UserProfileUpdateReq {

    @Length(max = 100, message = "昵称不能超过100字符")
    private String nickname;

    @Length(max = 500, message = "头像URL不能超过500字符")
    private String avatarUrl;

    @Length(max = 20, message = "电话不能超过20字符")
    private String phone;

    @Length(max = 100, message = "位置信息不能超过100字符")
    private String location;
}
