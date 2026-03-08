"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import FileUpload from "@/components/file-upload";

export default function AbrirDemandaPublicaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);
  const [protocolNumber, setProtocolNumber] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIA",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterCpf: "",
    prefectureId: "",
    attachments: [] as string[],
  });

  useEffect(() => {
    loadPrefectures();
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        toast.error("Nome e email são obrigatórios");
        return;
      }

      if (!formData.prefectureId) {
        toast.error("Selecione uma prefeitura");
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.requesterEmail)) {
        toast.error("Email inválido");
        return;
      }

      const res = await fetch("/api/demands/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar demanda");
      }

      const data = await res.json();
      setProtocolNumber(data.protocolNumber);
      setSuccess(true);
      toast.success("Demanda criada com sucesso!");
      
      // Enviar email para consulta posterior
      toast.info("Você receberá um email com o número do protocolo");

    } catch (error: any) {
      toast.error(error.message || "Erro ao criar demanda");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Demanda Registrada com Sucesso!
          </h1>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Número do Protocolo:</p>
            <p className="text-4xl font-bold text-blue-600 tracking-wider">
              {protocolNumber}
            </p>
          </div>

          <div className="space-y-4 text-left bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">📋 Próximos Passos:</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✅ Você receberá um email de confirmação com o número do protocolo</p>
              <p>✅ Guarde este número para acompanhar sua demanda</p>
              <p>✅ Você será notificado sobre atualizações no status</p>
              <p>✅ Use o link abaixo para consultar sua demanda a qualquer momento</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push(`/consulta-protocolo?protocol=${protocolNumber}`)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Consultar Demanda
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Abrir Nova Demanda
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Acessar Sistema Interno →
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Abrir Nova Demanda
            </h1>
            <p className="text-gray-600">
              Preencha o formulário abaixo para registrar sua solicitação. 
              Você receberá um número de protocolo para acompanhamento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados da Demanda */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-900">Dados da Demanda</h2>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prefectureId">
                    Prefeitura <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.prefectureId}
                    onValueChange={(value) => handleChange("prefectureId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prefeitura..." />
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
                  <Label htmlFor="title">
                    Título da Demanda <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Solicitação de documento, dúvida sobre edital..."
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">
                    Descrição Detalhada <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua solicitação com o máximo de detalhes possível..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={6}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Quanto mais informações você fornecer, mais rápido poderemos atendê-lo
                  </p>
                </div>

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
                  <Label>Anexos (Opcional)</Label>
                  <FileUpload
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
                    maxFiles={5}
                    maxSizeMB={10}
                    publicUpload={true}
                  />
                  <p className="text-sm text-gray-500">
                    Anexe documentos, imagens ou arquivos relacionados à sua demanda
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Requerente */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-900">Seus Dados</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="requesterName">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterName"
                    placeholder="Seu nome completo"
                    value={formData.requesterName}
                    onChange={(e) => handleChange("requesterName", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterCpf">CPF</Label>
                  <Input
                    id="requesterCpf"
                    placeholder="000.000.000-00"
                    value={formData.requesterCpf}
                    onChange={(e) => handleChange("requesterCpf", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterEmail">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.requesterEmail}
                    onChange={(e) => handleChange("requesterEmail", e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Enviaremos atualizações para este email
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterPhone">Telefone</Label>
                  <Input
                    id="requesterPhone"
                    placeholder="(00) 00000-0000"
                    value={formData.requesterPhone}
                    onChange={(e) => handleChange("requesterPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Demanda
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
              >
                Cancelar
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">
                Já possui um protocolo?
              </p>
              <Link 
                href="/consulta-protocolo" 
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Consultar Status da Demanda →
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Acessar Sistema Interno
          </Link>
        </div>
      </div>
    </div>
  );
}
