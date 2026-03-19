"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  FolderPlus,
  Search,
  ChevronRight,
  Home,
  FileText,
  Trash2,
  Edit2,
  X,
  ArrowLeft,
  FilePlus,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

interface Folder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  prefectureId: string | null;
  createdAt: string;
  _count: { children: number; documents: number };
  prefecture?: { id: string; name: string; city: string; state: string };
}

interface Document {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function PastasClient() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isGestor = userRole === "GESTOR";
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Raiz" },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", prefectureId: "" });

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.append("parentId", currentFolderId);
      if (search) params.append("search", search);

      const res = await fetch(`/api/folders?${params}`);
      const data = await res.json();
      setFolders(data);

      if (currentFolderId) {
        const folderRes = await fetch(`/api/folders/${currentFolderId}`);
        const folderData = await folderRes.json();
        setDocuments(folderData.documents || []);
      } else {
        setDocuments([]);
      }
    } catch {
      toast.error("Erro ao carregar pastas");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, search]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const fetchPrefectures = async () => {
      try {
        const res = await fetch("/api/prefectures");
        const data = await res.json();
        setPrefectures(Array.isArray(data) ? data : data.prefectures || []);
      } catch {
        console.error("Erro ao carregar prefeituras");
      }
    };
    fetchPrefectures();
  }, []);

  const navigateToFolder = async (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setBreadcrumb([{ id: null, name: "Raiz" }]);
    } else {
      const existingIndex = breadcrumb.findIndex((b) => b.id === folderId);
      if (existingIndex >= 0) {
        setBreadcrumb(breadcrumb.slice(0, existingIndex + 1));
      } else {
        setBreadcrumb([...breadcrumb, { id: folderId, name: folderName }]);
      }
    }
    setCurrentFolderId(folderId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFolder) {
        await fetch(`/api/folders/${editingFolder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        toast.success("Pasta atualizada!");
      } else {
        await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, parentId: currentFolderId, prefectureId: formData.prefectureId || null }),
        });
        toast.success("Pasta criada!");
      }
      setShowModal(false);
      setEditingFolder(null);
      setFormData({ name: "", description: "", prefectureId: "" });
      fetchFolders();
    } catch {
      toast.error("Erro ao salvar pasta");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta pasta?")) return;
    try {
      await fetch(`/api/folders/${id}`, { method: "DELETE" });
      toast.success("Pasta excluída!");
      fetchFolders();
    } catch {
      toast.error("Erro ao excluir pasta");
    }
  };

  const openEditModal = (folder: Folder) => {
    setEditingFolder(folder);
    setFormData({ name: folder.name, description: folder.description || "", prefectureId: folder.prefectureId || "" });
    setShowModal(true);
  };

  const statusColors: Record<string, string> = {
    RASCUNHO: "bg-gray-100 text-gray-700",
    EM_ANDAMENTO: "bg-yellow-100 text-yellow-700",
    CONCLUIDO: "bg-green-100 text-green-700",
    CANCELADO: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pastas</h1>
          <p className="text-gray-500">Organize seus documentos em pastas</p>
        </div>
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <Link
              href={`/documentos/novo?folderId=${currentFolderId}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <FilePlus className="w-5 h-5" />
              Adicionar Contrato
            </Link>
          )}
          {!isGestor && (
            <button
              onClick={() => {
                setEditingFolder(null);
                setFormData({ name: "", description: "", prefectureId: "" });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <FolderPlus className="w-5 h-5" />
              Nova Pasta
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
        {breadcrumb.map((item, index) => (
          <div key={item.id ?? "root"} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            <button
              onClick={() => navigateToFolder(item.id, item.name)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                index === breadcrumb.length - 1
                  ? "bg-emerald-100 text-emerald-700 font-medium"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              {index === 0 && <Home className="w-4 h-4" />}
              {item.name}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        {currentFolderId && (
          <button
            onClick={() => {
              const parent = breadcrumb[breadcrumb.length - 2];
              navigateToFolder(parent?.id ?? null, parent?.name ?? "Raiz");
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pastas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {folders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Pastas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all group cursor-pointer"
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{folder.name}</h4>
                            {folder.prefecture && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full" title={`${folder.prefecture.name} - ${folder.prefecture.city}/${folder.prefecture.state}`}>
                                <Landmark className="w-3 h-3" />
                                <span className="hidden sm:inline">{folder.prefecture.city}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {folder._count.children} pastas • {folder._count.documents} docs
                          </p>
                        </div>
                      </div>
                      {!isGestor && (
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditModal(folder)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(folder.id)}
                              className="p-1.5 hover:bg-red-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Documentos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map((doc) => (
                  <Link key={doc.id} href={`/documentos/${doc.id}`}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              statusColors[doc.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {doc.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {folders.length === 0 && documents.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma pasta encontrada</p>
            </div>
          )}
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
              className="bg-white rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingFolder ? "Editar Pasta" : "Nova Pasta"}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Landmark className="w-4 h-4 text-gray-500" />
                    Associar à Prefeitura (opcional)
                  </label>
                  <select
                    value={formData.prefectureId}
                    onChange={(e) => setFormData({ ...formData, prefectureId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Nenhuma prefeitura</option>
                    {prefectures.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.city}/{p.state}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ao usar templates, apenas pastas desta prefeitura aparecerão
                  </p>
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
