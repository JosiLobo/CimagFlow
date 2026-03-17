import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    let userId = (session.user as any).id;
    
    // Verificar se o usuário existe no banco (pode estar com sessão antiga)
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      const email = (session.user as any).email;
      const userByEmail = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
      if (userByEmail) {
        userId = userByEmail.id;
      } else {
        return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = { createdBy: userId };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const templates = await prisma.template.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { creator: { select: { name: true } } },
    });

    return NextResponse.json({ templates });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("POST /api/templates error: - route.ts:43", msg, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    
    // Verificar se o usuário existe no banco (pode estar com sessão antiga)
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      // Tentar encontrar pelo email da sessão
      const email = (session.user as any).email;
      const userByEmail = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
      if (userByEmail) {
        // Usar o ID correto do banco
        const body = await req.json();
        const { name, description, content, variables, headerImage, footerImage } = body;
        if (!name || !content) return NextResponse.json({ error: "Nome e conteúdo obrigatórios" }, { status: 400 });
        const template = await prisma.template.create({
          data: { name, description: description ?? null, content, variables: variables ?? [], headerImage: headerImage ?? null, footerImage: footerImage ?? null, createdBy: userByEmail.id },
        });

        await auditLog(req as any, {
          userId: userByEmail.id,
          userName: (session.user as any).name || (session.user as any).email,
          action: "CREATE",
          entity: "template",
          entityId: template.id,
          entityName: template.name,
          details: `Template criado: ${template.name}`,
        });

        return NextResponse.json({ template }, { status: 201 });
      }
      return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, content, variables, headerImage, footerImage } = body;

    if (!name || !content) return NextResponse.json({ error: "Nome e conteúdo obrigatórios" }, { status: 400 });

    const template = await prisma.template.create({
      data: { name, description: description ?? null, content, variables: variables ?? [], headerImage: headerImage ?? null, footerImage: footerImage ?? null, createdBy: userId },
    });

    await auditLog(req as any, {
      userId,
      userName: (session.user as any).name || (session.user as any).email,
      action: "CREATE",
      entity: "template",
      entityId: template.id,
      entityName: template.name,
      details: `Template criado: ${template.name}`,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("POST /api/templates error: - route.ts:86", msg, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
