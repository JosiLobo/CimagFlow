-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'AGUARDANDO_RESPOSTA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DemandPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "demands" (
    "id" TEXT NOT NULL,
    "protocolNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DemandStatus" NOT NULL DEFAULT 'ABERTA',
    "priority" "DemandPriority" NOT NULL DEFAULT 'MEDIA',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "requesterCpf" TEXT,
    "prefectureId" TEXT,
    "assignedToId" TEXT,
    "createdBy" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "resolution" TEXT,

    CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_history" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demands_protocolNumber_key" ON "demands"("protocolNumber");

-- CreateIndex
CREATE INDEX "demands_protocolNumber_idx" ON "demands"("protocolNumber");

-- CreateIndex
CREATE INDEX "demands_status_idx" ON "demands"("status");

-- CreateIndex
CREATE INDEX "demands_prefectureId_idx" ON "demands"("prefectureId");

-- CreateIndex
CREATE INDEX "demands_createdAt_idx" ON "demands"("createdAt");

-- CreateIndex
CREATE INDEX "demand_history_demandId_idx" ON "demand_history"("demandId");

-- CreateIndex
CREATE INDEX "demand_history_createdAt_idx" ON "demand_history"("createdAt");

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_prefectureId_fkey" FOREIGN KEY ("prefectureId") REFERENCES "prefectures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_history" ADD CONSTRAINT "demand_history_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "demands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
