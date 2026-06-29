package com.drawing.diagramai.service;

import com.drawing.diagramai.common.RuntimeContextHelper;
import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.domain.UserInfo;
import com.drawing.diagramai.dto.*;
import com.drawing.diagramai.entity.Document;
import com.drawing.diagramai.entity.DocumentVersion;
import com.drawing.diagramai.enums.BizCodeEnum;
import com.drawing.diagramai.repository.DocumentRepository;
import com.drawing.diagramai.repository.DocumentVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DocumentService {

    @Resource
    private DocumentRepository documentRepository;

    @Resource
    private DocumentVersionRepository documentVersionRepository;

    @Transactional(rollbackFor = Exception.class)
    public DocumentResp create(DocumentCreateReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = new Document();
        document.setDocumentId("doc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        document.setUserId(userId);
        document.setTitle(req.getTitle());
        document.setContent(req.getContent() != null ? req.getContent() : "");
        document.setDescription(req.getDescription());
        document.setChartType(req.getChartType() != null ? req.getChartType() : "flowchart");
        document.setTags(req.getTags());
        document.setVersion(1);
        document.setIsPublic(0);
        document.setBytesSize(calcBytesSize(req.getContent()));
        document = documentRepository.save(document);

        saveVersion(document, 1, "初始创建");
        return toResp(document);
    }

    public PageResp<DocumentResp> list(int page, int pageSize, String chartType) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docPage;

        if (StringUtils.isNotBlank(chartType)) {
            docPage = documentRepository.findByUserIdAndChartType(userId, chartType, pageable);
        } else {
            docPage = documentRepository.findByUserId(userId, pageable);
        }

        Page<DocumentResp> respPage = docPage.map(this::toResp);
        return PageResp.from(respPage);
    }

    /**
     * 列表查询（多 chartType 版本）：按 chartTypes 集合 IN 查询。
     * 用于「我的图表」页面拉取多种 Mermaid 图表类型，排除 markdown 文档。
     *
     * @param chartTypes 图表类型集合；为空时退化为查询当前用户全部文档
     */
    public PageResp<DocumentResp> list(int page, int pageSize, Collection<String> chartTypes) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Document> docPage;

        if (chartTypes != null && !chartTypes.isEmpty()) {
            docPage = documentRepository.findByUserIdAndChartTypeIn(userId, chartTypes, pageable);
        } else {
            docPage = documentRepository.findByUserId(userId, pageable);
        }

        Page<DocumentResp> respPage = docPage.map(this::toResp);
        return PageResp.from(respPage);
    }

    /**
     * 文档名唯一性校验：当前用户 + chartType 范围内是否存在同名文档。
     * excludeDocumentId 用于排除自身（编辑已有文档改名时）。
     */
    public DocumentTitleCheckResp checkTitleDuplicate(String title, String chartType, String excludeDocumentId) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        String normalizedTitle = StringUtils.trimToEmpty(title);
        if (normalizedTitle.isEmpty()) {
            return new DocumentTitleCheckResp(false, null);
        }

        String normalizedChartType = StringUtils.isBlank(chartType) ? "flowchart" : chartType;

        return documentRepository
                .findByUserIdAndChartTypeAndTitle(userId, normalizedChartType, normalizedTitle)
                .map(existing -> {
                    // 排除自身（编辑当前文档改名场景）
                    if (StringUtils.isNotBlank(excludeDocumentId)
                            && excludeDocumentId.equals(existing.getDocumentId())) {
                        return new DocumentTitleCheckResp(false, null);
                    }
                    return new DocumentTitleCheckResp(true, existing.getDocumentId());
                })
                .orElseGet(() -> new DocumentTitleCheckResp(false, null));
    }

    public DocumentResp getById(String documentId) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        return toResp(document);
    }

    @Transactional(rollbackFor = Exception.class)
    public DocumentResp update(String documentId, DocumentUpdateReq req) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        int newVersion = document.getVersion() + 1;
        String oldTitle = document.getTitle();
        String oldContent = document.getContent();

        document.setTitle(req.getTitle());
        document.setContent(req.getContent() != null ? req.getContent() : document.getContent());
        document.setDescription(req.getDescription());
        if (req.getChartType() != null) {
            document.setChartType(req.getChartType());
        }
        document.setTags(req.getTags());
        document.setVersion(newVersion);
        document.setBytesSize(calcBytesSize(document.getContent()));

        document = documentRepository.save(document);

        String changeSummary = buildChangeSummary(oldTitle, req.getTitle(), oldContent, req.getContent());
        saveVersion(document, newVersion, changeSummary);

        return toResp(document);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(String documentId) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        // 软删除：与实体 @Where(clause = "is_deleted = 0") 设计一致
        // 之前用 documentRepository.delete() 物理删除，与 @Where 注解不匹配，
        // 在 is_deleted != 0 时 DELETE 会静默失效（0 rows affected），导致文档"复活"
        document.setIsDeleted(1);
        documentRepository.save(document);
    }

    public List<DocumentVersionResp> getVersions(String documentId, int page, int pageSize) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "version"));
        List<DocumentVersion> versions = documentVersionRepository.findByDocumentIdOrderByVersionDesc(documentId, pageable);

        return versions.stream().map(this::toVersionResp).collect(Collectors.toList());
    }

    @Transactional(rollbackFor = Exception.class)
    public DocumentResp restoreVersion(String documentId, int version) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        DocumentVersion targetVersion = documentVersionRepository.findByDocumentIdAndVersion(documentId, version)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        int newVersion = document.getVersion() + 1;
        String oldTitle = document.getTitle();

        document.setTitle(targetVersion.getTitle());
        document.setContent(targetVersion.getContent());
        document.setVersion(newVersion);
        document.setBytesSize(calcBytesSize(targetVersion.getContent()));

        document = documentRepository.save(document);
        saveVersion(document, newVersion, "恢复到版本 " + version);

        return toResp(document);
    }

    @Transactional(rollbackFor = Exception.class)
    public DocumentResp setPublic(String documentId, boolean isPublic) {
        UserInfo userInfo = RuntimeContextHelper.getUserInfo();
        String userId = userInfo.getUserId();

        Document document = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        if (!document.getUserId().equals(userId)) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        document.setIsPublic(isPublic ? 1 : 0);
        if (isPublic && StringUtils.isBlank(document.getShareToken())) {
            document.setShareToken("share_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        }
        document = documentRepository.save(document);
        return toResp(document);
    }

    public DocumentResp getByShareToken(String shareToken) {
        // 直接通过 shareToken 字段精确查询，避免 LIKE 模糊匹配与全表扫描
        Document document = documentRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new BizException(BizCodeEnum._RESOURCE_REMOVED_));

        // 校验文档已公开（isPublic == 1），未公开则禁止访问
        if (document.getIsPublic() == null || document.getIsPublic() != 1) {
            throw new BizException(BizCodeEnum._ILLEGAL_VISITS_);
        }

        return toResp(document);
    }

    private void saveVersion(Document document, int version, String summary) {
        DocumentVersion dv = new DocumentVersion();
        dv.setDocumentId(document.getDocumentId());
        dv.setVersion(version);
        dv.setTitle(document.getTitle());
        dv.setContent(document.getContent());
        dv.setChangeSummary(summary);
        dv.setUserId(document.getUserId());
        documentVersionRepository.save(dv);
    }

    private int calcBytesSize(String content) {
        if (content == null) {
            return 0;
        }
        return content.getBytes(StandardCharsets.UTF_8).length;
    }

    private String buildChangeSummary(String oldTitle, String newTitle, String oldContent, String newContent) {
        StringBuilder sb = new StringBuilder();
        if (!StringUtils.equals(oldTitle, newTitle)) {
            sb.append("标题已更新;");
        }
        if (!StringUtils.equals(oldContent, newContent)) {
            sb.append("内容已更新;");
        }
        if (sb.length() == 0) {
            sb.append("文档已更新");
        }
        return sb.toString();
    }

    private DocumentResp toResp(Document document) {
        DocumentResp resp = new DocumentResp();
        resp.setDocumentId(document.getDocumentId());
        resp.setTitle(document.getTitle());
        resp.setContent(document.getContent());
        resp.setDescription(document.getDescription());
        resp.setTags(document.getTags());
        // 兼容历史数据：chartType 为 NULL/空字符串时默认设为 flowchart
        String chartType = document.getChartType();
        resp.setChartType(StringUtils.isBlank(chartType) ? "flowchart" : chartType);
        resp.setVersion(document.getVersion());
        resp.setIsPublic(document.getIsPublic());
        resp.setShareToken(document.getShareToken());
        resp.setBytesSize(document.getBytesSize());
        resp.setCreatedAt(document.getCreatedAt());
        resp.setUpdatedAt(document.getUpdatedAt());
        return resp;
    }

    private DocumentVersionResp toVersionResp(DocumentVersion version) {
        DocumentVersionResp resp = new DocumentVersionResp();
        resp.setDocumentId(version.getDocumentId());
        resp.setVersion(version.getVersion());
        resp.setTitle(version.getTitle());
        resp.setContent(version.getContent());
        resp.setChangeSummary(version.getChangeSummary());
        resp.setCreatedAt(version.getCreatedAt());
        return resp;
    }
}
