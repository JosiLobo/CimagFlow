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
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get("period") || "30");
    const format = searchParams.get("format") || "html"; // html | csv

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Gather all data in parallel
    const [
      totalDocs,
      docsByStatus,
      docsInPeriod,
      totalSignatures,
      sigsByStatus,
      sigsInPeriod,
      totalUsers,
      activeUsers,
      newUsers,
      totalSigners,
      totalTemplates,
      totalPrefectures,
      totalCompanies,
      totalBids,
      totalFolders,
      bidsByStatus,
      totalDemands,
      demandsByStatus,
      demandsByPriority,
      demandsInPeriod,
      auditLogs,
      auditLogCount,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.groupBy({ by: ["status"], _count: true }),
      prisma.document.count({ where: { createdAt: { gte: startDate } } }),
      prisma.documentSigner.count(),
      prisma.documentSigner.groupBy({ by: ["status"], _count: true }),
      prisma.documentSigner.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.signer.count(),
      prisma.template.count(),
      prisma.prefecture.count(),
      prisma.company.count(),
      prisma.bid.count(),
      prisma.folder.count(),
      prisma.bid.groupBy({ by: ["status"], _count: true }),
      prisma.demand.count(),
      prisma.demand.groupBy({ by: ["status"], _count: true }),
      prisma.demand.groupBy({ by: ["priority"], _count: true }),
      prisma.demand.count({ where: { createdAt: { gte: startDate } } }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: "desc" },
        take: 500,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Audit log summary by action
    const actionSummary: Record<string, number> = {};
    const entitySummary: Record<string, number> = {};
    const userActivitySummary: Record<string, { name: string; count: number }> = {};

    for (const log of auditLogs) {
      actionSummary[log.action] = (actionSummary[log.action] || 0) + 1;
      entitySummary[log.entity] = (entitySummary[log.entity] || 0) + 1;
      const uName = log.user?.name || log.userName || "Sistema";
      if (!userActivitySummary[uName]) {
        userActivitySummary[uName] = { name: uName, count: 0 };
      }
      userActivitySummary[uName].count += 1;
    }

    const topActiveUsers = Object.values(userActivitySummary)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const STATUS_LABELS: Record<string, string> = {
      RASCUNHO: "Rascunho", EM_ANDAMENTO: "Em Andamento", CONCLUIDO: "Concluído",
      CANCELADO: "Cancelado", PENDENTE: "Pendente", ASSINADO: "Assinado",
      RECUSADO: "Recusado", ABERTO: "Aberto", ENCERRADO: "Encerrado",
      SUSPENSO: "Suspenso", ABERTA: "Aberta", EM_ANALISE: "Em Análise",
      AGUARDANDO_RESPOSTA: "Aguardando Resposta", CONCLUIDA: "Concluída",
    };
    const PRIORITY_LABELS: Record<string, string> = {
      BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
    };
    const ACTION_LABELS: Record<string, string> = {
      CREATE: "Criação", UPDATE: "Atualização", DELETE: "Exclusão",
      SIGN: "Assinatura", REFUSE: "Recusa", SEND: "Envio",
      CANCEL: "Cancelamento", LOGIN: "Login", LOGOUT: "Logout",
    };
    const ENTITY_LABELS: Record<string, string> = {
      document: "Documento", signer: "Assinante", template: "Modelo",
      folder: "Pasta", prefecture: "Prefeitura", company: "Empresa",
      bid: "Edital", user: "Usuário", session: "Sessão", demand: "Demanda",
    };

    const now = new Date();
    const reportDate = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const periodStart = startDate.toLocaleDateString("pt-BR");
    const periodEnd = now.toLocaleDateString("pt-BR");
    const generatedBy = (session.user as Record<string, unknown>).name as string || "Admin";

    if (format === "csv") {
      const lines: string[] = [];
      lines.push("RELATÓRIO GERAL DO SISTEMA - CimagFlow");
      lines.push(`Gerado em:,${reportDate}`);
      lines.push(`Gerado por:,${generatedBy}`);
      lines.push(`Período:,${periodStart} a ${periodEnd} (${period} dias)`);
      lines.push("");

      lines.push("=== RESUMO GERAL ===");
      lines.push("Métrica,Total,No Período");
      lines.push(`Documentos,${totalDocs},+${docsInPeriod}`);
      lines.push(`Assinaturas,${totalSignatures},+${sigsInPeriod}`);
      lines.push(`Usuários,${totalUsers} (${activeUsers} ativos),+${newUsers}`);
      lines.push(`Demandas,${totalDemands},+${demandsInPeriod}`);
      lines.push(`Assinantes cadastrados,${totalSigners},`);
      lines.push(`Modelos,${totalTemplates},`);
      lines.push(`Prefeituras,${totalPrefectures},`);
      lines.push(`Empresas,${totalCompanies},`);
      lines.push(`Editais,${totalBids},`);
      lines.push(`Pastas,${totalFolders},`);
      lines.push(`Ações registradas no período,${auditLogCount},`);
      lines.push("");

      lines.push("=== DOCUMENTOS POR STATUS ===");
      lines.push("Status,Quantidade");
      for (const s of docsByStatus) {
        lines.push(`${STATUS_LABELS[s.status] || s.status},${s._count}`);
      }
      lines.push("");

      lines.push("=== ASSINATURAS POR STATUS ===");
      lines.push("Status,Quantidade");
      for (const s of sigsByStatus) {
        lines.push(`${STATUS_LABELS[s.status] || s.status},${s._count}`);
      }
      lines.push("");

      lines.push("=== EDITAIS POR STATUS ===");
      lines.push("Status,Quantidade");
      for (const s of bidsByStatus) {
        lines.push(`${STATUS_LABELS[s.status] || s.status},${s._count}`);
      }
      lines.push("");

      lines.push("=== DEMANDAS POR STATUS ===");
      lines.push("Status,Quantidade");
      for (const s of demandsByStatus) {
        lines.push(`${STATUS_LABELS[s.status] || s.status},${s._count}`);
      }
      lines.push("");

      lines.push("=== DEMANDAS POR PRIORIDADE ===");
      lines.push("Prioridade,Quantidade");
      for (const p of demandsByPriority) {
        lines.push(`${PRIORITY_LABELS[p.priority] || p.priority},${p._count}`);
      }
      lines.push("");

      lines.push("=== AÇÕES POR TIPO ===");
      lines.push("Tipo de Ação,Quantidade");
      for (const [action, count] of Object.entries(actionSummary).sort((a, b) => b[1] - a[1])) {
        lines.push(`${ACTION_LABELS[action] || action},${count}`);
      }
      lines.push("");

      lines.push("=== AÇÕES POR ENTIDADE ===");
      lines.push("Entidade,Quantidade");
      for (const [entity, count] of Object.entries(entitySummary).sort((a, b) => b[1] - a[1])) {
        lines.push(`${ENTITY_LABELS[entity] || entity},${count}`);
      }
      lines.push("");

      lines.push("=== USUÁRIOS MAIS ATIVOS ===");
      lines.push("Usuário,Ações no Período");
      for (const u of topActiveUsers) {
        lines.push(`${u.name},${u.count}`);
      }
      lines.push("");

      lines.push("=== LOG DE ATIVIDADES (últimas 500) ===");
      lines.push("Data/Hora,Usuário,Ação,Entidade,Descrição,IP");
      for (const log of auditLogs) {
        const date = new Date(log.createdAt).toLocaleString("pt-BR");
        const user = log.user?.name || log.userName || "Sistema";
        const action = ACTION_LABELS[log.action] || log.action;
        const entity = ENTITY_LABELS[log.entity] || log.entity;
        const detail = (log.entityName || log.details || "-").replace(/,/g, ";").replace(/\n/g, " ");
        const ip = log.ipAddress || "-";
        lines.push(`${date},${user},${action},${entity},${detail},${ip}`);
      }

      const csv = "\uFEFF" + lines.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-cimagflow-${periodStart.replace(/\//g, "-")}-a-${periodEnd.replace(/\//g, "-")}.csv"`,
        },
      });
    }

    // HTML Report
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório CimagFlow - ${periodStart} a ${periodEnd}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; color: #333; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      .container { max-width: 100%; }
    }
    .header { background: linear-gradient(135deg, #1E3A5F 0%, #0D2340 100%); color: #fff; padding: 40px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; }
    .header .meta { display: flex; justify-content: center; gap: 24px; margin-top: 16px; font-size: 13px; color: rgba(255,255,255,0.7); }
    .toolbar { background: #f8f8f8; border-bottom: 1px solid #e5e5e5; padding: 12px 40px; display: flex; gap: 12px; justify-content: flex-end; }
    .toolbar button { padding: 8px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-print { background: #1E3A5F; color: #fff; }
    .btn-print:hover { background: #152d4a; }
    .section { padding: 32px 40px; border-bottom: 1px solid #eee; }
    .section h2 { font-size: 20px; color: #1E3A5F; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
    .section h2::before { content: ''; display: inline-block; width: 4px; height: 24px; background: #10B981; border-radius: 2px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .card .value { font-size: 28px; font-weight: 700; color: #1E3A5F; }
    .card .label { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .card .sub { font-size: 12px; color: #10B981; margin-top: 4px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #374151; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #D1FAE5; color: #065F46; }
    .badge-blue { background: #DBEAFE; color: #1E40AF; }
    .badge-red { background: #FEE2E2; color: #991B1B; }
    .badge-yellow { background: #FEF3C7; color: #92400E; }
    .badge-gray { background: #F3F4F6; color: #374151; }
    .badge-purple { background: #EDE9FE; color: #5B21B6; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } .cards { grid-template-columns: repeat(2, 1fr); } }
    .bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .bar-label { width: 140px; font-size: 13px; color: #475569; text-align: right; flex-shrink: 0; }
    .bar-track { flex: 1; height: 24px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 12px; color: #fff; font-weight: 600; min-width: 32px; }
    .footer { padding: 24px 40px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Geral do Sistema</h1>
      <p>CimagFlow - Sistema de Gestão e Assinatura Digital</p>
      <div class="meta">
        <span>📅 Período: ${periodStart} a ${periodEnd} (${period} dias)</span>
        <span>👤 Gerado por: ${generatedBy}</span>
        <span>🕐 ${reportDate}</span>
      </div>
    </div>

    <div class="toolbar no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </div>

    <!-- Resumo Geral -->
    <div class="section">
      <h2>Resumo Geral</h2>
      <div class="cards">
        <div class="card">
          <div class="value">${totalDocs}</div>
          <div class="label">Documentos</div>
          <div class="sub">+${docsInPeriod} no período</div>
        </div>
        <div class="card">
          <div class="value">${totalSignatures}</div>
          <div class="label">Assinaturas</div>
          <div class="sub">+${sigsInPeriod} no período</div>
        </div>
        <div class="card">
          <div class="value">${totalUsers}</div>
          <div class="label">Usuários</div>
          <div class="sub">${activeUsers} ativos | +${newUsers} novos</div>
        </div>
        <div class="card">
          <div class="value">${totalDemands}</div>
          <div class="label">Demandas</div>
          <div class="sub">+${demandsInPeriod} no período</div>
        </div>
        <div class="card">
          <div class="value">${totalBids}</div>
          <div class="label">Editais</div>
        </div>
        <div class="card">
          <div class="value">${totalPrefectures}</div>
          <div class="label">Prefeituras</div>
        </div>
        <div class="card">
          <div class="value">${totalCompanies}</div>
          <div class="label">Empresas</div>
        </div>
        <div class="card">
          <div class="value">${totalSigners}</div>
          <div class="label">Assinantes</div>
        </div>
        <div class="card">
          <div class="value">${totalTemplates}</div>
          <div class="label">Modelos</div>
        </div>
        <div class="card">
          <div class="value">${totalFolders}</div>
          <div class="label">Pastas</div>
        </div>
        <div class="card">
          <div class="value">${auditLogCount}</div>
          <div class="label">Ações no Período</div>
        </div>
      </div>
    </div>

    <!-- Status Breakdown -->
    <div class="section">
      <h2>Distribuição por Status</h2>
      <div class="grid-2">
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Documentos</h3>
          ${docsByStatus.map(s => {
            const pct = totalDocs > 0 ? Math.round((s._count / totalDocs) * 100) : 0;
            const color = { RASCUNHO: "#94A3B8", EM_ANDAMENTO: "#3B82F6", CONCLUIDO: "#10B981", CANCELADO: "#EF4444" }[s.status] || "#6B7280";
            return `<div class="bar"><span class="bar-label">${STATUS_LABELS[s.status] || s.status}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%;background:${color}">${s._count}</div></div></div>`;
          }).join("")}
        </div>
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Assinaturas</h3>
          ${sigsByStatus.map(s => {
            const pct = totalSignatures > 0 ? Math.round((s._count / totalSignatures) * 100) : 0;
            const color = { PENDENTE: "#F59E0B", ASSINADO: "#10B981", RECUSADO: "#EF4444" }[s.status] || "#6B7280";
            return `<div class="bar"><span class="bar-label">${STATUS_LABELS[s.status] || s.status}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%;background:${color}">${s._count}</div></div></div>`;
          }).join("")}
        </div>
      </div>
      <div class="grid-2" style="margin-top:24px;">
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Editais</h3>
          ${bidsByStatus.map(s => {
            const pct = totalBids > 0 ? Math.round((s._count / totalBids) * 100) : 0;
            const color = { ABERTO: "#3B82F6", EM_ANDAMENTO: "#F59E0B", ENCERRADO: "#6B7280", CANCELADO: "#EF4444", SUSPENSO: "#F59E0B" }[s.status] || "#6B7280";
            return `<div class="bar"><span class="bar-label">${STATUS_LABELS[s.status] || s.status}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%;background:${color}">${s._count}</div></div></div>`;
          }).join("")}
        </div>
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Demandas</h3>
          ${demandsByStatus.map(s => {
            const pct = totalDemands > 0 ? Math.round((s._count / totalDemands) * 100) : 0;
            const color = { ABERTA: "#3B82F6", EM_ANALISE: "#F59E0B", EM_ANDAMENTO: "#8B5CF6", AGUARDANDO_RESPOSTA: "#F59E0B", CONCLUIDA: "#10B981", CANCELADA: "#EF4444" }[s.status] || "#6B7280";
            return `<div class="bar"><span class="bar-label">${STATUS_LABELS[s.status] || s.status}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%;background:${color}">${s._count}</div></div></div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- Demandas por Prioridade -->
    <div class="section">
      <h2>Demandas por Prioridade</h2>
      <div style="max-width:500px;">
        ${demandsByPriority.map(p => {
          const pct = totalDemands > 0 ? Math.round((p._count / totalDemands) * 100) : 0;
          const color = { BAIXA: "#10B981", MEDIA: "#3B82F6", ALTA: "#F59E0B", URGENTE: "#EF4444" }[p.priority] || "#6B7280";
          return `<div class="bar"><span class="bar-label">${PRIORITY_LABELS[p.priority] || p.priority}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 5)}%;background:${color}">${p._count}</div></div></div>`;
        }).join("")}
      </div>
    </div>

    <!-- Atividade no Período -->
    <div class="section page-break">
      <h2>Resumo de Atividades no Período</h2>
      <div class="grid-2">
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Por Tipo de Ação</h3>
          <table>
            <thead><tr><th>Ação</th><th style="text-align:right">Quantidade</th></tr></thead>
            <tbody>
              ${Object.entries(actionSummary).sort((a, b) => b[1] - a[1]).map(([action, count]) =>
                `<tr><td>${ACTION_LABELS[action] || action}</td><td style="text-align:right;font-weight:600">${count}</td></tr>`
              ).join("")}
            </tbody>
          </table>
        </div>
        <div>
          <h3 style="font-size:15px;color:#475569;margin-bottom:12px;">Por Entidade</h3>
          <table>
            <thead><tr><th>Entidade</th><th style="text-align:right">Quantidade</th></tr></thead>
            <tbody>
              ${Object.entries(entitySummary).sort((a, b) => b[1] - a[1]).map(([entity, count]) =>
                `<tr><td>${ENTITY_LABELS[entity] || entity}</td><td style="text-align:right;font-weight:600">${count}</td></tr>`
              ).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Top Usuários Ativos -->
    <div class="section">
      <h2>Usuários Mais Ativos no Período</h2>
      <table>
        <thead><tr><th>#</th><th>Usuário</th><th style="text-align:right">Ações Realizadas</th></tr></thead>
        <tbody>
          ${topActiveUsers.map((u, i) =>
            `<tr><td><strong>${i + 1}</strong></td><td>${u.name}</td><td style="text-align:right;font-weight:600;color:#1E3A5F">${u.count}</td></tr>`
          ).join("")}
        </tbody>
      </table>
    </div>

    <!-- Log de Atividades Detalhado -->
    <div class="section page-break">
      <h2>Log Detalhado de Atividades (${Math.min(auditLogs.length, 500)} de ${auditLogCount})</h2>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Ação</th>
            <th>Entidade</th>
            <th>Descrição</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          ${auditLogs.map(log => {
            const date = new Date(log.createdAt).toLocaleString("pt-BR");
            const user = log.user?.name || log.userName || "Sistema";
            const actionBadge = {
              CREATE: "badge-green", UPDATE: "badge-blue", DELETE: "badge-red",
              SIGN: "badge-green", REFUSE: "badge-red", SEND: "badge-blue",
              CANCEL: "badge-yellow", LOGIN: "badge-purple", LOGOUT: "badge-gray",
            }[log.action] || "badge-gray";
            return `<tr>
              <td style="white-space:nowrap;font-size:12px">${date}</td>
              <td>${user}</td>
              <td><span class="badge ${actionBadge}">${ACTION_LABELS[log.action] || log.action}</span></td>
              <td>${ENTITY_LABELS[log.entity] || log.entity}</td>
              <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${log.entityName || log.details || "-"}</td>
              <td style="font-family:monospace;font-size:11px;color:#9CA3AF">${log.ipAddress || "-"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Relatório gerado automaticamente pelo CimagFlow em ${reportDate}</p>
      <p style="margin-top:4px">Este documento é confidencial e destinado apenas para uso interno.</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
