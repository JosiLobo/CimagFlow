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

    const bid = await prisma.bid.findUnique({
      where: { id: params.id },
      include: {
        prefecture: true,
        creator: { select: { name: true } },
        documents: { include: { signers: { include: { signer: true } } } },
      },
    });

    if (!bid) {
      return NextResponse.json({ error: "Edital não encontrado" }, { status: 404 });
    }

    return NextResponse.json(bid);
  } catch (error) {
    console.error("Error fetching bid:", error);
    return NextResponse.json({ error: "Erro ao buscar edital" }, { status: 500 });
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

    const allowedFields = [
      "number", "title", "description", "type", "status",
      "openingDate", "closingDate", "value", "prefectureId",
      "fileUrl", "fileName", "fileSize",
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key] || null;
      }
    }
    // Keep required string fields as strings (not null)
    if (body.number) updateData.number = body.number;
    if (body.title) updateData.title = body.title;
    if (body.type) updateData.type = body.type;
    if (body.status) updateData.status = body.status;
    if (typeof body.description === "string") updateData.description = body.description || null;
    // Convert types
    if (body.openingDate) updateData.openingDate = new Date(body.openingDate);
    if (body.closingDate) updateData.closingDate = new Date(body.closingDate);
    if (body.value) updateData.value = parseFloat(body.value);
    if (body.fileSize) updateData.fileSize = parseInt(body.fileSize);
    // File fields: keep as string or null
    if (typeof body.fileUrl === "string") updateData.fileUrl = body.fileUrl || null;
    if (typeof body.fileName === "string") updateData.fileName = body.fileName || null;

    const bid = await prisma.bid.update({
      where: { id: params.id },
      data: updateData,
      include: {
        prefecture: true,
        creator: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    });

    await auditLog(request, {
      userId: sessionUser.id,
      userName: sessionUser.name || sessionUser.email,
      action: "UPDATE",
      entity: "bid",
      entityId: bid.id,
      entityName: bid.number + " - " + bid.title,
      details: `Edital atualizado: ${bid.number} - ${bid.title}`,
    });

    return NextResponse.json(bid);
  } catch (error) {
    console.error("Error updating bid:", error);
    return NextResponse.json({ error: "Erro ao atualizar edital" }, { status: 500 });
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

    // Buscar dados antes de deletar para auditoria
    const bid = await prisma.bid.findUnique({
      where: { id: params.id },
      select: { id: true, number: true, title: true },
    });

    await prisma.bid.delete({ where: { id: params.id } });

    if (bid) {
      await auditLog(request, {
        userId: sessionUser.id,
        userName: sessionUser.name || sessionUser.email,
        action: "DELETE",
        entity: "bid",
        entityId: bid.id,
        entityName: bid.number + " - " + bid.title,
        details: `Edital excluído: ${bid.number} - ${bid.title}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bid:", error);
    return NextResponse.json({ error: "Erro ao excluir edital" }, { status: 500 });
  }
}