import prisma from "@/lib/db";

/**
 * Resolve o userId real do banco de dados a partir da sessão.
 * Quando o banco é recriado/resetado, o JWT pode conter um ID antigo.
 * Este helper tenta primeiro pelo ID da sessão, depois pelo email.
 */
export async function resolveUserId(session: any): Promise<string | null> {
  const sessionId = session?.user?.id;
  if (sessionId) {
    const user = await prisma.user.findUnique({ where: { id: sessionId }, select: { id: true } });
    if (user) return user.id;
  }
  const email = session?.user?.email;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) return user.id;
  }
  return null;
}
