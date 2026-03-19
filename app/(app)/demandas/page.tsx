"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

const statusConfig = {
  ABERTA: { label: "Aberta", icon: FileText, color: "bg-blue-500" },
  EM_ANALISE: { label: "Em Análise", icon: Clock, color: "bg-yellow-500" },
  EM_ANDAMENTO: { label: "Em Andamento", icon: AlertCircle, color: "bg-orange-500" },
  AGUARDANDO_RESPOSTA: { label: "Aguardando", icon: Clock, color: "bg-purple-500" },
  CONCLUIDA: { label: "Concluída", icon: CheckCircle2, color: "bg-green-500" },
  CANCELADA: { label: "Cancelada", icon: XCircle, color: "bg-red-500" },
};

const priorityConfig = {
  BAIXA: { label: "Baixa", color: "bg-gray-500" },
  MEDIA: { label: "Média", color: "bg-blue-500" },
  ALTA: { label: "Alta", color: "bg-orange-500" },
  URGENTE: { label: "Urgente", color: "bg-red-500" },
};

export default function DemandasPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<any[]>([]);
  const [filteredDemands, setFilteredDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [prefectures, setPrefectures] = useState<any[]>([]);
  const [prefectureFilter, setPrefectureFilter] = useState("ALL");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDemands();
    loadPrefectures();
    loadStats();
  }, []);

  useEffect(() => {
    filterDemands();
  }, [demands, debouncedSearch, statusFilter, priorityFilter, prefectureFilter]);

  const loadDemands = async () => {
    try {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Erro ao carregar demandas");
      const data = await res.json();
      setDemands(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar demandas");
      setDemands([]);
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

  const loadStats = async () => {
    try {
      const res = await fetch("/api/demands/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const filterDemands = () => {
    let filtered = [...demands];

    if (debouncedSearch) {
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          d.protocolNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          d.requesterName.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    if (priorityFilter !== "ALL") {
      filtered = filtered.filter((d) => d.priority === priorityFilter);
    }

    if (prefectureFilter !== "ALL") {
      filtered = filtered.filter((d) => d.prefectureId === prefectureFilter);
    }

    setFilteredDemands(filtered);
  };

  const getStatusCount = (status: string) => {
    return demands.filter((d) => d.status === status).length;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando demandas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demandas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as demandas e solicitações
          </p>
        </div>
        <Button onClick={() => router.push("/demandas/nova")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Demanda
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Abertas</p>
                <h3 className="text-2xl font-bold">{stats.byStatus.ABERTA}</h3>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                <h3 className="text-2xl font-bold">
                  {stats.byStatus.EM_ANALISE + stats.byStatus.EM_ANDAMENTO}
                </h3>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <h3 className="text-2xl font-bold">{stats.byStatus.CONCLUIDA}</h3>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por protocolo, título ou requerente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Prioridades</SelectItem>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prefectureFilter} onValueChange={setPrefectureFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Prefeitura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Prefeituras</SelectItem>
              {Array.isArray(prefectures) && prefectures
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

      {/* Demands Board */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredDemands.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma demanda encontrada</p>
              </div>
            </Card>
          ) : (
            filteredDemands.map((demand) => (
              <Card
                key={demand.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/demandas/${demand.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {demand.protocolNumber}
                      </Badge>
                      <Badge className={priorityConfig[demand.priority as keyof typeof priorityConfig].color}>
                        {priorityConfig[demand.priority as keyof typeof priorityConfig].label}
                      </Badge>
                      <Badge variant="secondary" className={statusConfig[demand.status as keyof typeof statusConfig].color}>
                        {statusConfig[demand.status as keyof typeof statusConfig].label}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{demand.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {demand.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>Requerente: {demand.requesterName}</span>
                    {demand.prefecture && (
                      <span>• {demand.prefecture.name}</span>
                    )}
                    {demand.assignedTo && (
                      <span>• Responsável: {demand.assignedTo.name}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    Criada em {formatDate(demand.createdAt)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="board">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <config.icon className="h-4 w-4" />
                  <h3 className="font-semibold">{config.label}</h3>
                  <Badge variant="secondary">{getStatusCount(status)}</Badge>
                </div>
                <div className="space-y-2">
                  {filteredDemands
                    .filter((d) => d.status === status)
                    .map((demand) => (
                      <Card
                        key={demand.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/demandas/${demand.id}`)}
                      >
                        <div className="space-y-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {demand.protocolNumber}
                          </Badge>
                          <h4 className="font-medium text-sm line-clamp-2">
                            {demand.title}
                          </h4>
                          <div className="flex items-center justify-between">
                            <Badge
                              className={`text-xs ${priorityConfig[demand.priority as keyof typeof priorityConfig].color}`}
                            >
                              {priorityConfig[demand.priority as keyof typeof priorityConfig].label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(demand.createdAt)}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
