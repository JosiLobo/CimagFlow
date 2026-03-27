"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  PenLine,
  Users,
  Building2,
  Building,
  ScrollText,
  FolderOpen,
  FileCode2,
  TrendingUp,
  Loader2,
  Calendar,
  Activity,
  FileDown,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  documents: {
    total: number;
    byStatus: { status: string; _count: number }[];
    createdInPeriod: number;
    daily: { date: string; count: number }[];
  };
  signatures: {
    total: number;
    byStatus: { status: string; _count: number }[];
    inPeriod: number;
  };
  users: {
    total: number;
    active: number;
    newInPeriod: number;
  };
  entities: {
    signers: number;
    templates: number;
    prefectures: number;
    companies: number;
    bids: number;
    folders: number;
  };
  topSigners: {
    signerId: string;
    _count: number;
    signer?: { id: string; name: string; email: string };
  }[];
  bidsByStatus: { status: string; _count: number }[];
  recentActivity: {
    id: string;
    action: string;
    entity: string;
    entityName?: string;
    createdAt: string;
    user?: { name: string };
  }[];
  period: number;
}

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "#94A3B8",
  EM_ANDAMENTO: "#3B82F6",
  CONCLUIDO: "#10B981",
  CANCELADO: "#EF4444",
  PENDENTE: "#F59E0B",
  ASSINADO: "#10B981",
  RECUSADO: "#EF4444",
  ABERTO: "#3B82F6",
  ENCERRADO: "#6B7280",
  SUSPENSO: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  PENDENTE: "Pendente",
  ASSINADO: "Assinado",
  RECUSADO: "Recusado",
  ABERTO: "Aberto",
  ENCERRADO: "Encerrado",
  SUSPENSO: "Suspenso",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Excluiu",
  SIGN: "Assinou",
  REFUSE: "Recusou",
  SEND: "Enviou",
  CANCEL: "Cancelou",
  LOGIN: "Login",
  LOGOUT: "Logout",
};

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const generateReport = async (format: "html" | "csv") => {
    setGeneratingReport(true);
    setShowReportMenu(false);
    try {
      const url = `/api/analytics/report?period=${period}&format=${format}`;
      if (format === "csv") {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio-cimagflow.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#1E3A5F] animate-spin" />
      </div>
    );
  }

  const docStatusData = data.documents.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s._count,
    color: STATUS_COLORS[s.status] || "#6B7280",
  }));

  const sigStatusData = data.signatures.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s._count,
    color: STATUS_COLORS[s.status] || "#6B7280",
  }));

  const dailyData = data.documents.daily.map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    documentos: d.count,
  })).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            Analytics
          </h1>
          <p className="text-gray-500">Visão geral e métricas do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {generatingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Gerar Relatório
            </button>
            {showReportMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-56 z-50">
                <button
                  onClick={() => generateReport("html")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Printer className="w-5 h-5 text-[#1E3A5F]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Relatório Completo</p>
                    <p className="text-xs text-gray-500">Visualizar / Imprimir PDF</p>
                  </div>
                </button>
                <button
                  onClick={() => generateReport("csv")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Exportar CSV</p>
                    <p className="text-xs text-gray-500">Planilha com todos os dados</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { icon: FileText, label: "Documentos", value: data.documents.total, color: "bg-blue-500" },
          { icon: PenLine, label: "Assinaturas", value: data.signatures.total, color: "bg-emerald-500" },
          { icon: Users, label: "Assinantes", value: data.entities.signers, color: "bg-purple-500" },
          { icon: Building2, label: "Prefeituras", value: data.entities.prefectures, color: "bg-orange-500" },
          { icon: Building, label: "Empresas", value: data.entities.companies, color: "bg-cyan-500" },
          { icon: ScrollText, label: "Editais", value: data.entities.bids, color: "bg-pink-500" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1E3A5F] to-[#0D2340] rounded-xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-emerald-400" />
            <span className="text-blue-200">Período: {data.period} dias</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-200">Novos documentos</span>
              <span className="font-bold text-emerald-400">+{data.documents.createdInPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-200">Assinaturas realizadas</span>
              <span className="font-bold text-emerald-400">+{data.signatures.inPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-200">Novos usuários</span>
              <span className="font-bold text-emerald-400">+{data.users.newInPeriod}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Documentos por Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={docStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {docStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {docStatusData.map((item) => (
              <span
                key={item.name}
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: item.color + "20", color: item.color }}
              >
                {item.name}: {item.value}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Assinaturas por Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sigStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sigStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {sigStatusData.map((item) => (
              <span
                key={item.name}
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: item.color + "20", color: item.color }}
              >
                {item.name}: {item.value}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily Chart */}
      {dailyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Documentos Criados por Dia
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="documentos" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Signers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Top Assinantes</h3>
          {data.topSigners.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Sem dados disponíveis</p>
          ) : (
            <div className="space-y-3">
              {data.topSigners.map((item, i) => (
                <div
                  key={item.signerId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.signer?.name || "Desconhecido"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.signer?.email || ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-bold">{item._count} docs</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Atividade Recente
          </h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Sem atividade registrada</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{activity.user?.name || "Sistema"}</span>{" "}
                      {ACTION_LABELS[activity.action] || activity.action}{" "}
                      <span className="text-gray-500">{activity.entity}</span>
                      {activity.entityName && (
                        <span className="font-medium"> "{activity.entityName}"</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString("pt-BR")}
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
