-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "booking_id" INTEGER;

-- AlterTable
ALTER TABLE "passengers" ALTER COLUMN "family_name" DROP NOT NULL,
ALTER COLUMN "identity_type" DROP NOT NULL,
ALTER COLUMN "issuing_country" DROP NOT NULL,
ALTER COLUMN "identity_number" DROP NOT NULL,
ALTER COLUMN "expired_date" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
