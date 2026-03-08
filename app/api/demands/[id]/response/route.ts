import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { responseAttachments, responseComment } = await req.json();

    // Buscar a demanda
    const demand = await prisma.demand.findUnique({
      where: { id: params.id },
      include: {
        prefecture: true,
      },
    });

    if (!demand) {
      return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
    }

    // Buscar o usuário atual
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // Atualizar a demanda com os arquivos de resposta
    const updated = await prisma.demand.update({
      where: { id: params.id },
      data: {
        responseAttachments: responseAttachments || [],
        responseComment: responseComment || null,
      },
      include: {
        assignedTo: true,
        prefecture: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Criar entrada no histórico
    await prisma.demandHistory.create({
      data: {
        demandId: params.id,
        userId: user?.id,
        userName: user?.name || session.user.name || "Sistema",
        action: "RESPOSTA_ENVIADA",
        comment: responseComment,
      },
    });

    // Enviar email para o solicitante
    try {
      const filesList = responseAttachments && responseAttachments.length > 0
        ? `\n\nArquivos anexados: ${responseAttachments.length} documento(s)`
        : "";

      await sendEmail({
        to: demand.requesterEmail,
        subject: `Resposta para sua Demanda #${demand.protocolNumber}`,
        notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO || "default",
        html: `
          <h2>Nova Resposta para sua Demanda</h2>
          <p>Olá <strong>${demand.requesterName}</strong>,</p>
          <p>Recebemos uma nova resposta para sua demanda:</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Protocolo:</strong> ${demand.protocolNumber}</p>
            <p><strong>Título:</strong> ${demand.title}</p>
            <p><strong>Status:</strong> ${demand.status}</p>
          </div>
          ${responseComment ? `<p><strong>Comentário:</strong></p><p>${responseComment}</p>` : ""}
          ${filesList}
          <p>Você pode consultar o status e visualizar os documentos através do link:<br>
          ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/consulta-protocolo</p>
          <p>Atenciosamente,<br><strong>Equipe Cimagflow</strong></p>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      // Não falhar a requisição se o email falhar
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao enviar resposta:", error);
    return NextResponse.json(
      { error: "Erro ao enviar resposta" },
      { status: 500 }
    );
  }
}
