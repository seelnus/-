UPDATE `contacts`
SET `phone` = CONCAT('missing-phone-', `id`)
WHERE `phone` IS NULL OR TRIM(`phone`) = '';

ALTER TABLE `contacts`
  MODIFY `phone` VARCHAR(20) NOT NULL;
