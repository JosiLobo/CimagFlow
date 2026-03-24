"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Users, Settings, ChevronRight, ChevronLeft, Check, X, Search, Loader2, Wand2, FolderOpen, ArrowRight } from "lucide-react";

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PRESIDENTE: { label: "Presidente", color: "text-amber-700", bg: "bg-amber-100" },
  PREFEITO: { label: "Prefeito", color: "text-amber-700", bg: "bg-amber-100" },
  JURIDICO: { label: "Jurídico", color: "text-blue-700", bg: "bg-blue-100" },
  TESTEMUNHA: { label: "Testemunha", color: "text-purple-700", bg: "bg-purple-100" },
  FORNECEDOR: { label: "Fornecedor", color: "text-emerald-700", bg: "bg-emerald-100" },
  OUTRO: { label: "Outro", color: "text-gray-700", bg: "bg-gray-100" },
};

const steps = [
  { id: 1, label: "Documento", icon: FileText },
  { id: 2, label: "Assinantes", icon: Users },
  { id: 3, label: "Configurações", icon: Settings },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function NovoDocumentoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams?.get("folderId") ?? null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [signerSearch, setSignerSearch] = useState("");
  const [signerResults, setSignerResults] = useState<any[]>([]);
  const [selectedSigners, setSelectedSigners] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reminderDays, setReminderDays] = useState(3);

  const handleFileChange = async (f: File) => {
    if (f.type !== "application/pdf") {
      alert("Apenas arquivos PDF são permitidos.");
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      alert("Arquivo muito grande. Tamanho máximo permitido: 20MB.");
      return;
    }

    setFile(f);
    setUploading(true);
    try {
      // 1) Prefer presigned upload
      let uploadedCloudPath = "";
      try {
        const presignRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: f.name, contentType: f.type, isPublic: true }),
        });

        if (presignRes.ok) {
          const presignData = await presignRes.json();
          const uploadUrl = presignData.uploadUrl as string;
          uploadedCloudPath = presignData.cloud_storage_path || "";

          const urlObj = new URL(uploadUrl);
          const signedHeaders = urlObj.searchParams.get("X-Amz-SignedHeaders") ?? "";
          const uploadHeaders: Record<string, string> = { "Content-Type": f.type };
          if (signedHeaders.includes("content-disposition")) uploadHeaders["Content-Disposition"] = "inline";

          const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: uploadHeaders, body: f });
          if (!uploadRes.ok) {
            uploadedCloudPath = "";
          }
        }
      } catch {
        uploadedCloudPath = "";
      }

      // 2) Fallback to direct-public endpoint
      if (!uploadedCloudPath) {
        const formData = new FormData();
        formData.append("file", f);
        const directRes = await fetch("/api/upload/direct-public", {
          method: "POST",
          body: formData,
        });

        if (!directRes.ok) {
          const err = await directRes.json().catch(() => ({}));
          throw new Error(err.error || "Erro ao fazer upload do arquivo");
        }

        const directData = await directRes.json();
        uploadedCloudPath = directData.cloud_storage_path || directData.fileUrl || "";
      }

      if (!uploadedCloudPath) {
        throw new Error("Não foi possível obter o caminho do arquivo enviado.");
      }

      setUploadedPath(uploadedCloudPath);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao fazer upload");
      setFile(null);
      setUploadedPath("");
    } finally {
      setUploading(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/modelos");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const searchSigners = useCallback(async (q: string) => {
    if (!q.trim()) { setSignerResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/signers?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setSignerResults((data.signers ?? []).filter((s: any) => !selectedSigners.find((sel) => sel.id === s.id)));
    } finally { setSearchLoading(false); }
  }, [selectedSigners]);

  const addSigner = (s: any) => { setSelectedSigners([...selectedSigners, s]); setSignerResults([]); setSignerSearch(""); };
  const removeSigner = (id: string) => setSelectedSigners(selectedSigners.filter((s) => s.id !== id));
  const openUploadPicker = () => {
    setUseTemplate(false);
    fileInputRef.current?.click();
  };
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/documentos");
  };

  const handleSubmit = async (andSend: boolean) => {
    setSubmitting(true);
    try {
      // Validação dos assinantes obrigatórios
      if (andSend) {
        const tipos = selectedSigners.map((s) => s.type);
        const temPresidente = tipos.includes("PRESIDENTE") || tipos.includes("PREFEITO");
        if (!temPresidente) {
          alert("É obrigatório adicionar o Presidente como assinante.");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        title,
        description: description || null,
        fileUrl: uploadedPath || null,
        fileName: file?.name || null,
        fileSize: file?.size || null,
        message: message || null,
        deadline: deadline || null,
        reminderDays,
        signerIds: selectedSigners.map((s) => s.id),
        folderId: folderId || null,
      };

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Verificar se a resposta é JSON (pode ser redirect de autenticação)
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        alert("Erro de autenticação. Faça login novamente.");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "Erro ao criar documento");
        return;
      }

      if (andSend && selectedSigners.length > 0) {
        await fetch(`/api/documents/${data.document.id}/send`, { method: "POST" });
      }

      // Se foi criado a partir de uma pasta, volta para a pasta
      if (folderId) {
        router.push(`/pastas`);
      } else {
        router.push(`/documentos/${data.document.id}`);
      }
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      alert("Erro ao salvar documento. Verifique o console para mais detalhes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Documento</h1>
        <p className="text-gray-500 text-sm">Crie e envie um documento para assinatura</p>
        {folderId && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg w-fit text-sm">
            <FolderOpen className="w-4 h-4" />
            <span>Salvando na pasta selecionada</span>
          </div>
        )}
      </div>
      {/* Stepper */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  step > s.id ? "bg-emerald-500 text-white" : step === s.id ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${
                  step === s.id ? "text-[#1E3A5F]" : step > s.id ? "text-emerald-600" : "text-gray-400"
                }`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded ${step > s.id ? "bg-emerald-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Informações do Documento</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do documento"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descrição opcional"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={openUploadPicker}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${!useTemplate ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                <Upload className="w-4 h-4 inline mr-1" /> Upload
              </button>
              <button onClick={async () => { setUseTemplate(true); await loadTemplates(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${useTemplate ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                <Wand2 className="w-4 h-4 inline mr-1" /> Usar Modelo
              </button>
            </div>
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            {!useTemplate && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                {uploading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600">Enviando arquivo...</p>
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-xs text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} MB - upload concluído</p>
                    </div>
                    <button
                      type="button"
                      onClick={openUploadPicker}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-white"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum arquivo selecionado. Clique em Upload para anexar um PDF.</p>
                )}
              </div>
            )}
            {useTemplate && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Buscar modelo..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm"
                  />
                </div>
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
                    <span className="ml-2 text-sm text-gray-500">Carregando modelos...</span>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Wand2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum modelo encontrado</p>
                    <button
                      onClick={() => router.push("/modelos")}
                      className="mt-2 text-xs text-[#1E3A5F] hover:underline font-medium"
                    >
                      Criar um modelo
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-[340px] overflow-y-auto pr-1">
                    {templates
                      .filter((t) => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => router.push(`/modelos/${t.id}/usar`)}
                          className="group flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-[#1E3A5F]/40 hover:bg-blue-50/50 transition-all text-left w-full"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E3A5F]/10 to-emerald-500/10 flex items-center justify-center shrink-0 group-hover:from-[#1E3A5F]/20 group-hover:to-emerald-500/20 transition-colors">
                            <FileText className="w-5 h-5 text-[#1E3A5F]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#1E3A5F] transition-colors">
                              {t.name}
                            </p>
                            {t.description && (
                              <p className="text-xs text-gray-400 truncate">{t.description}</p>
                            )}
                            {t.variables?.length > 0 && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {t.variables.length} variáve{t.variables.length !== 1 ? "is" : "l"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#1E3A5F] opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                            Usar <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))}
                    {templates.filter((t) => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <p className="text-sm">Nenhum modelo encontrado para &quot;{templateSearch}&quot;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Selecionar Assinantes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={signerSearch}
                onChange={(e) => { setSignerSearch(e.target.value); searchSigners(e.target.value); }}
                placeholder="Buscar assinantes..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
              {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            </div>
            {signerResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {signerResults.map((s) => {
                  const typeInfo = TYPE_LABELS[s.type] || TYPE_LABELS.OUTRO;
                  return (
                    <button key={s.id} onClick={() => addSigner(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0 border-gray-100">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-[#1E3A5F] font-semibold text-sm">
                        {s.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedSigners.length > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <strong>Ordem de assinatura:</strong> O Presidente/Prefeito assina primeiro. Após sua assinatura, todos os demais são liberados para assinar simultaneamente.
                </div>
                <div className="space-y-2">
                  {selectedSigners.map((s) => {
                    const typeInfo = TYPE_LABELS[s.type] || TYPE_LABELS.OUTRO;
                    const isPresidente = s.type === "PRESIDENTE" || s.type === "PREFEITO";
                    return (
                      <div key={s.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isPresidente ? "bg-amber-50 border border-amber-200" : "bg-blue-50"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${isPresidente ? "bg-amber-500 text-white" : "bg-[#1E3A5F] text-white"}`}>
                          {isPresidente ? "1º" : "2º"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{s.name}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                        <button onClick={() => removeSigner(s.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum assinante selecionado</p>
              </div>
            )}
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Configurações</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem para assinantes</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                placeholder="Mensagem personalizada..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo para assinatura</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lembrete após (dias sem assinar)</label>
              <input type="number" value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} min={1} max={30}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <p className="font-semibold text-gray-700 mb-2">Resumo:</p>
              <p className="text-gray-600">Documento: <span className="font-medium">{title}</span></p>
              <p className="text-gray-600">Assinantes: <span className="font-medium">{selectedSigners.length}</span></p>
              {deadline && <p className="text-gray-600">Prazo: <span className="font-medium">{new Date(deadline + "T00:00:00").toLocaleDateString("pt-BR")}</span></p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <button onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex gap-2">
          {step < 3 ? (
            <button
              onClick={() => { if (step === 1 && !title.trim()) { alert("Informe o título"); return; } setStep(step + 1); }}
              className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors">
                Salvar Rascunho
              </button>
              <button onClick={() => handleSubmit(true)} disabled={submitting || selectedSigners.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg disabled:opacity-50">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar para Assinatura
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
