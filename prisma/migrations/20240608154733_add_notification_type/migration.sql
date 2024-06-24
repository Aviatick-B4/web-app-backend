-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('transaction', 'promo', 'general');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "type" "NotificationType";
