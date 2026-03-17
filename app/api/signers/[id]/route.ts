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
    const signer = await prisma.signer.findUnique({ where: { id: params.id } });
    if (!signer) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ signer });
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
    const signer = await prisma.signer.update({ where: { id: params.id }, data: body });

    const user = session.user as any;
    await auditLog(req as any, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "signer",
      entityId: signer.id,
      entityName: signer.name,
      details: `Assinante atualizado: ${signer.name} - ${signer.email}`,
    });

    return NextResponse.json({ signer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Buscar assinante antes de deletar para audit log
    const signer = await prisma.signer.findUnique({
      where: { id: params.id },
    });

    await prisma.signer.delete({ where: { id: params.id } });

    if (signer) {
      const user = session.user as any;
      await auditLog(req as any, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "signer",
        entityId: signer.id,
        entityName: signer.name,
        details: `Assinante excluído: ${signer.name} - ${signer.email}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
