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
 * 订阅记录
 */
@Getter
@Setter
@Entity
@Table(name = "t_subscription")
@Where(clause = "is_deleted = 0")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subscription_id", nullable = false, length = 32, unique = true)
    private String subscriptionId;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "plan", nullable = false, length = 16)
    private String plan = "pro";

    @Column(name = "status", nullable = false, length = 24)
    private String status = "pending_payment";

    @Column(name = "will_cancel_at_end", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Integer willCancelAtEnd = 0;

    @Column(name = "billing_period_start")
    private LocalDateTime billingPeriodStart;

    @Column(name = "billing_period_end")
    private LocalDateTime billingPeriodEnd;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "cancel_feedback", length = 1000)
    private String cancelFeedback;

    @Column(name = "payment_session_id", length = 64)
    private String paymentSessionId;

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
