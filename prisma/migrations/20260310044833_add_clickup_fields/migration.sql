-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `clickup_status` VARCHAR(191) NULL,
    ADD COLUMN `clickup_task_id` VARCHAR(191) NULL,
    ADD COLUMN `clickup_task_url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_settings` ADD COLUMN `clickup_list_id` VARCHAR(191) NULL,
    ADD COLUMN `clickup_token` VARCHAR(191) NULL;
