/*
  Warnings:

  - Added the required column `booking_tax` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "booking_tax" DOUBLE PRECISION NOT NULL;
