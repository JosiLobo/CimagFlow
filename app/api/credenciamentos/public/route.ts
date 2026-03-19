import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterCpf,
      requesterCnpj,
      companyName,
      tradeName,
      fantasyName,
      companyAddress,
      companyCity,
      companyState,
      companyCep,
      companyPhone,
      companyEmail,
      title,
      description,
      activityArea,
      requestedServices,
      priority,
      prefectureId,
      attachments,
    } = body;

    // Validações
    if (!requesterName || !requesterEmail || !requesterPhone || !requesterCpf || !requesterCnpj) {
      return NextResponse.json(
        { error: "Nome, email, telefone, CPF e CNPJ do solicitante são obrigatórios" },
        { status: 400 }
      );
    }

    if (!companyName || !title || !description) {
      return NextResponse.json(
        { error: "Nome da empresa, título e descrição são obrigatórios" },
        { status: 400 }
      );
    }

    if (!companyAddress || !companyCity || !companyState || !companyCep || !companyPhone || !companyEmail) {
      return NextResponse.json(
        { error: "Endereço completo, telefone e email da empresa são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Gerar número de protocolo único
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const protocolNumber = `CRED-${year}${month}${day}-${random}`;

    const credenciamento = await prisma.credenciamento.create({
      data: {
        protocolNumber,
        requesterName,
        requesterEmail,
        requesterPhone,
        requesterCpf,
        requesterCnpj,
        companyName,
        tradeName,
        fantasyName,
        companyAddress,
        companyCity,
        companyState,
        companyCep,
        companyPhone,
        companyEmail,
        title,
        description,
        activityArea,
        requestedServices,
        priority: priority || "MEDIA",
        prefectureId,
        attachments: attachments || [],
        publicSubmission: true,
        status: "PENDENTE",
      },
      include: {
        prefecture: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Criar histórico inicial
    await prisma.credenciamentoHistory.create({
      data: {
        credenciamentoId: credenciamento.id,
        userName: requesterName,
        action: "CRIADO",
        comment: "Solicitação de credenciamento criada via portal público",
      },
    });

    // Enviar email de confirmação para o solicitante
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1E3A5F 0%, #0D2340 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .protocol { background: white; border: 2px solid #1E3A5F; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .protocol-number { font-size: 28px; font-weight: bold; color: #1E3A5F; font-family: monospace; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1E3A5F; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Solicitação de Credenciamento Recebida</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${requesterName}</strong>!</p>
              
              <p>Sua solicitação de credenciamento foi registrada com sucesso em nosso sistema.</p>
              
              <div class="protocol">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Número do Protocolo:</p>
                <div class="protocol-number">${protocolNumber}</div>
              </p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">📋 Detalhes da Solicitação</h3>
                <p><strong>Empresa:</strong> ${companyName}</p>
                <p><strong>Título:</strong> ${title}</p>
                <p><strong>Prefeitura:</strong> ${credenciamento.prefecture?.name || ""}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">🔍 Próximos Passos</h3>
                <ul>
                  <li>Sua solicitação será analisada por nossa equipe</li>
                  <li>Você receberá notificações sobre mudanças no status</li>
                  <li>Use o número do protocolo para consultar o andamento</li>
                  <li>Guarde este email para referência futura</li>
                </ul>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <strong>Dúvidas?</strong><br>
                Entre em contato conosco através do email: contato@cimag.com.br
              </p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática. Por favor, não responda este email.</p>
              <p>© ${new Date().getFullYear()} CIMAG - Consórcio Intermunicipal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: requesterEmail,
        subject: `Credenciamento Recebido - Protocolo ${protocolNumber}`,
        html: emailHtml,
        notificationId: process.env.NOTIF_ID_CREDENCIAMENTO_CRIADO || "default",
      });
    } catch (emailError) {
      console.error("Erro ao enviar email de confirmação:", emailError);
      // Não falhar a requisição por erro no envio de email
    }

    return NextResponse.json(
      {
        success: true,
        protocolNumber,
        credenciamento: {
          id: credenciamento.id,
          protocolNumber: credenciamento.protocolNumber,
          status: credenciamento.status,
          createdAt: credenciamento.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating public credenciamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar solicitação de credenciamento" },
      { status: 500 }
    );
  }
}
