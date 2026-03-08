-- DropForeignKey
ALTER TABLE "demands" DROP CONSTRAINT "demands_createdBy_fkey";

-- AlterTable
ALTER TABLE "demands" ADD COLUMN     "publicSubmission" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
