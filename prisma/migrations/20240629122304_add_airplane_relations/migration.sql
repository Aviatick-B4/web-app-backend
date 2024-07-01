-- AlterTable
ALTER TABLE "flights" ADD COLUMN     "airplane_id" INTEGER;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_airplane_id_fkey" FOREIGN KEY ("airplane_id") REFERENCES "airplanes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
