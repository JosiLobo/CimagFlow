/*
  Warnings:

  - You are about to drop the column `reviewComment` on the `credenciamentos` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `credenciamentos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "credenciamentos" DROP CONSTRAINT "credenciamentos_reviewedBy_fkey";

-- AlterTable
ALTER TABLE "credenciamentos" DROP COLUMN "reviewComment",
DROP COLUMN "reviewedBy",
ADD COLUMN     "analysisNotes" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewerId" TEXT;

-- CreateTable
CREATE TABLE "credenciamento_messages" (
    "id" TEXT NOT NULL,
    "credenciamentoId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credenciamento_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credenciamento_messages_credenciamentoId_idx" ON "credenciamento_messages"("credenciamentoId");

-- CreateIndex
CREATE INDEX "credenciamento_messages_createdAt_idx" ON "credenciamento_messages"("createdAt");

-- CreateIndex
CREATE INDEX "credenciamento_messages_senderType_idx" ON "credenciamento_messages"("senderType");

-- AddForeignKey
ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciamento_messages" ADD CONSTRAINT "credenciamento_messages_credenciamentoId_fkey" FOREIGN KEY ("credenciamentoId") REFERENCES "credenciamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciamento_messages" ADD CONSTRAINT "credenciamento_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
