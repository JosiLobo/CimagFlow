import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// POST /api/demands/public - Criar demanda pública (sem autenticação)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      title,
      description,
      priority = "MEDIA",
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterCpf,
      dotacao,
      prefectureId,
    } = data;

    // Validações
    if (!title || !description || !requesterName || !requesterEmail || !prefectureId || !dotacao) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Verificar se prefeitura existe
    const prefecture = await prisma.prefecture.findUnique({
      where: { id: prefectureId },
    });

    if (!prefecture) {
      return NextResponse.json(
        { error: "Prefeitura não encontrada" },
        { status: 404 }
      );
    }

    // Gerar número de protocolo
    const currentYear = new Date().getFullYear();
    const lastDemand = await prisma.demand.findFirst({
      where: {
        protocolNumber: {
          startsWith: currentYear.toString(),
        },
      },
      orderBy: { protocolNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastDemand) {
      const lastNumber = parseInt(lastDemand.protocolNumber.substring(4));
      nextNumber = lastNumber + 1;
    }

    const protocolNumber = `${currentYear}-${nextNumber.toString().padStart(6, "0")}`;

    // Criar demanda
    const demand = await prisma.demand.create({
      data: {
        protocolNumber,
        title,
        description,
        status: "ABERTA",
        priority,
        requesterName,
        requesterEmail,
        requesterPhone,
        requesterCpf,
        dotacao,
        prefectureId,
        publicSubmission: true, // Flag para identificar que foi criada publicamente
      },
      include: {
        prefecture: true,
      },
    });

    // Criar histórico inicial
    await prisma.demandHistory.create({
      data: {
        demandId: demand.id,
        action: "CRIACAO",
        userName: requesterName,
        comment: "Demanda criada via formulário público",
      },
    });

    // Enviar email de confirmação para o requerente
    const confirmationEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Demanda Registrada com Sucesso!</h1>
        </div>
        
        <div style="background-color: #f7fafc; padding: 30px;">
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #718096; margin-bottom: 10px;">Número do Protocolo:</p>
            <p style="font-size: 32px; font-weight: bold; color: #667eea; margin: 0; text-align: center; letter-spacing: 2px;">
              ${protocolNumber}
            </p>
          </div>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="font-size: 18px; color: #2d3748; margin-top: 0;">Detalhes da Demanda</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #718096; font-size: 14px;">Título:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: 500;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-size: 14px;">Prefeitura:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: 500;">${prefecture.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-size: 14px;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #3182ce; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    ABERTA
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096; font-size: 14px;">Prioridade:</td>
                <td style="padding: 8px 0; color: #2d3748; font-weight: 500;">${priority}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #edf2f7; border-left: 4px solid #667eea; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px;">📋 Próximos Passos</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px; line-height: 1.6;">
              <li>Guarde este número de protocolo</li>
              <li>Você será notificado sobre atualizações</li>
              <li>Consulte o status a qualquer momento</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/consulta-protocolo?protocol=${protocolNumber}" 
               style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Consultar Demanda
            </a>
          </div>
        </div>

        <div style="background-color: #2d3748; padding: 20px; text-align: center;">
          <p style="color: #a0aec0; margin: 0; font-size: 12px;">
            Este é um email automático. Não responda a esta mensagem.
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: requesterEmail,
        subject: `Demanda Registrada - Protocolo ${protocolNumber}`,
        html: confirmationEmailHtml,
        notificationId: demand.id,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      // Não falhar a criação se o email falhar
    }

    // Criar notificação interna para a equipe (opcional)
    try {
      // Buscar um admin ou usuário ativo para notificar
      const adminUser = await prisma.user.findFirst({
        where: {
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminUser) {
        await prisma.notification.create({
          data: {
            userId: adminUser.id,
            title: "Nova Demanda Pública",
            message: `Nova demanda criada publicamente: ${title} (${protocolNumber})`,
            type: "info",
            link: `/demandas/${demand.id}`,
          },
        });
      }
    } catch (notifError) {
      console.error("Erro ao criar notificação:", notifError);
    }

    return NextResponse.json({
      success: true,
      protocolNumber: demand.protocolNumber,
      demandId: demand.id,
      message: "Demanda criada com sucesso! Você receberá um email de confirmação.",
    });

  } catch (error: any) {
    console.error("Erro ao criar demanda pública:", error);
    return NextResponse.json(
      { error: "Erro ao criar demanda" },
      { status: 500 }
    );
  }
}
