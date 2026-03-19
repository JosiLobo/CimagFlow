"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  Send,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/use-debounce";

interface PublicMinute {
  id: string;
  number: string;
  title: string;
  description: string | null;
  validityStartDate: string | null;
  validityEndDate: string | null;
  priceValue: number | null;
  items: string | null;
  allowAdhesion: boolean;
  prefecture: {
    name: string;
    city: string;
    state: string;
  } | null;
  bid: {
    number: string;
    title: string;
  } | null;
  _count: {
    adhesions: number;
  };
}

export default function AtasPublicasPage() {
  const [minutes, setMinutes] = useState<PublicMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [onlyActive, setOnlyActive] = useState(true);
  const [selectedMinute, setSelectedMinute] = useState<PublicMinute | null>(null);
  const [showAdhesionModal, setShowAdhesionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterCpf: "",
    requesterCnpj: "",
    companyName: "",
    position: "",
    justification: "",
  });

  useEffect(() => {
    fetchMinutes();
  }, [debouncedSearch, onlyActive]);

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (onlyActive) params.append("onlyActive", "true");

      const res = await fetch(`/api/public/minutes?${params}`);
      const data = await res.json();
      setMinutes(data.minutes || []);
    } catch {
      toast.error("Erro ao carregar atas");
    } finally {
      setLoading(false);
    }
  };

  const handleAdhesionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinute) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/adhesions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minuteId: selectedMinute.id,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar solicitação");
      }

      toast.success("Solicitação enviada com sucesso! Aguarde a análise.");
      setShowAdhesionModal(false);
      resetForm();
      fetchMinutes();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar solicitação");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      requesterCpf: "",
      requesterCnpj: "",
      companyName: "",
      position: "",
      justification: "",
    });
  };

  const openAdhesionModal = (minute: PublicMinute) => {
    if (!minute.allowAdhesion) {
      toast.error("Esta ata não permite adesões");
      return;
    }
    setSelectedMinute(minute);
    setShowAdhesionModal(true);
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2C5F7F] text-white py-8 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Atas de Registro de Preço Disponíveis</h1>
          <p className="text-blue-100">Consulte e solicite adesão às atas públicas</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, título ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-sm font-medium text-emerald-700">Apenas vigentes</span>
            </label>
          </div>
        </div>

        {/* Lista de Atas */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : minutes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma ata encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {minutes.map((minute) => {
              const expired = isExpired(minute.validityEndDate);
              return (
                <motion.div
                  key={minute.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-l-4 ${
                    expired ? "border-red-400 opacity-75" : "border-emerald-400"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono font-semibold">
                          {minute.number}
                        </span>
                        {expired ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Vencida
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Vigente
                          </span>
                        )}
                        {minute.allowAdhesion && !expired && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                            Aceita adesões
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{minute.title}</h3>
                      {minute.description && (
                        <p className="text-gray-600 mb-4">{minute.description}</p>
                      )}
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {minute.validityStartDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span className="text-gray-700">
                              <strong>Início:</strong>{" "}
                              {format(new Date(minute.validityStartDate), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        {minute.validityEndDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-red-600" />
                            <span className="text-gray-700">
                              <strong>Fim:</strong>{" "}
                              {format(new Date(minute.validityEndDate), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        {minute.prefecture && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">
                              {minute.prefecture.name} - {minute.prefecture.city}/{minute.prefecture.state}
                            </span>
                          </div>
                        )}
                        {minute.priceValue && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700">
                              <strong>Valor:</strong> {formatCurrency(minute.priceValue)}
                            </span>
                          </div>
                        )}
                      </div>

                      {minute.items && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-600 font-medium mb-1">Itens Registrados:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{minute.items}</p>
                        </div>
                      )}

                      {minute._count.adhesions > 0 && (
                        <p className="text-sm text-emerald-600 font-medium">
                          {minute._count.adhesions} {minute._count.adhesions === 1 ? "adesão" : "adesões"}{" "}
                          já realizadas
                        </p>
                      )}
                    </div>

                    {minute.allowAdhesion && !expired && (
                      <button
                        onClick={() => openAdhesionModal(minute)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium shadow-md hover:shadow-lg"
                      >
                        <Send className="w-5 h-5" />
                        Solicitar Adesão
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Adesão */}
      <AnimatePresence>
        {showAdhesionModal && selectedMinute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowAdhesionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl my-8 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Solicitar Adesão</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Ata: {selectedMinute.number} - {selectedMinute.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowAdhesionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdhesionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={formData.requesterEmail}
                      onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={formData.requesterPhone}
                      onChange={(e) => setFormData({ ...formData, requesterPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                      type="text"
                      value={formData.requesterCpf}
                      onChange={(e) => setFormData({ ...formData, requesterCpf: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={formData.requesterCnpj}
                      onChange={(e) => setFormData({ ...formData, requesterCnpj: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa/Organização
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo/Função</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Justificativa
                  </label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Descreva o motivo da solicitação de adesão..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdhesionModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Enviando..." : "Enviar Solicitação"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
