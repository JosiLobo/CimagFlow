"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  PenLine,
  Users,
  Building2,
  Building,
  ScrollText,
  FolderOpen,
  FileCode2,
  User,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Plus,
  Send,
  X,
  AlertCircle,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  SIGN: PenLine,
  REFUSE: X,
  SEND: Send,
  CANCEL: AlertCircle,
  LOGIN: LogIn,
  LOGOUT: LogOut,
};

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-600",
  UPDATE: "bg-blue-100 text-blue-600",
  DELETE: "bg-red-100 text-red-600",
  SIGN: "bg-emerald-100 text-emerald-600",
  REFUSE: "bg-red-100 text-red-600",
  SEND: "bg-blue-100 text-blue-600",
  CANCEL: "bg-orange-100 text-orange-600",
  LOGIN: "bg-purple-100 text-purple-600",
  LOGOUT: "bg-gray-100 text-gray-600",
};

const entityIcons: Record<string, any> = {
  document: FileText,
  signer: Users,
  template: FileCode2,
  folder: FolderOpen,
  prefecture: Building2,
  company: Building,
  bid: ScrollText,
  user: User,
  session: LogIn,
};

const actionLabels: Record<string, string> = {
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

const entityLabels: Record<string, string> = {
  document: "Documento",
  signer: "Assinante",
  template: "Modelo",
  folder: "Pasta",
  prefecture: "Prefeitura",
  company: "Empresa",
  bid: "Edital",
  user: "Usuário",
  session: "Sessão",
};

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity: "",
    action: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({ entity: "", action: "", startDate: "", endDate: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-7 h-7 text-emerald-500" />
            Logs de Auditoria
          </h1>
          <p className="text-gray-500">Histórico de todas as ações realizadas no sistema</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entidade</label>
              <select
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="">Todas</option>
                <option value="document">Documento</option>
                <option value="signer">Assinante</option>
                <option value="template">Modelo</option>
                <option value="folder">Pasta</option>
                <option value="prefecture">Prefeitura</option>
                <option value="company">Empresa</option>
                <option value="bid">Edital</option>
                <option value="user">Usuário</option>
                <option value="session">Sessão</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="">Todas</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Excluir</option>
                <option value="SIGN">Assinar</option>
                <option value="REFUSE">Recusar</option>
                <option value="SEND">Enviar</option>
                <option value="CANCEL">Cancelar</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Limpar
            </button>
            <button
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                fetchLogs();
              }}
              className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#152d4a] transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm text-gray-500">
          Mostrando{" "}
          <span className="font-semibold text-gray-900">
            {(pagination.page - 1) * pagination.limit + 1}
          </span>{" "}
          a{" "}
          <span className="font-semibold text-gray-900">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-gray-900">{pagination.total}</span> registros
        </p>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#1E3A5F] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
        >
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum log encontrado</p>
        </motion.div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Data/Hora</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Usuário</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Ação</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Entidade</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Detalhes</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const ActionIcon = actionIcons[log.action] || Edit;
                  const EntityIcon = entityIcons[log.entity] || FileText;
                  const actionColor = actionColors[log.action] || "bg-gray-100 text-gray-600";

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {(log.user?.name || log.userName || "S")[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">
                            {log.user?.name || log.userName || "Sistema"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${actionColor}`}>
                          <ActionIcon className="w-3 h-3" />
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <EntityIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {entityLabels[log.entity] || log.entity}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 truncate max-w-xs block">
                          {log.entityName || log.details || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
