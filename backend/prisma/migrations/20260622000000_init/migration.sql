CREATE TABLE `admin_users` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `admin_users_phone_key`(`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contacts` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(200) NULL,
  `job_no` VARCHAR(50) NULL,
  `position` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `tags` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `contacts_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wecom_users` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `wecom_userid` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NULL,
  `department` VARCHAR(200) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `wecom_users_wecom_userid_key`(`wecom_userid`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `surveys` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `type` ENUM('case_collection', 'assessment') NOT NULL DEFAULT 'assessment',
  `schema_json` JSON NOT NULL,
  `status` ENUM('draft', 'published', 'disabled') NOT NULL DEFAULT 'draft',
  `share_token` VARCHAR(64) NOT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT false,
  `created_by` INTEGER UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `surveys_title_key`(`title`),
  UNIQUE INDEX `surveys_share_token_key`(`share_token`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `survey_responses` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` INTEGER UNSIGNED NOT NULL,
  `wecom_userid` VARCHAR(64) NOT NULL,
  `answers_json` JSON NOT NULL,
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `uk_one_submission`(`survey_id`, `wecom_userid`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `response_comments` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `response_id` INTEGER UNSIGNED NOT NULL,
  `admin_id` INTEGER UNSIGNED NOT NULL,
  `comment` TEXT NULL,
  `score` TINYINT UNSIGNED NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `response_comments_response_id_key`(`response_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `survey_responses`
  ADD CONSTRAINT `survey_responses_survey_id_fkey`
  FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `response_comments`
  ADD CONSTRAINT `response_comments_response_id_fkey`
  FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
