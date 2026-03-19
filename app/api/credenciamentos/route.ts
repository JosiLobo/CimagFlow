import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { protocolNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { requesterName: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "TODOS") {
      where.status = status;
    }

    const [credenciamentos, total] = await Promise.all([
      prisma.credenciamento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          prefecture: { select: { name: true, city: true, state: true } },
          assignedTo: { select: { name: true } },
          reviewer: { select: { name: true } },
        },
      }),
      prisma.credenciamento.count({ where }),
    ]);

    return NextResponse.json({ credenciamentos, total, page, limit });
  } catch (error) {
    console.error("Error fetching credenciamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar credenciamentos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
      publicSubmission,
    } = body;

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
        publicSubmission: publicSubmission !== undefined ? publicSubmission : true,
      },
      include: {
        prefecture: true,
      },
    });

    // Criar histórico inicial
    await prisma.credenciamentoHistory.create({
      data: {
        credenciamentoId: credenciamento.id,
        userName: publicSubmission ? requesterName : (session?.user as any)?.name || requesterName,
        action: "CRIADO",
        comment: "Credenciamento criado",
      },
    });

    // Registrar auditoria se for usuário autenticado
    if (session) {
      const user = session!.user as any;
      await auditLog(request, {
        userId: user.id,
        userName: user.name || user.email,
        action: "CREATE",
        entity: "credenciamento",
        entityId: credenciamento.id,
        entityName: `${protocolNumber} - ${companyName}`,
        details: `Credenciamento criado: ${companyName}, Protocolo: ${protocolNumber}`,
      });
    }

    // Notificar admins sobre novo credenciamento
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          isActive: true,
        },
        select: { id: true },
      });

      const notificationPromises = admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: "CREDENCIAMENTO_NOVO",
            title: "🏢 Novo Credenciamento",
            message: `Novo credenciamento recebido de ${companyName} (Protocolo: ${protocolNumber})`,
            link: `/credenciamentos/${credenciamento.id}`,
          },
        })
      );

      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error("Erro ao criar notificações:", notificationError);
      // Não falha a requisição se as notificações falharem
    }

    return NextResponse.json({ credenciamento, protocolNumber }, { status: 201 });
  } catch (error) {
    console.error("Error creating credenciamento:", error);
    return NextResponse.json({ error: "Erro ao criar credenciamento" }, { status: 500 });
  }
}
