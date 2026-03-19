"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Upload,
  FileCheck,
  Loader2,
  Paperclip,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/use-debounce";

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
  description: string | null;
  type: string;
  status: string;
  openingDate: string | null;
  closingDate: string | null;
  value: number | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  prefectureId: string | null;
  prefecture: Prefecture | null;
  creator: { name: string };
  createdAt: string;
  _count: { documents: number };
}

const BID_TYPES = [
  { value: "CHAMADA_PUBLICA", label: "Chamada Pública" },
  { value: "COMPRA_DIRETA", label: "Compra Direta" },
  { value: "CONCORRENCIA", label: "Concorrência" },
  { value: "CONCURSO", label: "Concurso" },
  { value: "CONVENIO", label: "Convênio" },
  { value: "CONVITE", label: "Convite" },
  { value: "CREDENCIAMENTO", label: "Credenciamento" },
  { value: "DISPENSA", label: "Dispensa" },
  { value: "INEXIGIBILIDADE", label: "Inexigibilidade" },
  { value: "LEILAO", label: "Leilão" },
  { value: "PREGAO", label: "Pregão" },
  { value: "PREGAO_ELETRONICO", label: "Pregão Eletrônico" },
  { value: "RATEIO", label: "Rateio" },
  { value: "TOMADA_PRECOS", label: "Tomada de Preços" },
];

const BID_STATUS = [
  { value: "ABERTO", label: "Aberto", color: "bg-blue-100 text-blue-700" },
  { value: "EM_ANDAMENTO", label: "Em Andamento", color: "bg-yellow-100 text-yellow-700" },
  { value: "ENCERRADO", label: "Encerrado", color: "bg-green-100 text-green-700" },
  { value: "CANCELADO", label: "Cancelado", color: "bg-red-100 text-red-700" },
  { value: "SUSPENSO", label: "Suspenso", color: "bg-gray-100 text-gray-700" },
];

export default function EditaisClient() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterType, setFilterType] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    title: "",
    description: "",
    type: "PREGAO_ELETRONICO",
    status: "ABERTO",
    openingDate: "",
    closingDate: "",
    value: "",
    fileUrl: "",
    fileName: "",
    fileSize: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchBids = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterStatus !== "TODOS") params.append("status", filterStatus);
      if (filterType !== "TODOS") params.append("type", filterType);

      const res = await fetch(`/api/bids?${params}`);
      if (!res.ok) {
        throw new Error("Erro ao buscar editais");
      }
      const data = await res.json();
      setBids(data.bids || []);
    } catch (error) {
      console.error("Erro ao carregar editais:", error);
      toast.error("Erro ao carregar editais");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, filterType]);

  const fetchPrefectures = async () => {
    try {
      const res = await fetch("/api/prefectures");
      const data = await res.json();
      setPrefectures(data.prefectures || []);
    } catch {
      console.error("Erro ao carregar prefeituras");
    }
  };

  useEffect(() => {
    fetchBids();
    fetchPrefectures();
  }, [fetchBids]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setSelectedFile(file);
    // Create local blob URL for PDF preview
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setAnalyzingPdf(true);

    try {
      const formDataToAnalyze = new FormData();
      formDataToAnalyze.append("file", file);

      const response = await fetch("/api/bids/analyze-pdf", {
        method: "POST",
        body: formDataToAnalyze,
      });

      if (response.ok) {
        const suggestions = await response.json();

        setFormData(prev => ({
          ...prev,
          number: prev.number || suggestions.number || "",
          title: prev.title || suggestions.title || "",
          description: prev.description || suggestions.description || "",
          type: prev.type === "PREGAO_ELETRONICO" ? suggestions.type : prev.type,
        }));

        toast.success("PDF analisado! Campos preenchidos automaticamente.");
      }
    } catch (error) {
      console.error("Erro ao analisar PDF:", error);
      toast.error("Não foi possível analisar o arquivo, preencha manualmente");
    } finally {
      setAnalyzingPdf(false);
    }
  };

  const uploadFile = async (): Promise<{ fileUrl: string; fileName: string; fileSize: number } | null> => {
    if (!selectedFile) return null;

    setUploadingFile(true);
    try {
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          isPublic: true,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error("Erro ao gerar URL de upload");
      }

      const { uploadUrl, fileUrl } = await presignedRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });

      return { fileUrl, fileName: selectedFile.name, fileSize: selectedFile.size };
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.number || !formData.title) {
      toast.error("Preencha número e título do edital");
      return;
    }

    try {
      // Fazer upload do arquivo se houver
      let fileData = {
        fileUrl: formData.fileUrl,
        fileName: formData.fileName,
        fileSize: formData.fileSize,
      };

      if (selectedFile) {
        const uploaded = await uploadFile();
        if (uploaded) {
          fileData = {
            fileUrl: uploaded.fileUrl,
            fileName: uploaded.fileName,
            fileSize: uploaded.fileSize.toString(),
          };
        } else {
          toast.error("Erro ao enviar arquivo. Salvando edital sem anexo.");
          fileData = { fileUrl: "", fileName: "", fileSize: "" };
        }
      }

      const dataToSend = { 
        number: formData.number.trim(),
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        type: formData.type,
        status: formData.status,
        openingDate: formData.openingDate || "",
        closingDate: formData.closingDate || "",
        value: formData.value || "",
        fileUrl: fileData.fileUrl || "",
        fileName: fileData.fileName || "",
        fileSize: fileData.fileSize || "",
      };

      let response;
      if (editingBid) {
        response = await fetch(`/api/bids/${editingBid.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
      } else {
        response = await fetch("/api/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Erro ao salvar edital");
      }

      await response.json();

      toast.success(editingBid ? "Edital atualizado!" : "Edital cadastrado com sucesso!");
      setShowModal(false);
      setEditingBid(null);
      setSelectedFile(null);
      resetForm();
      
      await fetchBids();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar edital");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este edital?")) return;
    try {
      await fetch(`/api/bids/${id}`, { method: "DELETE" });
      toast.success("Edital excluído!");
      fetchBids();
    } catch {
      toast.error("Erro ao excluir edital");
    }
  };

  const openEditModal = (bid: Bid) => {
    setEditingBid(bid);
    setFormData({
      number: bid.number,
      title: bid.title,
      description: bid.description || "",
      type: bid.type,
      status: bid.status,
      openingDate: bid.openingDate ? bid.openingDate.split("T")[0] : "",
      closingDate: bid.closingDate ? bid.closingDate.split("T")[0] : "",
      value: bid.value?.toString() || "",
      fileUrl: bid.fileUrl || "",
      fileName: bid.fileName || "",
      fileSize: bid.fileSize?.toString() || "",
    });
    setSelectedFile(null);
    setShowModal(true);
    setPreviewUrl(bid.fileUrl || null);
  };

  const resetForm = () => {
    setFormData({
      number: "",
      title: "",
      description: "",
      type: "PREGAO_ELETRONICO",
      status: "ABERTO",
      openingDate: "",
      closingDate: "",
      value: "",
      fileUrl: "",
      fileName: "",
      fileSize: "",
    });
    setSelectedFile(null);
    setFileUrl(null);
    setFileName(null);
    setFileSize(null);
    setAnalyzingPdf(false);
    setUploadingFile(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowPreview(false);
  };

  const getStatusBadge = (status: string) => {
    const s = BID_STATUS.find((b) => b.value === status);
    return s ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span> : status;
  };

  const getTypeLabel = (type: string) => {
    return BID_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editais</h1>
          <p className="text-gray-500">Gerencie os editais de licitação</p>
        </div>
        <button
          onClick={() => { setEditingBid(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Edital
        </button>
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
          {BID_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="TODOS">Todas as Modalidades</option>
          {BID_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum edital encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <motion.div
              key={bid.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">{bid.number}</span>
                    {getStatusBadge(bid.status)}
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">{getTypeLabel(bid.type)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{bid.title}</h3>
                  {bid.description && <p className="text-gray-600 text-sm mb-3 line-clamp-2">{bid.description}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {bid.prefecture && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>{bid.prefecture.name}</span>
                      </div>
                    )}
                    {bid.value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(bid.value)}</span>
                      </div>
                    )}
                    {bid.openingDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Abertura: {format(new Date(bid.openingDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                    {bid.closingDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Encerramento: {format(new Date(bid.closingDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{bid._count.documents} documentos</span>
                    </div>
                    {bid.fileUrl && bid.fileName && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl(bid.fileUrl);
                            setFormData(prev => ({ ...prev, fileName: bid.fileName || "" }));
                            setShowPreview(true);
                          }}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Visualizar</span>
                        </button>
                        <a
                          href={bid.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(bid)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-5 h-5 text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(bid.id)} className="p-2 hover:bg-red-100 rounded-lg">
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
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingBid ? "Editar Edital" : "Novo Edital"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                    <input type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required placeholder="001/2024" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {BID_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                {/* PDF Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anexar PDF do Edital</label>
                  {!selectedFile ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload"
                        disabled={analyzingPdf}
                      />
                      <label
                        htmlFor="pdf-upload"
                        className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Clique para selecionar um PDF</span>
                        <span className="text-xs text-gray-400 mt-1">Máximo 10MB</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      {analyzingPdf ? (
                        <>
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Analisando arquivo...</p>
                            <p className="text-xs text-gray-500">{selectedFile.name}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Visualizar PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (previewUrl) URL.revokeObjectURL(previewUrl);
                              setPreviewUrl(null);
                              setShowPreview(false);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {BID_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Abertura</label>
                    <input type="date" value={formData.openingDate} onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Encerramento</label>
                    <input type="date" value={formData.closingDate} onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado (R$)</label>
                  <input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={uploadingFile || analyzingPdf} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                    {uploadingFile ? "Enviando..." : "Salvar"}
                  </button>
                </div>

                {/* Inline PDF preview */}
                {(previewUrl || formData.fileUrl) && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Pré-visualização do Edital</p>
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Tela cheia
                      </button>
                    </div>
                    <iframe
                      src={previewUrl || formData.fileUrl}
                      className="w-full h-64 border border-gray-200 rounded-xl"
                      title="Pré-visualização do PDF"
                    />
                  </div>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen PDF Preview Modal */}
      <AnimatePresence>
        {showPreview && (previewUrl || formData.fileUrl) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex flex-col z-[60]"
            onClick={() => setShowPreview(false)}
          >
            <div className="flex items-center justify-between p-4 bg-gray-900">
              <h3 className="text-white font-medium truncate">
                {selectedFile?.name || formData.fileName || "Edital PDF"}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl || formData.fileUrl}
                  download={selectedFile?.name || formData.fileName}
                  className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" /> Baixar
                </a>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-white/10 rounded-lg text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl || formData.fileUrl}
              className="flex-1 w-full bg-white"
              title="Visualização do Edital"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
