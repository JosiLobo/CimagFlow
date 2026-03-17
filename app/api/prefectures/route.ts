import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const isPublicRequest = !searchParams.has("page") && !searchParams.has("search");

    // Para requisições públicas (sem parâmetros), não requer autenticação
    if (!isPublicRequest) {
      const session = await getServerSession(authOptions);
      if (!(session?.user as any)?.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { state: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Para requisições públicas, retorna lista simples sem paginação
    if (isPublicRequest) {
      const prefectures = await prisma.prefecture.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      });
      return NextResponse.json(prefectures);
    }

    // Para requisições autenticadas, retorna com paginação e contadores
    const [prefectures, total] = await Promise.all([
      prisma.prefecture.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: { _count: { select: { signers: true, bids: true } } },
      }),
      prisma.prefecture.count({ where }),
    ]);

    return NextResponse.json({ prefectures, total, page, limit });
  } catch (error) {
    console.error("Error fetching prefectures:", error);
    return NextResponse.json({ error: "Erro ao buscar prefeituras" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, city, state, cnpj, address, phone, email, mayorName } = body;

    if (!name || !city || !state) {
      return NextResponse.json({ error: "Nome, cidade e estado são obrigatórios" }, { status: 400 });
    }

    const prefecture = await prisma.prefecture.create({
      data: { name, city, state, cnpj, address, phone, email, mayorName },
    });

    // Auditoria
    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "prefecture",
      entityId: prefecture.id,
      entityName: prefecture.name,
      details: `Prefeitura criada: ${prefecture.name} - ${prefecture.city}/${prefecture.state}`,
    });

    return NextResponse.json(prefecture, { status: 201 });
  } catch (error) {
    console.error("Error creating prefecture:", error);
    return NextResponse.json({ error: "Erro ao criar prefeitura" }, { status: 500 });
  }
}
