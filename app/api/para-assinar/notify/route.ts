import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { sendEmail, buildReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = (session.user as any).id;
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId é obrigatório" }, { status: 400 });
    }

    // Verify the document belongs to the user
    const document = await prisma.document.findFirst({
      where: { id: documentId, createdBy: userId },
      select: { id: true, title: true, deadline: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    // Get pending signers
    const pendingSigners = await prisma.documentSigner.findMany({
      where: { documentId, status: "PENDENTE" },
      include: { signer: { select: { name: true, email: true } } },
    });

    if (pendingSigners.length === 0) {
      return NextResponse.json({ error: "Nenhum assinante pendente" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Calculate days left if deadline exists
    let daysLeft: number | undefined;
    if (document.deadline) {
      const diff = new Date(document.deadline).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Send emails to all pending signers in parallel
    const results = await Promise.allSettled(
      pendingSigners.map(async (ds) => {
        const html = buildReminderEmail({
          signerName: ds.signer.name,
          documentTitle: document.title,
          signLink: `${baseUrl}/assinar/${ds.token}`,
          daysLeft,
        });
        return sendEmail({
          to: ds.signer.email,
          subject: `⏰ Lembrete: Assine o documento "${document.title}"`,
          html,
          notificationId: process.env.NOTIF_ID_LEMBRETE_ASSINATURA ?? "",
        });
      })
    );
    const notified = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    return NextResponse.json({ success: true, notified, total: pendingSigners.length });
  } catch (error) {
    console.error("Erro ao notificar pendentes: - route.ts:73", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
