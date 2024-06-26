/*
  Warnings:

  - You are about to drop the column `flight_id` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `departure_ticket_id` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_flight_id_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "flight_id",
ADD COLUMN     "departure_ticket_id" INTEGER NOT NULL,
ADD COLUMN     "return_ticket_id" INTEGER;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_ticket_id_fkey" FOREIGN KEY ("departure_ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_return_ticket_id_fkey" FOREIGN KEY ("return_ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
