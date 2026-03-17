import prisma from "./db";
import { AuditAction } from "@prisma/client";
import { NextRequest } from "next/server";

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

/**
 * Extrai o endereço IP real do request, considerando proxies e load balancers
 */
export function getClientIp(request: NextRequest): string {
  // Vercel/Next.js headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

/**
 * Cria um log de auditoria - versão básica
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    // Verificar se o userId existe no banco antes de criar o log
    let validUserId = params.userId;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) {
        validUserId = undefined;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        userName: params.userName || "Sistema",
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityName: params.entityName,
        details: params.details,
        ipAddress: params.ipAddress || "unknown",
        userAgent: params.userAgent || "unknown",
      },
    });
  } catch (error) {
    console.error("Erro ao criar log de auditoria:", error);
  }
}

/**
 * Cria um log de auditoria extraindo automaticamente IP e User-Agent do request
 */
export async function auditLog(
  request: NextRequest,
  params: {
    userId?: string;
    userName?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    entityName?: string;
    details?: string;
  }
) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  await createAuditLog({
    ...params,
    ipAddress,
    userAgent,
  });
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
