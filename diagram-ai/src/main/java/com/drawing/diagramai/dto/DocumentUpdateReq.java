package com.drawing.diagramai.dto;

import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.constraints.NotBlank;

@Data
public class DocumentUpdateReq {

    @NotBlank(message = "标题不能为空")
    @Length(max = 200, message = "标题不能超过200字符")
    private String title;

    private String content;

    @Length(max = 500, message = "描述不能超过500字符")
    private String description;

    private String chartType;

    private String tags;
}
