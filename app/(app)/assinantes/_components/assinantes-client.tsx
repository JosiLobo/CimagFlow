"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Search, Edit2, Trash2, X, Check, Loader2, User, Mail, Phone, Building2 } from "lucide-react";

const TYPES = ["PRESIDENTE", "PREFEITO", "JURIDICO", "TESTEMUNHA", "FORNECEDOR", "OUTRO"];
const typeLabels: Record<string, string> = {
  PRESIDENTE: "Presidente", PREFEITO: "Prefeito", JURIDICO: "Jurídico", TESTEMUNHA: "Testemunha", FORNECEDOR: "Fornecedor", OUTRO: "Outro"
};

const emptyForm = { name: "", email: "", phone: "", cpf: "", type: "OUTRO", municipality: "", company: "", isActive: true };

export default function AssinantesClient() {
  const [signers, setSigners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSigners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/signers?${params}`);
      const data = await res.json();
      setSigners(data.signers ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchSigners, 300);
    return () => clearTimeout(t);
  }, [fetchSigners]);

  const openCreate = () => { setForm({ ...emptyForm }); setEditId(null); setShowModal(true); };
  const openEdit = (s: any) => {
    setForm({ name: s.name ?? "", email: s.email ?? "", phone: s.phone ?? "", cpf: s.cpf ?? "", type: s.type ?? "OUTRO",
      municipality: s.municipality ?? "", company: s.company ?? "", isActive: s.isActive ?? true });
    setEditId(s.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { alert("Nome e email obrigatórios"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/signers/${editId}` : "/api/signers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); fetchSigners(); }
      else { const d = await res.json(); alert(d.error ?? "Erro ao salvar"); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este assinante?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/signers/${id}`, { method: "DELETE" });
      fetchSigners();
    } finally { setDeleting(null); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assinantes</h1>
          <p className="text-gray-500 text-sm">{total} assinante{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg">
          <Plus className="w-4 h-4" /> Novo Assinante
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou empresa..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16"><div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400">Carregando...</p></div>
        ) : signers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum assinante encontrado</p>
            <button onClick={openCreate} className="text-emerald-600 hover:underline text-sm mt-1">Adicionar assinante</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Assinante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Empresa/Município</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {signers.map((s) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-[#1E3A5F] font-semibold flex-shrink-0">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{typeLabels[s.type] ?? s.type}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {s.company || s.municipality || "-"}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">{editId ? "Editar" : "Novo"} Assinante</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "Nome *", key: "name", icon: User, placeholder: "Nome completo" },
                    { label: "Email *", key: "email", icon: Mail, type: "email", placeholder: "email@exemplo.com" },
                    { label: "Telefone", key: "phone", icon: Phone, placeholder: "(11) 99999-9999" },
                    { label: "CPF", key: "cpf", icon: User, placeholder: "000.000.000-00" },
                    { label: "Empresa", key: "company", icon: Building2, placeholder: "Nome da empresa" },
                    { label: "Município", key: "municipality", icon: Building2, placeholder: "Cidade" },
                  ].map(({ label, key, icon: Icon, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <div className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type={type ?? "text"} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm">
                      {TYPES.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#1E3A5F] rounded" />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Assinante ativo</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium text-sm">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
