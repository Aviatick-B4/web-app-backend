-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_promo_id_fkey";

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "promo_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
