-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "donation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "promos" ALTER COLUMN "created_at" DROP NOT NULL;
