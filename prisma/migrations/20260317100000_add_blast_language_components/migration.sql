-- AlterTable: add language_code and components to blast_campaigns
ALTER TABLE `blast_campaigns` ADD COLUMN `language_code` VARCHAR(191) NOT NULL DEFAULT 'id',
    ADD COLUMN `components` LONGTEXT NULL;
