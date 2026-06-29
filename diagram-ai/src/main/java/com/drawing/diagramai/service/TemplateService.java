package com.drawing.diagramai.service;

import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.entity.Document;
import com.drawing.diagramai.entity.Template;
import com.drawing.diagramai.entity.TemplateCategory;
import com.drawing.diagramai.enums.BizCodeEnum;
import com.drawing.diagramai.repository.DocumentRepository;
import com.drawing.diagramai.repository.TemplateCategoryRepository;
import com.drawing.diagramai.repository.TemplateRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class TemplateService {

    @Resource
    private TemplateRepository templateRepository;

    @Resource
    private TemplateCategoryRepository templateCategoryRepository;

    @Resource
    private DocumentRepository documentRepository;

    public List<TemplateCategoryResp> getCategories() {
        List<TemplateCategory> categories = templateCategoryRepository.findAll(
                Sort.by(Sort.Direction.ASC, "sortOrder", "createdAt")
        );
        return categories.stream().map(this::toCategoryResp).collect(Collectors.toList());
    }

    public PageResp<TemplateResp> list(int page, int pageSize, String category) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "useCount", "createdAt"));
        Page<Template> templatePage;

        if (StringUtils.isNotBlank(category)) {
            templatePage = templateRepository.findByCategory(category, pageable);
        } else {
            templatePage = templateRepository.findAll(pageable);
        }

        Page<TemplateResp> respPage = templatePage.map(this::toResp);
        return PageResp.from(respPage);
    }

    public TemplateResp getById(String templateId) {
        Template template = templateRepository.findByTemplateId(templateId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));
        return toResp(template);
    }

    @Transactional(rollbackFor = Exception.class)
    public DocumentResp useTemplate(String templateId) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Template template = templateRepository.findByTemplateId(templateId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        template.setUseCount(template.getUseCount() != null ? template.getUseCount() + 1 : 1);
        templateRepository.save(template);

        Document document = new Document();
        document.setDocumentId("doc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        document.setUserId(userId);
        document.setTitle(template.getTitle() + " (副本)");
        document.setContent(template.getContent());
        document.setDescription(template.getDescription());
        document.setTags(template.getTags());
        document.setChartType(detectChartType(template.getContent()));
        document.setVersion(1);
        document.setIsPublic(0);
        document.setBytesSize(template.getContent() != null ? template.getContent().getBytes().length : 0);
        document = documentRepository.save(document);

        DocumentResp resp = new DocumentResp();
        resp.setDocumentId(document.getDocumentId());
        resp.setTitle(document.getTitle());
        resp.setContent(document.getContent());
        resp.setDescription(document.getDescription());
        resp.setTags(document.getTags());
        resp.setChartType(document.getChartType());
        resp.setVersion(document.getVersion());
        resp.setIsPublic(document.getIsPublic());
        resp.setBytesSize(document.getBytesSize());
        resp.setCreatedAt(document.getCreatedAt());
        resp.setUpdatedAt(document.getUpdatedAt());
        return resp;
    }

    @Transactional(rollbackFor = Exception.class)
    public TemplateResp saveAsTemplate(String documentId) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        Template template = new Template();
        template.setTemplateId("tpl_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        template.setTitle(document.getTitle());
        template.setCategory(document.getChartType() != null ? document.getChartType() : "flowchart");
        template.setDescription(document.getDescription());
        template.setContent(document.getContent());
        template.setTags(document.getTags());
        template.setIsPublic(0);
        template.setOwnerUserId(userId);
        template.setUseCount(0);
        template = templateRepository.save(template);

        return toResp(template);
    }

    private String detectChartType(String content) {
        if (StringUtils.isBlank(content)) {
            return "flowchart";
        }
        if (content.contains("sequenceDiagram")) return "sequence";
        if (content.contains("classDiagram")) return "class";
        if (content.contains("stateDiagram")) return "state";
        if (content.contains("gantt")) return "gantt";
        if (content.contains("erDiagram")) return "er";
        if (content.contains("pie")) return "pie";
        if (content.contains("journey")) return "journey";
        return "flowchart";
    }

    private TemplateResp toResp(Template template) {
        TemplateResp resp = new TemplateResp();
        resp.setTemplateId(template.getTemplateId());
        resp.setTitle(template.getTitle());
        resp.setCategory(template.getCategory());
        resp.setDescription(template.getDescription());
        resp.setContent(template.getContent());
        resp.setTags(template.getTags());
        resp.setIsPublic(template.getIsPublic());
        resp.setOwnerUserId(template.getOwnerUserId());
        resp.setUseCount(template.getUseCount());
        resp.setCreatedAt(template.getCreatedAt());
        resp.setUpdatedAt(template.getUpdatedAt());
        return resp;
    }

    private TemplateCategoryResp toCategoryResp(TemplateCategory category) {
        TemplateCategoryResp resp = new TemplateCategoryResp();
        resp.setCategoryId(category.getCategoryId());
        resp.setName(category.getName());
        resp.setIcon(category.getIcon());
        resp.setDescription(category.getDescription());
        resp.setMermaidType(category.getMermaidType());
        resp.setSortOrder(category.getSortOrder());
        return resp;
    }
}
