package com.drawing.diagramai.service;

import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.component.DoubaoClient;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.entity.AiRecord;
import com.drawing.diagramai.entity.AiUsage;
import com.drawing.diagramai.entity.User;
import com.drawing.diagramai.enums.ChartTypeEnum;
import com.drawing.diagramai.repository.AiRecordRepository;
import com.drawing.diagramai.repository.AiUsageRepository;
import com.drawing.diagramai.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class AiService {

    @Resource
    private AiRecordRepository aiRecordRepository;

    @Resource
    private AiUsageRepository aiUsageRepository;

    @Resource
    private UserRepository userRepository;

    @Resource
    private DoubaoClient doubaoClient;

    @Transactional(rollbackFor = Exception.class)
    public AiGenerateResp generate(AiGenerateReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        String chartType = req.getChartType();
        boolean autoDetect = StringUtils.isBlank(chartType);
        
        if (autoDetect) {
            chartType = ChartTypeEnum.FLOWCHART.getCode();
        } else {
            chartType = normalizeChartType(chartType);
        }

        DoubaoClient.AiResult aiResult = doubaoClient.generateMermaid(req.getDescription(), chartType, autoDetect);

        AiRecord record = new AiRecord();
        record.setRecordId("ai_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        record.setUserId(userId);
        record.setType("generate");
        record.setChartType(chartType);
        record.setPrompt(req.getDescription());
        record.setResultCode(aiResult.getMermaidCode());
        record.setPromptTokens(aiResult.getPromptTokens());
        record.setCompletionTokens(aiResult.getCompletionTokens());
        record.setTotalTokens(aiResult.getTotalTokens());
        record.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        record.setProvider(aiResult.getProvider());
        record.setIsSuccess(StringUtils.isNotBlank(aiResult.getMermaidCode()) ? 1 : 0);
        aiRecordRepository.save(record);

        updateUsage(userId, "generate", aiResult.getTotalTokens());

        AiGenerateResp resp = new AiGenerateResp();
        resp.setRecordId(record.getRecordId());
        resp.setMermaidCode(aiResult.getMermaidCode());
        resp.setChartType(chartType);
        resp.setPromptTokens(aiResult.getPromptTokens());
        resp.setCompletionTokens(aiResult.getCompletionTokens());
        resp.setTotalTokens(aiResult.getTotalTokens());
        resp.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        return resp;
    }

    @Transactional(rollbackFor = Exception.class)
    public AiFixResp fix(AiFixReq req) {        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        DoubaoClient.AiResult aiResult = doubaoClient.fixMermaid(req.getMermaidCode(), req.getErrorMessage());

        AiRecord record = new AiRecord();
        record.setRecordId("ai_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        record.setUserId(userId);
        record.setType("fix");
        record.setChartType("flowchart");
        record.setPrompt(req.getErrorMessage() != null ? req.getErrorMessage() : "fix mermaid");
        record.setErrorMessage(req.getErrorMessage());
        record.setResultCode(aiResult.getMermaidCode());
        record.setPromptTokens(aiResult.getPromptTokens());
        record.setCompletionTokens(aiResult.getCompletionTokens());
        record.setTotalTokens(aiResult.getTotalTokens());
        record.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        record.setProvider(aiResult.getProvider());
        record.setIsSuccess(StringUtils.isNotBlank(aiResult.getMermaidCode()) ? 1 : 0);
        aiRecordRepository.save(record);

        updateUsage(userId, "fix", aiResult.getTotalTokens());

        AiFixResp resp = new AiFixResp();
        resp.setRecordId(record.getRecordId());
        resp.setOriginalCode(req.getMermaidCode());
        resp.setFixedCode(aiResult.getMermaidCode());
        resp.setFixSummary(new ArrayList<>());
        resp.setPromptTokens(aiResult.getPromptTokens());
        resp.setCompletionTokens(aiResult.getCompletionTokens());
        resp.setTotalTokens(aiResult.getTotalTokens());
        resp.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        return resp;
    }

    @Transactional(rollbackFor = Exception.class)
    public AiUpdateResp update(AiUpdateReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        DoubaoClient.ChatAiResult aiResult = doubaoClient.chatUpdateMermaid(
                req.getMermaidCode(), req.getHistory(), req.getMessage(), req.getErrorMessage());

        AiRecord record = new AiRecord();
        record.setRecordId("ai_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        record.setUserId(userId);
        record.setType("update");
        record.setChartType("flowchart");
        record.setPrompt(req.getMessage());
        record.setErrorMessage(req.getErrorMessage());
        record.setResultCode(aiResult.getMermaidCode());
        record.setPromptTokens(aiResult.getPromptTokens());
        record.setCompletionTokens(aiResult.getCompletionTokens());
        record.setTotalTokens(aiResult.getTotalTokens());
        record.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        record.setProvider(aiResult.getProvider());
        record.setIsSuccess(StringUtils.isNotBlank(aiResult.getMermaidCode()) ? 1 : 0);
        aiRecordRepository.save(record);

        updateUsage(userId, "update", aiResult.getTotalTokens());

        AiUpdateResp resp = new AiUpdateResp();
        resp.setRecordId(record.getRecordId());
        resp.setReply(aiResult.getReply());
        resp.setMermaidCode(aiResult.getMermaidCode());
        resp.setUpdated(aiResult.isUpdated());
        resp.setPromptTokens(aiResult.getPromptTokens());
        resp.setCompletionTokens(aiResult.getCompletionTokens());
        resp.setTotalTokens(aiResult.getTotalTokens());
        resp.setProcessingTimeMs(aiResult.getProcessingTimeMs());
        return resp;
    }

    public PageResp<AiRecordResp> getHistory(int page, int pageSize, String type) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AiRecord> recordPage;

        if (StringUtils.isNotBlank(type)) {
            recordPage = aiRecordRepository.findByUserIdAndType(userId, type, pageable);
        } else {
            recordPage = aiRecordRepository.findByUserId(userId, pageable);
        }

        Page<AiRecordResp> respPage = recordPage.map(this::toRecordResp);
        return PageResp.from(respPage);
    }

    public List<AiUsageResp> getUsage() {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        User user = userRepository.findByUserId(userId).orElse(null);
        boolean isPro = user != null && user.getIsSubscribed() != null && user.getIsSubscribed() == 1;

        List<AiUsageResp> result = new ArrayList<>();

        LocalDateTime periodStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        String period = LocalDate.now().toString();

        for (String type : new String[]{"generate", "fix", "update"}) {
            int dailyLimit = isPro ? Integer.MAX_VALUE : ("generate".equals(type) ? 5 : ("fix".equals(type) ? 10 : 20));

            AiUsage usage = aiUsageRepository.findByUserIdAndTypeAndPeriodStart(userId, type, periodStart).orElse(null);
            int used = usage != null ? usage.getUsedCount() : 0;

            AiUsageResp resp = new AiUsageResp();
            resp.setType(type);
            resp.setUsedCount(used);
            resp.setLimitCount(dailyLimit);
            resp.setRemainingCount(Math.max(0, dailyLimit - used));
            resp.setPeriod(period);
            result.add(resp);
        }

        return result;
    }

    /**
     * 查询最近 N 天每日 token 使用量，用于个人中心折线图。
     *
     * 实现要点：
     * - 仅查询有 AI 记录的日期聚合（findDailyTokenStats），再在 service 层补全
     *   区间内无记录的日期为 0，保证横轴连续无断点，前端折线图渲染稳定。
     * - days 上限 90，避免一次性聚合过大区间；下限 1。
     * - 按日期升序返回，前端可直接按序绘制。
     *
     * @param days 统计天数（含今天），默认 30
     */
    public List<AiTokenStatResp> getTokenStats(int days) {
        if (days < 1) {
            days = 1;
        }
        if (days > 90) {
            days = 90;
        }

        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(days - 1L);
        LocalDateTime startDateTime = LocalDateTime.of(startDate, LocalTime.MIN);

        List<Object[]> rows = aiRecordRepository.findDailyTokenStats(userId, startDateTime);

        // 有记录的日期 -> 聚合数据，用 LinkedHashMap 保持查询顺序
        Map<LocalDate, Object[]> dataMap = new LinkedHashMap<>();
        for (Object[] row : rows) {
            // FUNCTION('DATE', ...) 在 Hibernate 通常映射为 java.sql.Date，用 toString 兼容
            LocalDate day = LocalDate.parse(row[0].toString());
            dataMap.put(day, row);
        }

        // 补全区间内每一天，无记录补 0
        List<AiTokenStatResp> result = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate day = startDate.plusDays(i);
            Object[] row = dataMap.get(day);
            long totalTokens = row != null ? ((Number) row[1]).longValue() : 0L;
            long callCount = row != null ? ((Number) row[2]).longValue() : 0L;
            long promptTokens = row != null ? ((Number) row[3]).longValue() : 0L;
            long completionTokens = row != null ? ((Number) row[4]).longValue() : 0L;
            result.add(new AiTokenStatResp(day.toString(), totalTokens, callCount, promptTokens, completionTokens));
        }
        return result;
    }

    private void updateUsage(String userId, String type, int tokens) {
        LocalDateTime periodStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime periodEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        AiUsage usage = aiUsageRepository.findByUserIdAndTypeAndPeriodStart(userId, type, periodStart).orElse(null);

        if (usage == null) {
            usage = new AiUsage();
            usage.setUserId(userId);
            usage.setType(type);
            usage.setPeriodStart(periodStart);
            usage.setPeriodEnd(periodEnd);
            usage.setUsedCount(1);
            usage.setLimitCount(type.equals("generate") ? 5 : (type.equals("fix") ? 10 : 20));
            usage.setTotalTokens(tokens);
        } else {
            usage.setUsedCount(usage.getUsedCount() + 1);
            usage.setTotalTokens(usage.getTotalTokens() + tokens);
        }
        aiUsageRepository.save(usage);
    }

    private String normalizeChartType(String chartType) {
        if (StringUtils.isBlank(chartType)) {
            return ChartTypeEnum.FLOWCHART.getCode();
        }
        ChartTypeEnum type = ChartTypeEnum.of(chartType);
        return type != null ? type.getCode() : ChartTypeEnum.FLOWCHART.getCode();
    }

    private AiRecordResp toRecordResp(AiRecord record) {
        AiRecordResp resp = new AiRecordResp();
        resp.setRecordId(record.getRecordId());
        resp.setType(record.getType());
        resp.setChartType(record.getChartType());
        resp.setPrompt(record.getPrompt());
        resp.setResultCode(record.getResultCode());
        resp.setPromptTokens(record.getPromptTokens());
        resp.setCompletionTokens(record.getCompletionTokens());
        resp.setTotalTokens(record.getTotalTokens());
        resp.setProcessingTimeMs(record.getProcessingTimeMs());
        resp.setProvider(record.getProvider());
        resp.setIsSuccess(record.getIsSuccess());
        resp.setCreatedAt(record.getCreatedAt());
        return resp;
    }
}
