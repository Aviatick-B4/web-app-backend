/*
  Warnings:

  - You are about to drop the column `payment_method` on the `payments` table. All the data in the column will be lost.
  - Added the required column `name` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payment_method",
ADD COLUMN     "name" TEXT NOT NULL;
