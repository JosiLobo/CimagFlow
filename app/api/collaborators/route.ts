import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json({ error: "Erro ao buscar colaboradores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "COLABORADOR",
        phone,
        permissions: body.permissions || [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    const admin = session.user as any;
    await auditLog(request, {
      userId: admin.id,
      userName: admin.name || admin.email,
      action: "CREATE",
      entity: "user",
      entityId: user.id,
      entityName: user.name || user.email,
      details: `Colaborador criado: ${user.name} - ${user.email}, Perfil: ${user.role}`,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating collaborator:", error);
    return NextResponse.json({ error: "Erro ao criar colaborador" }, { status: 500 });
  }
}
