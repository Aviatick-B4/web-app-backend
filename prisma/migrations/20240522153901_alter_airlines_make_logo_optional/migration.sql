/*
  Warnings:

  - You are about to drop the column `logo` on the `airlines` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "airlines" DROP COLUMN "logo",
ADD COLUMN     "logo_id" TEXT,
ADD COLUMN     "logo_url" TEXT;
