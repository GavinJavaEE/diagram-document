package com.drawing.diagramai.repository;

import java.util.Optional;

import com.drawing.diagramai.entity.Template;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TemplateRepository extends JpaRepository<Template, Long> {

    Optional<Template> findByTemplateId(String templateId);

    Page<Template> findByCategory(String category, Pageable pageable);

    Page<Template> findByOwnerUserId(String ownerUserId, Pageable pageable);
}
