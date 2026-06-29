package com.drawing.diagramai.common.model;

import lombok.Data;

import java.io.Serializable;

/**
 * 响应体
 *
 * @author Json.Zheng
 * 创建时间 2018/10/13
 */
@Data
public class ResponseVo<T> implements Serializable {

    private static final long serialVersionUID = 272443008110037498L;

    private String code;

    private String msg;

    private T data;
}

