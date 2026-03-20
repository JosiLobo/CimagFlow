import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

const SYSTEM_DEFAULT_HEADER_IMAGE = process.env.NEXT_PUBLIC_SYSTEM_HEADER_IMAGE || "/system-header.svg";
const SYSTEM_DEFAULT_FOOTER_IMAGE = process.env.NEXT_PUBLIC_SYSTEM_FOOTER_IMAGE || "/system-footer.svg";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const template = await prisma.template.findUnique({ where: { id: params.id } });
    if (!template) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const body = await req.json();
    const data = {
      ...body,
      headerImage:
        body.headerImage === null || body.headerImage === ""
          ? SYSTEM_DEFAULT_HEADER_IMAGE
          : body.headerImage,
      footerImage:
        body.footerImage === null || body.footerImage === ""
          ? SYSTEM_DEFAULT_FOOTER_IMAGE
          : body.footerImage,
    };

    const template = await prisma.template.update({ where: { id: params.id }, data });

    const user = session?.user as any;
    await auditLog(req as any, {
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "template",
      entityId: template.id,
      entityName: template.name,
      details: `Template atualizado: ${template.name}`,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    });

    await prisma.template.delete({ where: { id: params.id } });

    if (template) {
      const user = session?.user as any;
      await auditLog(req as any, {
        userId: user.id,
        userName: user.name || user.email,
        action: "DELETE",
        entity: "template",
        entityId: template.id,
        entityName: template.name,
        details: `Template excluído: ${template.name}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}