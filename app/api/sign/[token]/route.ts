import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendEmail, buildCompletedEmail, buildSignatureEmail, buildSignerCompletedEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { getFileUrl } from "@/lib/s3";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { writeFile, readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Função para embutir assinaturas no PDF
async function embedSignaturesInPdf(
  pdfBytes: Uint8Array,
  signers: { name: string; signatureImage: string | null; signedAt: Date | null; ipAddress: string | null }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Calcular espaço necessário
  const sigHeight = 90; // altura por assinatura (imagem + texto)
  const sigWidth = 220;
  const cols = 2;
  const rows = Math.ceil(signers.length / cols);
  const totalHeight = rows * sigHeight + 60; // +60 para título e margem

  // Pegar última página
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // Verificar se há espaço na última página (pelo menos totalHeight de espaço livre na parte inferior)
  // Vamos adicionar uma nova página para as assinaturas se necessário
  let targetPage = lastPage;
  let startY = totalHeight + 40; // Começar de baixo para cima

  // Se precisar mais espaço, criar nova página
  if (totalHeight > height * 0.4) {
    targetPage = pdfDoc.addPage([width, height]);
    startY = height - 40;
  } else {
    // Colocar antes do final da página
    startY = totalHeight + 30;
  }

  // Título "Assinaturas"
  const titleY = startY;
  targetPage.drawText("Assinaturas", {
    x: 40,
    y: titleY,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.37),
  });

  // Linha separadora
  targetPage.drawLine({
    start: { x: 40, y: titleY - 8 },
    end: { x: width - 40, y: titleY - 8 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Desenhar assinaturas
  for (let i = 0; i < signers.length; i++) {
    const s = signers[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 40 + col * (sigWidth + 40);
    const y = titleY - 30 - row * sigHeight;

    // Imagem da assinatura
    if (s.signatureImage) {
      try {
        const base64Data = s.signatureImage.replace(/^data:image\/png;base64,/, "");
        const sigImgBytes = Uint8Array.from(Buffer.from(base64Data, "base64"));
        const sigImg = await pdfDoc.embedPng(sigImgBytes);
        const sigDims = sigImg.scale(0.35);
        targetPage.drawImage(sigImg, {
          x,
          y: y - Math.min(sigDims.height, 40),
          width: Math.min(sigDims.width, 180),
          height: Math.min(sigDims.height, 40),
        });
      } catch (e) {
        console.error("Erro ao embutir imagem de assinatura:", e);
      }
    }

    // Linha sob a assinatura
    targetPage.drawLine({
      start: { x, y: y - 45 },
      end: { x: x + 180, y: y - 45 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Nome
    targetPage.drawText(s.name, {
      x,
      y: y - 57,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Data/hora
    if (s.signedAt) {
      const dt = new Date(s.signedAt);
      targetPage.drawText(
        `Assinado em ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR")}`,
        { x, y: y - 68, size: 7, font, color: rgb(0.4, 0.4, 0.4) }
      );
    }

    // IP
    if (s.ipAddress) {
      targetPage.drawText(`IP: ${s.ipAddress}`, {
        x,
        y: y - 78,
        size: 6,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  return pdfDoc.save();
}

type RouteParams = { token: string } | Promise<{ token: string }>;

export async function GET(req: Request, { params }: { params: RouteParams }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;
    const ds = await prisma.documentSigner.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            creator: { select: { name: true, email: true } },
            template: { select: { headerImage: true, footerImage: true } },
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

    // Gerar presigned URLs para arquivos S3
    async function resolveUrl(path: string | null | undefined): Promise<string | null> {
      if (!path) return null;
      // Normalize local paths: /public/uploads/x → /uploads/x
      if (path.startsWith("/public/")) path = path.replace("/public/", "/");
      if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
      try { return await getFileUrl(path); } catch { return null; }
    }

    const [resolvedFileUrl, resolvedHeader, resolvedFooter] = await Promise.all([
      resolveUrl(ds.document.fileUrl),
      resolveUrl(ds.document.template?.headerImage),
      resolveUrl(ds.document.template?.footerImage),
    ]);

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
          fileUrl: resolvedFileUrl,
          message: ds.document.message,
          deadline: ds.document.deadline,
          creatorName: ds.document.creator.name,
          headerImage: resolvedHeader,
          footerImage: resolvedFooter,
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
          signatureImage: s.signatureImage ?? null,
          ipAddress: s.ipAddress ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/sign/[token]: - route.ts:81", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: RouteParams }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;
    const body = await req.json();
    const { action, cpf, signatureImage } = body;

    const ds = await prisma.documentSigner.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            creator: { select: { name: true, email: true } },
            template: { select: { headerImage: true, footerImage: true } },
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
      where: { token },
      data: updateData,
    });

    // Registrar auditoria de assinatura/recusa
    await createAuditLog({
      userId: ds.signer.id,
      userName: ds.signer.name,
      action: action === "sign" ? "SIGN" : "REFUSE",
      entity: "document",
      entityId: ds.document.id,
      entityName: ds.document.title,
      details: action === "sign" 
        ? `Documento assinado: ${ds.document.title} por ${ds.signer.name}`
        : `Documento recusado: ${ds.document.title} por ${ds.signer.name}`,
      ipAddress: ip || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
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
        const creatorHtml = buildCompletedEmail({
          creatorName: ds.document.creator.name,
          documentTitle: ds.document.title,
          totalSigners: ds.document.signers.length,
          documentLink: `${baseUrl}/documentos/${ds.documentId}`,
        });

        // Buscar assinantes atualizados com imagens de assinatura
        const signersWithSignatures = await prisma.documentSigner.findMany({
          where: { documentId: ds.documentId },
          include: { signer: true },
          orderBy: { order: "asc" },
        });

        // Gerar HTML do contrato com assinaturas para anexo
        const attachments: { filename: string; content: string }[] = [];
        if (ds.document.content) {
          const headerImg = ds.document.template?.headerImage;
          const footerImg = ds.document.template?.footerImage;
          const contractHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${ds.document.title}</title>
<style>
  @page { margin: 0; }
  body { margin: 0; font-family: 'Times New Roman', Georgia, serif; color: #1f2937; }
  .page { max-width: 210mm; margin: 0 auto; }
  .content { padding: 40px; font-size: 14px; line-height: 1.6; }
  img.header, img.footer { width: 100%; height: auto; }
  .signatures { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .sig-grid { display: flex; flex-wrap: wrap; gap: 24px; }
  .sig-item { text-align: center; flex: 1; min-width: 200px; }
  .sig-item img { height: 60px; margin: 0 auto 4px; }
  .sig-name { font-weight: bold; font-size: 13px; border-top: 1px solid #9ca3af; padding-top: 4px; }
  .sig-date { font-size: 11px; color: #6b7280; }
</style></head><body>
<div class="page">
  ${headerImg ? `<img class="header" src="${headerImg}" />` : ""}
  <div class="content">${ds.document.content}</div>
  <div class="content signatures">
    <h3>Assinaturas</h3>
    <div class="sig-grid">
      ${signersWithSignatures.map(s => `
        <div class="sig-item">
          ${s.signatureImage ? `<img src="${s.signatureImage}" />` : ""}
          <div class="sig-name">${s.signer.name}</div>
          <div class="sig-date">${s.signedAt ? `Assinado em ${new Date(s.signedAt).toLocaleDateString("pt-BR")} às ${new Date(s.signedAt).toLocaleTimeString("pt-BR")}` : ""}</div>
          ${s.ipAddress ? `<div class="sig-date">IP: ${s.ipAddress}</div>` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ${footerImg ? `<img class="footer" src="${footerImg}" />` : ""}
</div></body></html>`;
          attachments.push({ filename: `${ds.document.title.replace(/[^a-zA-Z0-9À-ú ]/g, "")}.html`, content: contractHtml });
        }

        // Se tem PDF anexo, embutir assinaturas dentro do PDF
        if (ds.document.fileUrl) {
          try {
            let pdfBytes: Uint8Array | null = null;
            const fileUrl = ds.document.fileUrl;

            // Carregar PDF (local ou S3)
            if (fileUrl.startsWith("/uploads/") || fileUrl.startsWith("/public/uploads/")) {
              const localPath = path.join(process.cwd(), "public", fileUrl.replace(/^\/public/, "").replace(/^\//, ""));
              pdfBytes = new Uint8Array(await readFile(localPath));
            } else {
              const { getFileUrl } = await import("@/lib/s3");
              const pdfUrl = await getFileUrl(fileUrl, true);
              const pdfRes = await fetch(pdfUrl);
              if (pdfRes.ok) {
                pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
              }
            }

            if (pdfBytes) {
              // Embutir assinaturas no PDF
              const signedPdfBytes = await embedSignaturesInPdf(
                pdfBytes,
                signersWithSignatures.map(s => ({
                  name: s.signer.name,
                  signatureImage: s.signatureImage,
                  signedAt: s.signedAt,
                  ipAddress: s.ipAddress,
                }))
              );

              // Salvar PDF assinado (local ou S3)
              if (fileUrl.startsWith("/uploads/") || fileUrl.startsWith("/public/uploads/")) {
                const localPath = path.join(process.cwd(), "public", fileUrl.replace(/^\/public/, "").replace(/^\//, ""));
                await writeFile(localPath, new Uint8Array(signedPdfBytes));
              } else {
                try {
                  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
                  const { createS3Client, getBucketConfig } = await import("@/lib/aws-config");
                  const client = createS3Client();
                  const { bucketName } = getBucketConfig();
                  await client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: fileUrl,
                    Body: Buffer.from(signedPdfBytes),
                    ContentType: "application/pdf",
                  }));
                } catch (s3Err) {
                  console.error("Erro ao salvar PDF assinado no S3:", s3Err);
                }
              }

              // Adicionar PDF assinado como anexo no email
              const ext = ds.document.fileName?.split(".").pop() || "pdf";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              attachments.push({ filename: `${ds.document.title.replace(/[^a-zA-Z0-9À-ú ]/g, "")}_assinado.${ext}`, content: Buffer.from(signedPdfBytes) as any });
            }
          } catch (err) {
            console.error("Erro ao embutir assinaturas no PDF:", err);
            // Fallback: anexar PDF original
            try {
              const { getFileUrl } = await import("@/lib/s3");
              const pdfUrl = await getFileUrl(ds.document.fileUrl, true);
              const pdfRes = await fetch(pdfUrl);
              if (pdfRes.ok) {
                const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                const ext = ds.document.fileName?.split(".").pop() || "pdf";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                attachments.push({ filename: `${ds.document.title.replace(/[^a-zA-Z0-9À-ú ]/g, "")}.${ext}`, content: pdfBuffer as any });
              }
            } catch (fallbackErr) {
              console.error("Erro ao buscar PDF original:", fallbackErr);
            }
          }
        }

        try {
          await sendEmail({
            to: ds.document.creator.email,
            subject: `✅ Documento assinado: ${ds.document.title}`,
            html: creatorHtml,
            notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO ?? "",
            attachments: attachments.length ? attachments : undefined,
          });
        } catch (emailError) {
          console.error("Erro ao enviar email de conclusão ao criador:", emailError);
        }

        // Notificar TODOS os assinantes que o documento foi concluído
        for (const signerDs of allSigners) {
          const signerHtml = buildSignerCompletedEmail({
            signerName: signerDs.signer.name,
            documentTitle: ds.document.title,
            creatorName: ds.document.creator.name,
            viewLink: `${baseUrl}/assinar/${signerDs.token}`,
          });

          try {
            await sendEmail({
              to: signerDs.signer.email,
              subject: `✅ Contrato concluído: ${ds.document.title}`,
              html: signerHtml,
              notificationId: process.env.NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO ?? "",
              attachments: attachments.length ? attachments : undefined,
            });
          } catch (emailError) {
            console.error(`Erro ao enviar email de conclusão para ${signerDs.signer.email}:`, emailError);
          }
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
