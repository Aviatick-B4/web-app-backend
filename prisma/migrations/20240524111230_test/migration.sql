/*
  Warnings:

  - You are about to drop the column `name` on the `payments` table. All the data in the column will be lost.
  - Added the required column `payment_method` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'Unpaid';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "name",
ADD COLUMN     "payment_method" TEXT NOT NULL;
