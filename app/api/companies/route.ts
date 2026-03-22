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
          _count: { select: { signers: true, items: true } },
          bid: { select: { id: true, title: true, number: true } },
          items: { orderBy: { name: "asc" } },
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
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, tradeName, cnpj, address, city, state, phone, email, contactName, cep, number, complement, isCredenciada, bidId, items, itemsFileUrl, itemsFileName } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    if (!cnpj || cnpj.replace(/\D/g, "").length !== 14) {
      return NextResponse.json({ error: "CNPJ é obrigatório (14 dígitos)" }, { status: 400 });
    }

    if (!cep) return NextResponse.json({ error: "CEP é obrigatório" }, { status: 400 });
    if (!address) return NextResponse.json({ error: "Endereço é obrigatório" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Telefone é obrigatório" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    if (!number) return NextResponse.json({ error: "Número é obrigatório" }, { status: 400 });

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
        itemsFileUrl: itemsFileUrl || null,
        itemsFileName: itemsFileName || null,
        items: items?.length ? {
          create: items.map((item: { name: string; description?: string; unit?: string; quantity?: number; unitPrice?: number; totalPrice?: number }) => ({
            name: item.name,
            description: item.description || null,
            unit: item.unit || "UN",
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            totalPrice: item.totalPrice ?? 0,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    await auditLog(request, {
      userId: sessionUser.id,
      userName: sessionUser.name || sessionUser.email,
      action: "CREATE",
      entity: "company",
      entityId: company.id,
      entityName: company.name,
      details: `Empresa criada: ${company.name}${cnpj ? ` (CNPJ: ${cnpj})` : ""}`,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}