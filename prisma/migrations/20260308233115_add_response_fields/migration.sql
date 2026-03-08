-- AlterTable
ALTER TABLE "demands" ADD COLUMN     "responseAttachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responseComment" TEXT;
