"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Clock, User, Building2, FileText, CheckCircle2, XCircle,
  Calendar, Phone, Mail, Hash, Download, Save, AlertCircle, RefreshCw,
  Briefcase, MapPin, Building, FileCheck, Loader2, Edit3, MessageSquare, Send
} from "lucide-react";
import FileUpload from "@/components/file-upload";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  PENDENTE: { label: "Pendente", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: FileText },
  EM_ANALISE: { label: "Em Análise", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200", icon: Clock },
  APROVADO: { label: "Aprovado", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  REPROVADO: { label: "Reprovado", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: XCircle },
  CANCELADO: { label: "Cancelado", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BAIXA: { label: "Baixa", color: "text-gray-700", bgColor: "bg-gray-100 border-gray-300" },
  MEDIA: { label: "Média", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-300" },
  ALTA: { label: "Alta", color: "text-orange-700", bgColor: "bg-orange-100 border-orange-300" },
  URGENTE: { label: "Urgente", color: "text-red-700", bgColor: "bg-red-100 border-red-300" },
};

export default function CredenciamentoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const credId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [credenciamento, setCredenciamento] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Documentos
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [approvingDoc, setApprovingDoc] = useState<string | null>(null);

  // Ações
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Comunicação
  const [newMessage, setNewMessage] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<string[]>([]);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [notifyPendency, setNotifyPendency] = useState(false);
  
  // Campos editáveis
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchCredenciamento = useCallback(async () => {
    try {
      const res = await fetch(`/api/credenciamentos/${credId}`);
      if (!res.ok) throw new Error("Credenciamento não encontrado");
      const data = await res.json();
      setCredenciamento(data);
      setHistory(data.history || []);
      setStatus(data.status);
      setPriority(data.priority);
      setAssignedToId(data.assignedToId || "");
      setReviewerId(data.reviewerId || "");
      setAnalysisNotes(data.analysisNotes || "");
      setRejectionReason(data.rejectionReason || "");
    } catch (e) {
      toast.error("Erro ao carregar credenciamento");
      setCredenciamento(null);
    } finally {
      setLoading(false);
    }
  }, [credId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/collaborators");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/credenciamentos/${credId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/credenciamentos/${credId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.approvals || []);
      }
    } catch (e) {
      console.error("Erro ao carregar documentos:", e);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocumentApproval = async (documentUrl: string, status: "APPROVED" | "REJECTED" | "PENDING", comment?: string) => {
    setApprovingDoc(documentUrl);
    try {
      const res = await fetch(`/api/credenciamentos/${credId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentUrl,
          status,
          comment,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao processar documento");
      }

      const data = await res.json();
      setDocuments(data.approvals || []);
      
      toast.success(
        status === "APPROVED" 
          ? "Documento aprovado com sucesso" 
          : status === "REJECTED"
          ? "Documento reprovado"
          : "Status atualizado"
      );
      
      // Recarregar histórico
      fetchCredenciamento();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar documento");
    } finally {
      setApprovingDoc(null);
    }
  };

  useEffect(() => {
    if (credId) {
      fetchCredenciamento();
      fetchUsers();
      fetchMessages();
      fetchDocuments();
    }
  }, [credId, fetchCredenciamento]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updatePayload: any = {};

      if (status !== credenciamento.status) updatePayload.status = status;
      if (priority !== credenciamento.priority) updatePayload.priority = priority;
      if (assignedToId !== (credenciamento.assignedToId || "")) {
        updatePayload.assignedToId = assignedToId || null;
      }
      if (reviewerId !== (credenciamento.reviewerId || "")) {
        updatePayload.reviewerId = reviewerId || null;
      }
      if (analysisNotes !== (credenciamento.analysisNotes || "")) {
        updatePayload.analysisNotes = analysisNotes;
      }
      if (rejectionReason !== (credenciamento.rejectionReason || "")) {
        updatePayload.rejectionReason = rejectionReason;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast.info("Nenhuma alteração detectada");
        setEditMode(false);
        return;
      }

      const res = await fetch(`/api/credenciamentos/${credId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error("Erro ao atualizar");

      toast.success("Credenciamento atualizado com sucesso");
      setEditMode(false);
      await fetchCredenciamento();
    } catch (error) {
      toast.error("Erro ao atualizar credenciamento");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Deseja aprovar este credenciamento?")) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/credenciamentos/${credId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "APROVADO",
          analysisNotes 
        }),
      });

      if (!res.ok) throw new Error("Erro ao aprovar");

      toast.success("Credenciamento aprovado com sucesso");
      await fetchCredenciamento();
    } catch (error) {
      toast.error("Erro ao aprovar credenciamento");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da reprovação");
      return;
    }

    if (!confirm("Deseja reprovar este credenciamento?")) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/credenciamentos/${credId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "REPROVADO",
          rejectionReason,
          analysisNotes
        }),
      });

      if (!res.ok) throw new Error("Erro ao reprovar");

      toast.success("Credenciamento reprovado");
      await fetchCredenciamento();
    } catch (error) {
      toast.error("Erro ao reprovar credenciamento");
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error("Por favor, escreva uma mensagem");
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/credenciamentos/${credId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newMessage,
          attachments: messageAttachments,
          isInternal: isInternalNote,
          notifyPendency,
        }),
      });

      if (!res.ok) throw new Error("Erro ao enviar mensagem");

      toast.success(isInternalNote ? "Nota interna adicionada" : "Mensagem enviada com sucesso");
      setNewMessage("");
      setMessageAttachments([]);
      setIsInternalNote(false);
      setNotifyPendency(false);
      await fetchMessages();
      await fetchCredenciamento(); // Atualizar histórico
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return "-";
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "-";
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  };

  const formatCEP = (cep: string) => {
    if (!cep) return "-";
    return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando credenciamento...</p>
        </div>
      </div>
    );
  }

  if (!credenciamento) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold">Credenciamento não encontrado</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig[credenciamento.status]?.icon || FileText;
  const statusStyle = statusConfig[credenciamento.status] || statusConfig.PENDENTE;
  const priorityStyle = priorityConfig[credenciamento.priority] || priorityConfig.MEDIA;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{credenciamento.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{credenciamento.protocolNumber}</span>
              <Badge className={`${statusStyle.bgColor} ${statusStyle.color} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusStyle.label}
              </Badge>
              <Badge className={`${priorityStyle.bgColor} ${priorityStyle.color} border`}>
                {priorityStyle.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {credenciamento.status === "PENDENTE" || credenciamento.status === "EM_ANALISE" ? (
            <>
              <Button onClick={handleApprove} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Aprovar
              </Button>
              <Button onClick={handleReject} disabled={saving} variant="destructive">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reprovar
              </Button>
            </>
          ) : null}
          
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => {
              if (editMode) {
                handleUpdate();
              } else {
                setEditMode(true);
              }
            }}
            disabled={saving}
          >
            {editMode ? (
              <>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Alterações
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
          <TabsTrigger value="communication">Comunicação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Tab: Informações */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status e Atribuição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Status e Atribuição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  {editMode ? (
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                        <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                        <SelectItem value="APROVADO">Aprovado</SelectItem>
                        <SelectItem value="REPROVADO">Reprovado</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 font-medium">{statusStyle.label}</p>
                  )}
                </div>

                <div>
                  <Label>Prioridade</Label>
                  {editMode ? (
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="URGENTE">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 font-medium">{priorityStyle.label}</p>
                  )}
                </div>

                <div>
                  <Label>Atribuído a</Label>
                  {editMode ? (
                    <Select value={assignedToId || "none"} onValueChange={(v) => setAssignedToId(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {users.filter(user => user.id && user.name).map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1">{credenciamento.assignedTo?.name || "Não atribuído"}</p>
                  )}
                </div>

                <div>
                  <Label>Revisor</Label>
                  {editMode ? (
                    <Select value={reviewerId || "none"} onValueChange={(v) => setReviewerId(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um revisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {users.filter(user => user.id && user.name).map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1">{credenciamento.reviewer?.name || "Não definido"}</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{formatDate(credenciamento.createdAt)}</span>
                  </div>
                  {credenciamento.approvedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Aprovado em:</span>
                      <span>{formatDate(credenciamento.approvedAt)}</span>
                    </div>
                  )}
                  {credenciamento.rejectedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-muted-foreground">Reprovado em:</span>
                      <span>{formatDate(credenciamento.rejectedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dados do Solicitante */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Solicitante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <p className="mt-1">{credenciamento.requesterName}</p>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${credenciamento.requesterEmail}`} className="text-blue-600 hover:underline">
                      {credenciamento.requesterEmail}
                    </a>
                  </div>
                </div>
                {credenciamento.requesterPhone && (
                  <div>
                    <Label>Telefone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{credenciamento.requesterPhone}</span>
                    </div>
                  </div>
                )}
                {credenciamento.requesterCpf && (
                  <div>
                    <Label>CPF</Label>
                    <p className="mt-1">{formatCPF(credenciamento.requesterCpf)}</p>
                  </div>
                )}
                {credenciamento.requesterCnpj && (
                  <div>
                    <Label>CNPJ</Label>
                    <p className="mt-1">{formatCNPJ(credenciamento.requesterCnpj)}</p>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <Label>Prefeitura</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{credenciamento.prefecture?.name || "-"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Descrição e Análise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{credenciamento.description || "Sem descrição"}</p>
                
                {credenciamento.requestedServices && (
                  <div className="mt-4">
                    <Label>Serviços Solicitados</Label>
                    <p className="mt-1 whitespace-pre-wrap">{credenciamento.requestedServices}</p>
                  </div>
                )}
                
                {credenciamento.activityArea && (
                  <div className="mt-4">
                    <Label>Área de Atuação</Label>
                    <p className="mt-1">{credenciamento.activityArea}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Notas da Análise</Label>
                  {editMode ? (
                    <Textarea
                      value={analysisNotes}
                      onChange={(e) => setAnalysisNotes(e.target.value)}
                      placeholder="Adicione observações sobre a análise..."
                      rows={4}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {credenciamento.analysisNotes || "Nenhuma nota registrada"}
                    </p>
                  )}
                </div>

                {credenciamento.status === "REPROVADO" && (
                  <div>
                    <Label className="text-red-600">Motivo da Reprovação</Label>
                    {editMode ? (
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Informe o motivo da reprovação..."
                        rows={3}
                        className="mt-1 border-red-300"
                      />
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
                        {credenciamento.rejectionReason || "Não informado"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Dados da Empresa */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Razão Social</Label>
                  <p className="mt-1 font-medium">{credenciamento.companyName || "-"}</p>
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <p className="mt-1">{credenciamento.companyTradeName || "-"}</p>
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <p className="mt-1">{formatCNPJ(credenciamento.cnpj)}</p>
                </div>
                {credenciamento.companyEmail && (
                  <div>
                    <Label>E-mail da Empresa</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${credenciamento.companyEmail}`} className="text-blue-600 hover:underline">
                        {credenciamento.companyEmail}
                      </a>
                    </div>
                  </div>
                )}
                {credenciamento.companyPhone && (
                  <div>
                    <Label>Telefone da Empresa</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{credenciamento.companyPhone}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <Label>Endereço Completo</Label>
                  <p className="mt-1">{credenciamento.companyAddress || "-"}</p>
                </div>
                <div>
                  <Label>Cidade</Label>
                  <p className="mt-1">{credenciamento.companyCity || "-"}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <p className="mt-1">{credenciamento.companyState || "-"}</p>
                </div>
                <div>
                  <Label>CEP</Label>
                  <p className="mt-1">{formatCEP(credenciamento.companyCep)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Análise de Documentos
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Revise e aprove/reprove cada documento individualmente
              </p>
            </CardHeader>
            <CardContent>
              {loadingDocs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc: any, index: number) => {
                    const fileName = doc.name || doc.url.split("/").pop() || `Documento ${index + 1}`;
                    const isProcessing = approvingDoc === doc.url;
                    const statusColors = {
                      PENDING: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-100" },
                      APPROVED: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", badge: "bg-green-100" },
                      REJECTED: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", badge: "bg-red-100" },
                    };
                    const style = statusColors[doc.status as keyof typeof statusColors] || statusColors.PENDING;

                    return (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-lg ${style.bg} ${style.border}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className={`h-5 w-5 ${style.text}`} />
                              <div className="flex-1">
                                <p className="font-medium">{decodeURIComponent(fileName)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={`${style.badge} ${style.text} border-0`}>
                                    {doc.status === "APPROVED" && "✅ Aprovado"}
                                    {doc.status === "REJECTED" && "❌ Reprovado"}
                                    {doc.status === "PENDING" && "⏳ Pendente"}
                                  </Badge>
                                  {doc.reviewedBy && (
                                    <span className="text-xs text-muted-foreground">
                                      por {doc.reviewedBy} • {formatDate(doc.reviewedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {doc.comment && (
                              <div className="mt-2 p-2 bg-white/50 rounded border">
                                <p className="text-sm text-gray-700">
                                  <strong>Observação:</strong> {doc.comment}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              asChild
                            >
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Visualizar
                              </a>
                            </Button>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const comment = prompt("Adicionar observação (opcional):");
                                  handleDocumentApproval(doc.url, "APPROVED", comment || undefined);
                                }}
                                disabled={isProcessing || doc.status === "APPROVED"}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {doc.status === "APPROVED" ? "Aprovado" : "Aprovar"}
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  const comment = prompt("Motivo da reprovação (opcional):");
                                  handleDocumentApproval(doc.url, "REJECTED", comment || undefined);
                                }}
                                disabled={isProcessing || doc.status === "REJECTED"}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {doc.status === "REJECTED" ? "Reprovado" : "Reprovar"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">Status da Análise de Documentos</h4>
                        <div className="mt-2 space-y-1 text-sm text-blue-800">
                          <p>✅ Aprovados: {documents.filter((d: any) => d.status === "APPROVED").length}</p>
                          <p>❌ Reprovados: {documents.filter((d: any) => d.status === "REJECTED").length}</p>
                          <p>⏳ Pendentes: {documents.filter((d: any) => d.status === "PENDING").length}</p>
                        </div>
                        {documents.every((d: any) => d.status !== "PENDING") && (
                          <p className="mt-3 font-medium text-green-700">
                            🎉 Todos os documentos foram analisados!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum documento anexado neste credenciamento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comunicação */}
        <TabsContent value="communication">
          <div className="space-y-4">
            {/* Formulário para enviar mensagem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Enviar Mensagem para a Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem para a empresa..."
                    rows={5}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Anexos (opcional)</Label>
                  <FileUpload
                    onFilesChange={setMessageAttachments}
                    maxFiles={5}
                    maxSizeMB={10}
                  />
                </div>

                <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isInternalNote"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isInternalNote" className="cursor-pointer">
                      📝 Nota interna (não será enviada por email)
                    </Label>
                  </div>

                  {!isInternalNote && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="notifyPendency"
                        checked={notifyPendency}
                        onChange={(e) => setNotifyPendency(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="notifyPendency" className="cursor-pointer">
                        ⚠️ Marcar como pendência (alertar empresa sobre documentos faltantes)
                      </Label>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSendMessage} 
                  disabled={sendingMessage || !newMessage.trim()}
                  className="w-full"
                >
                  {sendingMessage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {isInternalNote ? "Adicionar Nota Interna" : "Enviar Mensagem"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Histórico de mensagens */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Histórico de Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg: any) => {
                      const isAnalyst = msg.senderType === "ANALYST";
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg border ${
                            isAnalyst 
                              ? "bg-blue-50 border-blue-200 ml-8" 
                              : "bg-green-50 border-green-200 mr-8"
                          } ${msg.isInternal ? "border-dashed bg-gray-50" : ""}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isAnalyst ? "bg-blue-600" : "bg-green-600"
                              }`}>
                                {isAnalyst ? (
                                  <User className="h-4 w-4 text-white" />
                                ) : (
                                  <Building className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{msg.senderName}</p>
                                <p className="text-xs text-muted-foreground">{msg.senderEmail}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(msg.createdAt)}
                              </p>
                              {msg.isInternal && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  📝 Nota Interna
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-sm whitespace-pre-wrap mt-3">{msg.message}</p>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium mb-2">📎 Anexos:</p>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((url: string, idx: number) => {
                                  const fileName = url.split('/').pop() || `Arquivo ${idx + 1}`;
                                  return (
                                    <Button
                                      key={idx}
                                      size="sm"
                                      variant="outline"
                                      asChild
                                    >
                                      <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-3 w-3 mr-1" />
                                        {decodeURIComponent(fileName).substring(0, 30)}
                                      </a>
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma mensagem ainda. Envie a primeira mensagem para a empresa.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item: any) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Por: {item.userName || "Sistema"}
                        </p>
                        {item.oldValue && (
                          <p className="text-sm mt-1">
                            <span className="text-red-600 line-through">{item.oldValue}</span>
                            {" → "}
                            <span className="text-green-600">{item.newValue}</span>
                          </p>
                        )}
                        {item.comment && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            "{item.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum histórico disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
