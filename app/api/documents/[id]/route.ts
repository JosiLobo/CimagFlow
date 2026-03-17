import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { name: true, email: true } },
        signers: {
          include: { signer: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const doc = await prisma.document.update({
      where: { id: params.id },
      data: body,
    });

    const user = session.user as any;
    await auditLog(req as any, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "document",
      entityId: doc.id,
      entityName: doc.title,
      details: `Documento atualizado: ${doc.title}, Status: ${doc.status}`,
    });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Buscar documento antes de deletar para audit log
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
    });

    await prisma.document.delete({ where: { id: params.id } });

    if (doc) {
      const user = session.user as any;
      await auditLog(req as any, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "document",
        entityId: doc.id,
        entityName: doc.title,
        details: `Documento excluído: ${doc.title}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
