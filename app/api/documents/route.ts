import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: any = { createdBy: userId };
    if (status && status !== "TODOS") where.status = status;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [total, docs] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          signers: { include: { signer: { select: { name: true, email: true } } } },
        },
      }),
    ]);

    return NextResponse.json({ documents: docs, total, page, limit });
  } catch (error) {
    console.error("GET /api/documents - route.ts:41", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "Sessão inválida. Faça logout e login novamente." }, { status: 401 });
    const body = await req.json();
    const { title, description, fileUrl, fileName, fileSize, message, deadline, reminderDays, signerIds, folderId } = body;

    if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

    const document = await prisma.document.create({
      data: {
        title,
        description: description ?? null,
        fileUrl: fileUrl ?? null,
        fileName: fileName ?? null,
        fileSize: fileSize ?? null,
        message: message ?? null,
        deadline: deadline ? new Date(deadline) : null,
        reminderDays: reminderDays ?? 3,
        status: "RASCUNHO",
        createdBy: userId,
        folderId: folderId ?? null,
      },
    });

    if (signerIds?.length > 0) {
      // Buscar dados dos assinantes para ordenar corretamente
      const signers = await prisma.signer.findMany({
        where: { id: { in: signerIds } },
        select: { id: true, type: true },
      });

      // Presidente/Prefeito assina primeiro (order=0), todos os outros assinam depois (order=1) simultaneamente
      const signerTypeMap = new Map(signers.map(s => [s.id, String(s.type)]));

      // Separar presidente/prefeito dos demais
      const presidenteIds = signerIds.filter((id: string) => {
        const type = signerTypeMap.get(id) || "";
        return type === "PRESIDENTE" || type === "PREFEITO";
      });
      const outrosIds = signerIds.filter((id: string) => {
        const type = signerTypeMap.get(id) || "";
        return type !== "PRESIDENTE" && type !== "PREFEITO";
      });

      // Presidente com order=0, todos os outros com order=1 (assinam simultaneamente)
      const signerData = [
        ...presidenteIds.map((id: string) => ({
          documentId: document.id,
          signerId: id,
          order: 0,
        })),
        ...outrosIds.map((id: string) => ({
          documentId: document.id,
          signerId: id,
          order: 1,
        })),
      ];

      await prisma.documentSigner.createMany({ data: signerData });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/documents - route.ts:113", error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || "Erro interno" }, { status: 500 });
  }
}
