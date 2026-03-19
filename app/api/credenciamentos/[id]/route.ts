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

    const credenciamento = await prisma.credenciamento.findUnique({
      where: { id: params.id },
      include: {
        prefecture: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!credenciamento) {
      return NextResponse.json({ error: "Credenciamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(credenciamento);
  } catch (error) {
    console.error("Error fetching credenciamento:", error);
    return NextResponse.json({ error: "Erro ao buscar credenciamento" }, { status: 500 });
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

    const user = session.user as any;
    const body = await request.json();

    // Buscar credenciamento atual para comparação
    const current = await prisma.credenciamento.findUnique({
      where: { id: params.id },
    });

    if (!current) {
      return NextResponse.json({ error: "Credenciamento não encontrado" }, { status: 404 });
    }

    const credenciamento = await prisma.credenciamento.update({
      where: { id: params.id },
      data: body,
      include: {
        prefecture: true,
      },
    });

    // Criar histórico de alterações
    const changes = [];
    if (body.status && body.status !== current.status) {
      changes.push(`Status: ${current.status} → ${body.status}`);
      
      await prisma.credenciamentoHistory.create({
        data: {
          credenciamentoId: credenciamento.id,
          userId: user.id,
          userName: user.name || user.email,
          action: "STATUS_ALTERADO",
          oldValue: current.status,
          newValue: body.status,
          comment: body.reviewComment || `Status alterado para ${body.status}`,
        },
      });

      // Notificar sobre mudança de status (geral)
      if (body.status === "EM_ANALISE" && current.assignedToId) {
        try {
          await prisma.notification.create({
            data: {
              userId: current.assignedToId,
              type: "CREDENCIAMENTO_STATUS",
              title: "📋 Status Atualizado",
              message: `Credenciamento de ${credenciamento.companyName} está agora EM ANÁLISE (${credenciamento.protocolNumber})`,
              link: `/credenciamentos/${params.id}`,
            },
          });
        } catch (notificationError) {
          console.error("Erro ao criar notificação:", notificationError);
        }
      }

      // Atualizar campos de revisão se aprovado/reprovado
      if (body.status === "APROVADO" || body.status === "REPROVADO") {
        await prisma.credenciamento.update({
          where: { id: params.id },
          data: {
            reviewedBy: user.id,
            reviewedAt: new Date(),
            resolvedAt: new Date(),
          },
        });

        // Notificar admins sobre decisão
        try {
          const admins = await prisma.user.findMany({
            where: {
              role: "ADMIN",
              isActive: true,
            },
            select: { id: true },
          });

          const notificationTitle = body.status === "APROVADO"
            ? "✅ Credenciamento Aprovado"
            : "❌ Credenciamento Reprovado";

          const notificationPromises = admins
            .filter(admin => admin.id !== user.id) // Não notificar quem fez a ação
            .map((admin) =>
              prisma.notification.create({
                data: {
                  userId: admin.id,
                  type: "CREDENCIAMENTO_STATUS",
                  title: notificationTitle,
                  message: `${credenciamento.companyName} foi ${body.status === "APROVADO" ? 'aprovado' : 'reprovado'} (${credenciamento.protocolNumber})`,
                  link: `/credenciamentos/${params.id}`,
                },
              })
            );

          await Promise.all(notificationPromises);
        } catch (notificationError) {
          console.error("Erro ao criar notificações:", notificationError);
        }
      }
    }

    if (body.assignedToId && body.assignedToId !== current.assignedToId) {
      await prisma.credenciamentoHistory.create({
        data: {
          credenciamentoId: credenciamento.id,
          userId: user.id,
          userName: user.name || user.email,
          action: "ATRIBUIDO",
          newValue: body.assignedToId,
          comment: "Credenciamento atribuído",
        },
      });

      // Notificar o usuário atribuído
      try {
        await prisma.notification.create({
          data: {
            userId: body.assignedToId,
            type: "CREDENCIAMENTO_ATRIBUIDO",
            title: "📎 Credenciamento Atribuído",
            message: `Você foi atribuído ao credenciamento de ${credenciamento.companyName} (${credenciamento.protocolNumber})`,
            link: `/credenciamentos/${params.id}`,
          },
        });
      } catch (notificationError) {
        console.error("Erro ao criar notificação:", notificationError);
      }
    }

    // Registrar auditoria
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "credenciamento",
      entityId: credenciamento.id,
      entityName: `${credenciamento.protocolNumber} - ${credenciamento.companyName}`,
      details: `Credenciamento atualizado: ${credenciamento.companyName}${changes.length > 0 ? `. ${changes.join(", ")}` : ""}`,
    });

    return NextResponse.json(credenciamento);
  } catch (error) {
    console.error("Error updating credenciamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar credenciamento" }, { status: 500 });
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

    const user = session.user as any;

    // Buscar credenciamento antes de deletar
    const credenciamento = await prisma.credenciamento.findUnique({
      where: { id: params.id },
    });

    if (!credenciamento) {
      return NextResponse.json({ error: "Credenciamento não encontrado" }, { status: 404 });
    }

    await prisma.credenciamento.delete({
      where: { id: params.id },
    });

    // Registrar auditoria
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "DELETE",
      entity: "credenciamento",
      entityId: credenciamento.id,
      entityName: `${credenciamento.protocolNumber} - ${credenciamento.companyName}`,
      details: `Credenciamento excluído: ${credenciamento.companyName}, Protocolo: ${credenciamento.protocolNumber}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credenciamento:", error);
    return NextResponse.json({ error: "Erro ao excluir credenciamento" }, { status: 500 });
  }
}
