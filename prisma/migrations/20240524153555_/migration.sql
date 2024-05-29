/*
  Warnings:

  - You are about to drop the column `payment_id` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `booking_id` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_payment_id_fkey";

-- DropIndex
DROP INDEX "bookings_payment_id_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "payment_id";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "booking_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
