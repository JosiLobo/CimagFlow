import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Aprovar, rejeitar ou cancelar adesão
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { status, reviewComment } = body;

    if (!status || !["APROVADA", "REJEITADA", "CANCELADA"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const adhesion = await prisma.minuteAdhesion.update({
      where: { id: params.id },
      data: {
        status,
        reviewComment,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        minute: {
          select: {
            number: true,
            title: true,
          },
        },
      },
    });

    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "adhesion",
      entityId: adhesion.id,
      entityName: `${adhesion.minute.number} - ${adhesion.minute.title}`,
      details: `Adesão ${status === "APROVADA" ? "aprovada" : status === "REJEITADA" ? "rejeitada" : "cancelada"}: ${adhesion.minute.number} - ${adhesion.minute.title}`,
    });

    return NextResponse.json(adhesion);
  } catch (error) {
    console.error("Error updating adhesion:", error);
    return NextResponse.json({ error: "Erro ao atualizar adesão" }, { status: 500 });
  }
}

// Excluir adesão
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar adesão antes de deletar para audit log
    const adhesion = await prisma.minuteAdhesion.findUnique({
      where: { id: params.id },
      include: {
        minute: {
          select: {
            number: true,
            title: true,
          },
        },
      },
    });

    await prisma.minuteAdhesion.delete({
      where: { id: params.id },
    });

    if (adhesion) {
      const user = session.user as any;
      await auditLog(request, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "adhesion",
        entityId: adhesion.id,
        entityName: `${adhesion.minute.number} - ${adhesion.minute.title}`,
        details: `Adesão excluída: ${adhesion.minute.number} - ${adhesion.minute.title}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting adhesion:", error);
    return NextResponse.json({ error: "Erro ao excluir adesão" }, { status: 500 });
  }
}
