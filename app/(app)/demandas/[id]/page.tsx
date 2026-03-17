"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Paperclip, Send, Loader2, ArrowLeft, Clock, User, Building2,
  FileText, AlertTriangle, CheckCircle2, XCircle, MessageSquare,
  Calendar, Phone, Mail, Hash, Download, Eye, Edit3, Save,
  AlertCircle, RefreshCw, Copy, ExternalLink, Trash2
} from "lucide-react";
import { toast } from "sonner";
import FileUpload from "@/components/file-upload";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  ABERTA: { label: "Aberta", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: FileText },
  EM_ANALISE: { label: "Em Análise", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200", icon: Clock },
  EM_ANDAMENTO: { label: "Em Andamento", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", icon: AlertCircle },
  AGUARDANDO_RESPOSTA: { label: "Aguardando Resposta", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", icon: Clock },
  CONCLUIDA: { label: "Concluída", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  CANCELADA: { label: "Cancelada", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BAIXA: { label: "Baixa", color: "text-gray-700", bgColor: "bg-gray-100 border-gray-300" },
  MEDIA: { label: "Média", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-300" },
  ALTA: { label: "Alta", color: "text-orange-700", bgColor: "bg-orange-100 border-orange-300" },
  URGENTE: { label: "Urgente", color: "text-red-700", bgColor: "bg-red-100 border-red-300" },
};

const historyActionLabels: Record<string, { label: string; color: string; icon: any }> = {
  STATUS_ALTERADO: { label: "Status Alterado", color: "border-blue-500 text-blue-700", icon: RefreshCw },
  PRIORIDADE_ALTERADA: { label: "Prioridade Alterada", color: "border-orange-500 text-orange-700", icon: AlertTriangle },
  ATRIBUICAO_ALTERADA: { label: "Atribuição Alterada", color: "border-indigo-500 text-indigo-700", icon: User },
  PENDENCIA_ENVIADA: { label: "Pendência Enviada", color: "border-amber-500 text-amber-700", icon: AlertTriangle },
  RESPOSTA_ENVIADA: { label: "Resposta Enviada", color: "border-emerald-500 text-emerald-700", icon: Send },
  RESPOSTA_SOLICITANTE: { label: "Resposta do Solicitante", color: "border-teal-500 text-teal-700", icon: MessageSquare },
  PRAZO_ALTERADO: { label: "Prazo Alterado", color: "border-orange-500 text-orange-700", icon: Calendar },
  CONTRATO_GERADO: { label: "Contrato Gerado", color: "border-blue-500 text-blue-700", icon: FileText },
  DEMANDA_CRIADA: { label: "Demanda Criada", color: "border-green-500 text-green-700", icon: FileText },
};

export default function DemandaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const demandId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [demand, setDemand] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [prefectures, setPrefectures] = useState<any[]>([]);

  // Ações
  const [saving, setSaving] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingPendency, setSendingPendency] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);

  // Formulários
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  // Mensagem/Resposta ao solicitante
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAttachments, setResponseAttachments] = useState<string[]>([]);

  // Pendência
  const [pendencyMessage, setPendencyMessage] = useState("");
  const [pendencyAttachments, setPendencyAttachments] = useState<string[]>([]);

  // Notas internas
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Resolução
  const [resolution, setResolution] = useState("");

  const fetchDemand = useCallback(async () => {
    try {
      const res = await fetch(`/api/demands/${demandId}`);
      if (!res.ok) throw new Error("Demanda não encontrada");
      const data = await res.json();
      setDemand(data);
      setHistory(data.history || []);
      setInternalNotes(data.internalNotes || "");
      setResolution(data.resolution || "");
      setEditData({
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedToId || "",
        prefectureId: data.prefectureId || "",
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "",
      });
    } catch (e) {
      setDemand(null);
    } finally {
      setLoading(false);
    }
  }, [demandId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/collaborators");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchPrefectures = async () => {
    try {
      const res = await fetch("/api/prefectures");
      if (res.ok) {
        const data = await res.json();
        setPrefectures(Array.isArray(data) ? data : []);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (demandId) {
      fetchDemand();
      fetchUsers();
      fetchPrefectures();
    }
  }, [demandId, fetchDemand]);

  // === AÇÕES ===

  const handleUpdateDemand = async () => {
    setSaving(true);
    try {
      const updatePayload: any = {};

      if (editData.status !== demand.status) updatePayload.status = editData.status;
      if (editData.priority !== demand.priority) updatePayload.priority = editData.priority;
      if (editData.assignedToId !== (demand.assignedToId || "")) updatePayload.assignedToId = editData.assignedToId || null;
      if (editData.prefectureId !== (demand.prefectureId || "")) updatePayload.prefectureId = editData.prefectureId || null;
      
      const currentDueDate = demand.dueDate ? new Date(demand.dueDate).toISOString().split("T")[0] : "";
      if (editData.dueDate !== currentDueDate) updatePayload.dueDate = editData.dueDate || null;

      if (resolution !== (demand.resolution || "")) updatePayload.resolution = resolution;

      if (Object.keys(updatePayload).length === 0) {
        toast.info("Nenhuma alteração detectada");
        setEditMode(false);
        return;
      }

      const res = await fetch(`/api/demands/${demandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error("Erro ao atualizar demanda");

      toast.success("Demanda atualizada com sucesso!");
      setEditMode(false);
      await fetchDemand();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar demanda");
    } finally {
      setSaving(false);
    }
  };

  const handleSendResponse = async () => {
    if (!responseMessage.trim() && responseAttachments.length === 0) {
      toast.error("Envie uma mensagem ou anexe pelo menos um arquivo");
      return;
    }
    setSendingResponse(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: responseMessage,
          attachments: responseAttachments,
          isPendency: false,
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar resposta");
      toast.success("Resposta enviada ao solicitante! Email será enviado automaticamente.");
      setResponseMessage("");
      setResponseAttachments([]);
      await fetchDemand();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar resposta");
    } finally {
      setSendingResponse(false);
    }
  };

  const handleSendPendency = async () => {
    if (!pendencyMessage.trim()) {
      toast.error("Descreva a pendência para o solicitante");
      return;
    }
    setSendingPendency(true);
    try {
      const res = await fetch(`/api/demands/${demandId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: pendencyMessage,
          attachments: pendencyAttachments,
          isPendency: true,
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar pendência");
      toast.success("Pendência enviada! O solicitante receberá um email com link para responder.");
      setPendencyMessage("");
      setPendencyAttachments([]);
      await fetchDemand();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar pendência");
    } finally {
      setSendingPendency(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/demands/${demandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes }),
      });
      if (!res.ok) throw new Error("Erro ao salvar notas");
      toast.success("Notas internas salvas!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar notas");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopyProtocol = () => {
    navigator.clipboard.writeText(demand.protocolNumber);
    toast.success("Protocolo copiado!");
  };

  const handleDeleteDemand = async () => {
    if (!confirm("Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/demands/${demandId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir demanda");
      toast.success("Demanda excluída com sucesso!");
      router.push("/demandas");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir demanda");
    }
  };

  const formatDateTime = (date: string) => new Date(date).toLocaleString("pt-BR");
  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const fileNameWithParams = parts[parts.length - 1];
      return decodeURIComponent(fileNameWithParams.split("?")[0]);
    } catch {
      return "Arquivo";
    }
  };

  // === LOADING ===
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando demanda...</p>
        </div>
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Demanda não encontrada</h2>
        <p className="text-muted-foreground mb-4">A demanda solicitada não existe ou foi removida.</p>
        <Button onClick={() => router.push("/demandas")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Demandas
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[demand.status]?.icon || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/demandas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold">{demand.title}</h1>
              <Badge className={`${statusConfig[demand.status]?.bgColor} ${statusConfig[demand.status]?.color} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[demand.status]?.label || demand.status}
              </Badge>
              <Badge className={`${priorityConfig[demand.priority]?.bgColor} ${priorityConfig[demand.priority]?.color} border`}>
                {priorityConfig[demand.priority]?.label || demand.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <button onClick={handleCopyProtocol} className="flex items-center gap-1 font-mono hover:text-primary transition-colors" title="Copiar protocolo">
                <Hash className="h-3 w-3" />
                {demand.protocolNumber}
                <Copy className="h-3 w-3" />
              </button>
              <span>•</span>
              <span>Criada em {formatDateTime(demand.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Edit3 className="h-4 w-4 mr-1" /> Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setEditData({ status: demand.status, priority: demand.priority, assignedToId: demand.assignedToId || "", prefectureId: demand.prefectureId || "", dueDate: demand.dueDate ? new Date(demand.dueDate).toISOString().split("T")[0] : "" }); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleUpdateDemand} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </>
          )}
          <Button variant="destructive" size="sm" onClick={handleDeleteDemand}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descrição da Demanda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{demand.description}</p>
              {demand.dotacao && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground font-medium">Dotação Orçamentária</p>
                  <p className="text-sm font-mono">{demand.dotacao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs de Ações */}
          <Tabs defaultValue="responder" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="responder" className="text-xs sm:text-sm">
                <Send className="h-3 w-3 mr-1 hidden sm:inline" /> Responder
              </TabsTrigger>
              <TabsTrigger value="pendencia" className="text-xs sm:text-sm">
                <AlertTriangle className="h-3 w-3 mr-1 hidden sm:inline" /> Pendência
              </TabsTrigger>
              <TabsTrigger value="notas" className="text-xs sm:text-sm">
                <Edit3 className="h-3 w-3 mr-1 hidden sm:inline" /> Notas
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs sm:text-sm">
                <Clock className="h-3 w-3 mr-1 hidden sm:inline" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Tab: Responder ao Solicitante */}
            <TabsContent value="responder">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5 text-emerald-600" />
                    Responder ao Solicitante
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Envie uma mensagem e/ou documentos para <strong>{demand.requesterName}</strong> ({demand.requesterEmail}).
                    O solicitante receberá um email com a resposta.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="responseMessage">Mensagem</Label>
                    <Textarea
                      id="responseMessage"
                      placeholder="Digite sua resposta ao solicitante..."
                      value={responseMessage}
                      onChange={e => setResponseMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Anexar Documentos</Label>
                    <FileUpload
                      onFilesChange={(files) => setResponseAttachments(files)}
                      maxFiles={10}
                      maxSizeMB={10}
                      publicUpload={false}
                    />
                  </div>
                  <Button
                    onClick={handleSendResponse}
                    disabled={sendingResponse || (!responseMessage.trim() && responseAttachments.length === 0)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {sendingResponse ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar Resposta ao Solicitante
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Enviar Pendência */}
            <TabsContent value="pendencia">
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    Solicitar Pendência
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Solicite documentos ou informações ao solicitante. O status será alterado para
                    &quot;Aguardando Resposta&quot; e o solicitante receberá um email com link para responder.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pendencyMessage">Descreva a pendência *</Label>
                    <Textarea
                      id="pendencyMessage"
                      placeholder="Ex: Necessitamos do comprovante de endereço atualizado e cópia do contrato social..."
                      value={pendencyMessage}
                      onChange={e => setPendencyMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Anexar Documentos de Referência (opcional)</Label>
                    <FileUpload
                      onFilesChange={(files) => setPendencyAttachments(files)}
                      maxFiles={5}
                      maxSizeMB={10}
                      publicUpload={false}
                    />
                  </div>
                  <Button
                    onClick={handleSendPendency}
                    disabled={sendingPendency || !pendencyMessage.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    {sendingPendency ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    Enviar Pendência ao Solicitante
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Notas Internas */}
            <TabsContent value="notas">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-blue-600" />
                    Notas Internas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Anotações visíveis apenas para a equipe interna. O solicitante não tem acesso.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Adicione observações internas sobre esta demanda..."
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={6}
                  />
                  <Button onClick={handleSaveNotes} disabled={savingNotes} variant="outline" className="w-full">
                    {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Notas
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Histórico Completo */}
            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Histórico Completo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhuma ação registrada ainda.</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((h: any, i: number) => {
                        const actionConfig = historyActionLabels[h.action] || { label: h.action, color: "border-gray-500 text-gray-700", icon: FileText };
                        const ActionIcon = actionConfig.icon;
                        return (
                          <div key={h.id || i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${actionConfig.color} bg-white`}>
                                <ActionIcon className="h-3.5 w-3.5" />
                              </div>
                              {i < history.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={`text-xs ${actionConfig.color}`}>
                                  {actionConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(h.createdAt)}
                                </span>
                                {h.userName && (
                                  <span className="text-xs text-muted-foreground">
                                    por <strong>{h.userName}</strong>
                                  </span>
                                )}
                              </div>
                              {h.comment && (
                                <div className="mt-1 p-3 bg-muted rounded-md">
                                  <p className="text-sm whitespace-pre-wrap">{h.comment}</p>
                                </div>
                              )}
                              {h.oldValue && h.newValue && !h.newValue.startsWith("[") && (
                                <div className="mt-1 text-xs">
                                  <span className="text-muted-foreground line-through">{h.oldValue}</span>
                                  <span className="mx-2">→</span>
                                  <span className="font-medium text-emerald-700">{h.newValue}</span>
                                </div>
                              )}
                              {h.newValue && h.newValue.startsWith("[") && (
                                <div className="mt-2 space-y-1">
                                  {(() => {
                                    try {
                                      const files = JSON.parse(h.newValue);
                                      return files.map((url: string, idx: number) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                                          <Paperclip className="h-3 w-3" /> {getFileName(url)}
                                        </a>
                                      ));
                                    } catch { return null; }
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Anexos do Solicitante */}
          {demand.attachments && demand.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Documentos Enviados pelo Solicitante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {demand.attachments.map((file: string, index: number) => (
                    <a
                      key={index}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="flex-1 text-sm truncate">{getFileName(file)}</span>
                      <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resposta/Documentos Enviados ao Solicitante */}
          {(demand.responseComment || (demand.responseAttachments && demand.responseAttachments.length > 0)) && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Última Resposta Enviada
                </CardTitle>
              </CardHeader>
              <CardContent>
                {demand.responseComment && (
                  <div className="mb-4 p-3 bg-white rounded-md border border-emerald-200">
                    <p className="text-sm whitespace-pre-wrap">{demand.responseComment}</p>
                  </div>
                )}
                {demand.responseAttachments && demand.responseAttachments.length > 0 && (
                  <div className="grid gap-2">
                    {demand.responseAttachments.map((file: string, index: number) => (
                      <a
                        key={index}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors bg-white"
                      >
                        <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate">{getFileName(file)}</span>
                        <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resolução (se concluída) */}
          {demand.status === "CONCLUIDA" && demand.resolution && (
            <Card className="border-emerald-300 bg-emerald-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Resolução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{demand.resolution}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Informações do Solicitante */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Solicitante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{demand.requesterName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${demand.requesterEmail}`} className="text-sm text-blue-600 hover:underline">
                  {demand.requesterEmail}
                </a>
              </div>
              {demand.requesterPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${demand.requesterPhone}`} className="text-sm text-blue-600 hover:underline">
                    {demand.requesterPhone}
                  </a>
                </div>
              )}
              {demand.requesterCpf && (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{demand.requesterCpf}</span>
                </div>
              )}
              {demand.publicSubmission && (
                <Badge variant="outline" className="text-xs">Solicitação Pública</Badge>
              )}
            </CardContent>
          </Card>

          {/* Gestão da Demanda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Gestão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editMode ? (
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`mt-1 px-3 py-2 rounded-md border text-sm font-medium ${statusConfig[demand.status]?.bgColor} ${statusConfig[demand.status]?.color}`}>
                    {statusConfig[demand.status]?.label || demand.status}
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                {editMode ? (
                  <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`mt-1 px-3 py-2 rounded-md border text-sm font-medium ${priorityConfig[demand.priority]?.bgColor} ${priorityConfig[demand.priority]?.color}`}>
                    {priorityConfig[demand.priority]?.label || demand.priority}
                  </div>
                )}
              </div>

              {/* Responsável */}
              <div>
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                {editMode ? (
                  <Select value={editData.assignedToId || "none"} onValueChange={(v) => setEditData({ ...editData, assignedToId: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 px-3 py-2 rounded-md border text-sm bg-muted/50">
                    {demand.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {demand.assignedTo.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Não atribuído</span>
                    )}
                  </div>
                )}
              </div>

              {/* Prefeitura */}
              <div>
                <Label className="text-xs text-muted-foreground">Prefeitura</Label>
                {editMode ? (
                  <Select value={editData.prefectureId || "none"} onValueChange={(v) => setEditData({ ...editData, prefectureId: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {prefectures.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 px-3 py-2 rounded-md border text-sm bg-muted/50">
                    {demand.prefecture ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {demand.prefecture.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Não informada</span>
                    )}
                  </div>
                )}
              </div>

              {/* Prazo */}
              <div>
                <Label className="text-xs text-muted-foreground">Prazo / Data Limite</Label>
                {editMode ? (
                  <Input
                    type="date"
                    className="mt-1"
                    value={editData.dueDate}
                    onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                  />
                ) : (
                  <div className="mt-1 px-3 py-2 rounded-md border text-sm bg-muted/50">
                    {demand.dueDate ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className={new Date(demand.dueDate) < new Date() && demand.status !== "CONCLUIDA" ? "text-red-600 font-medium" : ""}>
                          {formatDate(demand.dueDate)}
                          {new Date(demand.dueDate) < new Date() && demand.status !== "CONCLUIDA" && " (Vencido)"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem prazo definido</span>
                    )}
                  </div>
                )}
              </div>

              {/* Resolução (quando em modo edição e status concluída) */}
              {editMode && editData.status === "CONCLUIDA" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Resolução</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Descreva como a demanda foi resolvida..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada em</span>
                <span>{formatDateTime(demand.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizada em</span>
                <span>{formatDateTime(demand.updatedAt)}</span>
              </div>
              {demand.resolvedAt && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concluída em</span>
                    <span className="text-emerald-600 font-medium">{formatDateTime(demand.resolvedAt)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Link Público */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <ExternalLink className="h-4 w-4" />
                Consulta Pública
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-blue-700 mb-3">
                O solicitante pode acompanhar esta demanda pelo protocolo na página de consulta pública.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => window.open(`/consulta-protocolo`, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Abrir Consulta Pública
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
