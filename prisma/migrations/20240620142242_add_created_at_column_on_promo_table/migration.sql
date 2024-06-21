/*
  Warnings:

  - Added the required column `created_at` to the `promos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promos" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL;
