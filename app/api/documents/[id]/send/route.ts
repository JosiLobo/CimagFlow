import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { sendEmail, buildSignatureEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        signers: {
          include: { signer: true },
          orderBy: { order: "asc" },
        },
        creator: { select: { name: true } },
      },
    });

    if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (doc.signers.length === 0) return NextResponse.json({ error: "Adicione assinantes antes de enviar" }, { status: 400 });

    await prisma.document.update({
      where: { id: params.id },
      data: { status: "EM_ANDAMENTO" },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Enviar email apenas para o primeiro assinante (presidente/order=0)
    // Os demais serão notificados conforme a ordem quando o anterior assinar
    const firstSigner = doc.signers[0];

    if (firstSigner) {
      const signLink = `${baseUrl}/assinar/${firstSigner.token}`;
      const html = buildSignatureEmail({
        signerName: firstSigner.signer.name,
        documentTitle: doc.title,
        creatorName: doc.creator.name,
        message: doc.message ?? undefined,
        signLink,
        deadline: doc.deadline ? new Date(doc.deadline).toLocaleDateString("pt-BR") : undefined,
      });

      try {
        await sendEmail({
          to: firstSigner.signer.email,
          subject: `✍️ Documento para assinar: ${doc.title}`,
          html,
          notificationId: process.env.NOTIF_ID_DOCUMENTO_ENVIADO_PARA_ASSINATURA ?? "",
        });
      } catch (emailError) {
        console.error("Erro ao enviar email para primeiro assinante: - route.ts:58", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
