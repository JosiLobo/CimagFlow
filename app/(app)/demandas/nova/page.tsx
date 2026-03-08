"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import FileUpload from "@/components/file-upload";

export default function NovaDemandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIA",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterCpf: "",
    dotacao: "",
    prefectureId: "",
    assignedToId: "",
    dueDate: "",
    attachments: [] as string[],
  });

  useEffect(() => {
    loadPrefectures();
    loadUsers();
  }, []);

  const loadPrefectures = async () => {
    try {
      const res = await fetch("/api/prefectures");
      if (res.ok) {
        const data = await res.json();
        setPrefectures(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar prefeituras:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.title || !formData.description) {
        toast.error("Título e descrição são obrigatórios");
        return;
      }

      if (!formData.requesterName || !formData.requesterEmail) {
        toast.error("Nome e email do requerente são obrigatórios");
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.requesterEmail)) {
        toast.error("Email inválido");
        return;
      }

      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar demanda");
      }

      const demand = await res.json();
      toast.success(`Demanda criada com sucesso! Protocolo: ${demand.protocolNumber}`);
      router.push(`/demandas/${demand.id}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar demanda");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Demanda</h1>
          <p className="text-muted-foreground">
            Registre uma nova demanda no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Informações da Demanda */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Informações da Demanda</h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ex: Solicitação de infraestrutura"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Descreva a demanda em detalhes..."
                  rows={5}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                  >
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
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Data Limite</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Informações do Requerente */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Informações do Requerente</h2>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="requesterName">Nome Completo *</Label>
                  <Input
                    id="requesterName"
                    value={formData.requesterName}
                    onChange={(e) => handleChange("requesterName", e.target.value)}
                    placeholder="Nome do requerente"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterEmail">Email *</Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    value={formData.requesterEmail}
                    onChange={(e) => handleChange("requesterEmail", e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="requesterPhone">Telefone</Label>
                  <Input
                    id="requesterPhone"
                    type="tel"
                    value={formData.requesterPhone}
                    onChange={(e) => handleChange("requesterPhone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterCpf">CPF</Label>
                  <Input
                    id="requesterCpf"
                    value={formData.requesterCpf}
                    onChange={(e) => handleChange("requesterCpf", e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dotacao">Dotação Orçamentária</Label>
                <Input
                  id="dotacao"
                  value={formData.dotacao}
                  onChange={(e) => handleChange("dotacao", e.target.value)}
                  placeholder="Ex: 3.3.90.39.00"
                />
              </div>
            </div>
          </Card>

          {/* Atribuição */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Atribuição</h2>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prefectureId">Prefeitura</Label>
                  <Select
                    value={formData.prefectureId}
                    onValueChange={(value) => handleChange("prefectureId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(prefectures) && prefectures.map((prefecture) => (
                        <SelectItem key={prefecture.id} value={prefecture.id}>
                          {prefecture.name} - {prefecture.city}/{prefecture.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assignedToId">Responsável</Label>
                  <Select
                    value={formData.assignedToId}
                    onValueChange={(value) => handleChange("assignedToId", value)}
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
                  <Label>Anexos</Label>
                  <FileUpload
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
                    maxFiles={5}
                    maxSizeMB={10}
                    publicUpload={false}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Demanda
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
