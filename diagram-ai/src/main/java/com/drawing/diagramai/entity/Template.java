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
 * 图表模板
 * 系统模板 ownerUserId = NULL + isPublic = 1
 * 用户私有模板 ownerUserId = 具体用户
 */
@Getter
@Setter
@Entity
@Table(name = "t_template")
@Where(clause = "is_deleted = 0")
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_id", nullable = false, length = 64, unique = true)
    private String templateId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "category", nullable = false, length = 32)
    private String category;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "content", columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "tags", length = 512)
    private String tags;

    @Column(name = "is_public", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Integer isPublic = 1;

    @Column(name = "owner_user_id", length = 32)
    private String ownerUserId;

    @Column(name = "use_count", nullable = false)
    private Integer useCount = 0;

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
