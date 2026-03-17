import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
      include: {
        parent: true,
        children: { include: { _count: { select: { children: true, documents: true } } } },
        documents: { include: { signers: { include: { signer: true } } } },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error fetching folder:", error);
    return NextResponse.json({ error: "Erro ao buscar pasta" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const folder = await prisma.folder.update({
      where: { id: params.id },
      data: body,
    });

    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "folder",
      entityId: folder.id,
      entityName: folder.name,
      details: `Pasta atualizada: ${folder.name}`,
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: "Erro ao atualizar pasta" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar pasta antes de deletar para audit log
    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
    });

    await prisma.folder.delete({ where: { id: params.id } });

    if (folder) {
      const user = session.user as any;
      await auditLog(request, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "folder",
        entityId: folder.id,
        entityName: folder.name,
        details: `Pasta excluída: ${folder.name}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Erro ao excluir pasta" }, { status: 500 });
  }
}
