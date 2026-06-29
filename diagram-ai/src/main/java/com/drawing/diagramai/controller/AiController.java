package com.drawing.diagramai.controller;

import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.inter.RateLimit;
import com.drawing.diagramai.service.AiService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    @Resource
    private AiService aiService;

    @PostMapping("/generate")
    @RateLimit(type = RateLimit.RateLimitType.AI_QUOTA_DAILY, aiQuotaType = RateLimit.AiQuotaType.GENERATE)
    public ResponseVo<AiGenerateResp> generate(@Valid @RequestBody AiGenerateReq req) {
        return ResponseUtil.whenSuccessWhiteData(aiService.generate(req));
    }

    @PostMapping("/fix")
    @RateLimit(type = RateLimit.RateLimitType.AI_QUOTA_DAILY, aiQuotaType = RateLimit.AiQuotaType.FIX)
    public ResponseVo<AiFixResp> fix(@Valid @RequestBody AiFixReq req) {
        return ResponseUtil.whenSuccessWhiteData(aiService.fix(req));
    }

    @PostMapping("/update")
    @RateLimit(type = RateLimit.RateLimitType.AI_QUOTA_DAILY, aiQuotaType = RateLimit.AiQuotaType.UPDATE)
    public ResponseVo<AiUpdateResp> update(@Valid @RequestBody AiUpdateReq req) {
        return ResponseUtil.whenSuccessWhiteData(aiService.update(req));
    }

    @GetMapping("/history")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<PageResp<AiRecordResp>> getHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String type) {
        return ResponseUtil.whenSuccessWhiteData(aiService.getHistory(page, pageSize, type));
    }

    @GetMapping("/usage")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<List<AiUsageResp>> getUsage() {
        return ResponseUtil.whenSuccessWhiteData(aiService.getUsage());
    }

    /**
     * 每日 Token 使用量统计（个人中心折线图）。
     *
     * @param days 统计天数（含今天），默认 30，范围 [1, 90]
     */
    @GetMapping("/token-stats")
    @RateLimit(limit = 100, period = 1, timeUnit = TimeUnit.MINUTES, type = RateLimit.RateLimitType.USER)
    public ResponseVo<List<AiTokenStatResp>> getTokenStats(@RequestParam(defaultValue = "30") int days) {
        return ResponseUtil.whenSuccessWhiteData(aiService.getTokenStats(days));
    }
}
