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
 * 模板分类（预置数据由 schema.sql 初始化）
 */
@Getter
@Setter
@Entity
@Table(name = "t_template_category")
@Where(clause = "is_deleted = 0")
public class TemplateCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false, length = 32, unique = true)
    private String categoryId;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "icon", length = 16)
    private String icon;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "mermaid_type", nullable = false, length = 64)
    private String mermaidType;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "is_enabled", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Integer isEnabled = 1;

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
