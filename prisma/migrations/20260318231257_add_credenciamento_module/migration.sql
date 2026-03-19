-- CreateEnum
CREATE TYPE "CredenciamentoStatus" AS ENUM ('PENDENTE', 'EM_ANALISE', 'APROVADO', 'REPROVADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "credenciamentos" (
    "id" TEXT NOT NULL,
    "protocolNumber" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "requesterCpf" TEXT,
    "requesterCnpj" TEXT,
    "companyName" TEXT NOT NULL,
    "tradeName" TEXT,
    "fantasyName" TEXT,
    "companyAddress" TEXT,
    "companyCity" TEXT,
    "companyState" TEXT,
    "companyCep" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activityArea" TEXT,
    "requestedServices" TEXT,
    "status" "CredenciamentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "priority" "DemandPriority" NOT NULL DEFAULT 'MEDIA',
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT,
    "prefectureId" TEXT,
    "assignedToId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "approvalDocument" TEXT,
    "publicSubmission" BOOLEAN NOT NULL DEFAULT true,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credenciamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credenciamento_history" (
    "id" TEXT NOT NULL,
    "credenciamentoId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credenciamento_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credenciamentos_protocolNumber_key" ON "credenciamentos"("protocolNumber");

-- CreateIndex
CREATE INDEX "credenciamentos_protocolNumber_idx" ON "credenciamentos"("protocolNumber");

-- CreateIndex
CREATE INDEX "credenciamentos_status_idx" ON "credenciamentos"("status");

-- CreateIndex
CREATE INDEX "credenciamentos_prefectureId_idx" ON "credenciamentos"("prefectureId");

-- CreateIndex
CREATE INDEX "credenciamentos_requesterEmail_idx" ON "credenciamentos"("requesterEmail");

-- CreateIndex
CREATE INDEX "credenciamentos_createdAt_idx" ON "credenciamentos"("createdAt");

-- CreateIndex
CREATE INDEX "credenciamento_history_credenciamentoId_idx" ON "credenciamento_history"("credenciamentoId");

-- CreateIndex
CREATE INDEX "credenciamento_history_createdAt_idx" ON "credenciamento_history"("createdAt");

-- AddForeignKey
ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_prefectureId_fkey" FOREIGN KEY ("prefectureId") REFERENCES "prefectures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciamentos" ADD CONSTRAINT "credenciamentos_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciamento_history" ADD CONSTRAINT "credenciamento_history_credenciamentoId_fkey" FOREIGN KEY ("credenciamentoId") REFERENCES "credenciamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
