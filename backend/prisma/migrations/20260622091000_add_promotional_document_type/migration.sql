ALTER TABLE `surveys`
  MODIFY `type` ENUM('case_collection', 'assessment', 'promotional_document') NOT NULL DEFAULT 'assessment';
