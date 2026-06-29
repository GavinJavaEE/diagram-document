package com.drawing.diagramai.entity;

import java.time.LocalDateTime;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.PostLoad;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Table;

import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Where;

/**
 * 图表文档
 */
@Getter
@Setter
@Entity
@Table(name = "t_document")
@Where(clause = "is_deleted = 0")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false, length = 32, unique = true)
    private String documentId;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "tags", length = 512)
    private String tags;

    @Column(name = "chart_type", nullable = false, length = 32)
    private String chartType = "flowchart";

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "is_public", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Integer isPublic = 0;

    @Column(name = "share_token", length = 32)
    private String shareToken;

    @Column(name = "bytes_size", nullable = false)
    private Integer bytesSize = 0;

    @Column(name = "is_deleted", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Integer isDeleted = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 从数据库加载后回填默认值：兼容历史数据 chart_type 为 NULL/空字符串的情况，统一按 flowchart 处理。
     */
    @PostLoad
    protected void onPostLoad() {
        if (this.chartType == null || this.chartType.trim().isEmpty()) {
            this.chartType = "flowchart";
        }
    }
}
