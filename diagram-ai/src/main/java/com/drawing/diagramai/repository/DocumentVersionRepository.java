package com.drawing.diagramai.repository;

import java.util.List;
import java.util.Optional;

import com.drawing.diagramai.entity.DocumentVersion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {

    Optional<DocumentVersion> findByDocumentIdAndVersion(String documentId, Integer version);

    List<DocumentVersion> findByDocumentIdOrderByVersionDesc(String documentId, Pageable pageable);
}
