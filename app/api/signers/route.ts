import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, signers] = await Promise.all([
      prisma.signer.count({ where }),
      prisma.signer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({ signers, total, page, limit });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, cpf, type, municipality, company } = body;

    if (!name || !email) return NextResponse.json({ error: "Nome e email obrigatórios" }, { status: 400 });

    const signer = await prisma.signer.create({
      data: { name, email, phone: phone ?? null, cpf: cpf ?? null, type: type ?? "OUTRO", municipality: municipality ?? null, company: company ?? null },
    });

    const user = (session.user as any);
    await auditLog(req as any, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "signer",
      entityId: signer.id,
      entityName: signer.name,
      details: `Assinante criado: ${signer.name} - ${signer.email}${signer.company ? `, Empresa: ${signer.company}` : ""}`,
    });

    return NextResponse.json({ signer }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
