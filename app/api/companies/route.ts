import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { tradeName: { contains: search, mode: "insensitive" as const } },
            { cnpj: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: { 
          _count: { select: { signers: true } },
          bid: { select: { id: true, title: true, number: true } }
        },
      }),
      prisma.company.count({ where }),
    ]);

    return NextResponse.json({ companies, total, page, limit });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Erro ao buscar empresas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, tradeName, cnpj, address, city, state, phone, email, contactName, cep, number, complement, isCredenciada, bidId } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: { 
        name, 
        tradeName, 
        cnpj, 
        address, 
        city, 
        state, 
        phone, 
        email, 
        contactName,
        cep,
        number,
        complement,
        isCredenciada: isCredenciada || false,
        bidId: bidId || null,
      },
    });

    // Auditoria
    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "company",
      entityId: company.id,
      entityName: company.name,
      details: `Empresa criada: ${company.name}${cnpj ? ` (CNPJ: ${cnpj})` : ''}`,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}
