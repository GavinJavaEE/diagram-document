package com.drawing.diagramai.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import com.drawing.diagramai.entity.AiUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiUsageRepository extends JpaRepository<AiUsage, Long> {

    Optional<AiUsage> findByUserIdAndTypeAndPeriodStart(String userId, String type, LocalDateTime periodStart);
}
