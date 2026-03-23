"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, FileText, Building2, FileSignature, Mail, Phone, User, AlertCircle, Building, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import FileUpload from "@/components/file-upload";

type TabType = "demanda" | "credenciamento";

export default function AbrirDemandaPublicaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);
  const [protocolNumber, setProtocolNumber] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("demanda");

  // Form data para Demanda
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

  // Form data para Credenciamento
  const [credenciamentoData, setCredenciamentoData] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterCpf: "",
    requesterCnpj: "",
    companyName: "",
    tradeName: "",
    fantasyName: "",
    companyAddress: "",
    companyCity: "",
    companyState: "",
    companyCep: "",
    companyPhone: "",
    companyEmail: "",
    title: "",
    description: "",
    activityArea: "",
    requestedServices: "",
    priority: "MEDIA",
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

  const handleCredenciamentoChange = (field: string, value: string) => {
    setCredenciamentoData((prev) => ({ ...prev, [field]: value }));
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

      if (!formData.dotacao) {
        toast.error("Dotação orçamentária é obrigatória");
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

  const handleSubmitCredenciamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!credenciamentoData.companyName || !credenciamentoData.title || !credenciamentoData.description) {
        toast.error("Nome da empresa, título e descrição são obrigatórios");
        return;
      }

      if (!credenciamentoData.requesterName || !credenciamentoData.requesterEmail || !credenciamentoData.requesterPhone || !credenciamentoData.requesterCpf || !credenciamentoData.requesterCnpj) {
        toast.error("Todos os dados do solicitante são obrigatórios (nome, email, telefone, CPF e CNPJ)");
        return;
      }

      if (!credenciamentoData.companyAddress || !credenciamentoData.companyCity || !credenciamentoData.companyState || !credenciamentoData.companyCep || !credenciamentoData.companyPhone || !credenciamentoData.companyEmail) {
        toast.error("Todos os dados de endereço e contato da empresa são obrigatórios");
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credenciamentoData.requesterEmail)) {
        toast.error("Email inválido");
        return;
      }

      const res = await fetch("/api/credenciamentos/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credenciamentoData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar solicitação de credenciamento");
      }

      const data = await res.json();
      setProtocolNumber(data.protocolNumber);
      setSuccess(true);
      toast.success("Solicitação de credenciamento criada com sucesso!");
      
      // Enviar email para consulta posterior
      toast.info("Você receberá um email com o número do protocolo");

    } catch (error: any) {
      toast.error(error.message || "Erro ao criar solicitação de credenciamento");
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
              Solicitação Registrada com Sucesso!
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
                  <span>Guarde este número para acompanhar sua solicitação</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Você será notificado sobre atualizações no status</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Use o botão abaixo para consultar sua solicitação a qualquer momento</span>
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
                Consultar Solicitação
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="lg"
              >
                Nova Solicitação
              </Button>
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
            Nova Solicitação
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Escolha o tipo de solicitação e preencha o formulário abaixo. 
            Você receberá um número de protocolo para acompanhamento.
          </p>
        </div>

        <Card className="p-8 shadow-2xl">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-1 bg-gray-100">
              <TabsTrigger 
                value="demanda" 
                className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
              >
                <FileText className="h-4 w-4" />
                Demanda/Solicitação
              </TabsTrigger>
              <TabsTrigger 
                value="credenciamento" 
                className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
              >
                <Building className="h-4 w-4" />
                Credenciamento
              </TabsTrigger>
            </TabsList>

            {/* TAB: DEMANDA */}
            <TabsContent value="demanda">
              {/* Card Informativo - Demanda */}
              <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 shadow-md relative overflow-hidden">
                {/* Logo CIMAG como marca d'água */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 opacity-10">
                  <Image
                    src="/cimag-logo.png"
                    alt="CIMAG"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Demanda/Solicitação</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Use este formulário quando precisar solicitar documentos, esclarecimentos, suporte ou fazer qualquer 
                      tipo de solicitação relacionada a uma prefeitura específica do consórcio.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-600 hover:bg-blue-700">📄 Documentos</Badge>
                      <Badge className="bg-blue-600 hover:bg-blue-700">❓ Dúvidas</Badge>
                      <Badge className="bg-blue-600 hover:bg-blue-700">🤝 Suporte</Badge>
                      <Badge className="bg-blue-600 hover:bg-blue-700">📝 Solicitações Gerais</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados da Demanda */}
            <div className="space-y-6 bg-blue-50/30 p-6 rounded-xl border-l-4 border-blue-600">
              <div className="flex items-center gap-3 border-b border-blue-200 pb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                  <FileSignature className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dados da Solicitação</h2>
                  <p className="text-xs text-blue-600">Informações sobre o que você está solicitando</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prefectureId" className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Prefeitura <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.prefectureId}
                      onValueChange={(value) => handleChange("prefectureId", value)}
                    >
                      <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(prefectures) && prefectures
                          .filter((prefecture) => prefecture.id && prefecture.name)
                          .map((prefecture) => (
                            <SelectItem key={prefecture.id} value={prefecture.id}>
                              {prefecture.name} - {prefecture.city}/{prefecture.state}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority" className="text-sm font-semibold">Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleChange("priority", value)}
                    >
                      <SelectTrigger className="h-11 border-2 focus:border-blue-500">
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
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title" className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Título da Solicitação <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Solicitação de certidão negativa, dúvida sobre processo licitatório..."
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Descrição Detalhada <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua solicitação: o que você precisa, para qual finalidade, prazo esperado e informações relevantes"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={5}
                    required
                    className="resize-none border-2 focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-semibold">Anexos (Opcional)</Label>
                  <FileUpload
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
                    maxFiles={5}
                    maxSizeMB={10}
                    publicUpload={true}
                  />
                  <p className="text-xs text-gray-500">
                    Máx. 5 arquivos, 10MB cada
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Requerente */}
            <div className="space-y-6 bg-green-50/30 p-6 rounded-xl border-l-4 border-green-600">
              <div className="flex items-center gap-3 border-b border-green-200 pb-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Seus Dados</h2>
                  <p className="text-xs text-green-600">Para contato e acompanhamento da solicitação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="requesterName" className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-green-600" />
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterName"
                    placeholder="Digite seu nome completo"
                    value={formData.requesterName}
                    onChange={(e) => handleChange("requesterName", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterCpf" className="text-sm font-semibold">CPF</Label>
                  <Input
                    id="requesterCpf"
                    placeholder="000.000.000-00"
                    value={formData.requesterCpf}
                    onChange={(e) => handleChange("requesterCpf", e.target.value)}
                    className="h-11 border-2 focus:border-green-500 font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dotacao" className="text-sm font-semibold">
                    Dotação Orçamentária <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dotacao"
                    placeholder="Ex: 3.3.90.39.00 ou 4.4.90.52.00"
                    value={formData.dotacao}
                    onChange={(e) => handleChange("dotacao", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500 font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterEmail" className="flex items-center gap-2 text-sm font-semibold">
                    <Mail className="h-4 w-4 text-green-600" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.requesterEmail}
                    onChange={(e) => handleChange("requesterEmail", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterPhone" className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-green-600" />
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterPhone"
                    placeholder="(00) 00000-0000"
                    value={formData.requesterPhone}
                    onChange={(e) => handleChange("requesterPhone", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500 font-mono"
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
                    Enviar Solicitação
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
                Consultar Status da Solicitação →
              </Link>
            </div>
          </form>
        </TabsContent>

        {/* TAB: CREDENCIAMENTO */}
        <TabsContent value="credenciamento">
          {/* Card Informativo - Credenciamento */}
          <div className="mb-8 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-6 shadow-md relative overflow-hidden">
            {/* Logo CIMAG como marca d'água */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 opacity-10">
              <Image
                src="/cimag-logo.png"
                alt="CIMAG"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-900 mb-2">Credenciamento de Empresa</h3>
                <p className="text-sm text-purple-800 mb-3">
                  Use este formulário se você representa uma empresa que deseja se credenciar para fornecer 
                  produtos ou serviços ao consórcio. Será necessário anexar documentação completa da empresa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-purple-600 hover:bg-purple-700">🏢 Fornecedores</Badge>
                  <Badge className="bg-purple-600 hover:bg-purple-700">🤝 Prestadores de Serviço</Badge>
                  <Badge className="bg-purple-600 hover:bg-purple-700">📋 Cadastro de Empresa</Badge>
                  <Badge className="bg-purple-600 hover:bg-purple-700">✅ Habilitação</Badge>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitCredenciamento} className="space-y-8">
            {/* Dados da Empresa */}
            <div className="space-y-6 bg-purple-50/30 p-6 rounded-xl border-l-4 border-purple-600">
              <div className="flex items-center gap-3 border-b border-purple-200 pb-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dados da Empresa</h2>
                  <p className="text-xs text-purple-600">Informações cadastrais e de localização</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2 text-sm font-semibold">
                    <Building className="h-4 w-4 text-purple-600" />
                    Razão Social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Razão social conforme CNPJ"
                    value={credenciamentoData.companyName}
                    onChange={(e) => handleCredenciamentoChange("companyName", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tradeName" className="text-sm font-semibold">Nome Fantasia</Label>
                  <Input
                    id="tradeName"
                    placeholder="Nome comercial da empresa"
                    value={credenciamentoData.tradeName}
                    onChange={(e) => handleCredenciamentoChange("tradeName", e.target.value)}
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterCnpj" className="text-sm font-semibold">CNPJ <span className="text-red-500">*</span></Label>
                  <Input
                    id="requesterCnpj"
                    placeholder="00.000.000/0000-00"
                    value={credenciamentoData.requesterCnpj}
                    onChange={(e) => handleCredenciamentoChange("requesterCnpj", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="activityArea" className="text-sm font-semibold">Área de Atuação</Label>
                  <Input
                    id="activityArea"
                    placeholder="Ex: Tecnologia, Saúde, Educação..."
                    value={credenciamentoData.activityArea}
                    onChange={(e) => handleCredenciamentoChange("activityArea", e.target.value)}
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2 grid gap-2">
                  <Label htmlFor="companyAddress" className="text-sm font-semibold">Endereço Completo <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyAddress"
                    placeholder="Rua/Avenida, número, complemento, bairro"
                    value={credenciamentoData.companyAddress}
                    onChange={(e) => handleCredenciamentoChange("companyAddress", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyCity" className="text-sm font-semibold">Cidade <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyCity"
                    placeholder="Nome da cidade"
                    value={credenciamentoData.companyCity}
                    onChange={(e) => handleCredenciamentoChange("companyCity", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyState" className="text-sm font-semibold">Estado <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyState"
                      placeholder="UF"
                      value={credenciamentoData.companyState}
                      onChange={(e) => handleCredenciamentoChange("companyState", e.target.value.toUpperCase())}
                      required
                      maxLength={2}
                      className="h-11 border-2 focus:border-purple-500 uppercase font-semibold text-center"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyCep" className="text-sm font-semibold">CEP <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyCep"
                      placeholder="00000-000"
                      value={credenciamentoData.companyCep}
                      onChange={(e) => handleCredenciamentoChange("companyCep", e.target.value)}
                      required
                      className="h-11 border-2 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyPhone" className="text-sm font-semibold">Telefone da Empresa <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyPhone"
                    placeholder="(00) 00000-0000"
                    value={credenciamentoData.companyPhone}
                    onChange={(e) => handleCredenciamentoChange("companyPhone", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyEmail" className="text-sm font-semibold">Email da Empresa <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={credenciamentoData.companyEmail}
                    onChange={(e) => handleCredenciamentoChange("companyEmail", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Credenciamento */}
            <div className="space-y-6 bg-indigo-50/30 p-6 rounded-xl border-l-4 border-indigo-600">
              <div className="flex items-center gap-3 border-b border-indigo-200 pb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Informações do Credenciamento</h2>
                  <p className="text-xs text-indigo-600">Serviços e produtos que sua empresa oferece</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title-cred" className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Título do Credenciamento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title-cred"
                    placeholder="Ex: Credenciamento para fornecimento de equipamentos de informática"
                    value={credenciamentoData.title}
                    onChange={(e) => handleCredenciamentoChange("title", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-indigo-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description-cred" className="text-sm font-semibold">
                    Descrição Detalhada <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description-cred"
                    placeholder="Inclua: atividades principais, tempo de atuação, principais clientes, diferenciais competitivos, capacidade de atendimento"
                    value={credenciamentoData.description}
                    onChange={(e) => handleCredenciamentoChange("description", e.target.value)}
                    rows={5}
                    required
                    className="resize-none border-2 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="requestedServices" className="text-sm font-semibold">Serviços/Produtos Solicitados</Label>
                    <Textarea
                      id="requestedServices"
                      placeholder="Liste os produtos e serviços que pretende fornecer"
                      value={credenciamentoData.requestedServices}
                      onChange={(e) => handleCredenciamentoChange("requestedServices", e.target.value)}
                      rows={4}
                      className="resize-none border-2 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority-cred" className="text-sm font-semibold">Prioridade</Label>
                    <Select
                      value={credenciamentoData.priority}
                      onValueChange={(value) => handleCredenciamentoChange("priority", value)}
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
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-semibold">Documentos Anexos <span className="text-red-500">*</span></Label>
                  <FileUpload
                    onFilesChange={(files) => setCredenciamentoData(prev => ({ ...prev, attachments: files }))}
                    maxFiles={10}
                    maxSizeMB={10}
                    publicUpload={true}
                  />
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-amber-900 mb-1">📄 Documentos Necessários:</p>
                    <ul className="text-xs text-amber-800 space-y-0.5 ml-4 list-disc">
                      <li>Contrato Social ou Estatuto</li>
                      <li>Cartão CNPJ atualizado</li>
                      <li>Certidões negativas (Federal, Estadual, Municipal)</li>
                      <li>Certidão de Regularidade do FGTS</li>
                      <li>Certidão Negativa Trabalhista</li>
                      <li>Alvará de Funcionamento (se aplicável)</li>
                      <li>Certificados ou Licenças (se aplicável)</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-1">ⓘ Máx. 10 arquivos, 10MB cada</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do Responsável */}
            <div className="space-y-6 bg-green-50/30 p-6 rounded-xl border-l-4 border-green-600">
              <div className="flex items-center gap-3 border-b border-green-200 pb-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dados do Responsável</h2>
                  <p className="text-xs text-green-600">Pessoa responsável pelo credenciamento</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="requesterName-cred" className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-green-600" />
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterName-cred"
                    placeholder="Nome completo do responsável legal"
                    value={credenciamentoData.requesterName}
                    onChange={(e) => handleCredenciamentoChange("requesterName", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterCpf-cred" className="text-sm font-semibold">CPF <span className="text-red-500">*</span></Label>
                  <Input
                    id="requesterCpf-cred"
                    placeholder="000.000.000-00"
                    value={credenciamentoData.requesterCpf}
                    onChange={(e) => handleCredenciamentoChange("requesterCpf", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500 font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterEmail-cred" className="flex items-center gap-2 text-sm font-semibold">
                    <Mail className="h-4 w-4 text-green-600" />
                    Email do Responsável <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterEmail-cred"
                    type="email"
                    placeholder="responsavel@empresa.com.br"
                    value={credenciamentoData.requesterEmail}
                    onChange={(e) => handleCredenciamentoChange("requesterEmail", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requesterPhone-cred" className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-green-600" />
                    Telefone do Responsável <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requesterPhone-cred"
                    placeholder="(00) 00000-0000"
                    value={credenciamentoData.requesterPhone}
                    onChange={(e) => handleCredenciamentoChange("requesterPhone", e.target.value)}
                    required
                    className="h-11 border-2 focus:border-green-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-base font-semibold"
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
                    Enviar Credenciamento
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
                Consultar Status da Solicitação →
              </Link>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  </div>
</div>
);
}
