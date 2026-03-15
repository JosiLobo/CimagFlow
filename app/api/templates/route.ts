import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, description, content, variables, headerImage, footerImage } = body;

    if (!name || !content) return NextResponse.json({ error: "Nome e conteúdo obrigatórios" }, { status: 400 });

    const template = await prisma.template.create({
      data: { name, description: description ?? null, content, variables: variables ?? [], headerImage: headerImage ?? null, footerImage: footerImage ?? null, createdBy: userId },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
