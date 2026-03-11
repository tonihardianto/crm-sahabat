-- CreateEnum
ALTER TABLE `user_settings` ADD COLUMN `notif_pref` ENUM('INAPP', 'PUSH', 'BOTH') NOT NULL DEFAULT 'BOTH';
