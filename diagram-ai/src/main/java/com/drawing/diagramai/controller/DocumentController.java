package com.drawing.diagramai.controller;

import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.inter.RateLimit;
import com.drawing.diagramai.service.DocumentService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    @Resource
    private DocumentService documentService;

    @PostMapping
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> create(@Valid @RequestBody DocumentCreateReq req) {
        return ResponseUtil.whenSuccessWhiteData(documentService.create(req));
    }

    @GetMapping
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<PageResp<DocumentResp>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String chartType,
            @RequestParam(required = false) List<String> chartTypes) {
        // chartTypes 优先：多值查询（用于「我的图表」页面拉取多种 Mermaid 类型）
        if (chartTypes != null && !chartTypes.isEmpty()) {
            return ResponseUtil.whenSuccessWhiteData(documentService.list(page, pageSize, chartTypes));
        }
        return ResponseUtil.whenSuccessWhiteData(documentService.list(page, pageSize, chartType));
    }

    /**
     * 文档名唯一性校验：保存前由前端调用，校验当前用户 + chartType 范围内是否重名。
     */
    @GetMapping("/check-title")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentTitleCheckResp> checkTitle(
            @RequestParam("title") String title,
            @RequestParam(value = "chartType", required = false, defaultValue = "markdown") String chartType,
            @RequestParam(value = "excludeDocumentId", required = false) String excludeDocumentId) {
        return ResponseUtil.whenSuccessWhiteData(
                documentService.checkTitleDuplicate(title, chartType, excludeDocumentId));
    }

    @GetMapping("/{id}")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> getById(@PathVariable("id") String documentId) {
        return ResponseUtil.whenSuccessWhiteData(documentService.getById(documentId));
    }

    @PutMapping("/{id}")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> update(
            @PathVariable("id") String documentId,
            @Valid @RequestBody DocumentUpdateReq req) {
        return ResponseUtil.whenSuccessWhiteData(documentService.update(documentId, req));
    }

    @DeleteMapping("/{id}")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<Void> delete(@PathVariable("id") String documentId) {
        documentService.delete(documentId);
        return ResponseUtil.whenSuccessWhiteData(null);
    }

    @GetMapping("/{id}/versions")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<List<DocumentVersionResp>> getVersions(
            @PathVariable("id") String documentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseUtil.whenSuccessWhiteData(documentService.getVersions(documentId, page, pageSize));
    }

    @PostMapping("/{id}/versions/{version}/restore")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> restoreVersion(
            @PathVariable("id") String documentId,
            @PathVariable("version") int version) {
        return ResponseUtil.whenSuccessWhiteData(documentService.restoreVersion(documentId, version));
    }

    @PatchMapping("/{id}/public")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<DocumentResp> setPublic(
            @PathVariable("id") String documentId,
            @RequestParam(defaultValue = "true") boolean isPublic) {
        return ResponseUtil.whenSuccessWhiteData(documentService.setPublic(documentId, isPublic));
    }

    @GetMapping("/public/{shareToken}")
    public ResponseVo<DocumentResp> getByShareToken(@PathVariable("shareToken") String shareToken) {
        return ResponseUtil.whenSuccessWhiteData(documentService.getByShareToken(shareToken));
    }
}
