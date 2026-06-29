package com.drawing.diagramai.repository;

import java.util.Optional;

import com.drawing.diagramai.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentId(String paymentId);

    Optional<Payment> findByThirdPartyTxId(String thirdPartyTxId);

    Page<Payment> findByUserId(String userId, Pageable pageable);
}
