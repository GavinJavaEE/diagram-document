package com.drawing.diagramai.entity;

import java.math.BigDecimal;
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
 * 支付记录
 */
@Getter
@Setter
@Entity
@Table(name = "t_payment")
@Where(clause = "is_deleted = 0")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false, length = 32, unique = true)
    private String paymentId;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "subscription_id", nullable = false, length = 32)
    private String subscriptionId;

    @Column(name = "plan", nullable = false, length = 16)
    private String plan;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 8)
    private String currency = "CNY";

    @Column(name = "status", nullable = false, length = 24)
    private String status = "pending";

    @Column(name = "payment_method", nullable = false, length = 24)
    private String paymentMethod = "stripe";

    @Column(name = "invoice_url", length = 512)
    private String invoiceUrl;

    @Column(name = "third_party_tx_id", length = 128)
    private String thirdPartyTxId;

    @Column(name = "billing_period_start")
    private LocalDateTime billingPeriodStart;

    @Column(name = "billing_period_end")
    private LocalDateTime billingPeriodEnd;

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
