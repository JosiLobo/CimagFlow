import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Buscar credenciamento por número de protocolo (pública)
export async function GET(
  request: NextRequest,
  { params }: { params: { protocol: string } }
) {
  try {
    const protocolNumber = params.protocol;

    if (!protocolNumber) {
      return NextResponse.json(
        { error: "Número de protocolo é obrigatório" },
        { status: 400 }
      );
    }

    const credenciamento = await prisma.credenciamento.findUnique({
      where: { protocolNumber },
      select: {
        id: true,
        protocolNumber: true,
        companyName: true,
        tradeName: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        requesterName: true,
        requesterEmail: true,
        requesterPhone: true,
        activityArea: true,
        requestedServices: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        rejectedAt: true,
        analysisNotes: true,
        rejectionReason: true,
        reviewer: {
          select: {
            name: true,
            email: true,
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            userName: true,
            comment: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
          },
        },
      },
    });

    if (!credenciamento) {
      return NextResponse.json(
        { error: "Credenciamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(credenciamento);
  } catch (error) {
    console.error("Erro ao buscar credenciamento por protocolo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar credenciamento" },
      { status: 500 }
    );
  }
}
