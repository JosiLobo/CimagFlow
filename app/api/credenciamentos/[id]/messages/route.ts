import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/db";
import { authOptions } from "@/lib/auth-options";
import { sendEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET - Buscar mensagens do credenciamento
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const credId = params.id;

    const messages = await prisma.credenciamentoMessage.findMany({
      where: { credenciamentoId: credId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar mensagens" },
      { status: 500 }
    );
  }
}

// POST - Enviar mensagem do analista para a empresa
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const credId = params.id;
    const body = await request.json();
    const { message, attachments, isInternal, notifyPendency } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Mensagem não pode estar vazia" },
        { status: 400 }
      );
    }

    // Buscar credenciamento
    const credenciamento = await prisma.credenciamento.findUnique({
      where: { id: credId },
      select: {
        id: true,
        protocolNumber: true,
        title: true,
        requesterName: true,
        requesterEmail: true,
        companyName: true,
        status: true,
      },
    });

    if (!credenciamento) {
      return NextResponse.json(
        { error: "Credenciamento não encontrado" },
        { status: 404 }
      );
    }

    // Buscar usuário atual
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Criar mensagem
    const newMessage = await prisma.credenciamentoMessage.create({
      data: {
        credenciamentoId: credId,
        senderName: user.name,
        senderEmail: user.email,
        senderType: "ANALYST",
        userId: user.id,
        message: message.trim(),
        attachments: attachments || [],
        isInternal: isInternal || false,
        emailSent: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Se não for mensagem interna, enviar email para a empresa
    if (!isInternal) {
      const emailSubject = notifyPendency
        ? `[PENDÊNCIA] ${credenciamento.protocolNumber} - ${credenciamento.title}`
        : `Nova Mensagem - ${credenciamento.protocolNumber}`;

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1E3A5F 0%, #2E5984 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .protocol-box { background: white; border-left: 4px solid #1E3A5F; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #ddd; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #1E3A5F; color: white !important; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">
                ${notifyPendency ? '⚠️ Documentação Pendente' : '📧 Nova Mensagem'}
              </h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Credenciamento ${credenciamento.protocolNumber}</p>
            </div>
            <div class="content">
              ${notifyPendency ? `
                <div class="alert-box">
                  <h3 style="margin-top: 0; color: #856404;">⚠️ Ação Necessária</h3>
                  <p>Identificamos pendências na documentação enviada. Por favor, revise a mensagem abaixo e envie os documentos solicitados.</p>
                </div>
              ` : ''}
              
              <div class="protocol-box">
                <strong>Protocolo:</strong> ${credenciamento.protocolNumber}<br>
                <strong>Título:</strong> ${credenciamento.title}<br>
                <strong>Empresa:</strong> ${credenciamento.companyName}<br>
                <strong>Status:</strong> ${credenciamento.status}
              </div>

              <div class="message-box">
                <h3 style="margin-top: 0;">Mensagem do Analista:</h3>
                <p style="white-space: pre-wrap;">${message}</p>
                ${user.name ? `<p style="margin-top: 20px; color: #666;"><em>— ${user.name}</em></p>` : ''}
              </div>

              ${attachments && attachments.length > 0 ? `
                <div style="margin: 20px 0;">
                  <h4>📎 Anexos:</h4>
                  ${attachments.map((url: string) => {
                    const fileName = url.split('/').pop() || 'Documento';
                    return `<p><a href="${url}" style="color: #1E3A5F;">${decodeURIComponent(fileName)}</a></p>`;
                  }).join('')}
                </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px;">
                <p><strong>Para responder esta mensagem:</strong></p>
                <p>Responda este email diretamente que sua mensagem será registrada no sistema automaticamente.</p>
              </div>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática do sistema CimagFlow.</p>
              <p>© ${new Date().getFullYear()} CIMAG - Consórcio Intermunicipal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmail({
          to: credenciamento.requesterEmail,
          subject: emailSubject,
          html: emailHTML,
          notificationId: `credenciamento-${credId}-${Date.now()}`,
        });

        // Atualizar flag de email enviado
        await prisma.credenciamentoMessage.update({
          where: { id: newMessage.id },
          data: { emailSent: true },
        });
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Continua mesmo se o email falhar
      }
    }

    // Criar registro no histórico
    await prisma.credenciamentoHistory.create({
      data: {
        credenciamentoId: credId,
        userId: user.id,
        userName: user.name,
        action: isInternal ? "NOTA_INTERNA_ADICIONADA" : notifyPendency ? "PENDENCIA_ENVIADA" : "MENSAGEM_ENVIADA",
        comment: message.substring(0, 200),
      },
    });

    // Se for notificação de pendência, atualizar status para EM_ANALISE se ainda estiver PENDENTE
    if (notifyPendency && credenciamento.status === "PENDENTE") {
      await prisma.credenciamento.update({
        where: { id: credId },
        data: { status: "EM_ANALISE" },
      });

      await prisma.credenciamentoHistory.create({
        data: {
          credenciamentoId: credId,
          userId: user.id,
          userName: user.name,
          action: "STATUS_ALTERADO",
          oldValue: credenciamento.status,
          newValue: "EM_ANALISE",
          comment: "Status alterado devido a pendência de documentos",
        },
      });
    }

    // Auditoria
    await createAuditLog({
      entity: "CREDENCIAMENTO",
      entityId: credId,
      entityName: credenciamento.protocolNumber,
      action: isInternal ? "CREATE" : "SEND",
      userId: user.id,
      userName: user.name,
      details: isInternal ? `Nota interna adicionada` : `Mensagem enviada para ${credenciamento.requesterEmail}`,
    });

    // Notificar o usuário atribuído ao credenciamento (se houver e não for nota interna)
    if (!isInternal) {
      try {
        const credenciamentoWithAssigned = await prisma.credenciamento.findUnique({
          where: { id: credId },
          select: {
            assignedToId: true,
            assignedTo: {
              select: { id: true, name: true },
            },
          },
        });

        // Notificar o responsável se existir e não for o próprio usuário que enviou
        if (
          credenciamentoWithAssigned?.assignedToId &&
          credenciamentoWithAssigned.assignedToId !== user.id
        ) {
          await prisma.notification.create({
            data: {
              userId: credenciamentoWithAssigned.assignedToId,
              type: "CREDENCIAMENTO_MENSAGEM",
              title: notifyPendency
                ? "⚠️ Pendência Enviada"
                : "💬 Nova Mensagem em Credenciamento",
              message: `${user.name} enviou ${notifyPendency ? 'uma pendência' : 'uma mensagem'} no credenciamento ${credenciamento.protocolNumber} - ${credenciamento.companyName}`,
              link: `/credenciamentos/${credId}`,
            },
          });
        }
      } catch (notificationError) {
        console.error("Erro ao criar notificação:", notificationError);
        // Não falha a requisição se a notificação falhar
      }
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
