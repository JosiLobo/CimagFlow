import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Buscar demanda por número de protocolo (rota pública)
export async function GET(
  req: NextRequest,
  { params }: { params: { protocol: string } }
) {
  try {
    const demand = await prisma.demand.findUnique({
      where: { protocolNumber: params.protocol },
      include: {
        prefecture: {
          select: { id: true, name: true, city: true, state: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        history: {
          where: {
            action: {
              in: ["CRIADA", "STATUS_ALTERADO", "CONCLUIDA"],
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            action: true,
            newValue: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!demand) {
      return NextResponse.json(
        { error: "Protocolo não encontrado" },
        { status: 404 }
      );
    }

    // Retornar apenas informações públicas
    return NextResponse.json({
      protocolNumber: demand.protocolNumber,
      title: demand.title,
      status: demand.status,
      priority: demand.priority,
      createdAt: demand.createdAt,
      updatedAt: demand.updatedAt,
      resolvedAt: demand.resolvedAt,
      prefecture: demand.prefecture,
      history: demand.history,
    });
  } catch (error: any) {
    console.error("Erro ao buscar protocolo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar protocolo" },
      { status: 500 }
    );
  }
}
