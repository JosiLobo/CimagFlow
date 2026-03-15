import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Search,
  LogIn,
  CheckCircle,
  Clock,
  Shield,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/cimag-logo.png"
              alt="CimagFlow"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div className="leading-tight">
              <span className="text-xl font-bold tracking-tight text-[#1E3A5F]">
                Cimag<span className="text-emerald-500">Flow</span>
              </span>
              <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
                Gestão de Demandas
              </p>
            </div>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-[#1E3A5F]/20 text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Acesso Interno
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#1a3356] to-[#122740]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistema Online 24/7
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Gestão Simplificada de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                Demandas Públicas
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Abra sua solicitação, acompanhe o status em tempo real e receba
              atualizações diretamente no seu email
            </p>

            {/* Main CTA Cards */}
            <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
              <Link href="/nova-solicitacao" className="block group">
                <Card className="p-6 md:p-8 transition-all duration-300 bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-xl group-hover:shadow-emerald-500/30 group-hover:-translate-y-1 h-full">
                  <FileText className="h-12 w-12 mb-4 mx-auto opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Abrir Nova Demanda</h3>
                  <p className="text-emerald-100 text-sm mb-5 leading-relaxed">
                    Registre sua solicitação e receba um protocolo para acompanhamento
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold bg-white/15 rounded-full px-4 py-2 group-hover:bg-white/25 transition-colors">
                    Começar agora
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Card>
              </Link>

              <Link href="/consulta-protocolo" className="block group">
                <Card className="p-6 md:p-8 transition-all duration-300 bg-white border-0 shadow-lg group-hover:shadow-xl group-hover:-translate-y-1 h-full">
                  <Search className="h-12 w-12 mb-4 mx-auto text-[#1E3A5F]" />
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Consultar Protocolo</h3>
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                    Já possui um protocolo? Acompanhe o andamento da sua demanda
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] bg-[#1E3A5F]/5 rounded-full px-4 py-2 group-hover:bg-[#1E3A5F]/10 transition-colors">
                    Consultar status
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Card>
              </Link>
            </div>
          </div>
        </div>
        {/* Hero wave divider */}
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 56" fill="none" className="w-full text-[#f8fafc]">
            <path d="M0 24C240 56 480 56 720 40C960 24 1200 0 1440 8V56H0V24Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Por que usar o CimagFlow?
          </h3>
          <p className="text-gray-500 max-w-lg mx-auto">
            Plataforma desenvolvida para oferecer praticidade e transparência na
            gestão de demandas públicas
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="p-6 text-center border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Rápido e Fácil</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              Formulário simples e intuitivo. Receba seu protocolo em segundos.
            </p>
          </Card>

          <Card className="p-6 text-center border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 text-[#1E3A5F]" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Tempo Real</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              Acompanhe cada etapa e receba notificações por email automaticamente.
            </p>
          </Card>

          <Card className="p-6 text-center border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-amber-500" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Seguro e Confiável</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              Seus dados protegidos com segurança de nível profissional.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA banner */}
      <section className="container mx-auto px-4 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-[#1E3A5F] to-[#264d7a] p-8 md:p-12 text-center text-white shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold mb-3">
            Precisa registrar uma demanda?
          </h3>
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            Abra sua solicitação agora mesmo e receba um número de protocolo
            para acompanhar o andamento.
          </p>
          <Link href="/nova-solicitacao">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 shadow-lg shadow-emerald-500/25"
            >
              Abrir Solicitação
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/cimag-logo.png"
                alt="CimagFlow"
                width={28}
                height={28}
                className="rounded-md opacity-70"
              />
              <p className="text-gray-400 text-sm">
                © 2026 CimagFlow. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/nova-solicitacao"
                className="text-gray-400 hover:text-[#1E3A5F] text-sm transition-colors"
              >
                Abrir Demanda
              </Link>
              <Link
                href="/consulta-protocolo"
                className="text-gray-400 hover:text-[#1E3A5F] text-sm transition-colors"
              >
                Consultar Protocolo
              </Link>
              <Link
                href="/login"
                className="text-gray-400 hover:text-[#1E3A5F] text-sm transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

