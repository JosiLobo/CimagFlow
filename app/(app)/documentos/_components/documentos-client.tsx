"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Search, Filter, CheckCircle2, Clock, FileEdit, XCircle, Download, Eye, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";

type DocStatus = "TODOS" | "RASCUNHO" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

const statusConfig: Record<string, { label: string; bg: string; icon: React.ComponentType<any> }> = {
  RASCUNHO: { label: "Rascunho", bg: "bg-gray-100 text-gray-600", icon: FileEdit },
  EM_ANDAMENTO: { label: "Em Andamento", bg: "bg-amber-100 text-amber-700", icon: Clock },
  CONCLUIDO: { label: "Concluído", bg: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CANCELADO: { label: "Cancelado", bg: "bg-red-100 text-red-600", icon: XCircle },
};

export default function DocumentosClient() {
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DocStatus>("TODOS");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "TODOS") params.set("status", status);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocs(data.documents ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSend = async (id: string) => {
    setSending(id);
    try {
      const res = await fetch(`/api/documents/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Documento enviado para assinatura!");
        fetchDocs();
      } else {
        alert(data.error ?? "Erro ao enviar");
      }
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este documento?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      fetchDocs();
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar este documento?")) return;
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    fetchDocs();
  };

  const tabs: { value: DocStatus; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "EM_ANDAMENTO", label: "Em Andamento" },
    { value: "CONCLUIDO", label: "Concluídos" },
    { value: "RASCUNHO", label: "Rascunhos" },
    { value: "CANCELADO", label: "Cancelados" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} documento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/documentos/novo"
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg">
          <Plus className="w-4 h-4" /> Novo Documento
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab.value ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Carregando...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum documento encontrado</p>
            <Link href="/documentos/novo" className="text-emerald-600 hover:underline text-sm mt-1 block">Criar novo documento</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Assinaturas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => {
                  const cfg = statusConfig[doc.status];
                  const signedCount = doc.signers?.filter((s: any) => s.status === "ASSINADO")?.length ?? 0;
                  const totalSigners = doc.signers?.length ?? 0;
                  return (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-[#1E3A5F]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                            {doc.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{doc.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg?.bg ?? "bg-gray-100 text-gray-600"}`}>
                          {cfg?.label ?? doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                            <div
                              className="bg-emerald-500 rounded-full h-1.5 transition-all"
                              style={{ width: totalSigners > 0 ? `${(signedCount / totalSigners) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{signedCount}/{totalSigners}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/documentos/${doc.id}`}
                            className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {doc.status === "RASCUNHO" && (
                            <button
                              onClick={() => handleSend(doc.id)}
                              disabled={sending === doc.id}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Enviar para assinatura"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {doc.status === "EM_ANDAMENTO" && (
                            <button
                              onClick={() => handleCancel(doc.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {doc.status === "RASCUNHO" && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleting === doc.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
