import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { resolveUserId } from "@/lib/resolve-user";

// GET - Listar todas as demandas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const prefectureId = searchParams.get("prefectureId");
    const assignedToId = searchParams.get("assignedToId");

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (prefectureId) where.prefectureId = prefectureId;
    if (assignedToId) where.assignedToId = assignedToId;

    const demands = await prisma.demand.findMany({
      where,
      include: {
        prefecture: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { history: true },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(demands);
  } catch (error: any) {
    console.error("Erro ao buscar demandas: - route.ts:51", error);
    return NextResponse.json(
      { error: "Erro ao buscar demandas" },
      { status: 500 }
    );
  }
}

// POST - Criar nova demanda
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      priority,
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterCpf,
      dotacao,
      prefectureId,
      assignedToId,
      dueDate,
      attachments,
    } = body;

    // Validações
    if (!title || !description || !requesterName || !requesterEmail) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Gerar número de protocolo único
    const year = new Date().getFullYear();
    const lastDemand = await prisma.demand.findFirst({
      where: {
        protocolNumber: {
          startsWith: `${year}-`,
        },
      },
      orderBy: { protocolNumber: "desc" },
    });

    let protocolNumber;
    if (lastDemand) {
      const lastNumber = parseInt(lastDemand.protocolNumber.split("-")[1]);
      protocolNumber = `${year}-${String(lastNumber + 1).padStart(6, "0")}`;
    } else {
      protocolNumber = `${year}-000001`;
    }

    // Criar demanda
    const demand = await prisma.demand.create({
      data: {
        protocolNumber,
        title,
        description,
        priority: priority || "MEDIA",
        requesterName,
        requesterEmail,
        requesterPhone,
        requesterCpf,
        dotacao,
        prefectureId,
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        attachments: attachments || [],
        createdBy: userId,
      },
      include: {
        prefecture: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Criar histórico
    await prisma.demandHistory.create({
      data: {
        demandId: demand.id,
        userName: session.user.name || "Sistema",
        action: "CRIADA",
        newValue: `Protocolo: ${protocolNumber}`,
        comment: "Demanda criada no sistema",
      },
    });

    // Log de auditoria
    await createAuditLog({
      userId,
      userName: session.user.name || "Usuário",
      action: "CREATE",
      entity: "Demand",
      entityId: demand.id,
      entityName: demand.title,
      details: `Demanda criada - Protocolo: ${protocolNumber}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    });

    // Enviar email para o requerente
    try {
      await sendEmail({
        to: requesterEmail,
        subject: `Demanda Registrada - Protocolo ${protocolNumber}`,
        notificationId: process.env.NOTIF_ID_DOCUMENTO_ENVIADO_PARA_ASSINATURA || "default",
        html: `
          <h2>Demanda Registrada com Sucesso!</h2>
          <p>Olá <strong>${requesterName}</strong>,</p>
          <p>Sua demanda foi registrada com sucesso!</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Protocolo:</strong> ${protocolNumber}</p>
            <p><strong>Título:</strong> ${title}</p>
            <p><strong>Status:</strong> ABERTA</p>
            ${prefectureId ? `<p><strong>Prefeitura:</strong> ${demand.prefecture?.name}</p>` : ""}
          </div>
          <p>Você receberá atualizações sobre o andamento da sua solicitação.</p>
          <p>Atenciosamente,<br><strong>Equipe Cimagflow</strong></p>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email: - route.ts:183", emailError);
    }

    // Notificar usuário atribuído, se existir
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: "DEMANDA_ATRIBUIDA",
          title: "Nova Demanda Atribuída",
          message: `Demanda #${protocolNumber} foi atribuída a você: ${title}`,
          link: `/demandas/${demand.id}`,
        },
      });
    }

    return NextResponse.json(demand, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar demanda: - route.ts:201", error);
    return NextResponse.json(
      { error: "Erro ao criar demanda" },
      { status: 500 }
    );
  }
}
