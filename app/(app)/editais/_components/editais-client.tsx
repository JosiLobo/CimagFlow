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
  const [viewingBid, setViewingBid] = useState<Bid | null>(null);
  const [expandedCardPreviewId, setExpandedCardPreviewId] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Array<{ label: string; value: string }>>([]);

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

        const filled: string[] = [];
        const filledDetails: Array<{ label: string; value: string }> = [];
        setFormData(prev => {
          const updated = { ...prev };
          if (!prev.number && suggestions.number) {
            updated.number = suggestions.number;
            filled.push("Número do Processo");
            filledDetails.push({ label: "Número do Processo", value: suggestions.number });
          }
          if (!prev.title && suggestions.title) { updated.title = suggestions.title; filled.push("Título"); }
          if (!prev.description && suggestions.description) { updated.description = suggestions.description; filled.push("Descrição"); }
          if (prev.type === "PREGAO_ELETRONICO" && suggestions.type) {
            updated.type = suggestions.type;
            filled.push("Modalidade");
            filledDetails.push({ label: "Modalidade", value: getTypeLabel(suggestions.type) });
          }
          if (!prev.openingDate && suggestions.openingDate) {
            updated.openingDate = suggestions.openingDate;
            filled.push("Data de Abertura");
            filledDetails.push({ label: "Data de Abertura", value: suggestions.openingDate });
          }
          if (!prev.closingDate && suggestions.closingDate) {
            updated.closingDate = suggestions.closingDate;
            filled.push("Data de Encerramento");
            filledDetails.push({ label: "Data de Encerramento", value: suggestions.closingDate });
          }
          if (!prev.value && suggestions.value) {
            updated.value = suggestions.value;
            filled.push("Valor Global");
            filledDetails.push({ label: "Valor Global", value: suggestions.value });
          }
          return updated;
        });
        setAutoFilledFields(filledDetails);

        if (filled.length > 0) {
          toast.success(`PDF analisado! Preenchido: ${filled.join(", ")}`);
        } else {
          toast.success("PDF analisado! Nenhum campo novo extraído.");
        }
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
      // 1) Try presigned upload (faster path)
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

        if (presignedRes.ok) {
          const { uploadUrl, fileUrl } = await presignedRes.json();
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: selectedFile,
            headers: { "Content-Type": selectedFile.type },
          });

          if (uploadRes.ok) {
            return { fileUrl, fileName: selectedFile.name, fileSize: selectedFile.size };
          }
        }
      } catch {
        // fallback below
      }

      // 2) Fallback upload via backend (handles S3/local internally)
      const fallbackFormData = new FormData();
      fallbackFormData.append("file", selectedFile);
      const fallbackRes = await fetch("/api/upload/direct-public", {
        method: "POST",
        body: fallbackFormData,
      });

      if (!fallbackRes.ok) {
        const err = await fallbackRes.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao enviar arquivo (upload direto)");
      }

      const fallbackData = await fallbackRes.json();
      return {
        fileUrl: fallbackData.fileUrl,
        fileName: fallbackData.fileName || selectedFile.name,
        fileSize: selectedFile.size,
      };
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar arquivo");
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
          toast.error("Erro ao enviar arquivo. Corrija o upload para salvar o edital com anexo.");
          return;
        }
      }

      const dataToSend = { 
        number: formData.number.trim(),
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        type: formData.type,
        status: formData.status,
        openingDate: formData.openingDate || null,
        closingDate: formData.closingDate || null,
        value: formData.value || null,
        fileUrl: fileData.fileUrl || null,
        fileName: fileData.fileName || null,
        fileSize: fileData.fileSize || null,
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
    setAutoFilledFields([]);
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
    setPreviewUrl(bid.fileUrl || null);
    setShowModal(true);
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
    setAutoFilledFields([]);
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
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
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setViewingBid(bid)}
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
                            setExpandedCardPreviewId(prev => prev === bid.id ? null : bid.id);
                          }}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{expandedCardPreviewId === bid.id ? "Ocultar PDF" : "Ver no card"}</span>
                        </button>
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
                  {bid.fileUrl && expandedCardPreviewId === bid.id && (
                    <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <div className="px-3 py-2 text-xs text-gray-600 bg-white border-b border-gray-200 flex items-center justify-between">
                        <span className="font-medium truncate">{bid.fileName || "Documento do edital"}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl(bid.fileUrl);
                            setFormData(prev => ({ ...prev, fileName: bid.fileName || "" }));
                            setShowPreview(true);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Expandir
                        </button>
                      </div>
                      <iframe
                        src={bid.fileUrl}
                        className="w-full h-64"
                        title={`Prévia ${bid.number}`}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(bid); }} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-5 h-5 text-gray-500" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(bid.id); }} className="p-2 hover:bg-red-100 rounded-lg">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número do Processo *</label>
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
                  {!selectedFile && !formData.fileUrl ? (
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
                        className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                      >
                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-600">Clique para selecionar um PDF</span>
                        <span className="text-xs text-gray-400 mt-1">O arquivo será analisado automaticamente para preencher os campos</span>
                        <span className="text-xs text-gray-400">Máximo 10MB</span>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                        {analyzingPdf ? (
                          <>
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700">Analisando PDF e preenchendo campos...</p>
                              <p className="text-xs text-gray-500">{selectedFile?.name || formData.fileName}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700">{selectedFile?.name || formData.fileName}</p>
                              {selectedFile && (
                                <p className="text-xs text-gray-500">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPreview(true)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                              title="Visualizar PDF"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (previewUrl && !formData.fileUrl) URL.revokeObjectURL(previewUrl);
                                setPreviewUrl(null);
                                setShowPreview(false);
                                setFormData(prev => ({ ...prev, fileUrl: "", fileName: "", fileSize: "" }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Inline PDF preview */}
                      {!analyzingPdf && (previewUrl || formData.fileUrl) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-gray-500">Pré-visualização</p>
                            <button
                              type="button"
                              onClick={() => setShowPreview(true)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Tela cheia
                            </button>
                          </div>
                          <iframe
                            src={previewUrl || formData.fileUrl || undefined}
                            className="w-full h-72 border border-gray-200 rounded-xl bg-gray-50"
                            title="Pré-visualização do PDF"
                          />
                        </div>
                      )}

                      {!analyzingPdf && autoFilledFields.length > 0 && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-800">Campos extraídos automaticamente do edital</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {autoFilledFields.map((item) => (
                              <div key={`${item.label}-${item.value}`} className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">{item.label}</p>
                                <p className="text-sm text-gray-700 truncate" title={item.value}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Global (R$)</label>
                  <input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={uploadingFile || analyzingPdf} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                    {uploadingFile ? "Enviando..." : analyzingPdf ? "Analisando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail View Modal */}
      <AnimatePresence>
        {viewingBid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingBid(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">{viewingBid.number}</span>
                    {getStatusBadge(viewingBid.status)}
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">{getTypeLabel(viewingBid.type)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingBid.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setViewingBid(null); openEditModal(viewingBid); }}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" /> Editar
                  </button>
                  {viewingBid.fileUrl && (
                    <a
                      href={viewingBid.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> Baixar PDF
                    </a>
                  )}
                  <button onClick={() => setViewingBid(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content: side-by-side on desktop */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Left: Info panel */}
                <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto p-5 border-b lg:border-b-0 lg:border-r border-gray-200">
                  {viewingBid.description && (
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Descrição</h3>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewingBid.description}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Informações</h3>
                    {viewingBid.prefecture && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Prefeitura</p>
                          <p className="text-gray-700">{viewingBid.prefecture.name}</p>
                        </div>
                      </div>
                    )}
                    {viewingBid.value && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Valor Estimado</p>
                          <p className="text-gray-700 font-medium">{formatCurrency(viewingBid.value)}</p>
                        </div>
                      </div>
                    )}
                    {viewingBid.openingDate && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Abertura</p>
                          <p className="text-gray-700">{format(new Date(viewingBid.openingDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>
                    )}
                    {viewingBid.closingDate && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Encerramento</p>
                          <p className="text-gray-700">{format(new Date(viewingBid.closingDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5 text-sm">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Documentos Vinculados</p>
                        <p className="text-gray-700">{viewingBid._count.documents}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Criado por</p>
                        <p className="text-gray-700">{viewingBid.creator?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Cadastrado em</p>
                        <p className="text-gray-700">{format(new Date(viewingBid.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: PDF Viewer */}
                <div className="flex-1 flex flex-col min-h-0">
                  {viewingBid.fileUrl ? (
                    <>
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <Paperclip className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium truncate">{viewingBid.fileName || "Documento do Edital"}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                setPreviewUrl(viewingBid.fileUrl);
                                setFormData(prev => ({ ...prev, fileName: viewingBid.fileName || "" }));
                                setShowPreview(true);
                              }}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> Tela cheia
                            </button>
                            <a
                              href={viewingBid.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Nova aba
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">PDF</span>
                          <span>Tamanho: {formatFileSize(viewingBid.fileSize)}</span>
                          <span>Cadastrado: {format(new Date(viewingBid.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      </div>
                      <div className="flex-1 p-3 bg-gray-100/70">
                        <div className="w-full h-full rounded-xl border border-gray-200 overflow-hidden bg-white">
                          <iframe
                            src={viewingBid.fileUrl}
                            className="w-full h-full min-h-[420px]"
                            title="Documento do Edital"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
                      <FileText className="w-16 h-16 mb-4" />
                      <p className="text-base font-medium mb-1">Nenhum documento anexado</p>
                      <p className="text-sm mb-4">Este edital ainda não possui um PDF anexado</p>
                      <button
                        onClick={() => { setViewingBid(null); openEditModal(viewingBid); }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-2 text-sm"
                      >
                        <Upload className="w-4 h-4" /> Anexar documento
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
