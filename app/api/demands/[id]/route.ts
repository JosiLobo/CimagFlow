import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

// GET - Buscar detalhes de uma demanda
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const demand = await prisma.demand.findUnique({
      where: { id: params.id },
      include: {
        prefecture: true,
        assignedTo: {
          select: { id: true, name: true, email: true, photo: true },
        },
        creator: {
          select: { id: true, name: true, email: true, photo: true },
        },
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!demand) {
      return NextResponse.json(
        { error: "Demanda não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(demand);
  } catch (error: any) {
    console.error("Erro ao buscar demanda:", error);
    return NextResponse.json(
      { error: "Erro ao buscar demanda" },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar demanda
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      priority,
      status,
      assignedToId,
      dueDate,
      internalNotes,
      resolution,
      attachments,
    } = body;

    // Buscar demanda atual
    const currentDemand = await prisma.demand.findUnique({
      where: { id: params.id },
      include: { assignedTo: true },
    });

    if (!currentDemand) {
      return NextResponse.json(
        { error: "Demanda não encontrada" },
        { status: 404 }
      );
    }

    // Preparar dados de atualização
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "CONCLUIDA") {
        updateData.resolvedAt = new Date();
      }
    }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (attachments !== undefined) updateData.attachments = attachments;

    // Atualizar demanda
    const demand = await prisma.demand.update({
      where: { id: params.id },
      data: updateData,
      include: {
        prefecture: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Criar registros de histórico para mudanças importantes
    const historyRecords = [];

    if (status && status !== currentDemand.status) {
      historyRecords.push({
        demandId: demand.id,
        userName: session.user.name || "Sistema",
        action: "STATUS_ALTERADO",
        oldValue: currentDemand.status,
        newValue: status,
        comment: `Status alterado de ${currentDemand.status} para ${status}`,
      });

      // Se concluída, notificar requerente
      if (status === "CONCLUIDA") {
        try {
          await sendEmail({
            to: demand.requesterEmail,
            subject: `Demanda Concluída - Protocolo ${demand.protocolNumber}`,
            notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO || "default",
            html: `
              <h2>Demanda Concluída!</h2>
              <p>Olá <strong>${demand.requesterName}</strong>,</p>
              <p>Sua demanda foi concluída!</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Protocolo:</strong> ${demand.protocolNumber}</p>
                <p><strong>Título:</strong> ${demand.title}</p>
                <p><strong>Status:</strong> CONCLUÍDA</p>
                ${resolution ? `<p><strong>Resolução:</strong> ${resolution}</p>` : ""}
              </div>
              <p>Atenciosamente,<br><strong>Equipe Cimagflow</strong></p>
            `,
          });
        } catch (emailError) {
          console.error("Erro ao enviar email:", emailError);
        }

        // Notificar prefeitura se existir
        if (demand.prefectureId && demand.prefecture?.email) {
          try {
            await sendEmail({
              to: demand.prefecture.email,
              subject: `Demanda Concluída - Protocolo ${demand.protocolNumber}`,
              notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO || "default",
              html: `
                <h2>Demanda Concluída</h2>
                <p>A demanda <strong>${demand.protocolNumber}</strong> foi concluída.</p>
                <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p><strong>Protocolo:</strong> ${demand.protocolNumber}</p>
                  <p><strong>Título:</strong> ${demand.title}</p>
                  <p><strong>Requerente:</strong> ${demand.requesterName}</p>
                  ${resolution ? `<p><strong>Resolução:</strong> ${resolution}</p>` : ""}
                </div>
                <p>Atenciosamente,<br><strong>Equipe Cimagflow</strong></p>
              `,
            });
          } catch (emailError) {
            console.error("Erro ao enviar email para prefeitura:", emailError);
          }
        }
      }
    }

    if (assignedToId && assignedToId !== currentDemand.assignedToId) {
      const oldAssigned = currentDemand.assignedTo?.name || "Nenhum";
      const newAssigned = demand.assignedTo?.name || "Nenhum";

      historyRecords.push({
        demandId: demand.id,
        userName: session.user.name || "Sistema",
        action: "ATRIBUICAO_ALTERADA",
        oldValue: oldAssigned,
        newValue: newAssigned,
        comment: `Atribuição alterada de ${oldAssigned} para ${newAssigned}`,
      });

      // Notificar novo responsável
      if (assignedToId) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: "DEMANDA_ATRIBUIDA",
            title: "Demanda Atribuída",
            message: `Demanda #${demand.protocolNumber} foi atribuída a você: ${demand.title}`,
            link: `/demandas/${demand.id}`,
          },
        });
      }
    }

    if (priority && priority !== currentDemand.priority) {
      historyRecords.push({
        demandId: demand.id,
        userName: session.user.name || "Sistema",
        action: "PRIORIDADE_ALTERADA",
        oldValue: currentDemand.priority,
        newValue: priority,
        comment: `Prioridade alterada de ${currentDemand.priority} para ${priority}`,
      });
    }

    // Criar todos os registros de histórico
    if (historyRecords.length > 0) {
      await prisma.demandHistory.createMany({
        data: historyRecords,
      });
    }

    // Log de auditoria
    await createAuditLog({
      userId: (session.user as any).id,
      userName: session.user.name || "Usuário",
      action: "UPDATE",
      entity: "Demand",
      entityId: demand.id,
      entityName: demand.title,
      details: `Demanda atualizada - Protocolo: ${demand.protocolNumber}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json(demand);
  } catch (error: any) {
    console.error("Erro ao atualizar demanda:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar demanda" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar demanda
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const demand = await prisma.demand.findUnique({
      where: { id: params.id },
    });

    if (!demand) {
      return NextResponse.json(
        { error: "Demanda não encontrada" },
        { status: 404 }
      );
    }

    await prisma.demand.delete({
      where: { id: params.id },
    });

    // Log de auditoria
    await createAuditLog({
      userId: (session.user as any).id,
      userName: session.user.name || "Usuário",
      action: "DELETE",
      entity: "Demand",
      entityId: demand.id,
      entityName: demand.title,
      details: `Demanda deletada - Protocolo: ${demand.protocolNumber}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar demanda:", error);
    return NextResponse.json(
      { error: "Erro ao deletar demanda" },
      { status: 500 }
    );
  }
}
