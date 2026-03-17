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
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const prefecture = await prisma.prefecture.findUnique({
      where: { id: params.id },
      include: { signers: true, bids: true },
    });

    if (!prefecture) {
      return NextResponse.json({ error: "Prefeitura não encontrada" }, { status: 404 });
    }

    return NextResponse.json(prefecture);
  } catch (error) {
    console.error("Error fetching prefecture:", error);
    return NextResponse.json({ error: "Erro ao buscar prefeitura" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();

    const prefecture = await prisma.prefecture.update({
      where: { id: params.id },
      data: body,
    });

    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "prefecture",
      entityId: prefecture.id,
      entityName: `${prefecture.name} - ${prefecture.city}/${prefecture.state}`,
      details: `Prefeitura atualizada: ${prefecture.name} - ${prefecture.city}/${prefecture.state}`,
    });

    return NextResponse.json(prefecture);
  } catch (error) {
    console.error("Error updating prefecture:", error);
    return NextResponse.json({ error: "Erro ao atualizar prefeitura" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;

    // Buscar prefeitura antes de deletar para audit log
    const prefecture = await prisma.prefecture.findUnique({
      where: { id: params.id },
    });

    await prisma.prefecture.delete({ where: { id: params.id } });

    if (prefecture) {
      await auditLog(request, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "prefecture",
        entityId: prefecture.id,
        entityName: `${prefecture.name} - ${prefecture.city}/${prefecture.state}`,
        details: `Prefeitura excluída: ${prefecture.name} - ${prefecture.city}/${prefecture.state}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prefecture:", error);
    return NextResponse.json({ error: "Erro ao excluir prefeitura" }, { status: 500 });
  }
}
