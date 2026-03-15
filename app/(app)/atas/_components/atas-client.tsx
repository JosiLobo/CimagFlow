"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Prefecture {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface Bid {
  id: string;
  number: string;
  title: string;
}

interface Minute {
  id: string;
  number: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  participants: string[];
  content: string | null;
  decisions: string | null;
  isPriceRegistry: boolean;
  validityStartDate: string | null;
  validityEndDate: string | null;
  isPublic: boolean;
  allowAdhesion: boolean;
  priceValue: number | null;
  items: string | null;
  prefectureId: string | null;
  bidId: string | null;
  prefecture: Prefecture | null;
  bid: Bid | null;
  creator: { name: string };
  createdAt: string;
  _count?: { adhesions: number };
}

const MINUTE_TYPES = [
  { value: "ORDINARIA", label: "Ordinária" },
  { value: "EXTRAORDINARIA", label: "Extraordinária" },
  { value: "ESPECIAL", label: "Especial" },
  { value: "SOLENE", label: "Solene" },
];

const MINUTE_STATUS = [
  { value: "RASCUNHO", label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  { value: "APROVADA", label: "Aprovada", color: "bg-green-100 text-green-700" },
  { value: "PUBLICADA", label: "Publicada", color: "bg-blue-100 text-blue-700" },
  { value: "ARQUIVADA", label: "Arquivada", color: "bg-orange-100 text-orange-700" },
];

export default function AtasClient() {
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterType, setFilterType] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editingMinute, setEditingMinute] = useState<Minute | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    title: "",
    description: "",
    type: "ORDINARIA",
    status: "RASCUNHO",
    meetingDate: "",
    startTime: "",
    endTime: "",
    location: "",
    participants: "",
    content: "",
    decisions: "",
    prefectureId: "",
    bidId: "",
    isPriceRegistry: false,
    validityStartDate: "",
    validityEndDate: "",
    isPublic: false,
    allowAdhesion: false,
    priceValue: "",
    items: "",
  });

  const fetchMinutes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterStatus !== "TODOS") params.append("status", filterStatus);
      if (filterType !== "TODOS") params.append("type", filterType);

      const res = await fetch(`/api/minutes?${params}`);
      const data = await res.json();
      setMinutes(data.minutes || []);
    } catch {
      toast.error("Erro ao carregar atas");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterType]);

  const fetchPrefectures = async () => {
    try {
      const res = await fetch("/api/prefectures");
      const data = await res.json();
      setPrefectures(data.prefectures || []);
    } catch {
      console.error("Erro ao carregar prefeituras");
    }
  };

  const fetchBids = async () => {
    try {
      const res = await fetch("/api/bids");
      const data = await res.json();
      setBids(data.bids || []);
    } catch {
      console.error("Erro ao carregar editais");
    }
  };

  useEffect(() => {
    fetchMinutes();
    fetchPrefectures();
    fetchBids();
  }, [fetchMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        participants: formData.participants.split(",").map((p) => p.trim()).filter(Boolean),
      };

      if (editingMinute) {
        await fetch(`/api/minutes/${editingMinute.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Ata atualizada!");
      } else {
        await fetch("/api/minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Ata cadastrada!");
      }
      setShowModal(false);
      setEditingMinute(null);
      resetForm();
      fetchMinutes();
    } catch {
      toast.error("Erro ao salvar ata");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta ata?")) return;
    try {
      await fetch(`/api/minutes/${id}`, { method: "DELETE" });
      toast.success("Ata excluída!");
      fetchMinutes();
    } catch {
      toast.error("Erro ao excluir ata");
    }
  };

  const openEditModal = (minute: Minute) => {
    setEditingMinute(minute);
    setFormData({
      number: minute.number,
      title: minute.title,
      description: minute.description || "",
      type: minute.type,
      status: minute.status,
      meetingDate: minute.meetingDate ? minute.meetingDate.split("T")[0] : "",
      startTime: minute.startTime || "",
      endTime: minute.endTime || "",
      location: minute.location || "",
      participants: minute.participants.join(", "),
      content: minute.content || "",
      decisions: minute.decisions || "",
      prefectureId: minute.prefectureId || "",
      bidId: minute.bidId || "",
      isPriceRegistry: minute.isPriceRegistry || false,
      validityStartDate: minute.validityStartDate ? minute.validityStartDate.split("T")[0] : "",
      validityEndDate: minute.validityEndDate ? minute.validityEndDate.split("T")[0] : "",
      isPublic: minute.isPublic || false,
      allowAdhesion: minute.allowAdhesion || false,
      priceValue: minute.priceValue?.toString() || "",
      items: minute.items || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      number: "",
      title: "",
      description: "",
      type: "ORDINARIA",
      status: "RASCUNHO",
      meetingDate: "",
      startTime: "",
      endTime: "",
      location: "",
      participants: "",
      content: "",
      decisions: "",
      prefectureId: "",
      bidId: "",
      isPriceRegistry: false,
      validityStartDate: "",
      validityEndDate: "",
      isPublic: false,
      allowAdhesion: false,
      priceValue: "",
      items: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const s = MINUTE_STATUS.find((m) => m.value === status);
    return s ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span> : status;
  };

  const getTypeLabel = (type: string) => {
    return MINUTE_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atas de Registro de Preços</h1>
          <p className="text-gray-500">Gerencie as atas de registro de preços</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/atas-publicas"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Ver URL Pública
          </Link>
          <Link
            href="/atas/adesoes"
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
          >
            <Inbox className="w-5 h-5" />
            Adesões
          </Link>
          <button
            onClick={() => {
              setEditingMinute(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Ata
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número ou título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="TODOS">Todos os Status</option>
          {MINUTE_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="TODOS">Todos os Tipos</option>
          {MINUTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : minutes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma ata encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {minutes.map((minute) => (
            <motion.div
              key={minute.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">
                      {minute.number}
                    </span>
                    {getStatusBadge(minute.status)}
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                      {getTypeLabel(minute.type)}
                    </span>
                    {minute.isPriceRegistry && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                        📋 Registro de Preço
                      </span>
                    )}
                    {minute.isPublic && (
                      <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-xs">
                        🌐 Pública
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{minute.title}</h3>
                  {minute.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{minute.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(minute.meetingDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {minute.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {minute.startTime}
                          {minute.endTime && ` - ${minute.endTime}`}
                        </span>
                      </div>
                    )}
                    {minute.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{minute.location}</span>
                      </div>
                    )}
                    {minute.participants.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{minute.participants.length} participantes</span>
                      </div>
                    )}
                    {minute.prefecture && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{minute.prefecture.name}</span>
                      </div>
                    )}
                  </div>
                  {minute.bid && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        Edital: {minute.bid.number} - {minute.bid.title}
                      </span>
                    </div>
                  )}
                  {minute.isPriceRegistry && (minute.validityStartDate || minute.validityEndDate) && (
                    <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-4 text-xs">
                        {minute.validityStartDate && (
                          <span className="text-purple-700">
                            <strong>Início:</strong> {format(new Date(minute.validityStartDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {minute.validityEndDate && (
                          <span className="text-purple-700">
                            <strong>Fim:</strong> {format(new Date(minute.validityEndDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {minute.validityEndDate && new Date(minute.validityEndDate) < new Date() && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                            Vencida
                          </span>
                        )}
                        {minute.validityEndDate && new Date(minute.validityEndDate) >= new Date() && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Vigente
                          </span>
                        )}
                      </div>
                      {minute._count?.adhesions !== undefined && minute._count.adhesions > 0 && (
                        <div className="mt-1 text-xs text-purple-600">
                          {minute._count.adhesions} {minute._count.adhesions === 1 ? 'adesão' : 'adesões'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(minute)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(minute.id)}
                    className="p-2 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingMinute ? "Editar Ata" : "Nova Ata"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                      placeholder="001/2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {MINUTE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {MINUTE_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data da Reunião *</label>
                    <input
                      type="date"
                      value={formData.meetingDate}
                      onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Início</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Término</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Sala de reuniões, endereço, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prefeitura</label>
                    <select
                      value={formData.prefectureId}
                      onChange={(e) => setFormData({ ...formData, prefectureId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione</option>
                      {prefectures.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.city}/{p.state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edital Relacionado</label>
                    <select
                      value={formData.bidId}
                      onChange={(e) => setFormData({ ...formData, bidId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione</option>
                      {bids.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.number} - {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Participantes (separados por vírgula)
                  </label>
                  <textarea
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="João Silva, Maria Santos, ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo da Ata</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Descreva o conteúdo da reunião..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decisões Tomadas</label>
                  <textarea
                    value={formData.decisions}
                    onChange={(e) => setFormData({ ...formData, decisions: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Liste as decisões, deliberações e ações definidas..."
                  />
                </div>

                {/* Seção de Registro de Preço */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="isPriceRegistry"
                      checked={formData.isPriceRegistry}
                      onChange={(e) => setFormData({ ...formData, isPriceRegistry: e.target.checked })}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <label htmlFor="isPriceRegistry" className="text-sm font-medium text-gray-700">
                      📋 Esta é uma Ata de Registro de Preço
                    </label>
                  </div>

                  {formData.isPriceRegistry && (
                    <div className="space-y-4 pl-7 border-l-2 border-purple-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de Início da Vigência
                          </label>
                          <input
                            type="date"
                            value={formData.validityStartDate}
                            onChange={(e) => setFormData({ ...formData, validityStartDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data de Fim da Vigência
                          </label>
                          <input
                            type="date"
                            value={formData.validityEndDate}
                            onChange={(e) => setFormData({ ...formData, validityEndDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valor Estimado (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.priceValue}
                          onChange={(e) => setFormData({ ...formData, priceValue: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Itens/Produtos Registrados
                        </label>
                        <textarea
                          value={formData.items}
                          onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Liste os itens, produtos ou serviços registrados..."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isPublic"
                          checked={formData.isPublic}
                          onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                          className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 rounded"
                        />
                        <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                          🌐 Disponibilizar publicamente (URL acessível sem login)
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="allowAdhesion"
                          checked={formData.allowAdhesion}
                          onChange={(e) => setFormData({ ...formData, allowAdhesion: e.target.checked })}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 rounded"
                        />
                        <label htmlFor="allowAdhesion" className="text-sm font-medium text-gray-700">
                          ✅ Permitir adesões (formulário público de solicitação)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
                  >
                    Salvar
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
