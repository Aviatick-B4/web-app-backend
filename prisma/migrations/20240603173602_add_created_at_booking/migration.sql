/*
  Warnings:

  - Added the required column `created_at` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL;
