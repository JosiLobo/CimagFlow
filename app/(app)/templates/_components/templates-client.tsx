"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, Plus, Search, Edit2, Trash2, X, Check, Loader2, Tag, Eye, FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Undo2, Redo2, List, ListOrdered, Minus, Maximize2, Minimize2, ImagePlus, Strikethrough, Subscript, Superscript, IndentIncrease, IndentDecrease, Quote, Link as LinkIcon, Unlink, RemoveFormatting, Highlighter, Palette } from "lucide-react";

const HEADER_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";
import Link from "next/link";

const COMMON_VARS = [
  // Data
  "data", "data_atual", "ano",
  // Prefeitura
  "prefeitura", "municipio", "prefeito", "p_nome", "p_cidade", "p_estado", "p_cnpj", "p_endereco", "p_telefone", "p_email", "p_prefeito",
  // Empresa
  "empresa", "fornecedor", "razao_social", "m_nome", "m_cnpj", "m_endereco", "m_cidade", "m_estado", "m_telefone", "m_email", "m_contato",
  // Edital
  "edital", "licitacao", "objeto", "e_numero", "e_ano", "e_modalidade", "e_objeto", "e_valor",
  // Contrato
  "cont_n", "valor_global", "valor_ext",
  // Outros
  "nome_assinante", "cargo", "cpf", "testemunha1", "testemunha2",
];

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", content: "", variables: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newVar, setNewVar] = useState("");
  const [previewEditing, setPreviewEditing] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [showVarPanel, setShowVarPanel] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const createEditorRef = useRef<HTMLDivElement>(null);
  const savedCreateRange = useRef<Range | null>(null);
  const savedPreviewRange = useRef<Range | null>(null);
  const [createEditorContent, setCreateEditorContent] = useState("");
  const [showCreateVarPanel, setShowCreateVarPanel] = useState(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [footerImage, setFooterImage] = useState<string | null>(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingFooter, setUploadingFooter] = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(t);
  }, [fetchTemplates]);

  const openCreate = () => {
    setForm({ name: "", description: "", content: "", variables: [] });
    setEditId(null);
    setCreateEditorContent("");
    setShowCreateVarPanel(true);
    setHeaderImage(null);
    setFooterImage(null);
    setShowModal(true);
    setEditorVersion((v) => v + 1);
  };
  const openEdit = (t: any) => {
    setForm({ name: t.name ?? "", description: t.description ?? "", content: t.content ?? "", variables: t.variables ?? [] });
    setEditId(t.id);
    const c = t.content ?? "";
    const isHtml = /<[a-z][\s\S]*>/i.test(c);
    setCreateEditorContent(isHtml ? c : c.replace(/\n/g, "<br>"));
    setShowCreateVarPanel(true);
    setHeaderImage(t.headerImage ?? null);
    setFooterImage(t.footerImage ?? null);
    setShowModal(true);
    setEditorVersion((v) => v + 1);
  };

  const uploadHeaderImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Use uma imagem PNG, JPG ou WebP para o timbrado."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Imagem muito grande (máx 5MB)"); return; }
    setUploadingHeader(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setHeaderImage(reader.result as string);
        setUploadingHeader(false);
      };
      reader.onerror = () => {
        alert("Erro ao ler a imagem");
        setUploadingHeader(false);
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); alert("Erro ao fazer upload"); setUploadingHeader(false); }
  };

  const uploadFooterImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Use uma imagem PNG, JPG ou WebP para o rodapé."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Imagem muito grande (máx 5MB)"); return; }
    setUploadingFooter(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setFooterImage(reader.result as string);
        setUploadingFooter(false);
      };
      reader.onerror = () => {
        alert("Erro ao ler a imagem");
        setUploadingFooter(false);
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); alert("Erro ao fazer upload"); setUploadingFooter(false); }
  };

  // Initialize editor content via useEffect (only on intentional content changes)
  useEffect(() => {
    if (editorVersion > 0 && createEditorRef.current) {
      createEditorRef.current.innerHTML = createEditorContent;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorVersion]);

  const saveCreateSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && createEditorRef.current?.contains(sel.anchorNode)) {
      savedCreateRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const savePreviewSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedPreviewRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertVarSpan = (editor: HTMLDivElement, savedRange: React.MutableRefObject<Range | null>, v: string) => {
    const span = document.createElement("span");
    span.style.backgroundColor = "#dbeafe";
    span.style.color = "#1e40af";
    span.style.padding = "1px 4px";
    span.style.borderRadius = "4px";
    span.style.fontWeight = "600";
    span.textContent = `{${v}}`;
    const space = document.createTextNode("\u00A0");

    editor.focus();
    const sel = window.getSelection();

    // Try saved range first, then current selection
    let range = savedRange.current;
    if (!range && sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    }

    if (range && editor.contains(range.startContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(range);
      range.deleteContents();
      range.insertNode(space);
      range.insertNode(span);
      range.setStartAfter(space);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      editor.appendChild(span);
      editor.appendChild(space);
      const r = document.createRange();
      r.setStartAfter(space);
      r.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    savedRange.current = null;
  };

  const insertVar = (v: string) => {
    if (!form.variables.includes(v)) setForm((f) => ({ ...f, variables: [...f.variables, v] }));
    if (createEditorRef.current) insertVarSpan(createEditorRef.current, savedCreateRange, v);
  };

  const addVar = () => {
    const v = newVar.trim().replace(/\s+/g, "_").toLowerCase();
    if (v && !form.variables.includes(v)) setForm((f) => ({ ...f, variables: [...f.variables, v] }));
    setNewVar("");
  };

  const removeVar = (v: string) => setForm((f) => ({ ...f, variables: f.variables.filter((x) => x !== v) }));

  const extractVars = (content: string) => {
    const matches = content.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches.map((m) => m.slice(1, -1)))] : [];
  };

  const handleSave = async () => {
    const content = createEditorRef.current ? createEditorRef.current.innerHTML : form.content;
    const cleanContent = content?.replace(/<br\s*\/?>/gi, "").replace(/&nbsp;/g, "").trim();
    if (!form.name || !cleanContent) { alert("Nome e conteúdo obrigatórios"); return; }
    setSaving(true);
    const vars = [...new Set([...form.variables, ...extractVars(content)])];
    try {
      const url = editId ? `/api/templates/${editId}` : "/api/templates";
      const method = editId ? "PATCH" : "POST";
      const payload = { name: form.name, description: form.description, content, variables: vars, headerImage, footerImage };
      console.log("[Templates] Saving template, payload size:", JSON.stringify(payload).length, "bytes");
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { setShowModal(false); fetchTemplates(); }
      else {
        let errorMsg = "Erro ao salvar";
        try {
          const d = await res.json();
          errorMsg = d.error ?? errorMsg;
        } catch {
          errorMsg = `Erro ${res.status}: ${res.statusText}`;
        }
        alert(errorMsg);
      }
    } catch (err: unknown) {
      console.error("[Templates] Save error:", err);
      alert("Erro de conexão ao salvar o modelo. Verifique o console.");
    } finally { setSaving(false); }
  };

  const execCreateCmd = (cmd: string, value?: string) => {
    if (savedCreateRange.current && createEditorRef.current) {
      createEditorRef.current.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedCreateRange.current);
    }
    document.execCommand(cmd, false, value);
    createEditorRef.current?.focus();
    saveCreateSelection();
  };

  const createInsertLink = () => {
    const url = prompt("URL do link:");
    if (url) execCreateCmd("createLink", url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    setDeleting(id);
    try { await fetch(`/api/templates/${id}`, { method: "DELETE" }); fetchTemplates(); }
    finally { setDeleting(null); }
  };

  const openPreview = (template: any) => {
    setShowPreview(template);
    // Convert plain text newlines to HTML if content doesn't contain HTML tags
    const content = template.content || "";
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    setPreviewContent(isHtml ? content : content.replace(/\n/g, "<br>"));
    setPreviewEditing(false);
    setEditorFullscreen(false);
    setShowVarPanel(false);
  };

  const savePreviewChanges = async () => {
    if (!showPreview || !editorRef.current) return;
    setSaving(true);
    const htmlContent = editorRef.current.innerHTML;
    try {
      const vars = [...new Set((htmlContent.match(/\{([^}]+)\}/g) || []).map((m: string) => m.slice(1, -1)))];
      const res = await fetch(`/api/templates/${showPreview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: htmlContent, variables: vars }),
      });
      if (res.ok) {
        setShowPreview({ ...showPreview, content: htmlContent, variables: vars });
        setPreviewContent(htmlContent);
        setPreviewEditing(false);
        fetchTemplates();
      } else {
        const d = await res.json();
        alert(d.error ?? "Erro ao salvar alterações");
      }
    } finally {
      setSaving(false);
    }
  };

  const execCmd = (cmd: string, value?: string) => {
    if (savedPreviewRange.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedPreviewRange.current);
    }
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    savePreviewSelection();
  };

  const previewInsertLink = () => {
    const url = prompt("URL do link:");
    if (url) execCmd("createLink", url);
  };

  const insertVarInEditor = (varName: string) => {
    if (!editorRef.current) return;
    insertVarSpan(editorRef.current, savedPreviewRange, varName);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos</h1>
          <p className="text-gray-500 text-sm">{templates.length} modelo{templates.length !== 1 ? "s" : ""} disponível</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg">
          <Plus className="w-4 h-4" /> Novo Modelo
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelos..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400">Carregando...</p></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum modelo encontrado</p>
          <button onClick={openCreate} className="text-emerald-600 hover:underline text-sm mt-1">Criar modelo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
                  {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>}
                </div>
              </div>
              {(t.variables?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.variables.slice(0, 4).map((v: string) => (
                    <span key={v} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{`{${v}}`}</span>
                  ))}
                  {t.variables.length > 4 && <span className="text-xs text-gray-400">+{t.variables.length - 4} mais</span>}
                </div>
              )}
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.content?.replace(/<[^>]+>/g, " ").substring(0, 100)}...</p>
              <div className="flex items-center gap-2">
                <Link href={`/templates/${t.id}/usar`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-[#1E3A5F] text-white hover:bg-[#2a4a73] transition-colors font-medium">
                  <FileText className="w-3.5 h-3.5" /> Usar Modelo
                </Link>
                <button onClick={() => openPreview(t)}
                  className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEdit(t)}
                  className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-lg bg-blue-50 text-[#1E3A5F] hover:bg-blue-100 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                  className="flex items-center justify-center gap-1.5 text-xs p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal - Full WYSIWYG Editor */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full h-full sm:h-[95vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
                    <FileCode2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{editId ? "Editar" : "Novo"} Modelo</h2>
                    <p className="text-[11px] text-gray-400">Editor de contrato com formatação</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowCreateVarPanel(!showCreateVarPanel)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      showCreateVarPanel ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    <Tag className="w-3.5 h-3.5" /> Variáveis
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#1E3A5F] text-white hover:bg-[#152d4a] rounded-lg transition-colors disabled:opacity-50 font-medium">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar
                  </button>
                </div>
              </div>

              {/* Name, Description & Letterhead */}
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 bg-white shrink-0">
                <div className="flex-1">
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do modelo *"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm font-medium" />
                </div>
                <div className="flex-1">
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição (opcional)"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <input ref={headerInputRef} type="file" accept={HEADER_ACCEPT} className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadHeaderImage(e.target.files[0]); e.target.value = ""; }} />
                  <input ref={footerInputRef} type="file" accept={HEADER_ACCEPT} className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadFooterImage(e.target.files[0]); e.target.value = ""; }} />
                  {headerImage ? (
                    <div className="flex items-center gap-1">
                      <div className="w-7 h-7 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center" title="Cabeçalho">
                        <img src={headerImage} alt="Cabeçalho" className="w-full h-full object-contain" />
                      </div>
                      <button onClick={() => setHeaderImage(null)} title="Remover cabeçalho"
                        className="p-0.5 text-red-400 hover:text-red-600 rounded transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => headerInputRef.current?.click()} disabled={uploadingHeader}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                      title="Cabeçalho do timbrado">
                      {uploadingHeader ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                      Cabeçalho
                    </button>
                  )}
                  <div className="w-px h-5 bg-gray-200" />
                  {footerImage ? (
                    <div className="flex items-center gap-1">
                      <div className="w-7 h-7 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center" title="Rodapé">
                        <img src={footerImage} alt="Rodapé" className="w-full h-full object-contain" />
                      </div>
                      <button onClick={() => setFooterImage(null)} title="Remover rodapé"
                        className="p-0.5 text-red-400 hover:text-red-600 rounded transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => footerInputRef.current?.click()} disabled={uploadingFooter}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium disabled:opacity-50"
                      title="Rodapé do timbrado">
                      {uploadingFooter ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                      Rodapé
                    </button>
                  )}
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-gray-200 bg-white overflow-x-auto shrink-0">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                  <button onClick={() => execCreateCmd("undo")} title="Desfazer (Ctrl+Z)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Undo2 className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("redo")} title="Refazer (Ctrl+Y)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Redo2 className="w-4 h-4" /></button>
                </div>
                {/* Font & Size */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-200 mr-1">
                  <select onChange={(e) => { if (e.target.value) execCreateCmd("fontName", e.target.value); e.target.value = ""; }}
                    defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[100px]">
                    <option value="" disabled>Fonte</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Garamond">Garamond</option>
                  </select>
                  <select onChange={(e) => { if (e.target.value) execCreateCmd("fontSize", e.target.value); e.target.value = ""; }}
                    defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[75px]">
                    <option value="" disabled>Tamanho</option>
                    <option value="1">8</option>
                    <option value="2">10</option>
                    <option value="3">12</option>
                    <option value="4">14</option>
                    <option value="5">18</option>
                    <option value="6">24</option>
                    <option value="7">36</option>
                  </select>
                  <select onChange={(e) => { if (e.target.value) execCreateCmd("formatBlock", e.target.value); e.target.value = ""; }}
                    defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[90px]">
                    <option value="" disabled>Estilo</option>
                    <option value="p">Normal</option>
                    <option value="h1">Título 1</option>
                    <option value="h2">Título 2</option>
                    <option value="h3">Título 3</option>
                    <option value="h4">Título 4</option>
                    <option value="blockquote">Citação</option>
                    <option value="pre">Código</option>
                  </select>
                </div>
                {/* Text style */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                  <button onClick={() => execCreateCmd("bold")} title="Negrito (Ctrl+B)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("italic")} title="Itálico (Ctrl+I)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("underline")} title="Sublinhado (Ctrl+U)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Underline className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("strikeThrough")} title="Tachado" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Strikethrough className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("subscript")} title="Subscrito" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Subscript className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("superscript")} title="Sobrescrito" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Superscript className="w-4 h-4" /></button>
                </div>
                {/* Alignment */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                  <button onClick={() => execCreateCmd("justifyLeft")} title="Alinhar à esquerda" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("justifyCenter")} title="Centralizar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("justifyRight")} title="Alinhar à direita" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignRight className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("justifyFull")} title="Justificar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignJustify className="w-4 h-4" /></button>
                </div>
                {/* Lists, indent, quote */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                  <button onClick={() => execCreateCmd("insertUnorderedList")} title="Lista com marcadores" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><List className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("insertOrderedList")} title="Lista numerada" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><ListOrdered className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("indent")} title="Aumentar recuo" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><IndentIncrease className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("outdent")} title="Diminuir recuo" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><IndentDecrease className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("insertHorizontalRule")} title="Linha horizontal" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Minus className="w-4 h-4" /></button>
                </div>
                {/* Link */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                  <button onClick={createInsertLink} title="Inserir link" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><LinkIcon className="w-4 h-4" /></button>
                  <button onClick={() => execCreateCmd("unlink")} title="Remover link" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Unlink className="w-4 h-4" /></button>
                </div>
                {/* Colors */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-200 mr-1">
                  <div className="relative" title="Cor do texto">
                    <Palette className="w-3.5 h-3.5 text-gray-400 absolute left-0.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input type="color" onChange={(e) => execCreateCmd("foreColor", e.target.value)} defaultValue="#000000"
                      className="w-7 h-7 rounded cursor-pointer border border-gray-200 opacity-0 absolute inset-0" />
                    <div className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer">
                      <Type className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </div>
                  <div className="relative" title="Cor de fundo do texto">
                    <input type="color" onChange={(e) => execCreateCmd("hiliteColor", e.target.value)} defaultValue="#FFFF00"
                      className="w-7 h-7 rounded cursor-pointer border border-gray-200 opacity-0 absolute inset-0" />
                    <div className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer">
                      <Highlighter className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </div>
                </div>
                {/* Clear */}
                <div className="flex items-center gap-0.5">
                  <button onClick={() => execCreateCmd("removeFormat")} title="Limpar formatação" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><RemoveFormatting className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-hidden flex">
                {/* Document Area */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8">
                  <div className="flex flex-col mx-auto bg-white shadow-lg rounded-sm max-w-3xl" style={{ minHeight: "1123px" }}>
                    {headerImage && (
                      <img key="header-img" src={headerImage} alt="Cabeçalho" className="w-full h-auto pointer-events-none select-none flex-shrink-0" draggable={false} />
                    )}
                    <div
                      key="create-editor"
                      ref={createEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="outline-none px-12 py-8 flex-1 text-gray-800 text-[14px] leading-relaxed"
                      style={{
                        fontFamily: "'Times New Roman', 'Georgia', serif",
                      }}
                      onMouseUp={saveCreateSelection}
                      onKeyUp={saveCreateSelection}
                      data-placeholder="Comece a digitar o conteúdo do contrato aqui... Use o painel de variáveis para inserir campos dinâmicos como {prefeitura}, {empresa}, etc."
                    />
                    {footerImage && (
                      <img key="footer-img" src={footerImage} alt="Rodapé" className="w-full h-auto pointer-events-none select-none flex-shrink-0 mt-auto" draggable={false} />
                    )}
                  </div>
                </div>

                {/* Variables Side Panel */}
                {showCreateVarPanel && (
                  <div className="w-64 border-l border-gray-200 bg-white overflow-y-auto shrink-0">
                    <div className="p-3 border-b border-gray-100">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Variáveis</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Clique para inserir no contrato</p>
                    </div>
                    <div className="p-3 space-y-3">
                      {/* Custom var */}
                      <div className="flex gap-1.5">
                        <input type="text" value={newVar} onChange={(e) => setNewVar(e.target.value)} placeholder="Nova variável"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVar(); } }}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]" />
                        <button onClick={addVar} className="px-2 py-1 bg-[#1E3A5F] text-white rounded text-[10px] hover:bg-[#152d4a]">
                          <Tag className="w-3 h-3" />
                        </button>
                      </div>
                      {form.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.variables.map((v) => (
                            <span key={v} className="flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {`{${v}}`}
                              <button onClick={() => removeVar(v)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</p>
                        <div className="flex flex-wrap gap-1">
                          {["data", "data_atual", "ano"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prefeitura</p>
                        <div className="flex flex-wrap gap-1">
                          {["prefeitura", "municipio", "prefeito", "p_nome", "p_cidade", "p_estado", "p_cnpj", "p_endereco", "p_telefone", "p_email", "p_prefeito"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Empresa</p>
                        <div className="flex flex-wrap gap-1">
                          {["empresa", "fornecedor", "razao_social", "m_nome", "m_cnpj", "m_endereco", "m_cidade", "m_estado", "m_telefone", "m_email", "m_contato"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Edital</p>
                        <div className="flex flex-wrap gap-1">
                          {["edital", "licitacao", "objeto", "e_numero", "e_ano", "e_modalidade", "e_objeto", "e_valor"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contrato</p>
                        <div className="flex flex-wrap gap-1">
                          {["cont_n", "valor_global", "valor_ext"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Outros</p>
                        <div className="flex flex-wrap gap-1">
                          {["nome_assinante", "cargo", "cpf", "testemunha1", "testemunha2"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVar(v); }}
                              className="text-[10px] bg-gray-50 text-gray-600 hover:bg-gray-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract Editor Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className={`bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${
                editorFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl max-h-[92vh]"
              }`}>
              
              {/* Editor Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{showPreview.name}</h2>
                    <p className="text-[11px] text-gray-400">
                      {previewEditing ? "Modo de edição — edite o contrato diretamente" : "Visualização do modelo"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {previewEditing ? (
                    <>
                      <button onClick={() => setShowVarPanel(!showVarPanel)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                          showVarPanel ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}>
                        <Tag className="w-3.5 h-3.5" /> Variáveis
                      </button>
                      <button onClick={() => { setPreviewContent(showPreview.content); setPreviewEditing(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                      <button onClick={savePreviewChanges} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 font-medium">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setPreviewEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#1E3A5F] text-white hover:bg-[#152d4a] rounded-lg transition-colors font-medium">
                      <Edit2 className="w-3.5 h-3.5" /> Editar Contrato
                    </button>
                  )}
                  <button onClick={() => setEditorFullscreen(!editorFullscreen)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    {editorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setShowPreview(null); setPreviewEditing(false); setEditorFullscreen(false); setShowVarPanel(false); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              {previewEditing && (
                <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-gray-200 bg-white overflow-x-auto shrink-0">
                  {/* Undo / Redo */}
                  <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                    <button onClick={() => execCmd("undo")} title="Desfazer (Ctrl+Z)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Undo2 className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("redo")} title="Refazer (Ctrl+Y)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Redo2 className="w-4 h-4" /></button>
                  </div>
                  {/* Font & Size */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-200 mr-1">
                    <select onChange={(e) => { if (e.target.value) execCmd("fontName", e.target.value); e.target.value = ""; }}
                      defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[100px]">
                      <option value="" disabled>Fonte</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                      <option value="Garamond">Garamond</option>
                    </select>
                    <select onChange={(e) => { if (e.target.value) execCmd("fontSize", e.target.value); e.target.value = ""; }}
                      defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[75px]">
                      <option value="" disabled>Tamanho</option>
                      <option value="1">8</option>
                      <option value="2">10</option>
                      <option value="3">12</option>
                      <option value="4">14</option>
                      <option value="5">18</option>
                      <option value="6">24</option>
                      <option value="7">36</option>
                    </select>
                    <select onChange={(e) => { if (e.target.value) execCmd("formatBlock", e.target.value); e.target.value = ""; }}
                      defaultValue="" className="text-[11px] border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] max-w-[90px]">
                      <option value="" disabled>Estilo</option>
                      <option value="p">Normal</option>
                      <option value="h1">Título 1</option>
                      <option value="h2">Título 2</option>
                      <option value="h3">Título 3</option>
                      <option value="h4">Título 4</option>
                      <option value="blockquote">Citação</option>
                      <option value="pre">Código</option>
                    </select>
                  </div>
                  {/* Text style */}
                  <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                    <button onClick={() => execCmd("bold")} title="Negrito (Ctrl+B)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("italic")} title="Itálico (Ctrl+I)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("underline")} title="Sublinhado (Ctrl+U)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Underline className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("strikeThrough")} title="Tachado" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Strikethrough className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("subscript")} title="Subscrito" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Subscript className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("superscript")} title="Sobrescrito" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Superscript className="w-4 h-4" /></button>
                  </div>
                  {/* Alignment */}
                  <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                    <button onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("justifyCenter")} title="Centralizar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("justifyRight")} title="Alinhar à direita" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignRight className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("justifyFull")} title="Justificar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><AlignJustify className="w-4 h-4" /></button>
                  </div>
                  {/* Lists, indent, quote */}
                  <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                    <button onClick={() => execCmd("insertUnorderedList")} title="Lista com marcadores" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><List className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("insertOrderedList")} title="Lista numerada" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><ListOrdered className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("indent")} title="Aumentar recuo" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><IndentIncrease className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("outdent")} title="Diminuir recuo" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><IndentDecrease className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("insertHorizontalRule")} title="Linha horizontal" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Minus className="w-4 h-4" /></button>
                  </div>
                  {/* Link */}
                  <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-1">
                    <button onClick={previewInsertLink} title="Inserir link" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><LinkIcon className="w-4 h-4" /></button>
                    <button onClick={() => execCmd("unlink")} title="Remover link" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><Unlink className="w-4 h-4" /></button>
                  </div>
                  {/* Colors */}
                  <div className="flex items-center gap-1 pr-2 border-r border-gray-200 mr-1">
                    <div className="relative" title="Cor do texto">
                      <input type="color" onChange={(e) => execCmd("foreColor", e.target.value)} defaultValue="#000000"
                        className="w-7 h-7 rounded cursor-pointer border border-gray-200 opacity-0 absolute inset-0" />
                      <div className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer">
                        <Type className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                    <div className="relative" title="Cor de fundo do texto">
                      <input type="color" onChange={(e) => execCmd("hiliteColor", e.target.value)} defaultValue="#FFFF00"
                        className="w-7 h-7 rounded cursor-pointer border border-gray-200 opacity-0 absolute inset-0" />
                      <div className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer">
                        <Highlighter className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                  </div>
                  {/* Clear */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => execCmd("removeFormat")} title="Limpar formatação" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"><RemoveFormatting className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {/* Editor Body */}
              <div className="flex-1 overflow-hidden flex">
                {/* Document Area */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8">
                  <div className={`flex flex-col mx-auto bg-white shadow-lg rounded-sm ${editorFullscreen ? "max-w-4xl" : "max-w-3xl"}`}
                    style={{ minHeight: "1123px" }}>
                    {showPreview?.headerImage && (
                      <img key="preview-header" src={showPreview.headerImage} alt="Cabeçalho" className="w-full h-auto pointer-events-none select-none flex-shrink-0" draggable={false} />
                    )}
                    {previewEditing ? (
                      <div
                        key="preview-editor"
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: previewContent }}
                        className="outline-none px-12 py-8 flex-1 text-gray-800 text-[14px] leading-relaxed"
                        style={{
                          fontFamily: "'Times New Roman', 'Georgia', serif",
                        }}
                        onMouseUp={savePreviewSelection}
                        onKeyUp={savePreviewSelection}
                        onInput={() => {
                          if (editorRef.current) {
                            setPreviewContent(editorRef.current.innerHTML);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="px-12 py-8 flex-1 text-gray-800 text-[14px] leading-relaxed whitespace-pre-wrap"
                        style={{
                          fontFamily: "'Times New Roman', 'Georgia', serif",
                        }}
                        dangerouslySetInnerHTML={{ __html: previewContent.replace(/\{([^}]+)\}/g, '<span style="background:#dbeafe;color:#1e40af;padding:1px 4px;border-radius:4px;font-weight:600">{$1}</span>') }}
                      />
                    )}
                    {showPreview?.footerImage && (
                      <img src={showPreview.footerImage} alt="Rodapé" className="w-full h-auto pointer-events-none select-none flex-shrink-0 mt-auto" draggable={false} />
                    )}
                  </div>
                </div>

                {/* Variables Side Panel */}
                {previewEditing && showVarPanel && (
                  <div className="w-64 border-l border-gray-200 bg-white overflow-y-auto shrink-0">
                    <div className="p-3 border-b border-gray-100">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Variáveis</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Clique para inserir no contrato</p>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</p>
                        <div className="flex flex-wrap gap-1">
                          {["data", "data_atual", "ano"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prefeitura</p>
                        <div className="flex flex-wrap gap-1">
                          {["prefeitura", "municipio", "prefeito", "p_nome", "p_cidade", "p_estado", "p_cnpj", "p_endereco", "p_telefone", "p_email", "p_prefeito"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Empresa</p>
                        <div className="flex flex-wrap gap-1">
                          {["empresa", "fornecedor", "razao_social", "m_nome", "m_cnpj", "m_endereco", "m_cidade", "m_estado", "m_telefone", "m_email", "m_contato"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Edital</p>
                        <div className="flex flex-wrap gap-1">
                          {["edital", "licitacao", "objeto", "e_numero", "e_ano", "e_modalidade", "e_objeto", "e_valor"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contrato</p>
                        <div className="flex flex-wrap gap-1">
                          {["cont_n", "valor_global", "valor_ext"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Outros</p>
                        <div className="flex flex-wrap gap-1">
                          {["nome_assinante", "cargo", "cpf", "testemunha1", "testemunha2"].map((v) => (
                            <button key={v} onMouseDown={(e) => { e.preventDefault(); insertVarInEditor(v); }}
                              className="text-[10px] bg-gray-50 text-gray-600 hover:bg-gray-100 px-2 py-0.5 rounded-full transition-colors font-medium cursor-pointer select-none">
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
