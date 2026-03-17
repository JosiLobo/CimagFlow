import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: { 
        signers: true,
        bid: { select: { id: true, title: true, number: true } }
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: "Erro ao buscar empresa" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const company = await prisma.company.update({
      where: { id: params.id },
      data: body,
    });

    // Auditoria
    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "company",
      entityId: company.id,
      entityName: company.name,
      details: `Empresa atualizada: ${company.name}`,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Erro ao atualizar empresa" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar dados antes de deletar
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await prisma.company.delete({ where: { id: params.id } });

    // Auditoria
    if (company) {
      const user = session.user as any;
      await auditLog(request, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "company",
        entityId: company.id,
        entityName: company.name,
        details: `Empresa excluída: ${company.name}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Erro ao excluir empresa" }, { status: 500 });
  }
}
