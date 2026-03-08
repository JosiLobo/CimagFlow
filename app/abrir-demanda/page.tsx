"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, FileText, Building2, FileSignature, Mail, Phone, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
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
    dotacao: "",
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
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0D2340] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <Image
                src="/cimag-logo.png"
                alt="CIMAG Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>

          <Card className="p-8 text-center shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Demanda Registrada com Sucesso!
            </h1>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 mb-6 shadow-md">
              <p className="text-sm text-gray-600 mb-2 font-medium">Número do Protocolo:</p>
              <p className="text-4xl font-bold text-blue-700 tracking-wider font-mono">
                {protocolNumber}
              </p>
            </div>

            <div className="space-y-4 text-left bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Próximos Passos:
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Você receberá um email de confirmação com o número do protocolo</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Guarde este número para acompanhar sua demanda</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Você será notificado sobre atualizações no status</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Use o botão abaixo para consultar sua demanda a qualquer momento</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push(`/consulta-protocolo?protocol=${protocolNumber}`)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <FileText className="h-4 w-4" />
                Consultar Demanda
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="lg"
              >
                Abrir Nova Demanda
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Link href="/login" className="text-sm text-blue-600 hover:underline font-medium">
                Acessar Sistema Interno →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0D2340] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <Image
              src="/cimag-logo.png"
              alt="CIMAG Logo"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Abrir Nova Demanda
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Preencha o formulário abaixo para registrar sua solicitação. 
            Você receberá um número de protocolo para acompanhamento.
          </p>
        </div>

        <Card className="p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados da Demanda */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileSignature className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Dados da Demanda</h2>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="prefectureId" className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    Prefeitura <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.prefectureId}
                    onValueChange={(value) => handleChange("prefectureId", value)}
                  >
                    <SelectTrigger className="h-11">
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

                <div className="grid gap-3">
                  <Label htmlFor="title" className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Título da Demanda <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Solicitação de documento, dúvida sobre edital..."
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="description" className="text-base">
                    Descrição Detalhada <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua solicitação com o máximo de detalhes possível..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={6}
                    required
                    className="resize-none"
                  />
                  <p className="text-sm text-gray-500 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Quanto mais informações você fornecer, mais rápido poderemos atendê-lo
                  </p>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="priority" className="text-base">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione a prioridade..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">🟢 Baixa</SelectItem>
                      <SelectItem value="MEDIA">🔵 Média</SelectItem>
                      <SelectItem value="ALTA">🟠 Alta</SelectItem>
                      <SelectItem value="URGENTE">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <Label className="text-base">Anexos (Opcional)</Label>
                  <FileUpload
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
                    maxFiles={5}
                    maxSizeMB={10}
                    publicUpload={true}
                  />
                  <p className="text-sm text-gray-500">
                    Anexe documentos, imagens ou arquivos relacionados à sua demanda (máx. 5 arquivos, 10MB cada)
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Requerente */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Seus Dados</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="requesterName" className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-gray-500" />
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterName"
                    placeholder="Seu nome completo"
                    value={formData.requesterName}
                    onChange={(e) => handleChange("requesterName", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="requesterCpf" className="text-base">CPF</Label>
                  <Input
                    id="requesterCpf"
                    placeholder="000.000.000-00"
                    value={formData.requesterCpf}
                    onChange={(e) => handleChange("requesterCpf", e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="dotacao" className="text-base">Dotação Orçamentária</Label>
                  <Input
                    id="dotacao"
                    placeholder="Ex: 3.3.90.39.00"
                    value={formData.dotacao}
                    onChange={(e) => handleChange("dotacao", e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="requesterEmail" className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.requesterEmail}
                    onChange={(e) => handleChange("requesterEmail", e.target.value)}
                    required
                    className="h-11"
                  />
                  <p className="text-sm text-gray-500">
                    Enviaremos atualizações para este email
                  </p>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="requesterPhone" className="flex items-center gap-2 text-base">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Telefone
                  </Label>
                  <Input
                    id="requesterPhone"
                    placeholder="(00) 00000-0000"
                    value={formData.requesterPhone}
                    onChange={(e) => handleChange("requesterPhone", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Enviar Demanda
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="h-12 text-base"
                size="lg"
              >
                Cancelar
              </Button>
            </div>

            <div className="text-center pt-6 border-t bg-gray-50 -mx-8 -mb-8 px-8 py-6 rounded-b-lg">
              <p className="text-sm text-gray-600 mb-3 font-medium">
                Já possui um protocolo?
              </p>
              <Link 
                href="/consulta-protocolo" 
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline"
              >
                <FileText className="h-4 w-4" />
                Consultar Status da Demanda →
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Acessar Sistema Interno
          </Link>
        </div>
      </div>
    </div>
  );
}
