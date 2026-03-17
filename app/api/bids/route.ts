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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { number: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "TODOS") {
      where.status = status;
    }

    if (type && type !== "TODOS") {
      where.type = type;
    }

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          prefecture: true,
          creator: { select: { name: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.bid.count({ where }),
    ]);

    return NextResponse.json({ bids, total, page, limit });
  } catch (error) {
    console.error("Error fetching bids:", error);
    return NextResponse.json({ error: "Erro ao buscar editais" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("POST /api/bids: Não autorizado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let userId = (session.user as any)?.id;
    console.log("POST /api/bids: userId da sessão:", userId);

    // Verificar se o usuário existe, se não pegar o primeiro admin
    let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    
    if (!user) {
      console.log("POST /api/bids: Usuário da sessão não encontrado, buscando admin...");
      user = await prisma.user.findFirst({ 
        where: { role: "ADMIN", isActive: true },
        orderBy: { createdAt: "asc" }
      });
      
      if (!user) {
        console.error("POST /api/bids: Nenhum admin encontrado no sistema");
        return NextResponse.json({ error: "Erro de configuração do sistema" }, { status: 500 });
      }
      
      userId = user.id;
      console.log("POST /api/bids: Usando admin:", user.email, userId);
    }

    const body = await request.json();
    console.log("POST /api/bids: Body recebido:", JSON.stringify(body, null, 2));
    
    const { number, title, description, type, status, openingDate, closingDate, value, fileUrl, fileName, fileSize } = body;

    if (!number || !title) {
      console.log("POST /api/bids: Dados inválidos - número ou título faltando");
      return NextResponse.json({ error: "Número e título são obrigatórios" }, { status: 400 });
    }

    const bidData = {
      number: String(number).trim(),
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      type: type || "PREGAO_ELETRONICO",
      status: status || "ABERTO",
      openingDate: openingDate && openingDate !== "" ? new Date(openingDate) : null,
      closingDate: closingDate && closingDate !== "" ? new Date(closingDate) : null,
      value: value && value !== "" ? parseFloat(value) : null,
      prefectureId: null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize ? parseInt(String(fileSize)) : null,
      createdBy: userId,
    };

    console.log("POST /api/bids: Dados a inserir:", JSON.stringify(bidData, null, 2));
    console.log("POST /api/bids: Criando edital no banco...");
    
    const bid = await prisma.bid.create({
      data: bidData,
      include: { 
        prefecture: true,
        creator: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    });

    console.log("POST /api/bids: Edital criado com sucesso:", bid.id);
    
    // Auditoria
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "bid",
      entityId: bid.id,
      entityName: bid.number + " - " + bid.title,
      details: `Edital criado: ${bid.number} - ${bid.title}, Tipo: ${bid.type}, Status: ${bid.status}`,
    });
    
    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error("POST /api/bids: Erro ao criar edital:", error);
    console.error("POST /api/bids: Stack trace:", error instanceof Error ? error.stack : "");
    return NextResponse.json({ 
      error: "Erro ao criar edital",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 });
  }
}
