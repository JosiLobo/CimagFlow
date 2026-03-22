"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
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
  Package,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  cep: string | null;
  number: string | null;
  complement: string | null;
  isCredenciada: boolean;
  bidId: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { signers: number; items: number };
  bid?: { id: string; title: string; number: string } | null;
  items?: CompanyItem[];
}

interface CompanyItem {
  id?: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  type: string;
  isActive: boolean;
}

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const typeLabels: Record<string, string> = {
  OUTRO: "Outro",
  FORNECEDOR: "Fornecedor",
  PREFEITO: "Prefeito",
  JURIDICO: "Jurídico",
  TESTEMUNHA: "Testemunha",
};

interface Bid {
  id: string;
  title: string;
  number: string;
}

export default function EmpresasClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    contactName: "",
    cep: "",
    number: "",
    complement: "",
    isCredenciada: false,
    bidId: "",
  });
  const [formItems, setFormItems] = useState<CompanyItem[]>([]);

  // Signers panel state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySigners, setCompanySigners] = useState<Signer[]>([]);
  const [availableSigners, setAvailableSigners] = useState<Signer[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);
  const [signerSearch, setSignerSearch] = useState("");

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies?search=${search}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch {
      toast.error("Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch("/api/bids?limit=1000");
      const data = await res.json();
      setBids(data.bids || []);
    } catch {
      toast.error("Erro ao carregar editais");
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchBids();
  }, [fetchCompanies, fetchBids]);

  const fetchCompanySigners = async (companyId: string) => {
    setLoadingSigners(true);
    try {
      const [companyRes, allSignersRes] = await Promise.all([
        fetch(`/api/companies/${companyId}`),
        fetch("/api/signers?limit=1000"),
      ]);
      const companyData = await companyRes.json();
      const allData = await allSignersRes.json();
      const linked: Signer[] = companyData.signers || [];
      const linkedIds = new Set(linked.map((s: Signer) => s.id));
      const available = (allData.signers || []).filter((s: Signer) => !linkedIds.has(s.id));
      setCompanySigners(linked);
      setAvailableSigners(available);
    } catch {
      toast.error("Erro ao carregar assinantes");
    } finally {
      setLoadingSigners(false);
    }
  };

  const openSignersPanel = (company: Company) => {
    setSelectedCompany(company);
    setSignerSearch("");
    fetchCompanySigners(company.id);
  };

  const closeSignersPanel = () => {
    setSelectedCompany(null);
    setCompanySigners([]);
    setAvailableSigners([]);
    setSignerSearch("");
  };

  const addSignerToCompany = async (signerId: string) => {
    if (!selectedCompany) return;
    try {
      await fetch(`/api/signers/${signerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompany.id }),
      });
      toast.success("Assinante associado!");
      fetchCompanySigners(selectedCompany.id);
      fetchCompanies();
    } catch {
      toast.error("Erro ao associar assinante");
    }
  };

  const removeSignerFromCompany = async (signerId: string) => {
    if (!selectedCompany) return;
    try {
      await fetch(`/api/signers/${signerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: null }),
      });
      toast.success("Assinante desvinculado!");
      fetchCompanySigners(selectedCompany.id);
      fetchCompanies();
    } catch {
      toast.error("Erro ao desvincular assinante");
    }
  };

  const filteredAvailable = availableSigners.filter(
    (s) =>
      s.name.toLowerCase().includes(signerSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(signerSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, items: formItems.filter(i => i.name.trim()) };
      if (editingCompany) {
        await fetch(`/api/companies/${editingCompany.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Empresa atualizada!");
      } else {
        await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Empresa cadastrada!");
      }
      setShowModal(false);
      setEditingCompany(null);
      resetForm();
      fetchCompanies();
    } catch {
      toast.error("Erro ao salvar empresa");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta empresa?")) return;
    try {
      await fetch(`/api/companies/${id}`, { method: "DELETE" });
      toast.success("Empresa excluída!");
      fetchCompanies();
    } catch {
      toast.error("Erro ao excluir empresa");
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      tradeName: company.tradeName || "",
      cnpj: company.cnpj || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      phone: company.phone || "",
      email: company.email || "",
      contactName: company.contactName || "",
      cep: company.cep || "",
      number: company.number || "",
      complement: company.complement || "",
      isCredenciada: company.isCredenciada || false,
      bidId: company.bidId || "",
    });
    setFormItems((company.items || []).map(i => ({
      name: i.name,
      description: i.description || "",
      unit: i.unit || "UN",
      quantity: i.quantity ?? 1,
      unitPrice: i.unitPrice ?? 0,
    })));
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", tradeName: "", cnpj: "", address: "", city: "", state: "", phone: "", email: "", contactName: "", cep: "", number: "", complement: "", isCredenciada: false, bidId: "" });
    setFormItems([]);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Fornecedoras</h1>
          <p className="text-gray-500">Gerencie as empresas fornecedoras</p>
        </div>
        <button
          onClick={() => { setEditingCompany(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Empresa
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, nome fantasia ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma empresa encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    {company.tradeName && <p className="text-sm text-gray-500">{company.tradeName}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(company)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(company.id)} className="p-2 hover:bg-red-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {company.cnpj && <p className="text-gray-500">CNPJ: {company.cnpj}</p>}
                {(company.city || company.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{[company.city, company.state].filter(Boolean).join(" - ")}</span>
                  </div>
                )}
                {company.contactName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{company.contactName}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{company.email}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
                <button
                  onClick={() => openSignersPanel(company)}
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>{company._count.signers} assinantes</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                <span className="flex items-center gap-1 text-emerald-600">
                  <Package className="w-4 h-4" />
                  <span>{company._count.items} itens</span>
                </span>
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
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingCompany ? "Editar Empresa" : "Nova Empresa"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                  <input type="text" value={formData.tradeName} onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
                  <input type="text" value={formData.cnpj} onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                    let masked = digits;
                    if (digits.length > 2) masked = digits.slice(0, 2) + "." + digits.slice(2);
                    if (digits.length > 5) masked = masked.slice(0, 6) + "." + digits.slice(5);
                    if (digits.length > 8) masked = masked.slice(0, 10) + "/" + digits.slice(8);
                    if (digits.length > 12) masked = masked.slice(0, 15) + "-" + digits.slice(12);
                    setFormData({ ...formData, cnpj: masked });
                  }} maxLength={18} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider" placeholder="00.000.000/0000-00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP *</label>
                    <input type="text" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="00000-000" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <input type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                    <input type="text" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Selecione</option>
                      {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contato</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edital</label>
                  <select value={formData.bidId} onChange={(e) => setFormData({ ...formData, bidId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Selecione um edital</option>
                    {bids.map((bid) => (
                      <option key={bid.id} value={bid.id}>
                        {bid.number} - {bid.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isCredenciada"
                    checked={formData.isCredenciada}
                    onChange={(e) => setFormData({ ...formData, isCredenciada: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isCredenciada" className="text-sm font-medium text-gray-700">
                    Empresa Credenciada
                  </label>
                </div>

                {/* Itens Fornecidos */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      Itens Fornecidos
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormItems([...formItems, { name: "", description: "", unit: "UN", quantity: 1, unitPrice: 0 }])}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Item
                    </button>
                  </div>
                  {formItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                      Nenhum item cadastrado. Clique em &quot;Adicionar Item&quot; para começar.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 relative">
                          <button
                            type="button"
                            onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <input
                              type="text"
                              placeholder="Nome do item *"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...formItems];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setFormItems(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Descrição (opcional)"
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...formItems];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                setFormItems(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Unidade</label>
                              <select
                                value={item.unit}
                                onChange={(e) => {
                                  const updated = [...formItems];
                                  updated[idx] = { ...updated[idx], unit: e.target.value };
                                  setFormItems(updated);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="UN">UN</option>
                                <option value="KG">KG</option>
                                <option value="L">L</option>
                                <option value="M">M</option>
                                <option value="M²">M²</option>
                                <option value="M³">M³</option>
                                <option value="CX">CX</option>
                                <option value="PCT">PCT</option>
                                <option value="HR">HR</option>
                                <option value="DIA">DIA</option>
                                <option value="MÊS">MÊS</option>
                                <option value="SV">SV</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Quantidade</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...formItems];
                                  updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                                  setFormItems(updated);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Preço Unit. (R$)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updated = [...formItems];
                                  updated[idx] = { ...updated[idx], unitPrice: parseFloat(e.target.value) || 0 };
                                  setFormItems(updated);
                                }}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            Total: <span className="font-semibold text-gray-700">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.quantity * item.unitPrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {formItems.length > 0 && (
                        <div className="text-right text-sm font-semibold text-emerald-700 pt-1">
                          Total Geral: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            formItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
        {selectedCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeSignersPanel}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assinantes da Empresa</h2>
                  <p className="text-sm text-gray-500">{selectedCompany.name}</p>
                </div>
                <button onClick={closeSignersPanel} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingSigners ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <>
                    {/* Linked Signers */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        Assinantes Vinculados ({companySigners.length})
                      </h3>
                      {companySigners.length === 0 ? (
                        <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                          Nenhum assinante vinculado a esta empresa
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {companySigners.map((signer) => (
                            <div key={signer.id} className="flex items-center justify-between bg-purple-50 rounded-xl p-3">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{signer.name}</p>
                                <p className="text-xs text-gray-500">{signer.email}</p>
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                  {typeLabels[signer.type] || signer.type}
                                </span>
                              </div>
                              <button
                                onClick={() => removeSignerFromCompany(signer.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Available Signers */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-500" />
                        Assinantes Disponíveis
                      </h3>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar assinante por nome ou email..."
                          value={signerSearch}
                          onChange={(e) => setSignerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      {filteredAvailable.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          Nenhum assinante disponível
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredAvailable.map((signer) => (
                            <div key={signer.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{signer.name}</p>
                                <p className="text-xs text-gray-500">{signer.email}</p>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                  {typeLabels[signer.type] || signer.type}
                                </span>
                              </div>
                              <button
                                onClick={() => addSignerToCompany(signer.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
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
