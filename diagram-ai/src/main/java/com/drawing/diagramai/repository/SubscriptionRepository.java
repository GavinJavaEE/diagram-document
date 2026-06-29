package com.drawing.diagramai.repository;

import java.util.Optional;

import com.drawing.diagramai.entity.Subscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findBySubscriptionId(String subscriptionId);

    Page<Subscription> findByUserId(String userId, Pageable pageable);
}
