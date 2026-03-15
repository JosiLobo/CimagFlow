"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  PenLine,
  ArrowRight,
  Building2,
  Users,
  Briefcase,
  FolderOpen,
  FileSignature,
  Gavel,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity,
  Target,
  BookOpen,
  Handshake,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

// Lazy-load recharts (heavy ~200KB) — only loaded when charts scroll into view
let rechartsModule: typeof import("recharts") | null = null;
const rechartsReady = typeof window !== "undefined"
  ? import("recharts").then((mod) => { rechartsModule = mod; return mod; })
  : Promise.resolve(null);

// ─── Types ───
interface DashboardData {
  overview: {
    documents: { total: number; period: number };
    demands: { total: number; period: number; completed: number };
    bids: number;
    prefectures: { total: number; active: number };
    companies: { total: number; active: number };
    signers: { total: number; active: number };
    templates: number;
    folders: number;
    users: { total: number; active: number };
    minutes: number;
    adhesions: number;
    pendingToSign: number;
    signatures: number;
  };
  documents: {
    byStatus: { status: string; count: number }[];
    byMonth: { month: string; count: number }[];
  };
  demands: {
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    byMonth: { month: string; count: number }[];
    avgResolutionDays: number;
    publicDemands: number;
    internalDemands: number;
    completionRate: number;
    completionRateByPriority: { priority: string; total: number; completed: number; rate: number }[];
    topPrefectures: { prefecture: { id: string; name: string; city: string; state: string }; count: number }[];
  };
  bids: { byStatus: { status: string; count: number }[] };
  minutes: { byStatus: { status: string; count: number }[] };
  adhesions: { byStatus: { status: string; count: number }[] };
  signatures: { byStatus: { status: string; count: number }[] };
  recentDocs: { id: string; title: string; status: string; createdAt: string; signersCount: number; signedCount: number }[];
  recentDemands: { id: string; title: string; status: string; priority: string; protocolNumber: string; prefecture: string | null; assignedTo: string | null; createdAt: string }[];
  recentActivity: { id: string; action: string; entity: string; entityName: string; userName: string; createdAt: string }[];
  period: number;
}

// ─── Label Maps ───
const DOC_STATUS: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: "Rascunho", color: "#94A3B8" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "#F59E0B" },
  CONCLUIDO: { label: "Concluído", color: "#10B981" },
  CANCELADO: { label: "Cancelado", color: "#EF4444" },
};

const DEMAND_STATUS: Record<string, { label: string; color: string }> = {
  ABERTA: { label: "Aberta", color: "#3B82F6" },
  EM_ANALISE: { label: "Em Análise", color: "#8B5CF6" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "#F59E0B" },
  AGUARDANDO_RESPOSTA: { label: "Aguardando", color: "#F97316" },
  CONCLUIDA: { label: "Concluída", color: "#10B981" },
  CANCELADA: { label: "Cancelada", color: "#EF4444" },
};

const DEMAND_PRIORITY: Record<string, { label: string; color: string }> = {
  BAIXA: { label: "Baixa", color: "#94A3B8" },
  MEDIA: { label: "Média", color: "#3B82F6" },
  ALTA: { label: "Alta", color: "#F59E0B" },
  URGENTE: { label: "Urgente", color: "#EF4444" },
};

const BID_STATUS: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "#3B82F6" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "#F59E0B" },
  ENCERRADO: { label: "Encerrado", color: "#10B981" },
  CANCELADO: { label: "Cancelado", color: "#EF4444" },
  SUSPENSO: { label: "Suspenso", color: "#94A3B8" },
};

const ADHESION_STATUS: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "#F59E0B" },
  APROVADA: { label: "Aprovada", color: "#10B981" },
  REJEITADA: { label: "Rejeitada", color: "#EF4444" },
  CANCELADA: { label: "Cancelada", color: "#94A3B8" },
};

const AUDIT_ACTION: Record<string, string> = {
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Removeu",
  SIGN: "Assinou",
  REFUSE: "Recusou",
  SEND: "Enviou",
  CANCEL: "Cancelou",
  LOGIN: "Entrou",
  LOGOUT: "Saiu",
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ─── Animated Number ───
function AnimNum({ target, decimals = 0, suffix = "" }: { target: number; decimals?: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let current = 0;
    const inc = target / (1000 / 16);
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) { setValue(target); clearInterval(timer); } else setValue(current);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{decimals > 0 ? value.toFixed(decimals) : Math.floor(value)}{suffix}</>;
}

// ─── KPI Card ───
function KpiCard({ label, value, icon: Icon, color, link, subtitle, delay = 0 }: {
  label: string; value: number; icon: any; color: string; link?: string; subtitle?: string; delay?: number;
}) {
  const content = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${link ? "hover:shadow-md hover:border-gray-200 cursor-pointer" : ""} transition-all h-full`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1"><AnimNum target={value} /></p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {link && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-emerald-600 transition-colors">
          <span>Ver detalhes</span><ArrowRight className="w-3 h-3" />
        </div>
      )}
    </motion.div>
  );
  return link ? <Link href={link} className="group">{content}</Link> : content;
}

// ─── Section Header ───
function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#1E3A5F]" />
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

// ─── Status Badge ───
function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Empty State ───
function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Chart Loading Placeholder ───
function ChartPlaceholder() {
  return (
    <div className="flex items-center justify-center h-[200px] text-gray-300">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

// ─── Lazy Chart Components ───
function LazyPieChart({ data: pieData, height = 200 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  if (!rechartsModule) return <ChartPlaceholder />;
  const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = rechartsModule;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function LazyAreaChartComponent({ data: areaData }: { data: { month: string; documentos: number; demandas: number }[] }) {
  if (!rechartsModule) return <ChartPlaceholder />;
  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } = rechartsModule;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="documentos" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.15} strokeWidth={2} name="Documentos" />
        <Area type="monotone" dataKey="demandas" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} name="Demandas" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LazyBarChartComponent({ data: barData, dataKey, name, fillColor, colorByItem }: { data: any[]; dataKey: string; name: string; fillColor?: string; colorByItem?: boolean }) {
  if (!rechartsModule) return <ChartPlaceholder />;
  const { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = rechartsModule;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} name={name} fill={fillColor}>
          {colorByItem && barData.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LazyCompletionBarChart({ data: barData }: { data: { priority: string; rate: number }[] }) {
  if (!rechartsModule) return <ChartPlaceholder />;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = rechartsModule;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Bar dataKey="rate" radius={[6, 6, 0, 0]} fill="#10B981" name="Taxa %" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── SWR fetcher ───
const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); });

// ─── Main Component ───
export default function DashboardClient({ userName, userRole }: { userName: string; userRole: string }) {
  const [period, setPeriod] = useState(30);
  const [chartsReady, setChartsReady] = useState(false);

  // SWR with deduplication + stale-while-revalidate
  const { data, isLoading: loading, mutate } = useSWR<DashboardData>(
    `/api/dashboard?period=${period}`,
    fetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: false, keepPreviousData: true }
  );

  // Load recharts asynchronously after first paint
  useEffect(() => {
    rechartsReady.then(() => setChartsReady(true));
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-1">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const o = data.overview;
  const isAdmin = userRole === "ADMIN";

  // Chart data
  const docPieData = data.documents.byStatus.map((s) => ({
    name: DOC_STATUS[s.status]?.label ?? s.status,
    value: s.count,
    color: DOC_STATUS[s.status]?.color ?? "#6B7280",
  })).filter((d) => d.value > 0);

  const demandPieData = data.demands.byStatus.map((s) => ({
    name: DEMAND_STATUS[s.status]?.label ?? s.status,
    value: s.count,
    color: DEMAND_STATUS[s.status]?.color ?? "#6B7280",
  })).filter((d) => d.value > 0);

  const priorityData = data.demands.byPriority.map((p) => ({
    name: DEMAND_PRIORITY[p.priority]?.label ?? p.priority,
    value: p.count,
    color: DEMAND_PRIORITY[p.priority]?.color ?? "#6B7280",
  }));

  const bidPieData = data.bids.byStatus.map((s) => ({
    name: BID_STATUS[s.status]?.label ?? s.status,
    value: s.count,
    color: BID_STATUS[s.status]?.color ?? "#6B7280",
  })).filter((d) => d.value > 0);

  const adhesionPieData = data.adhesions.byStatus.map((s) => ({
    name: ADHESION_STATUS[s.status]?.label ?? s.status,
    value: s.count,
    color: ADHESION_STATUS[s.status]?.color ?? "#6B7280",
  })).filter((d) => d.value > 0);

  const areaData = data.documents.byMonth.map((d, i) => ({
    month: MONTH_NAMES[new Date(d.month).getMonth()],
    documentos: d.count,
    demandas: data.demands.byMonth[i]?.count ?? 0,
  }));

  const sigPieData = data.signatures.byStatus.map((s) => ({
    name: s.status === "PENDENTE" ? "Pendente" : s.status === "ASSINADO" ? "Assinado" : "Recusado",
    value: s.count,
    color: s.status === "PENDENTE" ? "#F59E0B" : s.status === "ASSINADO" ? "#10B981" : "#EF4444",
  })).filter((d) => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {userName?.split(" ")?.[0] ?? ""}! 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Painel de gestão — visão geral do sistema</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <button onClick={() => mutate()} disabled={loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
        </motion.div>
      </div>

      {/* ─── Primary KPIs ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Documentos" value={o.documents.total} icon={FileText} color="from-[#1E3A5F] to-[#0D2340]" link="/documentos" subtitle={`+${o.documents.period} no período`} delay={0} />
        <KpiCard label="Para Assinar" value={o.pendingToSign} icon={PenLine} color="from-purple-500 to-purple-700" link="/para-assinar" delay={0.05} />
        <KpiCard label="Demandas" value={o.demands.total} icon={Target} color="from-blue-500 to-blue-700" link="/demandas" subtitle={`+${o.demands.period} no período`} delay={0.1} />
        <KpiCard label="Editais" value={o.bids} icon={Gavel} color="from-amber-500 to-amber-700" link="/editais" delay={0.15} />
        <KpiCard label="Prefeituras" value={o.prefectures.total} icon={Building2} color="from-emerald-500 to-emerald-700" link="/prefeituras" subtitle={`${o.prefectures.active} ativas`} delay={0.2} />
        <KpiCard label="Empresas" value={o.companies.total} icon={Briefcase} color="from-cyan-500 to-cyan-700" link="/empresas" subtitle={`${o.companies.active} ativas`} delay={0.25} />
      </div>

      {/* ─── Secondary KPIs ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Assinaturas", value: o.signatures, icon: FileSignature, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Assinantes", value: o.signers.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Atas", value: o.minutes, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Adesões", value: o.adhesions, icon: Handshake, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Modelos", value: o.templates, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Pastas", value: o.folders, icon: FolderOpen, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Colaboradores", value: o.users.total, icon: Users, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Ativos", value: o.users.active, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 leading-tight"><AnimNum target={item.value} /></p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Demand Metrics Banner ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-gradient-to-r from-[#1E3A5F] to-[#2D5A8E] rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5" />
          <h3 className="font-semibold">Métricas de Demandas</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Taxa de Conclusão</p>
            <p className="text-3xl font-bold mt-1"><AnimNum target={data.demands.completionRate} decimals={1} suffix="%" /></p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Tempo Médio</p>
            <p className="text-3xl font-bold mt-1"><AnimNum target={data.demands.avgResolutionDays} decimals={1} /> <span className="text-lg font-normal">dias</span></p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Concluídas ({period}d)</p>
            <p className="text-3xl font-bold mt-1"><AnimNum target={o.demands.completed} /></p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Públicas</p>
            <p className="text-3xl font-bold mt-1"><AnimNum target={data.demands.publicDemands} /></p>
            <p className="text-white/40 text-xs mt-1">
              {o.demands.total > 0 ? ((data.demands.publicDemands / o.demands.total) * 100).toFixed(1) : "0"}% do total
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Internas</p>
            <p className="text-3xl font-bold mt-1"><AnimNum target={data.demands.internalDemands} /></p>
            <p className="text-white/40 text-xs mt-1">
              {o.demands.total > 0 ? ((data.demands.internalDemands / o.demands.total) * 100).toFixed(1) : "0"}% do total
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── Charts Row 1: Status Distribution ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Documentos por Status" icon={FileText} />
          {docPieData.length === 0 ? <EmptyState text="Nenhum documento" /> : (
            chartsReady ? <LazyPieChart data={docPieData} /> : <ChartPlaceholder />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Demandas por Status" icon={Target} />
          {demandPieData.length === 0 ? <EmptyState text="Nenhuma demanda" /> : (
            chartsReady ? <LazyPieChart data={demandPieData} /> : <ChartPlaceholder />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Assinaturas" icon={FileSignature} />
          {sigPieData.length === 0 ? <EmptyState text="Nenhuma assinatura" /> : (
            chartsReady ? <LazyPieChart data={sigPieData} /> : <ChartPlaceholder />
          )}
        </motion.div>
      </div>

      {/* ─── Charts Row 2: Trends ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Evolução Mensal" icon={TrendingUp} />
          {areaData.length === 0 ? <EmptyState text="Sem dados mensais" /> : (
            chartsReady ? <LazyAreaChartComponent data={areaData} /> : <ChartPlaceholder />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Demandas por Prioridade" icon={AlertTriangle} />
          {priorityData.length === 0 ? <EmptyState text="Sem dados" /> : (
            chartsReady ? <LazyBarChartComponent data={priorityData} dataKey="value" name="Demandas" colorByItem /> : <ChartPlaceholder />
          )}
        </motion.div>
      </div>

      {/* ─── Charts Row 3: Editais + Adesões + Conclusão ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Editais por Status" icon={Gavel} />
          {bidPieData.length === 0 ? <EmptyState text="Nenhum edital" /> : (
            chartsReady ? <LazyPieChart data={bidPieData} /> : <ChartPlaceholder />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Adesões" icon={Handshake} />
          {adhesionPieData.length === 0 ? <EmptyState text="Nenhuma adesão" /> : (
            chartsReady ? <LazyPieChart data={adhesionPieData} /> : <ChartPlaceholder />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Conclusão por Prioridade" icon={CheckCircle2} />
          {data.demands.completionRateByPriority.length === 0 ? <EmptyState text="Sem dados" /> : (
            chartsReady ? <LazyCompletionBarChart data={data.demands.completionRateByPriority} /> : <ChartPlaceholder />
          )}
        </motion.div>
      </div>

      {/* ─── Top Prefeituras + Demandas Recentes ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <SectionHeader title="Prefeituras com Mais Demandas" icon={Building2} />
          {data.demands.topPrefectures.length === 0 ? <EmptyState text="Nenhuma demanda registrada" /> : (
            <div className="space-y-2">
              {data.demands.topPrefectures.slice(0, 5).map((item, idx) => {
                const maxCount = data.demands.topPrefectures[0]?.count ?? 1;
                return (
                  <div key={item.prefecture.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.prefecture.name}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">{item.count}</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#1E3A5F]" />
              <h3 className="text-base font-semibold text-gray-800">Demandas Recentes</h3>
            </div>
            <Link href="/demandas" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentDemands.length === 0 ? <EmptyState text="Nenhuma demanda" /> : (
            <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
              {data.recentDemands.map((d) => (
                <Link key={d.id} href={`/demandas/${d.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{d.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      #{d.protocolNumber} · {d.prefecture ?? "Sem prefeitura"} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge label={DEMAND_STATUS[d.status]?.label ?? d.status} color={DEMAND_STATUS[d.status]?.color ?? "#6B7280"} />
                    <StatusBadge label={DEMAND_PRIORITY[d.priority]?.label ?? d.priority} color={DEMAND_PRIORITY[d.priority]?.color ?? "#6B7280"} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── Documentos Recentes + Atividade Recente ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1E3A5F]" />
              <h3 className="text-base font-semibold text-gray-800">Documentos Recentes</h3>
            </div>
            <Link href="/documentos" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentDocs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum documento ainda</p>
              <Link href="/documentos/novo" className="text-emerald-600 hover:underline text-sm mt-1 block">Criar primeiro documento</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
              {data.recentDocs.map((doc) => (
                <Link key={doc.id} href={`/documentos/${doc.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#1E3A5F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.signedCount}/{doc.signersCount} assinaturas · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <StatusBadge label={DOC_STATUS[doc.status]?.label ?? doc.status} color={DOC_STATUS[doc.status]?.color ?? "#6B7280"} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1E3A5F]" />
              <h3 className="text-base font-semibold text-gray-800">Atividade Recente</h3>
            </div>
            {isAdmin && (
              <Link href="/audit-logs" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                Ver logs <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {data.recentActivity.length === 0 ? <EmptyState text="Nenhuma atividade registrada" /> : (
            <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{a.userName ?? "Sistema"}</span>
                      {" "}<span className="text-gray-500">{AUDIT_ACTION[a.action] ?? a.action}</span>
                      {" "}<span className="font-medium">{a.entityName ?? a.entity}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString("pt-BR")} às {new Date(a.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
