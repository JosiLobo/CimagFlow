import prisma from "./db";
import { AuditAction } from "@prisma/client";

interface AuditLogParams {
  userId?: string;
  userName?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    // Verificar se o userId existe no banco antes de criar o log
    // IDs hardcoded (como "hardcoded-admin") não existem na tabela users
    let validUserId = params.userId;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) {
        validUserId = undefined; // Não vincular a um user inexistente
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityName: params.entityName,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Erro ao criar log de auditoria: - audit.ts:45", error);
  }
}

export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    CREATE: "Criou",
    UPDATE: "Atualizou",
    DELETE: "Excluiu",
    SIGN: "Assinou",
    REFUSE: "Recusou",
    SEND: "Enviou",
    CANCEL: "Cancelou",
    LOGIN: "Login",
    LOGOUT: "Logout",
  };
  return labels[action] || action;
}

export function getEntityLabel(entity: string): string {
  const labels: Record<string, string> = {
    document: "Documento",
    signer: "Assinante",
    template: "Template",
    folder: "Pasta",
    prefecture: "Prefeitura",
    company: "Empresa",
    bid: "Edital",
    user: "Usuário",
    session: "Sessão",
  };
  return labels[entity] || entity;
}
