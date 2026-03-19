"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

const statusConfig = {
  PENDENTE: { label: "Pendente", icon: FileText, color: "bg-blue-500" },
  EM_ANALISE: { label: "Em Análise", icon: Clock, color: "bg-yellow-500" },
  APROVADO: { label: "Aprovado", icon: CheckCircle2, color: "bg-green-500" },
  REPROVADO: { label: "Reprovado", icon: XCircle, color: "bg-red-500" },
  CANCELADO: { label: "Cancelado", icon: AlertCircle, color: "bg-gray-500" },
};

const priorityConfig = {
  BAIXA: { label: "Baixa", color: "bg-gray-500" },
  MEDIA: { label: "Média", color: "bg-blue-500" },
  ALTA: { label: "Alta", color: "bg-orange-500" },
  URGENTE: { label: "Urgente", color: "bg-red-500" },
};

export default function CredenciamentosPage() {
  const router = useRouter();
  const [credenciamentos, setCredenciamentos] = useState<any[]>([]);
  const [filteredCredenciamentos, setFilteredCredenciamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [prefectureFilter, setPrefectureFilter] = useState("ALL");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadCredenciamentos();
    loadPrefectures();
  }, []);

  useEffect(() => {
    filterCredenciamentos();
  }, [credenciamentos, debouncedSearch, statusFilter, priorityFilter, prefectureFilter]);

  const loadCredenciamentos = async () => {
    try {
      const res = await fetch("/api/credenciamentos");
      if (!res.ok) throw new Error("Erro ao carregar credenciamentos");
      const data = await res.json();
      const credenciamentosList = Array.isArray(data.credenciamentos) ? data.credenciamentos : [];
      setCredenciamentos(credenciamentosList);
      
      // Calcular estatísticas
      const statsData = {
        total: data.total || 0,
        pendentes: credenciamentosList.filter((c: any) => c.status === "PENDENTE").length,
        emAnalise: credenciamentosList.filter((c: any) => c.status === "EM_ANALISE").length,
        aprovados: credenciamentosList.filter((c: any) => c.status === "APROVADO").length,
        reprovados: credenciamentosList.filter((c: any) => c.status === "REPROVADO").length,
      };
      setStats(statsData);
    } catch (error) {
      toast.error("Erro ao carregar credenciamentos");
      setCredenciamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPrefectures = async () => {
    try {
      const res = await fetch("/api/prefectures");
      if (res.ok) {
        const data = await res.json();
        setPrefectures(Array.isArray(data) ? data : []);
      } else {
        setPrefectures([]);
      }
    } catch (error) {
      console.error("Erro ao carregar prefeituras:", error);
      setPrefectures([]);
    }
  };

  const filterCredenciamentos = () => {
    let filtered = [...credenciamentos];

    if (debouncedSearch) {
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.protocolNumber?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.requesterName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.companyName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.cnpj?.includes(debouncedSearch)
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (priorityFilter !== "ALL") {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    if (prefectureFilter !== "ALL") {
      filtered = filtered.filter((c) => c.prefectureId === prefectureFilter);
    }

    setFilteredCredenciamentos(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return "-";
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando credenciamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Credenciamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os credenciamentos de empresas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
                <p className="text-2xl font-bold">{stats.emAnalise}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold">{stats.aprovados}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reprovados</p>
                <p className="text-2xl font-bold">{stats.reprovados}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por protocolo, empresa, CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="REPROVADO">Reprovado</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Prioridades</SelectItem>
              <SelectItem value="BAIXA">Baixa</SelectItem>
              <SelectItem value="MEDIA">Média</SelectItem>
              <SelectItem value="ALTA">Alta</SelectItem>
              <SelectItem value="URGENTE">Urgente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={prefectureFilter} onValueChange={setPrefectureFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Prefeitura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Prefeituras</SelectItem>
              {prefectures
                .filter((prefecture) => prefecture.id && prefecture.name)
                .map((prefecture) => (
                  <SelectItem key={prefecture.id} value={prefecture.id}>
                    {prefecture.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Credenciamentos List */}
      <div className="space-y-4">
        {filteredCredenciamentos.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "ALL" || priorityFilter !== "ALL" || prefectureFilter !== "ALL"
                ? "Nenhum credenciamento encontrado com os filtros aplicados"
                : "Nenhum credenciamento cadastrado"}
            </p>
          </Card>
        ) : (
          filteredCredenciamentos.map((cred) => {
            const StatusIcon = statusConfig[cred.status as keyof typeof statusConfig]?.icon || FileText;
            const statusColor = statusConfig[cred.status as keyof typeof statusConfig]?.color || "bg-gray-500";
            const priorityColor = priorityConfig[cred.priority as keyof typeof priorityConfig]?.color || "bg-gray-500";

            return (
              <Card
                key={cred.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/credenciamentos/${cred.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${statusColor} bg-opacity-10`}>
                        <StatusIcon className={`h-5 w-5 ${statusColor.replace("bg-", "text-")}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{cred.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Protocolo: {cred.protocolNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa</p>
                        <p className="font-medium">{cred.companyName}</p>
                        {cred.requesterCnpj && (
                          <p className="text-sm text-muted-foreground">{formatCNPJ(cred.requesterCnpj)}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Solicitante</p>
                        <p className="font-medium">{cred.requesterName}</p>
                        {cred.requesterEmail && (
                          <p className="text-sm text-muted-foreground">{cred.requesterEmail}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Prefeitura</p>
                        <p className="font-medium">{cred.prefecture?.name || "-"}</p>
                        {cred.prefecture?.city && (
                          <p className="text-sm text-muted-foreground">{cred.prefecture.city}</p>
                        )}
                      </div>
                    </div>

                    {cred.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {cred.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${statusColor} text-white`}>
                      {statusConfig[cred.status as keyof typeof statusConfig]?.label || cred.status}
                    </Badge>
                    <Badge className={`${priorityColor} text-white`}>
                      {priorityConfig[cred.priority as keyof typeof priorityConfig]?.label || cred.priority}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(cred.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
