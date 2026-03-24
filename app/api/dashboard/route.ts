import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { resolveUserId } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodDays = parseInt(searchParams.get("period") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const userId = await resolveUserId(session) || (session.user as any).id;
    const userEmail = session.user?.email ?? "";
    const docsWhere = { createdBy: userId };
    const templatesWhere = { createdBy: userId };
    const foldersWhere = { createdBy: userId };

    // ─── Batch 1: All counts + groupBys in parallel ───
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Período anterior para comparação
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
    const previousPeriodEnd = new Date(startDate);

    const [
      totalDocuments, docsByStatus, docsInPeriod, docsInPreviousPeriod,
      totalDemands, demandsByStatus, demandsByPriority, demandsInPeriod, demandsCompletedInPeriod, demandsInPreviousPeriod,
      totalBids, bidsByStatus,
      totalPrefectures, activePrefectures,
      totalCompanies, activeCompanies,
      totalSigners, activeSigners,
      totalTemplates, totalFolders,
      totalUsers, activeUsers,
      totalMinutes, minutesByStatus,
      totalCredenciamentos,
      totalAdhesions, adhesionsByStatus,
      pendingToSign, totalSignatures, signedSignatures, signaturesByStatus,
      publicDemands, internalDemands,
      topPrefecturesRaw,
      resolvedDemands,
      docsByMonth, demandsByMonth,
      recentActivity,
    ] = await Promise.all([
      prisma.document.count({ where: docsWhere }),
      prisma.document.groupBy({ by: ["status"], where: docsWhere, _count: true }),
      prisma.document.count({ where: { ...docsWhere, createdAt: { gte: startDate } } }),
      prisma.document.count({ where: { ...docsWhere, createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } } }),
      prisma.demand.count(),
      prisma.demand.groupBy({ by: ["status"], _count: true }),
      prisma.demand.groupBy({ by: ["priority"], _count: true }),
      prisma.demand.count({ where: { createdAt: { gte: startDate } } }),
      prisma.demand.count({ where: { status: "CONCLUIDA", resolvedAt: { gte: startDate } } }),
      prisma.demand.count({ where: { createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } } }),
      prisma.bid.count(),
      prisma.bid.groupBy({ by: ["status"], _count: true }),
      prisma.prefecture.count(),
      prisma.prefecture.count({ where: { isActive: true } }),
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.signer.count(),
      prisma.signer.count({ where: { isActive: true } }),
      prisma.template.count({ where: templatesWhere }),
      prisma.folder.count({ where: foldersWhere }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.minutesOfMeeting.count(),
      prisma.minutesOfMeeting.groupBy({ by: ["status"], _count: true }),
      prisma.credenciamento.count(),
      prisma.minuteAdhesion.count(),
      prisma.minuteAdhesion.groupBy({ by: ["status"], _count: true }),
      prisma.documentSigner.count({ where: { status: "PENDENTE", document: { status: "EM_ANDAMENTO" } } }),
      prisma.documentSigner.count(),
      prisma.documentSigner.count({ where: { status: "ASSINADO" } }),
      prisma.documentSigner.groupBy({ by: ["status"], _count: true }),
      prisma.demand.count({ where: { publicSubmission: true } }),
      prisma.demand.count({ where: { publicSubmission: false } }),
      prisma.demand.groupBy({
        by: ["prefectureId"],
        where: { prefectureId: { not: null } },
        _count: true,
        orderBy: { _count: { prefectureId: "desc" } },
        take: 5,
      }),
      prisma.demand.findMany({
        where: { status: "CONCLUIDA", resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 100, // menor para menos processamento
        orderBy: { resolvedAt: "desc" },
      }),
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
        FROM documents WHERE "createdAt" >= ${sixMonthsAgo} AND "createdBy" = ${userId}
        GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month ASC
      ` as Promise<{ month: Date; count: bigint }[]>,
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
        FROM demands WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month ASC
      ` as Promise<{ month: Date; count: bigint }[]>,
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5, // menos logs
        select: { id: true, action: true, entity: true, entityName: true, createdAt: true, userName: true, user: { select: { name: true } } },
      }),
    ]);

    // ─── Batch 2: Dependent queries ───
    const [prefInfos, recentDocs, recentDemands, completionRateByPriority] = await Promise.all([
      prisma.prefecture.findMany({
        where: { id: { in: topPrefecturesRaw.map((p) => p.prefectureId).filter((id): id is string => !!id) } },
        select: { id: true, name: true, city: true, state: true },
      }),
      prisma.document.findMany({
        where: docsWhere,
        orderBy: { createdAt: "desc" },
        take: 5, // menos documentos recentes
        select: {
          id: true, title: true, status: true, createdAt: true,
          signers: { select: { status: true } },
        },
      }),
      prisma.demand.findMany({
        orderBy: { createdAt: "desc" },
        take: 5, // menos demandas recentes
        select: {
          id: true, title: true, status: true, priority: true, protocolNumber: true, createdAt: true,
          prefecture: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
      (async () => {
        const raw = await prisma.demand.groupBy({
          by: ["priority", "status"],
          _count: true,
        });
        const labels: Record<string, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente" };
        return (["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const).map((p) => {
          const rows = raw.filter((r) => r.priority === p);
          const total = rows.reduce((s, r) => s + r._count, 0);
          const completed = rows.filter((r) => r.status === "CONCLUIDA").reduce((s, r) => s + r._count, 0);
          return { priority: labels[p], total, completed, rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0 };
        });
      })(),
    ]);

    // ─── Compute derived values ───
    let avgResolutionDays = 0;
    if (resolvedDemands.length > 0) {
      const totalDays = resolvedDemands.reduce((acc, d) => {
        return d.resolvedAt ? acc + (d.resolvedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24) : acc;
      }, 0);
      avgResolutionDays = Math.round((totalDays / resolvedDemands.length) * 10) / 10;
    }

    const topPrefectures = topPrefecturesRaw
      .map((p) => ({ prefecture: prefInfos.find((i) => i.id === p.prefectureId), count: p._count }))
      .filter((p) => p.prefecture);

    // Calcular variações percentuais
    const docsPeriodGrowth = docsInPreviousPeriod > 0 
      ? Math.round(((docsInPeriod - docsInPreviousPeriod) / docsInPreviousPeriod) * 100) 
      : 0;
    const demandsPeriodGrowth = demandsInPreviousPeriod > 0
      ? Math.round(((demandsInPeriod - demandsInPreviousPeriod) / demandsInPreviousPeriod) * 100)
      : 0;

    const responseData = {
      overview: {
        documents: { total: totalDocuments, period: docsInPeriod, previousPeriod: docsInPreviousPeriod, growth: docsPeriodGrowth },
        demands: { total: totalDemands, period: demandsInPeriod, completed: demandsCompletedInPeriod, previousPeriod: demandsInPreviousPeriod, growth: demandsPeriodGrowth },
        bids: totalBids,
        prefectures: { total: totalPrefectures, active: activePrefectures },
        companies: { total: totalCompanies, active: activeCompanies },
        signers: { total: totalSigners, active: activeSigners },
        templates: totalTemplates,
        folders: totalFolders,
        users: { total: totalUsers, active: activeUsers },
        minutes: totalMinutes,
        credenciamentos: totalCredenciamentos,
        adhesions: totalAdhesions,
        pedidos: publicDemands,
        pendingToSign,
        signatures: signedSignatures,
        signaturesTotal: totalSignatures,
      },
      documents: {
        byStatus: docsByStatus.map((s) => ({ status: s.status, count: s._count })),
        byMonth: (docsByMonth as any[]).map((m) => ({ month: m.month, count: Number(m.count) })),
      },
      demands: {
        byStatus: demandsByStatus.map((s) => ({ status: s.status, count: s._count })),
        byPriority: demandsByPriority.map((p) => ({ priority: p.priority, count: p._count })),
        byMonth: (demandsByMonth as any[]).map((m) => ({ month: m.month, count: Number(m.count) })),
        avgResolutionDays,
        publicDemands,
        internalDemands,
        completionRate: totalDemands > 0
          ? Math.round(((demandsByStatus.find((s: any) => s.status === "CONCLUIDA")?._count ?? 0) / totalDemands) * 1000) / 10
          : 0,
        completionRateByPriority,
        topPrefectures,
      },
      bids: { byStatus: bidsByStatus.map((s) => ({ status: s.status, count: s._count })) },
      minutes: { byStatus: minutesByStatus.map((s) => ({ status: s.status, count: s._count })) },
      adhesions: { byStatus: adhesionsByStatus.map((s) => ({ status: s.status, count: s._count })) },
      signatures: { byStatus: signaturesByStatus.map((s) => ({ status: s.status, count: s._count })) },
      recentDocs: recentDocs.map((d) => ({
        id: d.id, title: d.title, status: d.status,
        createdAt: d.createdAt.toISOString(),
        signersCount: d.signers.length,
        signedCount: d.signers.filter((s) => s.status === "ASSINADO").length,
      })),
      recentDemands: recentDemands.map((d) => ({
        id: d.id, title: d.title, status: d.status, priority: d.priority,
        protocolNumber: d.protocolNumber,
        prefecture: d.prefecture?.name ?? null,
        assignedTo: d.assignedTo?.name ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id, action: a.action, entity: a.entity, entityName: a.entityName,
        userName: a.user?.name ?? a.userName,
        createdAt: a.createdAt.toISOString(),
      })),
      period: periodDays,
    };

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard: - route.ts:256", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
