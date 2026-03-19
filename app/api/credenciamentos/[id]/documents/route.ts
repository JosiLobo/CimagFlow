import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Buscar aprovações de documentos
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const credenciamento = await prisma.credenciamento.findUnique({
      where: { id: params.id },
      select: {
        attachments: true,
        documentsApproval: true,
      },
    });

    if (!credenciamento) {
      return NextResponse.json(
        { error: "Credenciamento não encontrado" },
        { status: 404 }
      );
    }

    // Parse do JSON de aprovações
    let approvals = [];
    if (credenciamento.documentsApproval) {
      try {
        approvals = JSON.parse(credenciamento.documentsApproval);
      } catch (e) {
        approvals = [];
      }
    }

    // Se ainda não há aprovações registradas, criar estrutura inicial
    if (approvals.length === 0 && credenciamento.attachments.length > 0) {
      approvals = credenciamento.attachments.map((url) => ({
        url,
        name: url.split("/").pop() || "Documento",
        status: "PENDING", // PENDING, APPROVED, REJECTED
        reviewedBy: null,
        reviewedAt: null,
        comment: null,
      }));
    }

    return NextResponse.json({
      attachments: credenciamento.attachments,
      approvals,
    });
  } catch (error) {
    console.error("Erro ao buscar documentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar documentos" },
      { status: 500 }
    );
  }
}

// POST - Aprovar/Reprovar documento
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { documentUrl, status, comment } = body;

    if (!documentUrl || !status) {
      return NextResponse.json(
        { error: "URL do documento e status são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Buscar credenciamento
    const credenciamento = await prisma.credenciamento.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        attachments: true,
        documentsApproval: true,
        protocolNumber: true,
      },
    });

    if (!credenciamento) {
      return NextResponse.json(
        { error: "Credenciamento não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o documento existe nos attachments
    if (!credenciamento.attachments.includes(documentUrl)) {
      return NextResponse.json(
        { error: "Documento não encontrado nos anexos" },
        { status: 404 }
      );
    }

    // Parse das aprovações existentes
    let approvals = [];
    if (credenciamento.documentsApproval) {
      try {
        approvals = JSON.parse(credenciamento.documentsApproval);
      } catch (e) {
        approvals = [];
      }
    }

    // Se não há estrutura, criar
    if (approvals.length === 0) {
      approvals = credenciamento.attachments.map((url) => ({
        url,
        name: url.split("/").pop() || "Documento",
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
        comment: null,
      }));
    }

    // Atualizar o status do documento específico
    const docIndex = approvals.findIndex((doc: any) => doc.url === documentUrl);
    
    if (docIndex === -1) {
      // Adicionar novo documento
      approvals.push({
        url: documentUrl,
        name: documentUrl.split("/").pop() || "Documento",
        status,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        comment: comment || null,
      });
    } else {
      // Atualizar existente
      approvals[docIndex] = {
        ...approvals[docIndex],
        status,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        comment: comment || null,
      };
    }

    // Salvar no banco
    await prisma.credenciamento.update({
      where: { id: params.id },
      data: {
        documentsApproval: JSON.stringify(approvals),
      },
    });

    // Criar histórico
    await prisma.credenciamentoHistory.create({
      data: {
        credenciamentoId: params.id,
        userId: user.id,
        userName: user.name,
        action:
          status === "APPROVED"
            ? "DOCUMENTO_APROVADO"
            : status === "REJECTED"
            ? "DOCUMENTO_REPROVADO"
            : "DOCUMENTO_REVISADO",
        comment: `Documento ${documentUrl.split("/").pop()} ${
          status === "APPROVED"
            ? "aprovado"
            : status === "REJECTED"
            ? "reprovado"
            : "marcado como pendente"
        }${comment ? `: ${comment}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error("Erro ao aprovar/reprovar documento:", error);
    return NextResponse.json(
      { error: "Erro ao processar documento" },
      { status: 500 }
    );
  }
}
