import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendEmail, buildCompletedEmail, buildSignatureEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const ds = await prisma.documentSigner.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            creator: { select: { name: true, email: true } },
            signers: {
              include: { signer: true },
              orderBy: { order: "asc" },
            },
          },
        },
        signer: true,
      },
    });

    if (!ds) return NextResponse.json({ error: "Token inválido" }, { status: 404 });

    // Verificar se é a vez deste assinante
    // Presidente/Prefeito (order=0) assina primeiro, depois todos os outros (order=1) simultaneamente
    const allSigners = ds.document.signers;
    const myOrder = allSigners.find(s => s.id === ds.id)?.order ?? 1;
    let canSign = true;
    let waitingFor: string | null = null;

    // Se meu order > 0, verificar se todos os assinantes com order menor já assinaram
    if (myOrder > 0) {
      const previousSigners = allSigners.filter(s => s.order < myOrder);
      for (const prev of previousSigners) {
        if (prev.status !== "ASSINADO") {
          canSign = false;
          waitingFor = prev.signer.name;
          break;
        }
      }
    }

    return NextResponse.json({
      documentSigner: {
        id: ds.id,
        status: ds.status,
        signedAt: ds.signedAt,
        canSign,
        waitingFor,
        signerOrder: (allSigners.findIndex(s => s.id === ds.id)) + 1,
        totalSigners: allSigners.length,
        document: {
          id: ds.document.id,
          title: ds.document.title,
          description: ds.document.description,
          content: ds.document.content,
          fileUrl: ds.document.fileUrl,
          message: ds.document.message,
          deadline: ds.document.deadline,
          creatorName: ds.document.creator.name,
        },
        signer: {
          name: ds.signer.name,
          email: ds.signer.email,
          cpfPrefix: ds.signer.cpf ? ds.signer.cpf.replace(/\D/g, "").slice(0, 5) : null,
        },
        // Mostrar status de todos os assinantes
        allSigners: allSigners.map((s, idx) => ({
          name: s.signer.name,
          type: s.signer.type,
          order: idx + 1,
          status: s.status,
          signedAt: s.signedAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/sign/[token]: - route.ts:81", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const { action, cpf, signatureImage } = body;

    const ds = await prisma.documentSigner.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            creator: { select: { name: true, email: true } },
            signers: {
              include: { signer: true },
              orderBy: { order: "asc" },
            },
          },
        },
        signer: true,
      },
    });

    if (!ds) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    if (ds.status !== "PENDENTE") return NextResponse.json({ error: "Documento já processado" }, { status: 400 });

    // Verificar ordem de assinatura (order-based)
    const allSigners = ds.document.signers;
    const myOrder = allSigners.find(s => s.id === ds.id)?.order ?? 1;

    // Se meu order > 0, verificar se todos com order menor já assinaram
    if (myOrder > 0) {
      const previousSigners = allSigners.filter(s => s.order < myOrder);
      for (const prev of previousSigners) {
        if (prev.status !== "ASSINADO") {
          return NextResponse.json({
            error: `Aguardando assinatura de ${prev.signer.name}. Você será notificado quando for sua vez.`,
          }, { status: 400 });
        }
      }
    }

    if (action === "sign") {
      // Validar CPF
      const cpfDigits = cpf?.replace(/\D/g, "") || "";
      if (cpfDigits.length !== 11) {
        return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
      }

      // Validar os 5 primeiros dígitos do CPF com o cadastrado
      if (ds.signer.cpf) {
        const registeredCpfDigits = ds.signer.cpf.replace(/\D/g, "");
        const cpfPrefix = cpfDigits.slice(0, 5);
        const registeredPrefix = registeredCpfDigits.slice(0, 5);

        if (cpfPrefix !== registeredPrefix) {
          return NextResponse.json({
            error: "Os 5 primeiros dígitos do CPF não conferem com o cadastro do assinante.",
          }, { status: 400 });
        }
      }

      // Validar assinatura (desenho)
      if (!signatureImage) {
        return NextResponse.json({ error: "Desenhe sua assinatura" }, { status: 400 });
      }
    }

    const newStatus = action === "sign" ? "ASSINADO" : "RECUSADO";
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")?.[0] ?? null;

    const updateData: Record<string, unknown> = {
      status: newStatus,
      signedAt: new Date(),
      tokenUsedAt: new Date(),
      ipAddress: ip,
    };
    if (action === "sign" && cpf) updateData.cpfUsed = cpf.replace(/\D/g, "");
    if (action === "sign" && signatureImage) updateData.signatureImage = signatureImage;

    await prisma.documentSigner.update({
      where: { token: params.token },
      data: updateData,
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    if (action === "sign") {
      // Verificar se todos assinaram
      const updatedSigners = await prisma.documentSigner.findMany({
        where: { documentId: ds.documentId },
        orderBy: { order: "asc" },
      });

      const allSigned = updatedSigners.every(s => s.status === "ASSINADO");

      if (allSigned) {
        // Todos assinaram - marcar documento como concluído
        await prisma.document.update({
          where: { id: ds.documentId },
          data: { status: "CONCLUIDO" },
        });

        // Notificar criador
        const html = buildCompletedEmail({
          creatorName: ds.document.creator.name,
          documentTitle: ds.document.title,
          totalSigners: ds.document.signers.length,
          documentLink: `${baseUrl}/documentos/${ds.documentId}`,
        });

        try {
          await sendEmail({
            to: ds.document.creator.email,
            subject: `✅ Documento assinado: ${ds.document.title}`,
            html,
            notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO ?? "",
          });
        } catch (emailError) {
          console.error("Erro ao enviar email de conclusão: - route.ts:204", emailError);
        }
      } else {
        // Notificar TODOS os assinantes pendentes que agora podem assinar
        // (quando o presidente assina, todos os order=1 são liberados simultaneamente)
        const pendingSigners = updatedSigners.filter(s => s.status === "PENDENTE");
        
        // Verificar quais pendentes agora podem assinar (todos com order menor já assinaram)
        for (const pending of pendingSigners) {
          const pendingOrder = pending.order;
          const allPreviousSigned = updatedSigners
            .filter(s => s.order < pendingOrder)
            .every(s => s.status === "ASSINADO");
          
          if (allPreviousSigned) {
            const signerFull = allSigners.find(s => s.id === pending.id);
            if (signerFull) {
              const signLink = `${baseUrl}/assinar/${pending.token}`;
              const html = buildSignatureEmail({
                signerName: signerFull.signer.name,
                documentTitle: ds.document.title,
                creatorName: ds.document.creator.name,
                message: ds.document.message ?? undefined,
                signLink,
                deadline: ds.document.deadline ? new Date(ds.document.deadline).toLocaleDateString("pt-BR") : undefined,
              });

              try {
                await sendEmail({
                  to: signerFull.signer.email,
                  subject: `✍️ Sua vez de assinar: ${ds.document.title}`,
                  html,
                  notificationId: process.env.NOTIF_ID_DOCUMENTO_ENVIADO_PARA_ASSINATURA ?? "",
                });
              } catch (emailError) {
                console.error("Erro ao enviar email para assinante: - route.ts:239", emailError);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("POST /api/sign/[token]: - route.ts:249", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
