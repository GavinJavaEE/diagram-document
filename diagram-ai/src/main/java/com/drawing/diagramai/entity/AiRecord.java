package com.drawing.diagramai.entity;

import java.time.LocalDateTime;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Table;

import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Where;

/**
 * AI 生成/修复记录
 * type: "generate" | "fix"
 */
@Getter
@Setter
@Entity
@Table(name = "t_ai_record")
@Where(clause = "is_deleted = 0")
public class AiRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_id", nullable = false, length = 32, unique = true)
    private String recordId;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "type", nullable = false, length = 16)
    private String type;

    @Column(name = "chart_type", nullable = false, length = 32)
    private String chartType;

    @Column(name = "prompt", columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "result_code", columnDefinition = "MEDIUMTEXT")
    private String resultCode;

    @Column(name = "prompt_tokens", nullable = false)
    private Integer promptTokens = 0;

    @Column(name = "completion_tokens", nullable = false)
    private Integer completionTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    private Integer totalTokens = 0;

    @Column(name = "processing_time_ms", nullable = false)
    private Integer processingTimeMs = 0;

    @Column(name = "provider", length = 32)
    private String provider;

    @Column(name = "is_success", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Integer isSuccess = 1;

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
}
