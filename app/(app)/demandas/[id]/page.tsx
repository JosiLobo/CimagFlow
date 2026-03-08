"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Clock, User, Mail, Phone, Building2, Calendar, FileText, Trash2, Paperclip, Download, Upload, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const statusConfig = {
  ABERTA: { label: "Aberta", color: "bg-blue-500" },
  EM_ANALISE: { label: "Em Análise", color: "bg-yellow-500" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "bg-orange-500" },
  AGUARDANDO_RESPOSTA: { label: "Aguardando", color: "bg-purple-500" },
  CONCLUIDA: { label: "Concluída", color: "bg-green-500" },
  CANCELADA: { label: "Cancelada", color: "bg-red-500" },
};

const priorityConfig = {
  BAIXA: { label: "Baixa", color: "bg-gray-500" },
  MEDIA: { label: "Média", color: "bg-blue-500" },
  ALTA: { label: "Alta", color: "bg-orange-500" },
  URGENTE: { label: "Urgente", color: "bg-red-500" },
};

export default function DemandaDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [demand, setDemand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [editData, setEditData] = useState({
    status: "",
    priority: "",
    assignedToId: "",
    resolution: "",
    internalNotes: "",
  });

  const [responseFiles, setResponseFiles] = useState<string[]>([]);
  const [responseComment, setResponseComment] = useState("");
  const [uploadingResponse, setUploadingResponse] = useState(false);

  useEffect(() => {
    loadDemand();
    loadUsers();
  }, [params.id]);

  const loadDemand = async () => {
    try {
      const res = await fetch(`/api/demands/${params.id}`);
      if (!res.ok) throw new Error("Erro ao carregar demanda");
      const data = await res.json();
      setDemand(data);
      setEditData({
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedToId || "",
        resolution: data.resolution || "",
        internalNotes: data.internalNotes || "",
      });
    } catch (error) {
      toast.error("Erro ao carregar demanda");
      router.push("/demandas");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/collaborators");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/demands/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error("Erro ao atualizar demanda");

      const updated = await res.json();
      setDemand(updated);
      setEditing(false);
      toast.success("Demanda atualizada com sucesso!");
      loadDemand(); // Recarregar para pegar histórico atualizado
    } catch (error) {
      toast.error("Erro ao atualizar demanda");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/demands/${params.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao deletar demanda");

      toast.success("Demanda deletada com sucesso!");
      router.push("/demandas");
    } catch (error) {
      toast.error("Erro ao deletar demanda");
    }
  };

  const getFileName = (url: string) => {
    const parts = url.split("/");
    const fileNameWithParams = parts[parts.length - 1];
    return decodeURIComponent(fileNameWithParams.split("?")[0]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingResponse(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Get presigned URL
        const presignedRes = await fetch("/api/upload/presigned-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!presignedRes.ok) throw new Error("Erro ao obter URL de upload");

        const { url, fileUrl } = await presignedRes.json();

        // Upload to S3
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) throw new Error("Erro ao fazer upload do arquivo");
        uploadedUrls.push(fileUrl);
      }

      setResponseFiles([...responseFiles, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} arquivo(s) adicionado(s)`);
    } catch (error) {
      toast.error("Erro ao fazer upload dos arquivos");
    } finally {
      setUploadingResponse(false);
    }
  };

  const handleSendResponse = async () => {
    if (responseFiles.length === 0 && !responseComment.trim()) {
      toast.error("Adicione arquivos ou um comentário para enviar a resposta");
      return;
    }

    setUploadingResponse(true);
    try {
      const res = await fetch(`/api/demands/${params.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseAttachments: responseFiles,
          responseComment: responseComment.trim(),
        }),
      });

      if (!res.ok) throw new Error("Erro ao enviar resposta");

      toast.success("Resposta enviada com sucesso! O solicitante será notificado por email.");
      setResponseFiles([]);
      setResponseComment("");
      loadDemand(); // Recarregar para mostrar a resposta
    } catch (error) {
      toast.error("Erro ao enviar resposta");
    } finally {
      setUploadingResponse(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando demanda...</p>
        </div>
      </div>
    );
  }

  if (!demand) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono">
                {demand.protocolNumber}
              </Badge>
              <Badge className={priorityConfig[demand.priority as keyof typeof priorityConfig].color}>
                {priorityConfig[demand.priority as keyof typeof priorityConfig].label}
              </Badge>
              <Badge className={statusConfig[demand.status as keyof typeof statusConfig].color}>
                {statusConfig[demand.status as keyof typeof statusConfig].label}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">{demand.title}</h1>
            <p className="text-muted-foreground">
              Criada em {formatDateTime(demand.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar esta demanda? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Descrição</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {demand.description}
            </p>
          </Card>

          {/* Arquivos Enviados pelo Solicitante */}
          {demand.attachments && demand.attachments.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Arquivos Enviados
              </h2>
              <div className="grid gap-3">
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
            </Card>
          )}

          {/* Resposta e Upload de Documentos */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Enviar Resposta / Documentos
            </h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Comentário da Resposta</Label>
                <Textarea
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder="Adicione um comentário ou instruções sobre os documentos enviados..."
                  rows={4}
                  disabled={uploadingResponse}
                />
              </div>

              <div className="grid gap-2">
                <Label>Upload de Arquivos (Contratos, Documentos)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="response-file-upload"
                    disabled={uploadingResponse}
                  />
                  <label
                    htmlFor="response-file-upload"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Clique para fazer upload</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, XLSX, imagens e mais
                      </p>
                    </div>
                  </label>
                </div>

                {/* Lista de arquivos adicionados */}
                {responseFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {responseFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-accent rounded text-sm"
                      >
                        <FileText className="h-4 w-4 text-green-500" />
                        <span className="flex-1 truncate">{getFileName(file)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResponseFiles(responseFiles.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSendResponse}
                disabled={uploadingResponse || (responseFiles.length === 0 && !responseComment.trim())}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                {uploadingResponse ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </Card>

          {/* Resposta Anterior (se houver) */}
          {demand.responseComment && (
            <Card className="p-6 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <h2 className="text-xl font-semibold mb-4">Resposta Enviada</h2>
              <p className="whitespace-pre-wrap text-muted-foreground mb-4">
                {demand.responseComment}
              </p>
              {demand.responseAttachments && demand.responseAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documentos Anexados:</p>
                  <div className="grid gap-2">
                    {demand.responseAttachments.map((file: string, index: number) => (
                      <a
                        key={index}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors bg-white dark:bg-gray-900"
                      >
                        <FileText className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate">{getFileName(file)}</span>
                        <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Atualização de Status */}
          {editing && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Atualizar Demanda</h2>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={editData.status}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={editData.priority}
                      onValueChange={(value) => setEditData({ ...editData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Responsável</Label>
                  <Select
                    value={editData.assignedToId}
                    onValueChange={(value) => setEditData({ ...editData, assignedToId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(users) && users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} - {user.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Resolução</Label>
                  <Textarea
                    value={editData.resolution}
                    onChange={(e) => setEditData({ ...editData, resolution: e.target.value })}
                    placeholder="Descreva a resolução da demanda..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Notas Internas</Label>
                  <Textarea
                    value={editData.internalNotes}
                    onChange={(e) => setEditData({ ...editData, internalNotes: e.target.value })}
                    placeholder="Notas visíveis apenas internamente..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Resolução */}
          {demand.resolution && !editing && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Resolução</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {demand.resolution}
              </p>
            </Card>
          )}

          {/* Histórico */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico</h2>
            <div className="space-y-4">
              {demand.history && demand.history.length > 0 ? (
                demand.history.map((item: any, index: number) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {index < demand.history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.userName}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <Badge variant="outline" className="mb-2">
                        {item.action}
                      </Badge>
                      {item.comment && (
                        <p className="text-sm text-muted-foreground">{item.comment}</p>
                      )}
                      {item.oldValue && item.newValue && (
                        <p className="text-sm text-muted-foreground">
                          {item.oldValue} → {item.newValue}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum histórico disponível</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações do Requerente */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Requerente</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{demand.requesterName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${demand.requesterEmail}`}
                  className="text-sm text-blue-500 hover:underline"
                >
                  {demand.requesterEmail}
                </a>
              </div>
              {demand.requesterPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{demand.requesterPhone}</p>
                </div>
              )}
              {demand.requesterCpf && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{demand.requesterCpf}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Prefeitura */}
          {demand.prefecture && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Prefeitura</h2>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{demand.prefecture.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {demand.prefecture.city}/{demand.prefecture.state}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Responsável */}
          {demand.assignedTo && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Responsável</h2>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={demand.assignedTo.photo} />
                  <AvatarFallback>{getInitials(demand.assignedTo.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{demand.assignedTo.name}</p>
                  <p className="text-xs text-muted-foreground">{demand.assignedTo.email}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Datas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informações</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Criada em</p>
                <p className="text-sm">{formatDateTime(demand.createdAt)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Atualizada em</p>
                <p className="text-sm">{formatDateTime(demand.updatedAt)}</p>
              </div>
              {demand.dueDate && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data Limite</p>
                    <p className="text-sm">{formatDate(demand.dueDate)}</p>
                  </div>
                </>
              )}
              {demand.resolvedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resolvida em</p>
                    <p className="text-sm">{formatDateTime(demand.resolvedAt)}</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
