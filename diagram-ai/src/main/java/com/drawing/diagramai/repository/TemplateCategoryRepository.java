package com.drawing.diagramai.repository;

import java.util.Optional;

import com.drawing.diagramai.entity.TemplateCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TemplateCategoryRepository extends JpaRepository<TemplateCategory, Long> {

    Optional<TemplateCategory> findByCategoryId(String categoryId);
}
