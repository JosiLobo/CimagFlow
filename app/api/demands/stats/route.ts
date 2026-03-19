import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Estatísticas das demandas
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const [
      total,
      abertas,
      emAnalise,
      emAndamento,
      aguardandoResposta,
      concluidas,
      canceladas,
      byPriority,
      byPrefecture,
      recentDemands,
    ] = await Promise.all([
      prisma.demand.count(),
      prisma.demand.count({ where: { status: "ABERTA" } }),
      prisma.demand.count({ where: { status: "EM_ANALISE" } }),
      prisma.demand.count({ where: { status: "EM_ANDAMENTO" } }),
      prisma.demand.count({ where: { status: "AGUARDANDO_RESPOSTA" } }),
      prisma.demand.count({ where: { status: "CONCLUIDA" } }),
      prisma.demand.count({ where: { status: "CANCELADA" } }),
      prisma.demand.groupBy({
        by: ["priority"],
        _count: true,
      }),
      prisma.demand.groupBy({
        by: ["prefectureId"],
        _count: true,
        where: {
          prefectureId: { not: null },
        },
      }),
      prisma.demand.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          prefecture: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
    ]);

    const stats = {
      total,
      byStatus: {
        ABERTA: abertas,
        EM_ANALISE: emAnalise,
        EM_ANDAMENTO: emAndamento,
        AGUARDANDO_RESPOSTA: aguardandoResposta,
        CONCLUIDA: concluidas,
        CANCELADA: canceladas,
      },
      byPriority: byPriority.reduce((acc: Record<string, number>, item: { priority: string; _count: number }) => {
        acc[item.priority] = item._count;
        return acc;
      }, {}),
      byPrefecture: await (async () => {
        const prefIds = byPrefecture.map((p: { prefectureId: string | null }) => p.prefectureId).filter(Boolean) as string[];
        const prefs = await prisma.prefecture.findMany({
          where: { id: { in: prefIds } },
          select: { id: true, name: true },
        });
        const prefMap = new Map(prefs.map(p => [p.id, p.name]));
        return byPrefecture.map((item: { prefectureId: string | null; _count: number }) => ({
          prefectureId: item.prefectureId,
          prefectureName: prefMap.get(item.prefectureId ?? "") || "Desconhecida",
          count: item._count,
        }));
      })(),
      recentDemands,
    };

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}
