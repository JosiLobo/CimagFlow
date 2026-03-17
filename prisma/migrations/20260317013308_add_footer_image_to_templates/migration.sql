-- AlterTable
ALTER TABLE "document_signers" ADD COLUMN     "cpfUsed" TEXT,
ADD COLUMN     "signatureImage" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "demandId" TEXT;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "footerImage" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "demands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
