import prisma from "@/lib/db";

/**
 * Resolve o userId real do banco de dados a partir da sessão.
 * Quando o banco é recriado/resetado, o JWT pode conter um ID antigo.
 * Este helper tenta primeiro pelo ID da sessão, depois pelo email.
 */
export async function resolveUserId(session: any): Promise<string | null> {
  const sessionId = session?.user?.id;
  const email = session?.user?.email;

  const conditions: any[] = [];
  if (sessionId) conditions.push({ id: sessionId });
  if (email) conditions.push({ email });
  if (conditions.length === 0) return null;

  const user = await prisma.user.findFirst({
    where: { OR: conditions },
    select: { id: true },
  });
  return user?.id ?? null;
}
