import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { resolveUserId } from "@/lib/resolve-user";

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
    console.error("Erro ao buscar demanda: - route.ts:45", error);
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
      prefectureId,
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
    if (prefectureId !== undefined) updateData.prefectureId = prefectureId;
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

      // Notificar requerente sobre mudanças de status importantes
      const statusToNotify = ["EM_ANDAMENTO", "AGUARDANDO_RESPOSTA", "CONCLUIDA"];
      if (statusToNotify.includes(status)) {
        const statusMessages: { [key: string]: string } = {
          EM_ANDAMENTO: "Sua demanda está em andamento e sendo processada pela equipe.",
          AGUARDANDO_RESPOSTA: "Sua demanda está aguardando resposta. Em breve você receberá mais informações.",
          CONCLUIDA: "Sua demanda foi concluída com sucesso!",
        };

        try {
          await sendEmail({
            to: demand.requesterEmail,
            subject: `Atualização de Demanda - Protocolo ${demand.protocolNumber}`,
            notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO || "default",
            html: `
              <h2>Atualização de Demanda</h2>
              <p>Olá <strong>${demand.requesterName}</strong>,</p>
              <p>Sua demanda foi atualizada!</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Protocolo:</strong> ${demand.protocolNumber}</p>
                <p><strong>Título:</strong> ${demand.title}</p>
                <p><strong>Novo Status:</strong> ${status}</p>
              </div>
              <p>${statusMessages[status]}</p>
              ${resolution && status === "CONCLUIDA" ? `<p><strong>Resolução:</strong> ${resolution}</p>` : ""}
              <p>Você pode consultar o status completo através do link:<br>
              ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/consulta-protocolo</p>
              <p>Atenciosamente,<br><strong>Equipe Cimagflow</strong></p>
            `,
          });
        } catch (emailError) {
          console.error("Erro ao enviar email: - route.ts:165", emailError);
        }
      }

      // Se concluída, notificar prefeitura também
      if (status === "CONCLUIDA" && demand.prefectureId && demand.prefecture?.email) {
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
          console.error("Erro ao enviar email para prefeitura: - route.ts:189", emailError);
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

    // Registrar alteração de data limite e notificar o solicitante
    if (dueDate !== undefined) {
      const oldDate = currentDemand.dueDate
        ? new Date(currentDemand.dueDate).toLocaleDateString("pt-BR")
        : "Não definida";
      const newDate = dueDate
        ? new Date(dueDate).toLocaleDateString("pt-BR")
        : "Removida";

      if (
        (dueDate && !currentDemand.dueDate) ||
        (!dueDate && currentDemand.dueDate) ||
        (dueDate && currentDemand.dueDate && new Date(dueDate).toISOString() !== new Date(currentDemand.dueDate).toISOString())
      ) {
        historyRecords.push({
          demandId: demand.id,
          userName: session.user.name || "Sistema",
          action: "PRAZO_ALTERADO",
          oldValue: oldDate,
          newValue: newDate,
          comment: `Data limite alterada de ${oldDate} para ${newDate}`,
        });

        // Notificar solicitante por email
        if (demand.requesterEmail) {
          const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://cimagflow.app";
          const consultaUrl = `${appUrl}/consulta-protocolo`;

          try {
            await sendEmail({
              to: demand.requesterEmail,
              subject: `Prazo Atualizado - Protocolo ${demand.protocolNumber}`,
              notificationId: `duedate-${demand.id}-${Date.now()}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
                  <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">📅 CimagFlow</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Atualização de Prazo</p>
                  </div>
                  <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
                    <p style="font-size: 16px; color: #374151;">Olá, <strong>${demand.requesterName}</strong>!</p>
                    <p style="color: #6B7280;">O prazo da sua demanda foi atualizado.</p>
                    <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; border-radius: 4px; margin: 20px 0;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">Demanda:</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1E3A5F;">${demand.title}</p>
                      <p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;">Protocolo: <strong>${demand.protocolNumber}</strong></p>
                    </div>
                    <div style="background: #FFF7ED; border-left: 4px solid #F97316; padding: 16px; border-radius: 4px; margin: 20px 0;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">Nova data limite:</p>
                      <p style="margin: 0; font-size: 20px; font-weight: 700; color: #EA580C;">${newDate}</p>
                      ${oldDate !== "Não definida" ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9CA3AF;">Anterior: ${oldDate}</p>` : ""}
                    </div>
                    <p style="color: #6B7280; font-size: 14px;">Você pode acompanhar o andamento da sua demanda consultando o protocolo:</p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${consultaUrl}" style="background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">🔍 Consultar Protocolo</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                    <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Este e-mail foi enviado pelo CimagFlow. Não responda a este e-mail.</p>
                  </div>
                </div>
              `,
            });
          } catch (emailError) {
            console.error("Erro ao enviar email de prazo: - route.ts:295", emailError);
          }
        }
      }
    }

    // Criar todos os registros de histórico
    if (historyRecords.length > 0) {
      await prisma.demandHistory.createMany({
        data: historyRecords,
      });
    }

    // Resolver userId para auditoria
    const userId = await resolveUserId(session);

    // Log de auditoria
    await createAuditLog({
      userId: userId || undefined,
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
    console.error("Erro ao atualizar demanda: - route.ts:325", error);
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

    // Desvincular documentos associados antes de deletar
    await prisma.document.updateMany({
      where: { demandId: params.id },
      data: { demandId: null },
    });

    await prisma.demand.delete({
      where: { id: params.id },
    });

    // Log de auditoria
    const deleteUserId = await resolveUserId(session);
    await createAuditLog({
      userId: deleteUserId || undefined,
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
    console.error("Erro ao deletar demanda: - route.ts:380", error);
    return NextResponse.json(
      { error: "Erro ao deletar demanda" },
      { status: 500 }
    );
  }
}
