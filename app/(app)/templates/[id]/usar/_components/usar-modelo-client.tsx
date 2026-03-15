"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ArrowLeft, Save, Send, Loader2, Building2, Landmark,
  FileCode2, FolderOpen, Users, ChevronDown, ChevronUp, Check, AlertCircle,
  Sparkles, RefreshCw, Maximize2, Minimize2, Edit2, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface UsarModeloClientProps {
  templateId: string;
}

// Mapeamento completo de variáveis para entidades (igual Firmaí)
const PREFECTURE_VARS: Record<string, string> = {
  // Variáveis padrão
  p_nome: "name", p_cidade: "city", p_estado: "state", p_cnpj: "cnpj",
  p_endereco: "address", p_telefone: "phone", p_email: "email", p_prefeito: "mayorName",
  // Variáveis alternativas
  prefeitura: "name", prefeito: "mayorName", municipio: "city",
  nome_prefeitura: "name", cidade_prefeitura: "city", estado_prefeitura: "state",
  cnpj_prefeitura: "cnpj", endereco_prefeitura: "address", telefone_prefeitura: "phone",
  email_prefeitura: "email", nome_prefeito: "mayorName",
  contratante: "name", nome_contratante: "name", cnpj_contratante: "cnpj",
  endereco_contratante: "address", cidade_contratante: "city", estado_contratante: "state",
};

const COMPANY_VARS: Record<string, string> = {
  // Variáveis padrão
  m_nome: "name", m_cnpj: "cnpj", m_endereco: "address", m_cidade: "city",
  m_estado: "state", m_telefone: "phone", m_email: "email", m_contato: "contactName",
  // Variáveis alternativas
  empresa: "name", fornecedor: "name", razao_social: "name", nome_fantasia: "tradeName",
  nome_empresa: "name", cnpj_empresa: "cnpj", endereco_empresa: "address",
  cidade_empresa: "city", estado_empresa: "state", telefone_empresa: "phone",
  email_empresa: "email", contato_empresa: "contactName",
  contratada: "name", nome_contratada: "name", cnpj_contratada: "cnpj",
  endereco_contratada: "address", cidade_contratada: "city", estado_contratada: "state",
  representante: "contactName", representante_legal: "contactName",
};

const BID_VARS: Record<string, string> = {
  // Variáveis padrão
  e_numero: "number", e_ano: "year", e_modalidade: "modality", e_objeto: "object",
  e_valor: "estimatedValue",
  // Variáveis alternativas
  edital: "number", licitacao: "number", objeto: "object",
  numero_edital: "number", ano_edital: "year", modalidade: "modality",
  objeto_licitacao: "object", valor_estimado: "estimatedValue",
  numero_licitacao: "number", ano_licitacao: "year",
  processo: "number", numero_processo: "number",
};

// Categorização de variáveis para melhor UX
const VAR_CATEGORIES = {
  data: ["data", "data_atual", "data_assinatura", "data_contrato", "data_inicio", "data_fim", "data_termino", "data_vencimento", "prazo", "vigencia"],
  valores: ["valor", "valor_total", "valor_contrato", "valor_mensal", "valor_unitario", "valor_global", "preco", "preco_total"],
  contrato: ["numero_contrato", "contrato", "clausula", "objeto_contrato", "descricao"],
};

export default function UsarModeloClient({ templateId }: UsarModeloClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [signers, setSigners] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);

  const [selectedPrefecture, setSelectedPrefecture] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedBid, setSelectedBid] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedSigners, setSelectedSigners] = useState<string[]>([]);
  const [selectedDemand, setSelectedDemand] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [sendAfterCreate, setSendAfterCreate] = useState(false);
  const [showSigners, setShowSigners] = useState(false);
  const [preview, setPreview] = useState("");

  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/templates/${templateId}/use`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setTemplate(data.template);
        setPrefectures(data.prefectures || []);
        setCompanies(data.companies || []);
        setBids(data.bids || []);
        setFolders(data.folders || []);
        setSigners(data.signers || []);
        setDemands(data.demands || []);
        setTitle(data.template.name);

        // Extrair variáveis do template
        const vars = extractVariables(data.template.content);
        const initialVars: Record<string, string> = {};
        vars.forEach(v => { initialVars[v] = ""; });
        
        // Preencher data atual automaticamente
        const today = new Date();
        const formattedDate = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        const shortDate = today.toLocaleDateString("pt-BR");
        
        VAR_CATEGORIES.data.forEach(dateVar => {
          if (vars.includes(dateVar)) {
            initialVars[dateVar] = dateVar.includes("atual") ? formattedDate : shortDate;
          }
        });
        
        setVariables(initialVars);
      } catch (e: any) {
        toast.error(e.message || "Erro ao carregar modelo");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [templateId]);

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches.map(m => m.slice(1, -1)))] : [];
  };

  // Preencher variáveis baseado na prefeitura selecionada
  useEffect(() => {
    if (!selectedPrefecture || !autoFillEnabled) return;
    const pref = prefectures.find(p => p.id === selectedPrefecture);
    if (!pref) return;
    
    setVariables(prev => {
      const updated = { ...prev };
      Object.entries(PREFECTURE_VARS).forEach(([varName, field]) => {
        if (varName in updated && pref[field]) {
          updated[varName] = pref[field];
        }
      });
      return updated;
    });
    toast.success(`Dados da prefeitura "${pref.name}" preenchidos!`, { duration: 2000 });
  }, [selectedPrefecture, prefectures, autoFillEnabled]);

  // Preencher variáveis baseado na empresa selecionada
  useEffect(() => {
    if (!selectedCompany || !autoFillEnabled) return;
    const comp = companies.find(c => c.id === selectedCompany);
    if (!comp) return;
    
    setVariables(prev => {
      const updated = { ...prev };
      Object.entries(COMPANY_VARS).forEach(([varName, field]) => {
        if (varName in updated && comp[field]) {
          updated[varName] = comp[field];
        }
      });
      return updated;
    });
    toast.success(`Dados da empresa "${comp.name}" preenchidos!`, { duration: 2000 });
  }, [selectedCompany, companies, autoFillEnabled]);

  // Preencher variáveis baseado no edital selecionado
  useEffect(() => {
    if (!selectedBid || !autoFillEnabled) return;
    const bid = bids.find(b => b.id === selectedBid);
    if (!bid) return;
    
    setVariables(prev => {
      const updated = { ...prev };
      Object.entries(BID_VARS).forEach(([varName, field]) => {
        if (varName in updated && bid[field]) {
          let value = String(bid[field]);
          // Formatar valor monetário
          if (field === "estimatedValue" && bid[field]) {
            value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(bid[field]);
          }
          updated[varName] = value;
        }
      });
      return updated;
    });
    toast.success(`Dados do edital "${bid.number}/${bid.year}" preenchidos!`, { duration: 2000 });
  }, [selectedBid, bids, autoFillEnabled]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    documentRef.current?.focus();
  };

  // Gerar o HTML do preview com destaques
  const generatePreviewHtml = useCallback(() => {
    if (!template) return "";
    let content = template.content;
    // Se o conteúdo não tem tags HTML, converter quebras de linha
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    if (!isHtml) {
      content = content.replace(/\n/g, "<br>");
    }
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      if (value) {
        content = content.replace(regex, `<span style="background:#d1fae5;color:#065f46;padding:1px 4px;border-radius:4px">${value}</span>`);
      } else {
        content = content.replace(regex, `<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:4px;font-weight:600">{${key}}</span>`);
      }
    });
    return content;
  }, [template, variables]);

  // Atualizar preview
  useEffect(() => {
    if (!template) return;
    setPreview(generatePreviewHtml());
  }, [template, variables, generatePreviewHtml]);

  const handleSubmit = async (send: boolean) => {
    if (!title.trim()) {
      toast.error("Informe o título do documento");
      return;
    }

    // Verificar se há variáveis não preenchidas
    const emptyVars = Object.entries(variables).filter(([_, v]) => !v);
    if (emptyVars.length > 0 && !inlineEditing) {
      const confirm = window.confirm(`Há ${emptyVars.length} campo(s) não preenchido(s). Deseja continuar mesmo assim?`);
      if (!confirm) return;
    }
    
    setSaving(true);
    try {
      // Se está editando inline, pegar o conteúdo diretamente do editor
      let finalVariables = variables;
      let customContent: string | undefined;
      
      if (inlineEditing && documentRef.current) {
        customContent = documentRef.current.innerHTML;
      }

      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          variables: inlineEditing ? {} : finalVariables,
          customContent,
          folderId: selectedFolder || null,
          signerIds: selectedSigners,
          sendAfterCreate: send,
          demandId: selectedDemand || null,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(send ? "Documento criado e enviado para assinatura!" : "Documento salvo como rascunho!");
      router.push(`/documentos/${data.document.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar documento");
    } finally {
      setSaving(false);
    }
  };

  const toggleSigner = (id: string) => {
    setSelectedSigners(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const resetVariables = () => {
    const vars = extractVariables(template.content);
    const resetVars: Record<string, string> = {};
    vars.forEach(v => { resetVars[v] = ""; });
    setVariables(resetVars);
    setSelectedPrefecture("");
    setSelectedCompany("");
    setSelectedBid("");
    toast.success("Campos resetados!");
  };

  // Contar variáveis preenchidas
  const templateVars = useMemo(() => template ? extractVariables(template.content) : [], [template]);
  const filledVars = useMemo(() => Object.values(variables).filter(v => v).length, [variables]);
  const totalVars = templateVars.length;
  const fillPercentage = totalVars > 0 ? Math.round((filledVars / totalVars) * 100) : 0;

  // Filtrar pastas baseado na prefeitura selecionada
  const filteredFolders = useMemo(() => {
    if (!selectedPrefecture) return folders;
    // Mostrar APENAS pastas da prefeitura selecionada
    return folders.filter(f => f.prefectureId === selectedPrefecture);
  }, [folders, selectedPrefecture]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1E3A5F]" />
        <p className="text-gray-500">Carregando modelo...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-gray-600">Modelo não encontrado</p>
        <Link href="/templates" className="text-[#1E3A5F] hover:underline mt-2 inline-block">Voltar aos modelos</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Usar Modelo
            </h1>
            <p className="text-gray-500 text-sm">{template.name}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{filledVars}/{totalVars} campos</p>
            <p className="text-xs text-gray-400">preenchidos</p>
          </div>
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${fillPercentage === 100 ? 'bg-emerald-500' : 'bg-[#1E3A5F]'}`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${fillPercentage === 100 ? 'text-emerald-600' : 'text-gray-700'}`}>{fillPercentage}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Panel - Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Título */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Informações do Documento</h3>
              <button onClick={resetVariables}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Resetar
              </button>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Título *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent text-sm"
                placeholder="Título do documento" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoFillEnabled} onChange={e => setAutoFillEnabled(e.target.checked)}
                className="w-4 h-4 text-[#1E3A5F] rounded border-gray-300 focus:ring-[#1E3A5F]" />
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Preenchimento automático
              </span>
            </label>
          </div>

          {/* Auto-fill Entities */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl shadow-sm border border-blue-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Preenchimento Automático</h3>
            </div>
            <p className="text-xs text-gray-500">Selecione entidades para preencher automaticamente.</p>

            {/* Edital */}
            {bids.length > 0 && (
              <div className="bg-white/70 rounded-xl p-3 border border-blue-100/80">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-blue-600" /> Edital
                </label>
                <select value={selectedBid} onChange={e => setSelectedBid(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {bids.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.number}/{b.year} - {b.modality} {b.prefecture?.name ? `(${b.prefecture.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prefeitura */}
            {prefectures.length > 0 && (
              <div className="bg-white/70 rounded-xl p-3 border border-blue-100/80">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" /> Prefeitura
                </label>
                <select value={selectedPrefecture} onChange={e => setSelectedPrefecture(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {prefectures.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.city}/{p.state}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Empresa */}
            {companies.length > 0 && (
              <div className="bg-white/70 rounded-xl p-3 border border-blue-100/80">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Empresa
                </label>
                <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.cnpj ? `(${c.cnpj})` : ""}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Pasta */}
            {folders.length > 0 && (
              <div className="bg-white/70 rounded-xl p-3 border border-blue-100/80">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" /> Pasta
                  {selectedPrefecture && filteredFolders.length < folders.length && (
                    <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Filtrado</span>
                  )}
                </label>
                <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Nenhuma (raiz)</option>
                  {filteredFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {selectedPrefecture && filteredFolders.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Nenhuma pasta para esta prefeitura
                  </p>
                )}
              </div>
            )}

            {/* Vincular Demanda */}
            {demands.length > 0 && (
              <div className="bg-white/70 rounded-xl p-3 border border-emerald-100/80">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-600" /> Vincular à Demanda
                  <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Opcional</span>
                </label>
                <select value={selectedDemand} onChange={e => setSelectedDemand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">Nenhuma demanda</option>
                  {demands.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.protocolNumber} - {d.title} {d.requesterName ? `(${d.requesterName})` : ""}
                    </option>
                  ))}
                </select>
                {selectedDemand && (
                  <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> O solicitante será notificado por e-mail
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Variables */}
          {templateVars.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" /> Campos do Modelo
                </h3>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filledVars}/{totalVars}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {templateVars.map(varName => {
                  const isFilled = !!variables[varName];
                  return (
                    <div key={varName} className={`relative ${isFilled ? 'ring-1 ring-emerald-200' : ''} rounded-lg`}>
                      <label className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                        {isFilled && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                        <code className="bg-gray-50 px-1 rounded text-[10px]">{`{${varName}}`}</code>
                      </label>
                      <input type="text" value={variables[varName] || ""}
                        onChange={e => setVariables(prev => ({ ...prev, [varName]: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all ${
                          isFilled ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
                        }`}
                        placeholder={varName.replace(/_/g, " ")} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signers */}
          {signers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <button type="button" onClick={() => setShowSigners(!showSigners)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-[#1E3A5F] transition-colors">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Assinantes
                  {selectedSigners.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {selectedSigners.length}
                    </span>
                  )}
                </span>
                {showSigners ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showSigners && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2">
                      {signers.map(s => (
                        <label key={s.id} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                          <input type="checkbox" checked={selectedSigners.includes(s.id)}
                            onChange={() => toggleSigner(s.id)}
                            className="w-3.5 h-3.5 text-[#1E3A5F] rounded border-gray-300 focus:ring-[#1E3A5F]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{s.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{s.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-gray-50/80 backdrop-blur py-3 -mx-1 px-1">
            <button onClick={() => handleSubmit(false)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Rascunho
            </button>
            <button onClick={() => handleSubmit(true)} disabled={saving || selectedSigners.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm font-medium hover:bg-[#2a4a73] transition-colors disabled:opacity-50 shadow-lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Criar e Enviar
            </button>
          </div>
        </div>

        {/* Right Panel - Document Preview / Editor */}
        <div className="lg:col-span-3">
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col ${
            previewFullscreen ? "fixed inset-0 z-50 rounded-none" : "lg:sticky lg:top-4"
          }`}>
            {/* Preview Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {inlineEditing ? "Editor de Contrato" : "Pré-visualização"}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {inlineEditing ? "Edite o contrato diretamente no documento" : "Preencha os campos ao lado para ver as alterações"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-2 mr-2 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded" style={{ background: "#d1fae5" }}></span> Preenchido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded" style={{ background: "#fef3c7" }}></span> Pendente
                  </span>
                </div>
                <button onClick={() => setInlineEditing(!inlineEditing)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                    inlineEditing
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-blue-50 text-[#1E3A5F] hover:bg-blue-100"
                  }`}>
                  <Edit2 className="w-3 h-3" />
                  {inlineEditing ? "Visualizar" : "Editar"}
                </button>
                <button onClick={() => setPreviewFullscreen(!previewFullscreen)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Inline Editor Toolbar */}
            {inlineEditing && (
              <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-white overflow-x-auto shrink-0">
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-2">
                  <button onClick={() => execCmd("undo")} title="Desfazer"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("redo")} title="Refazer"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-2">
                  <select onChange={(e) => { execCmd("fontSize", e.target.value); e.target.value = ""; }}
                    defaultValue="" className="text-xs border border-gray-200 rounded px-1 py-1 text-gray-600 focus:outline-none">
                    <option value="" disabled>Tamanho</option>
                    <option value="1">Pequeno</option>
                    <option value="3">Normal</option>
                    <option value="5">Grande</option>
                    <option value="7">Título</option>
                  </select>
                </div>
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-2">
                  <button onClick={() => execCmd("bold")} title="Negrito"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("italic")} title="Itálico"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("underline")} title="Sublinhado"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 mr-2">
                  <button onClick={() => execCmd("justifyLeft")} title="Esquerda"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("justifyCenter")} title="Centro"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("justifyRight")} title="Direita"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => execCmd("justifyFull")} title="Justificar"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input type="color" onChange={(e) => execCmd("foreColor", e.target.value)} defaultValue="#000000"
                  title="Cor" className="w-6 h-6 rounded cursor-pointer border border-gray-200" />
              </div>
            )}

            {/* Document Body */}
            <div className={`flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 ${previewFullscreen ? "" : "max-h-[75vh]"}`}>
              <div className="flex flex-col mx-auto bg-white shadow-lg rounded-sm max-w-3xl" style={{ minHeight: "1123px" }}>
                {template?.headerImage && (
                  <img src={template.headerImage} alt="Cabeçalho" className="w-full h-auto pointer-events-none select-none flex-shrink-0" draggable={false} />
                )}
                {inlineEditing ? (
                  <div
                    ref={documentRef}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: preview }}
                    className="outline-none px-10 py-8 flex-1 text-gray-800 text-[14px] leading-relaxed"
                    style={{
                      fontFamily: "'Times New Roman', 'Georgia', serif",
                    }}
                  />
                ) : (
                  <div
                    className="px-10 py-8 flex-1 text-gray-800 text-[14px] leading-relaxed"
                    style={{
                      fontFamily: "'Times New Roman', 'Georgia', serif",
                    }}
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                )}
                {template?.footerImage && (
                  <img src={template.footerImage} alt="Rodapé" className="w-full h-auto pointer-events-none select-none flex-shrink-0 mt-auto" draggable={false} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
