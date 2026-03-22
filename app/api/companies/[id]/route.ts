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
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        signers: true,
        bid: { select: { id: true, title: true, number: true } },
        items: { orderBy: { name: "asc" } },
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
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { items, ...raw } = body;

    // Se items foi enviado, atualizar itens
    if (items !== undefined) {
      // Deletar itens existentes e recriar
      await prisma.companyItem.deleteMany({ where: { companyId: params.id } });
      if (items?.length) {
        await prisma.companyItem.createMany({
          data: items.map((item: { name: string; description?: string; unit?: string; quantity?: number; unitPrice?: number; totalPrice?: number }) => ({
            companyId: params.id,
            name: item.name,
            description: item.description || null,
            unit: item.unit || "UN",
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            totalPrice: item.totalPrice ?? 0,
          })),
        });
      }
    }

    // Sanitize: empty strings to null for optional/FK fields
    if (raw.bidId === "") raw.bidId = null;
    if (raw.itemsFileUrl === "") raw.itemsFileUrl = null;
    if (raw.itemsFileName === "") raw.itemsFileName = null;
    if (raw.tradeName === "") raw.tradeName = null;
    if (raw.complement === "") raw.complement = null;
    if (raw.contactName === "") raw.contactName = null;
    if (raw.city === "") raw.city = null;
    if (raw.state === "") raw.state = null;
    if (raw.number === "") raw.number = null;

    const company = await prisma.company.update({
      where: { id: params.id },
      data: raw,
      include: { items: { orderBy: { name: "asc" } } },
    });

    await auditLog(request, {
      userId: sessionUser.id,
      userName: sessionUser.name || sessionUser.email,
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
    const sessionUser = session?.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar dados antes de deletar
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await prisma.company.delete({ where: { id: params.id } });

    if (company) {
      await auditLog(request, {
        userId: sessionUser.id,
        userName: sessionUser.name || sessionUser.email,
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