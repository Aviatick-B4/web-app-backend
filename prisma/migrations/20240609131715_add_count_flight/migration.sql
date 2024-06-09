-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('transaction', 'promo', 'general');

-- AlterTable
ALTER TABLE "flights" ADD COLUMN     "count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "type" "NotificationType";
