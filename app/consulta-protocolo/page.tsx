"use client";

import { useState } from "react";
import { Search, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Image from "next/image";

const statusConfig = {
  ABERTA: { label: "Aberta", icon: FileText, color: "bg-blue-500" },
  EM_ANALISE: { label: "Em Análise", icon: Clock, color: "bg-yellow-500" },
  EM_ANDAMENTO: { label: "Em Andamento", icon: AlertCircle, color: "bg-orange-500" },
  AGUARDANDO_RESPOSTA: { label: "Aguardando Resposta", icon: Clock, color: "bg-purple-500" },
  CONCLUIDA: { label: "Concluída", icon: CheckCircle2, color: "bg-green-500" },
  CANCELADA: { label: "Cancelada", icon: CheckCircle2, color: "bg-red-500" },
};

const priorityConfig = {
  BAIXA: { label: "Baixa", color: "bg-gray-500" },
  MEDIA: { label: "Média", color: "bg-blue-500" },
  ALTA: { label: "Alta", color: "bg-orange-500" },
  URGENTE: { label: "Urgente", color: "bg-red-500" },
};

export default function ConsultaProtocoloPage() {
  const [protocolNumber, setProtocolNumber] = useState("");
  const [demand, setDemand] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolNumber.trim()) {
      toast.error("Digite um número de protocolo");
      return;
    }

    setLoading(true);
    setSearched(true);
    setDemand(null);

    try {
      const res = await fetch(`/api/demands/protocol/${protocolNumber.trim()}`);
      if (res.status === 404) {
        toast.error("Protocolo não encontrado");
        return;
      }
      if (!res.ok) {
        throw new Error("Erro ao buscar protocolo");
      }

      const data = await res.json();
      setDemand(data);
    } catch (error) {
      toast.error("Erro ao buscar protocolo");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const StatusIcon = demand ? statusConfig[demand.status as keyof typeof statusConfig].icon : FileText;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0D2340] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <Image
              src="/cimag-logo.png"
              alt="CIMAG Logo"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Consulta de Protocolo</h1>
          <p className="text-blue-200">
            Acompanhe o status da sua demanda usando o número de protocolo
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Digite o número do protocolo (ex: 2026-000001)"
              value={protocolNumber}
              onChange={(e) => setProtocolNumber(e.target.value)}
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Results */}
        {searched && !loading && !demand && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Protocolo não encontrado</p>
              <p className="text-sm mt-2">
                Verifique se o número do protocolo está correto e tente novamente
              </p>
            </div>
          </Card>
        )}

        {demand && (
          <div className="space-y-6">
            {/* Main Info */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                      {demand.protocolNumber}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{demand.title}</h2>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityConfig[demand.priority as keyof typeof priorityConfig].color}>
                      {priorityConfig[demand.priority as keyof typeof priorityConfig].label}
                    </Badge>
                    <Badge className={statusConfig[demand.status as keyof typeof statusConfig].color}>
                      {statusConfig[demand.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                </div>
                <StatusIcon className="h-12 w-12 text-muted-foreground" />
              </div>

              {demand.prefecture && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Prefeitura</p>
                    <p className="font-medium">
                      {demand.prefecture.name} - {demand.prefecture.city}/{demand.prefecture.state}
                    </p>
                  </div>
                </>
              )}

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Criada em</p>
                  <p className="font-medium">{formatDateTime(demand.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Atualização</p>
                  <p className="font-medium">{formatDateTime(demand.updatedAt)}</p>
                </div>
              </div>

              {demand.resolvedAt && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Conclusão</p>
                    <p className="font-medium text-green-600">{formatDateTime(demand.resolvedAt)}</p>
                  </div>
                </>
              )}
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Histórico</h3>
              <div className="space-y-4">
                {demand.history && demand.history.length > 0 ? (
                  demand.history.map((item: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {index < demand.history.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{item.action}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                        {item.comment && (
                          <p className="text-sm text-muted-foreground">{item.comment}</p>
                        )}
                        {item.newValue && (
                          <p className="text-sm font-medium">{item.newValue}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
                )}
              </div>
            </Card>

            {/* Info Box */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Informações Importantes</p>
                  <p className="text-blue-700">
                    Esta é uma consulta pública do protocolo. Para mais informações ou atualizações
                    sobre sua demanda, você receberá notificações no email cadastrado.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>© 2026 Cimagflow. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
