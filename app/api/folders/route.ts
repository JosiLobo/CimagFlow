import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const search = searchParams.get("search") || "";

    const folders = await prisma.folder.findMany({
      where: {
        createdBy: userId,
        parentId: parentId || null,
        name: { contains: search, mode: "insensitive" },
      },
      include: {
        _count: { select: { children: true, documents: true } },
        prefecture: { select: { id: true, name: true, city: true, state: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Erro ao buscar pastas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, description, parentId, prefectureId } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        prefectureId: prefectureId || null,
        createdBy: userId,
      },
      include: {
        prefecture: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "folder",
      entityId: folder.id,
      entityName: folder.name,
      details: `Pasta criada: ${folder.name}${folder.prefecture ? ` - ${folder.prefecture.name}` : ""}`,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Erro ao criar pasta" }, { status: 500 });
  }
}
