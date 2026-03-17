import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Helper para resolver o userId real do banco
async function resolveUserId(session: any): Promise<string | null> {
  const sessionId = session.user?.id;
  if (sessionId) {
    const user = await prisma.user.findUnique({ where: { id: sessionId }, select: { id: true } });
    if (user) return user.id;
  }
  const email = session.user?.email;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) return user.id;
  }
  return null;
}

// GET - Buscar template e dados relacionados para o formulário
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });

    const [template, prefectures, companies, bids, folders, signers, demands] = await Promise.all([
      prisma.template.findUnique({ where: { id: params.id } }),
      prisma.prefecture.findMany({ orderBy: { name: "asc" } }),
      prisma.company.findMany({ orderBy: { name: "asc" } }),
      prisma.bid.findMany({ include: { prefecture: true }, orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ 
        where: { createdBy: userId }, 
        include: { prefecture: { select: { id: true, name: true, city: true, state: true } } },
        orderBy: { name: "asc" } 
      }),
      prisma.signer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.demand.findMany({
        where: { status: { in: ["ABERTA", "EM_ANALISE", "EM_ANDAMENTO"] } },
        select: { id: true, protocolNumber: true, title: true, requesterName: true, requesterEmail: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!template) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

    return NextResponse.json({ template, prefectures, companies, bids, folders, signers, demands });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Criar documento a partir do modelo
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });

    const body = await req.json();
    const { title, variables, customContent, folderId, signerIds, sendAfterCreate, demandId } = body;

    const template = await prisma.template.findUnique({ where: { id: params.id } });
    if (!template) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

    // Se tiver customContent (editado inline), usar diretamente; senão substituir variáveis
    let content = template.content;
    if (customContent) {
      content = customContent;
    } else {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        content = content.replace(regex, String(value ?? ""));
      }
    }

    // Criar documento
    const doc = await prisma.document.create({
      data: {
        title: title || template.name,
        description: `Documento criado a partir do modelo: ${template.name}`,
        content,
        status: "RASCUNHO",
        createdBy: userId,
        folderId: folderId || null,
        templateId: params.id,
        demandId: demandId || null,
        signers: signerIds?.length ? {
          create: signerIds.map((signerId: string, idx: number) => ({
            signerId,
            order: idx,
          })),
        } : undefined,
      },
      include: { signers: { include: { signer: true } } },
    });

    // Se vinculado a uma demanda, registrar no histórico e notificar o solicitante
    if (demandId) {
      const demand = await prisma.demand.findUnique({
        where: { id: demandId },
        select: { protocolNumber: true, title: true, requesterEmail: true, requesterName: true },
      });

      if (demand) {
        const userName = (session.user as any).name || "Sistema";

        // Registrar no histórico da demanda
        await prisma.demandHistory.create({
          data: {
            demandId,
            userId,
            userName,
            action: "CONTRATO_GERADO",
            newValue: doc.title,
            comment: `Contrato "${doc.title}" gerado a partir do modelo "${template.name}"`,
          },
        });

        // Enviar email ao solicitante
        if (demand.requesterEmail) {
          const appUrl = process.env.NEXTAUTH_URL || "https://cimagflow.app";
          const consultaUrl = `${appUrl}/consulta-protocolo`;

          await sendEmail({
            to: demand.requesterEmail,
            subject: `Contrato Gerado - Protocolo ${demand.protocolNumber}`,
            html: buildContractNotificationEmail({
              requesterName: demand.requesterName || "Solicitante",
              demandTitle: demand.title,
              protocolNumber: demand.protocolNumber,
              documentTitle: doc.title,
              consultaUrl,
            }),
            notificationId: `contract-${doc.id}`,
          });
        }
      }
    }

    // Se solicitado, enviar para assinatura
    if (sendAfterCreate && doc.signers.length > 0) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "EM_ANDAMENTO" },
      });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar documento" }, { status: 500 });
  }
}

function buildContractNotificationEmail(params: {
  requesterName: string;
  demandTitle: string;
  protocolNumber: string;
  documentTitle: string;
  consultaUrl: string;
}) {
  const { requesterName, demandTitle, protocolNumber, documentTitle, consultaUrl } = params;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #10B981 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">📋 CimagFlow</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Notificação de Contrato</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151;">Olá, <strong>${requesterName}</strong>!</p>
        <p style="color: #6B7280;">Informamos que o contrato referente à sua demanda foi gerado com sucesso.</p>
        <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">Demanda:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1E3A5F;">${demandTitle}</p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #6B7280;">Protocolo: <strong>${protocolNumber}</strong></p>
        </div>
        <div style="background: #EFF6FF; border-left: 4px solid #1E3A5F; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #6B7280;">Contrato gerado:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1E3A5F;">${documentTitle}</p>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Você pode acompanhar o andamento da sua demanda consultando o protocolo:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${consultaUrl}" style="background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">🔍 Consultar Protocolo</a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Se o botão não funcionar, copie e cole o link: <br/><a href="${consultaUrl}" style="color: #10B981;">${consultaUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">Este e-mail foi enviado pelo CimagFlow. Não responda a este e-mail.</p>
      </div>
    </div>
  `;
}
