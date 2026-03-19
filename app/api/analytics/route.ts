import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30"; // days
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Document statistics
    const [totalDocs, docsByStatus, docsCreatedInPeriod] = await Promise.all([
      prisma.document.count(),
      prisma.document.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.document.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    // Signature statistics
    const [totalSignatures, signaturesByStatus, signaturesInPeriod] = await Promise.all([
      prisma.documentSigner.count(),
      prisma.documentSigner.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.documentSigner.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    // User statistics
    const [totalUsers, activeUsers, newUsersInPeriod] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Other entity counts
    const [totalSigners, totalTemplates, totalPrefectures, totalCompanies, totalBids, totalFolders] = await Promise.all([
      prisma.signer.count(),
      prisma.template.count(),
      prisma.prefecture.count(),
      prisma.company.count(),
      prisma.bid.count(),
      prisma.folder.count(),
    ]);

    // Daily documents created (last 30 days)
    const dailyDocs = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM documents
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    ` as { date: Date; count: bigint }[];

    // Top signers
    const topSigners = await prisma.documentSigner.groupBy({
      by: ["signerId"],
      _count: true,
      orderBy: { _count: { signerId: "desc" } },
      take: 5,
    });

    const signerIds = topSigners.map((s) => s.signerId);
    const signersInfo = await prisma.signer.findMany({
      where: { id: { in: signerIds } },
      select: { id: true, name: true, email: true },
    });

    const topSignersWithInfo = topSigners.map((s) => ({
      ...s,
      signer: signersInfo.find((info) => info.id === s.signerId),
    }));

    // Bids by status
    const bidsByStatus = await prisma.bid.groupBy({
      by: ["status"],
      _count: true,
    });

    // Recent activity (last 10 audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      documents: {
        total: totalDocs,
        byStatus: docsByStatus,
        createdInPeriod: docsCreatedInPeriod,
        daily: dailyDocs.map((d) => ({ date: d.date, count: Number(d.count) })),
      },
      signatures: {
        total: totalSignatures,
        byStatus: signaturesByStatus,
        inPeriod: signaturesInPeriod,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newInPeriod: newUsersInPeriod,
      },
      entities: {
        signers: totalSigners,
        templates: totalTemplates,
        prefectures: totalPrefectures,
        companies: totalCompanies,
        bids: totalBids,
        folders: totalFolders,
      },
      topSigners: topSignersWithInfo,
      bidsByStatus,
      recentActivity,
      period: periodDays,
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Erro ao buscar analytics:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
