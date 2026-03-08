-- AlterTable: add is_edited and edited_at to messages
ALTER TABLE `messages` ADD COLUMN `is_edited` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `messages` ADD COLUMN `edited_at` DATETIME(3) NULL;
