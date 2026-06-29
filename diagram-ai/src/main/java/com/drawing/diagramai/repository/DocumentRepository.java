package com.drawing.diagramai.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.drawing.diagramai.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByDocumentId(String documentId);

    Page<Document> findByUserId(String userId, Pageable pageable);

    /**
     * 按 user + chartType 单值查询。
     * 兼容历史数据：chartType 为 NULL 或空字符串的旧数据均按 flowchart 处理，
     * 因此查询 flowchart 时需额外匹配 IS NULL / = '' 条件。
     */
    @Query("SELECT d FROM Document d WHERE d.userId = :userId AND (" +
            "d.chartType = :chartType OR " +
            "((d.chartType IS NULL OR d.chartType = '') AND :chartType = 'flowchart')" +
            ")")
    Page<Document> findByUserIdAndChartType(@Param("userId") String userId,
                                            @Param("chartType") String chartType,
                                            Pageable pageable);

    /**
     * 按 user + chartType 集合查询（IN 语义），用于「我的图表」页面拉取多种 Mermaid 图表类型。
     * 集合为空时不应调用此方法（service 层会走 findByUserId）。
     * 兼容历史数据：chartType 为 NULL 或空字符串的旧数据按 flowchart 处理，
     * 当 IN 集合包含 'flowchart' 时需额外匹配 IS NULL / = '' 条件。
     */
    @Query("SELECT d FROM Document d WHERE d.userId = :userId AND (" +
            "d.chartType IN :chartTypes OR " +
            "((d.chartType IS NULL OR d.chartType = '') AND 'flowchart' IN :chartTypes)" +
            ")")
    Page<Document> findByUserIdAndChartTypeIn(@Param("userId") String userId,
                                              @Param("chartTypes") Collection<String> chartTypes,
                                              Pageable pageable);

    List<Document> findByUserIdAndTitleContaining(String userId, String keyword);

    int countByUserId(String userId);

    /**
     * 统计当前用户创建的 Markdown 文档数量（chart_type='markdown'），用于「个人中心」文档总数。
     * 与「我的文档」页面展示口径一致。
     */
    int countByUserIdAndChartType(String userId, String chartType);

    /**
     * 统计当前用户创建的 Mermaid 图表数量（排除 chart_type='markdown' 的 Markdown 文档）。
     * 兼容历史数据：chartType 为 NULL 或空字符串的旧数据按 flowchart 处理，计入图表数。
     */
    @Query("SELECT COUNT(d) FROM Document d WHERE d.userId = :userId AND (" +
            "d.chartType <> 'markdown' OR d.chartType IS NULL OR d.chartType = ''" +
            ")")
    int countChartsByUserId(@Param("userId") String userId);

    /**
     * 按 user + chartType + title 精确匹配查询，用于文档名唯一性校验。
     * 兼容历史数据：chartType 为 NULL/'' 的旧数据按 flowchart 处理，查重时一并纳入匹配。
     */
    @Query("SELECT d FROM Document d WHERE d.userId = :userId AND d.title = :title AND (" +
            "d.chartType = :chartType OR " +
            "((d.chartType IS NULL OR d.chartType = '') AND :chartType = 'flowchart')" +
            ")")
    Optional<Document> findByUserIdAndChartTypeAndTitle(@Param("userId") String userId,
                                                        @Param("chartType") String chartType,
                                                        @Param("title") String title);

    /**
     * 按分享 token 精确查询，用于公开文档的只读访问。
     */
    Optional<Document> findByShareToken(String shareToken);
}
