package com.drawing.diagramai.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.drawing.diagramai.entity.AiRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AiRecordRepository extends JpaRepository<AiRecord, Long> {

    Optional<AiRecord> findByRecordId(String recordId);

    Page<AiRecord> findByUserId(String userId, Pageable pageable);

    Page<AiRecord> findByUserIdAndType(String userId, String type, Pageable pageable);

    int countByUserId(String userId);

    /**
     * 按天聚合用户 AI 调用的 token 消耗与调用次数（含输入/输出细分）。
     *
     * 用 JPQL 的 FUNCTION('DATE', ...) 提取日期部分分组，兼容 MySQL/H2。
     * 仅返回有记录的日期，无记录的日期由 service 层补 0 占位。
     *
     * @param userId 用户 ID
     * @param start  查询起始时间（含），通常为 now - days 天的 00:00:00
     * @return Object[] {0: 当天日期, 1: totalTokens, 2: callCount, 3: promptTokens, 4: completionTokens}
     */
    @Query("SELECT FUNCTION('DATE', r.createdAt) AS d, " +
            "COALESCE(SUM(r.totalTokens), 0) AS t, " +
            "COUNT(r) AS c, " +
            "COALESCE(SUM(r.promptTokens), 0) AS p, " +
            "COALESCE(SUM(r.completionTokens), 0) AS k " +
            "FROM AiRecord r " +
            "WHERE r.userId = :userId AND r.createdAt >= :start " +
            "GROUP BY FUNCTION('DATE', r.createdAt) " +
            "ORDER BY d ASC")
    List<Object[]> findDailyTokenStats(@Param("userId") String userId, @Param("start") LocalDateTime start);
}
