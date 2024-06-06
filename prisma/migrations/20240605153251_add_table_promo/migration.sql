/*
  Warnings:

  - You are about to drop the column `description_promo` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `valid_from` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `valid_until` on the `tickets` table. All the data in the column will be lost.
  - Added the required column `promo_id` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "description_promo",
DROP COLUMN "discount",
DROP COLUMN "is_active",
DROP COLUMN "valid_from",
DROP COLUMN "valid_until",
ADD COLUMN     "promo_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "promos" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
