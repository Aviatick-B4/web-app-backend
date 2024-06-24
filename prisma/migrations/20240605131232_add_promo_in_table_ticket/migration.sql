-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "after_discount_price" DOUBLE PRECISION,
ADD COLUMN     "description_promo" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "valid_from" TIMESTAMP(3),
ADD COLUMN     "valid_until" TIMESTAMP(3);
