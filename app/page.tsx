import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Search, LogIn, CheckCircle, Clock, Users } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cimagflow</h1>
            <p className="text-sm text-gray-600">Sistema de Gestão de Demandas</p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Acesso Interno
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Gestão Simplificada de Demandas Públicas
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Abra sua solicitação, acompanhe o status e receba atualizações em tempo real
          </p>

          {/* Main CTA Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Abrir Demanda - Destaque */}
            <Link href="/abrir-demanda" className="block">
              <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white h-full">
                <FileText className="h-16 w-16 mb-4 mx-auto" />
                <h3 className="text-2xl font-bold mb-3">Abrir Nova Demanda</h3>
                <p className="text-blue-100 mb-4">
                  Registre sua solicitação e receba um número de protocolo para acompanhamento
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  Começar agora
                  <span className="text-2xl">→</span>
                </div>
              </Card>
            </Link>

            {/* Consultar Protocolo */}
            <Link href="/consulta-protocolo" className="block">
              <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-gray-200 bg-white h-full">
                <Search className="h-16 w-16 mb-4 mx-auto text-gray-700" />
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Consultar Protocolo</h3>
                <p className="text-gray-600 mb-4">
                  Já possui um protocolo? Acompanhe o status da sua demanda
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                  Consultar status
                  <span className="text-2xl">→</span>
                </div>
              </Card>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Rápido e Fácil</h4>
              <p className="text-sm text-gray-600">
                Preencha um formulário simples e receba seu protocolo em segundos
              </p>
            </Card>

            <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Acompanhamento em Tempo Real</h4>
              <p className="text-sm text-gray-600">
                Receba notificações por email sobre cada atualização
               </p>
            </Card>

            <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Atendimento Profissional</h4>
              <p className="text-sm text-gray-600">
                Equipe dedicada para resolver sua demanda com eficiência
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Prefeituras Section */}
      <section className="bg-white/80 backdrop-blur-sm py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Atendemos Múltiplas Prefeituras
          </h3>
          <p className="text-gray-600 mb-8">
            Sistema integrado para gestão de demandas de diversas prefeituras parceiras
          </p>
          <Link href="/abrir-demanda">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Ver Prefeituras Disponíveis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 Cimagflow. Sistema de Gestão de Demandas Públicas.
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/abrir-demanda" className="text-gray-400 hover:text-white text-sm">
              Abrir Demanda
            </Link>
            <Link href="/consulta-protocolo" className="text-gray-400 hover:text-white text-sm">
              Consultar Protocolo
            </Link>
            <Link href="/login" className="text-gray-400 hover:text-white text-sm">
              Login Interno
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

