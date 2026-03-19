import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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
    });

    const admin = session?.user as any;
    await auditLog(request, {
      userId: admin.id,
      userName: admin.name || admin.email,
      action: "UPDATE",
      entity: "user",
      entityId: user.id,
      entityName: user.name || user.email,
      details: `Colaborador atualizado: ${user.name} - ${user.email}, Perfil: ${user.role}, Ativo: ${user.isActive}`,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating collaborator:", error);
    return NextResponse.json({ error: "Erro ao atualizar colaborador" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;

    if (params.id === currentUserId) {
      return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
    }

    // Buscar colaborador antes de deletar para audit log
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.user.delete({ where: { id: params.id } });

    if (user) {
      const admin = session?.user as any;
      await auditLog(request, {
        userId: admin.id,
        userName: admin.name || admin.email,
        action: "DELETE",
        entity: "user",
        entityId: user.id,
        entityName: user.name || user.email,
        details: `Colaborador excluído: ${user.name} - ${user.email}, Perfil: ${user.role}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collaborator:", error);
    return NextResponse.json({ error: "Erro ao excluir colaborador" }, { status: 500 });
  }
}
