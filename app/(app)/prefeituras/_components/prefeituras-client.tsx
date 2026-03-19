"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";

interface Signer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  type: string;
  isActive: boolean;
}

interface Prefecture {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  mayorName: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { signers: number; bids: number };
}

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const typeLabels: Record<string, string> = {
  OUTRO: "Outro", FORNECEDOR: "Fornecedor", PREFEITO: "Prefeito", JURIDICO: "Jurídico", TESTEMUNHA: "Testemunha",
};

export default function PrefeiturasClient() {
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showModal, setShowModal] = useState(false);
  const [editingPrefecture, setEditingPrefecture] = useState<Prefecture | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    mayorName: "",
  });

  // Signers panel state
  const [selectedPrefecture, setSelectedPrefecture] = useState<Prefecture | null>(null);
  const [prefectureSigners, setPrefectureSigners] = useState<Signer[]>([]);
  const [availableSigners, setAvailableSigners] = useState<Signer[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);
  const [signerSearch, setSignerSearch] = useState("");

  const fetchPrefectures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prefectures?search=${encodeURIComponent(debouncedSearch)}`);
      const data = await res.json();
      setPrefectures(data.prefectures || []);
    } catch {
      toast.error("Erro ao carregar prefeituras");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPrefectures();
  }, [fetchPrefectures]);

  const fetchPrefectureSigners = async (prefId: string) => {
    setLoadingSigners(true);
    try {
      const [prefRes, allSignersRes] = await Promise.all([
        fetch(`/api/prefectures/${prefId}`),
        fetch("/api/signers?limit=1000"),
      ]);
      const prefData = await prefRes.json();
      const allData = await allSignersRes.json();

      const linked: Signer[] = prefData.signers || [];
      const linkedIds = new Set(linked.map((s: Signer) => s.id));
      const available = (allData.signers || []).filter((s: Signer) => !linkedIds.has(s.id));

      setPrefectureSigners(linked);
      setAvailableSigners(available);
    } catch {
      toast.error("Erro ao carregar assinantes");
    } finally {
      setLoadingSigners(false);
    }
  };

  const openSignersPanel = (pref: Prefecture) => {
    setSelectedPrefecture(pref);
    setSignerSearch("");
    fetchPrefectureSigners(pref.id);
  };

  const closeSignersPanel = () => {
    setSelectedPrefecture(null);
    setPrefectureSigners([]);
    setAvailableSigners([]);
    setSignerSearch("");
  };

  const addSignerToPrefecture = async (signerId: string) => {
    if (!selectedPrefecture) return;
    try {
      await fetch(`/api/signers/${signerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefectureId: selectedPrefecture.id }),
      });
      toast.success("Assinante associado!");
      fetchPrefectureSigners(selectedPrefecture.id);
      fetchPrefectures();
    } catch {
      toast.error("Erro ao associar assinante");
    }
  };

  const removeSignerFromPrefecture = async (signerId: string) => {
    if (!selectedPrefecture) return;
    try {
      await fetch(`/api/signers/${signerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefectureId: null }),
      });
      toast.success("Assinante desvinculado!");
      fetchPrefectureSigners(selectedPrefecture.id);
      fetchPrefectures();
    } catch {
      toast.error("Erro ao desvincular assinante");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPrefecture) {
        await fetch(`/api/prefectures/${editingPrefecture.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        toast.success("Prefeitura atualizada!");
      } else {
        await fetch("/api/prefectures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        toast.success("Prefeitura cadastrada!");
      }
      setShowModal(false);
      setEditingPrefecture(null);
      resetForm();
      fetchPrefectures();
    } catch {
      toast.error("Erro ao salvar prefeitura");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta prefeitura?")) return;
    try {
      await fetch(`/api/prefectures/${id}`, { method: "DELETE" });
      toast.success("Prefeitura excluída!");
      fetchPrefectures();
    } catch {
      toast.error("Erro ao excluir prefeitura");
    }
  };

  const openEditModal = (pref: Prefecture) => {
    setEditingPrefecture(pref);
    setFormData({
      name: pref.name,
      cnpj: pref.cnpj || "",
      address: pref.address || "",
      city: pref.city,
      state: pref.state,
      phone: pref.phone || "",
      email: pref.email || "",
      mayorName: pref.mayorName || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", cnpj: "", address: "", city: "", state: "", phone: "", email: "", mayorName: "" });
  };

  const filteredAvailable = availableSigners.filter(
    (s) =>
      s.name.toLowerCase().includes(signerSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(signerSearch.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prefeituras</h1>
          <p className="text-gray-500">Gerencie as prefeituras municipais</p>
        </div>
        <button
          onClick={() => { setEditingPrefecture(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Prefeitura
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, cidade ou estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : prefectures.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma prefeitura encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {prefectures.map((pref) => (
            <motion.div
              key={pref.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{pref.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {pref.city} - {pref.state}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(pref)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(pref.id)} className="p-2 hover:bg-red-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {pref.mayorName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Prefeito: {pref.mayorName}</span>
                  </div>
                )}
                {pref.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{pref.phone}</span>
                  </div>
                )}
                {pref.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{pref.email}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 text-sm">
                <button
                  onClick={() => openSignersPanel(pref)}
                  className="flex items-center gap-1.5 text-[#1E3A5F] hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Users className="w-4 h-4" />
                  <span>{pref._count.signers} assinantes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Prefecture Modal */}
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
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingPrefecture ? "Editar Prefeitura" : "Nova Prefeitura"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                    <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                      <option value="">Selecione</option>
                      {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input type="text" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Prefeito</label>
                  <input type="text" value={formData.mayorName} onChange={(e) => setFormData({ ...formData, mayorName: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Salvar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signers Panel Modal */}
      <AnimatePresence>
        {selectedPrefecture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeSignersPanel}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Assinantes</h2>
                    <p className="text-sm text-gray-500">{selectedPrefecture.name} — {selectedPrefecture.city}/{selectedPrefecture.state}</p>
                  </div>
                </div>
                <button onClick={closeSignersPanel} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingSigners ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Current Signers */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assinantes vinculados ({prefectureSigners.length})
                      </h3>
                      {prefectureSigners.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Nenhum assinante vinculado</p>
                          <p className="text-xs text-gray-400 mt-1">Adicione assinantes na seção abaixo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {prefectureSigners.map((signer) => (
                            <div
                              key={signer.id}
                              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm">
                                  {signer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{signer.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{signer.email}</span>
                                    {signer.type && (
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                        {typeLabels[signer.type] ?? signer.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => removeSignerFromPrefecture(signer.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                title="Desvincular assinante"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Signers */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Adicionar assinante
                      </h3>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar assinante por nome ou email..."
                          value={signerSearch}
                          onChange={(e) => setSignerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                      {filteredAvailable.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {availableSigners.length === 0
                            ? "Todos os assinantes já estão vinculados"
                            : "Nenhum assinante encontrado"}
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {filteredAvailable.map((signer) => (
                            <div
                              key={signer.id}
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs">
                                  {signer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700 text-sm">{signer.name}</p>
                                  <p className="text-xs text-gray-400">{signer.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => addSignerToPrefecture(signer.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors font-medium"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Vincular
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
