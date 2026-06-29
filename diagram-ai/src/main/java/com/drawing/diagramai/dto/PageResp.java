package com.drawing.diagramai.dto;

import lombok.Data;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
public class PageResp<T> {
    private List<T> items;
    private long total;
    private int page;
    private int pageSize;
    private int totalPages;

    public static <T> PageResp<T> from(Page<T> page) {
        PageResp<T> resp = new PageResp<>();
        resp.setItems(page.getContent());
        resp.setTotal(page.getTotalElements());
        resp.setPage(page.getNumber() + 1);
        resp.setPageSize(page.getSize());
        resp.setTotalPages(page.getTotalPages());
        return resp;
    }
}
