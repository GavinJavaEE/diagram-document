package com.drawing.diagramai.controller;

import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.inter.RateLimit;
import com.drawing.diagramai.service.TemplateService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/templates")
public class TemplateController {

    @Resource
    private TemplateService templateService;

    @GetMapping("/categories")
    public ResponseVo<List<TemplateCategoryResp>> getCategories() {
        return ResponseUtil.whenSuccessWhiteData(templateService.getCategories());
    }

    @GetMapping
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.IP)
    public ResponseVo<PageResp<TemplateResp>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String category) {
        return ResponseUtil.whenSuccessWhiteData(templateService.list(page, pageSize, category));
    }

    @GetMapping("/{id}")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.IP)
    public ResponseVo<TemplateResp> getById(@PathVariable("id") String templateId) {
        return ResponseUtil.whenSuccessWhiteData(templateService.getById(templateId));
    }

    @PostMapping("/{id}/use")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> useTemplate(@PathVariable("id") String templateId) {
        return ResponseUtil.whenSuccessWhiteData(templateService.useTemplate(templateId));
    }

    @PostMapping("/from-document/{documentId}")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<TemplateResp> saveAsTemplate(@PathVariable("documentId") String documentId) {
        return ResponseUtil.whenSuccessWhiteData(templateService.saveAsTemplate(documentId));
    }
}
