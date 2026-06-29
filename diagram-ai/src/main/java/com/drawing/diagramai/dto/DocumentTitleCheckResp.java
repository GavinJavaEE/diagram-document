package com.drawing.diagramai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文档名唯一性校验响应。
 * - duplicated=true 时 conflictDocumentId 返回冲突文档 id，供前端覆盖流程使用
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentTitleCheckResp {
    /** 当前用户 + chartType 范围内是否已存在同名文档 */
    private Boolean duplicated;
    /** 冲突文档的 documentId（duplicated=false 时为 null） */
    private String conflictDocumentId;
}
