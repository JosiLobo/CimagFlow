import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { secret } = body;

    // Simple secret to prevent unauthorized access
    if (secret !== "setup-admin-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hash = await bcrypt.hash("admin123", 12);
    const user = await prisma.user.upsert({
      where: { email: "admin@signflow.com" },
      update: {
        password: hash,
        isActive: true,
        role: "ADMIN",
        name: "Administrador",
      },
      create: {
        name: "Administrador",
        email: "admin@signflow.com",
        password: hash,
        role: "ADMIN",
        phone: "11977777777",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error("Erro setup-admin:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error?.message },
      { status: 500 }
    );
  }
}
