import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Buscar template e dados relacionados para o formulário
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const [template, prefectures, companies, bids, folders, signers] = await Promise.all([
      prisma.template.findUnique({ where: { id: params.id } }),
      prisma.prefecture.findMany({ orderBy: { name: "asc" } }),
      prisma.company.findMany({ orderBy: { name: "asc" } }),
      prisma.bid.findMany({ include: { prefecture: true }, orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ 
        where: { createdBy: (session.user as any).id }, 
        include: { prefecture: { select: { id: true, name: true, city: true, state: true } } },
        orderBy: { name: "asc" } 
      }),
      prisma.signer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);

    if (!template) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

    return NextResponse.json({ template, prefectures, companies, bids, folders, signers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Criar documento a partir do modelo
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await req.json();
    const { title, variables, customContent, folderId, signerIds, sendAfterCreate } = body;

    const template = await prisma.template.findUnique({ where: { id: params.id } });
    if (!template) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

    // Se tiver customContent (editado inline), usar diretamente; senão substituir variáveis
    let content = template.content;
    if (customContent) {
      content = customContent;
    } else {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        content = content.replace(regex, String(value ?? ""));
      }
    }

    // Criar documento
    const doc = await prisma.document.create({
      data: {
        title: title || template.name,
        description: `Documento criado a partir do modelo: ${template.name}`,
        content,
        status: "RASCUNHO",
        createdBy: userId,
        folderId: folderId || null,
        templateId: params.id,
        signers: signerIds?.length ? {
          create: signerIds.map((signerId: string, idx: number) => ({
            signerId,
            order: idx,
          })),
        } : undefined,
      },
      include: { signers: { include: { signer: true } } },
    });

    // Se solicitado, enviar para assinatura
    if (sendAfterCreate && doc.signers.length > 0) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "EM_ANDAMENTO" },
      });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar documento" }, { status: 500 });
  }
}
