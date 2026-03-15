"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  FileText,
  ClipboardList,
  FolderOpen,
  PenLine,
  FileCode2,
  Building2,
  Building,
  ScrollText,
  FileCheck,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "demandas", label: "Demandas", icon: ClipboardList },
  { key: "pastas", label: "Pastas", icon: FolderOpen },
  { key: "para-assinar", label: "Para Assinar", icon: PenLine },
  { key: "templates", label: "Templates", icon: FileCode2 },
  { key: "assinantes", label: "Assinantes", icon: Users },
  { key: "prefeituras", label: "Prefeituras", icon: Building2 },
  { key: "empresas", label: "Empresas", icon: Building },
  { key: "editais", label: "Editais", icon: ScrollText },
  { key: "atas", label: "Atas", icon: FileCheck },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export default function ColaboradoresClient() {
  const { data: session } = useSession() || {};
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "COLABORADOR",
    permissions: ALL_MODULES.map((m) => m.key),
  });

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isAdmin = userRole === "ADMIN";

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators?search=${search}`);
      const data = await res.json();
      setUsers(data || []);
    } catch {
      toast.error("Erro ao carregar colaboradores");
    } finally {
      setLoading(false);
    }
  }, [search, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData: Record<string, unknown> = { name: formData.name, phone: formData.phone, role: formData.role, permissions: formData.permissions };
        if (formData.password) updateData.password = formData.password;
        await fetch(`/api/collaborators/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        toast.success("Colaborador atualizado!");
      } else {
        await fetch("/api/collaborators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        toast.success("Colaborador cadastrado!");
      }
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch {
      toast.error("Erro ao salvar colaborador");
    }
  };

  const handleDelete = async (id: string) => {
    if (id === userId) {
      toast.error("Você não pode excluir seu próprio usuário");
      return;
    }
    if (!confirm("Excluir este colaborador?")) return;
    try {
      await fetch(`/api/collaborators/${id}`, { method: "DELETE" });
      toast.success("Colaborador excluído!");
      fetchUsers();
    } catch {
      toast.error("Erro ao excluir colaborador");
    }
  };

  const toggleActive = async (user: User) => {
    if (user.id === userId) {
      toast.error("Você não pode desativar seu próprio usuário");
      return;
    }
    try {
      await fetch(`/api/collaborators/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      toast.success(user.isActive ? "Colaborador desativado!" : "Colaborador ativado!");
      fetchUsers();
    } catch {
      toast.error("Erro ao atualizar colaborador");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role: user.role,
      permissions: user.permissions?.length ? user.permissions : ALL_MODULES.map((m) => m.key),
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", phone: "", role: "COLABORADOR", permissions: ALL_MODULES.map((m) => m.key) });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="text-gray-500">Gerencie os usuários do sistema</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Colaborador
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Acesso</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-700 font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.role === "ADMIN" ? "Administrador" : "Colaborador"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === "ADMIN" ? (
                        <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                          <Eye className="w-3 h-3" />
                          Todos
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Eye className="w-3 h-3" />
                          {user.permissions?.length || 0} de {ALL_MODULES.length}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={user.id === userId}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        } ${user.id === userId ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                      >
                        {user.isActive ? (
                          <><CheckCircle className="w-3 h-3" /> Ativo</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Inativo</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "Nunca acessou"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(user)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        {user.id !== userId && (
                          <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-100 rounded-lg">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
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
              className="bg-white rounded-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingUser ? "Editar Colaborador" : "Novo Colaborador"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required disabled={!!editingUser} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required={!editingUser} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="COLABORADOR">Colaborador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                {formData.role !== "ADMIN" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Módulos Permitidos</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, permissions: ALL_MODULES.map((m) => m.key) })}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Marcar todos
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, permissions: [] })}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-3 space-y-1 max-h-52 overflow-y-auto">
                      {ALL_MODULES.map((mod) => {
                        const checked = formData.permissions.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              checked ? "bg-emerald-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const perms = checked
                                  ? formData.permissions.filter((p) => p !== mod.key)
                                  : [...formData.permissions, mod.key];
                                setFormData({ ...formData, permissions: perms });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                            />
                            <mod.icon className={`w-4 h-4 ${checked ? "text-emerald-600" : "text-gray-400"}`} />
                            <span className={`text-sm ${checked ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                              {mod.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.permissions.length} de {ALL_MODULES.length} módulos selecionados
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Salvar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
