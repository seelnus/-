-- CreateTable
CREATE TABLE `survey_folders` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_by` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `surveys` ADD COLUMN `folder_id` INTEGER UNSIGNED NULL;

-- AddForeignKey
ALTER TABLE `survey_folders` ADD CONSTRAINT `survey_folders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `survey_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
