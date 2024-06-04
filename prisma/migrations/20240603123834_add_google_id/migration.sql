-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "full_name" DROP NOT NULL,
ALTER COLUMN "phone_number" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;
