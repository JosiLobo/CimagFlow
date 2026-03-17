import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone ?? null,
        role: role ?? "COLABORADOR",
      },
    });

    // Registrar auditoria de criação de conta
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")?.[0] ?? req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entity: "user",
      entityId: user.id,
      entityName: `${user.name} - ${user.email}`,
      details: `Conta criada: ${user.name} - ${user.email}, Perfil: ${user.role}`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true, id: user.id }, { status: 201 });
  } catch (error) {
    console.error("Erro no signup:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
