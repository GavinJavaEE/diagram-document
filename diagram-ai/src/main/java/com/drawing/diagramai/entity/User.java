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
import javax.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Where;

/**
 * 用户表
 *
 * email 唯一性通过 (email, is_deleted) 联合唯一索引保证（见 SQL 迁移脚本），
 * 允许 is_deleted=1 的已注销账号被同邮箱重新注册覆盖。
 */
@Getter
@Setter
@Entity
@Table(
    name = "t_user",
    uniqueConstraints = @UniqueConstraint(name = "uk_email_is_deleted", columnNames = {"email", "is_deleted"})
)
@Where(clause = "is_deleted = 0")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 32, unique = true)
    private String userId;

    @Column(name = "email", nullable = false, length = 128)
    private String email;

    @Column(name = "nickname", length = 100)
    private String nickname;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "role", nullable = false, length = 16)
    private String role = "user";

    @Column(name = "is_subscribed", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Integer isSubscribed = 0;

    @Column(name = "subscription_plan", nullable = false, length = 16)
    private String subscriptionPlan = "free";

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;

    @Column(name = "preferences", columnDefinition = "JSON")
    private String preferences;

    @Column(name = "github_id", length = 64)
    private String githubId;

    @Column(name = "login_count", nullable = false)
    private Integer loginCount = 0;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "is_locked", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Integer isLocked = 0;

    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Integer isActive = 1;

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
