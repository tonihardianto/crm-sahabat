-- AlterTable
ALTER TABLE `clients` ADD COLUMN `pic_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_pic_id_fkey` FOREIGN KEY (`pic_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
