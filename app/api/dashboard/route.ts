import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// In-memory cache with TTL
let cachedData: { data: any; period: number; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

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

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === "ADMIN";
    const userEmail = session.user?.email ?? "";

    // Check cache (shared across users for aggregate data, personalized fields added after)
    const now = Date.now();
    if (cachedData && cachedData.period === periodDays && now - cachedData.timestamp < CACHE_TTL) {
      // Only refresh user-specific fields
      const pendingToSign = await prisma.documentSigner.count({
        where: { signer: { email: userEmail }, status: "PENDENTE" },
      });
      const recentDocs = await prisma.document.findMany({
        where: isAdmin ? {} : { createdBy: userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, title: true, status: true, createdAt: true,
          signers: { select: { status: true } },
        },
      });
      const result = {
        ...cachedData.data,
        overview: { ...cachedData.data.overview, pendingToSign },
        recentDocs: recentDocs.map((d) => ({
          id: d.id, title: d.title, status: d.status,
          createdAt: d.createdAt.toISOString(),
          signersCount: d.signers.length,
          signedCount: d.signers.filter((s) => s.status === "ASSINADO").length,
        })),
      };
      return NextResponse.json(result, {
        headers: { "Cache-Control": "private, max-age=30" },
      });
    }

    // ─── Batch 1: All counts + groupBys in parallel ───
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalDocuments, docsByStatus, docsInPeriod,
      totalDemands, demandsByStatus, demandsByPriority, demandsInPeriod, demandsCompletedInPeriod,
      totalBids, bidsByStatus,
      totalPrefectures, activePrefectures,
      totalCompanies, activeCompanies,
      totalSigners, activeSigners,
      totalTemplates, totalFolders,
      totalUsers, activeUsers,
      totalMinutes, minutesByStatus,
      totalAdhesions, adhesionsByStatus,
      pendingToSign, totalSignatures, signaturesByStatus,
      publicDemands, internalDemands,
      topPrefecturesRaw,
      resolvedDemands,
      docsByMonth, demandsByMonth,
      recentActivity,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.groupBy({ by: ["status"], _count: true }),
      prisma.document.count({ where: { createdAt: { gte: startDate } } }),
      prisma.demand.count(),
      prisma.demand.groupBy({ by: ["status"], _count: true }),
      prisma.demand.groupBy({ by: ["priority"], _count: true }),
      prisma.demand.count({ where: { createdAt: { gte: startDate } } }),
      prisma.demand.count({ where: { status: "CONCLUIDA", resolvedAt: { gte: startDate } } }),
      prisma.bid.count(),
      prisma.bid.groupBy({ by: ["status"], _count: true }),
      prisma.prefecture.count(),
      prisma.prefecture.count({ where: { isActive: true } }),
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.signer.count(),
      prisma.signer.count({ where: { isActive: true } }),
      prisma.template.count(),
      prisma.folder.count(),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.minutesOfMeeting.count(),
      prisma.minutesOfMeeting.groupBy({ by: ["status"], _count: true }),
      prisma.minuteAdhesion.count(),
      prisma.minuteAdhesion.groupBy({ by: ["status"], _count: true }),
      prisma.documentSigner.count({ where: { signer: { email: userEmail }, status: "PENDENTE" } }),
      prisma.documentSigner.count(),
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
        take: 200,
        orderBy: { resolvedAt: "desc" },
      }),
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
        FROM documents WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month ASC
      ` as Promise<{ month: Date; count: bigint }[]>,
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
        FROM demands WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month ASC
      ` as Promise<{ month: Date; count: bigint }[]>,
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
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
        where: isAdmin ? {} : { createdBy: userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, title: true, status: true, createdAt: true,
          signers: { select: { status: true } },
        },
      }),
      prisma.demand.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, title: true, status: true, priority: true, protocolNumber: true, createdAt: true,
          prefecture: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
      Promise.all(
        (["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const).map(async (priority) => {
          const [total, completed] = await Promise.all([
            prisma.demand.count({ where: { priority } }),
            prisma.demand.count({ where: { priority, status: "CONCLUIDA" } }),
          ]);
          const labels: Record<string, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente" };
          return { priority: labels[priority], total, completed, rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0 };
        })
      ),
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

    const responseData = {
      overview: {
        documents: { total: totalDocuments, period: docsInPeriod },
        demands: { total: totalDemands, period: demandsInPeriod, completed: demandsCompletedInPeriod },
        bids: totalBids,
        prefectures: { total: totalPrefectures, active: activePrefectures },
        companies: { total: totalCompanies, active: activeCompanies },
        signers: { total: totalSigners, active: activeSigners },
        templates: totalTemplates,
        folders: totalFolders,
        users: { total: totalUsers, active: activeUsers },
        minutes: totalMinutes,
        adhesions: totalAdhesions,
        pendingToSign,
        signatures: totalSignatures,
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

    // Update cache (exclude user-specific fields)
    cachedData = { data: responseData, period: periodDays, timestamp: now };

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
