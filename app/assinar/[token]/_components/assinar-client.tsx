"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, XCircle, FileText, User, Calendar, Loader2, PenLine, Eye, Eraser, AlertTriangle, Clock, Shield, Users } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

const TYPE_LABELS: Record<string, string> = {
  PRESIDENTE: "Presidente",
  PREFEITO: "Prefeito",
  JURIDICO: "Jurídico",
  TESTEMUNHA: "Testemunha",
  FORNECEDOR: "Fornecedor",
  OUTRO: "Outro",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "text-amber-600 bg-amber-50" },
  ASSINADO: { label: "Assinado", color: "text-emerald-600 bg-emerald-50" },
  RECUSADO: { label: "Recusado", color: "text-red-600 bg-red-50" },
};

export default function AssinarClient({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"signed" | "refused" | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [error, setError] = useState("");

  // CPF + Signature state
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/sign/${token}`);
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Token inválido"); return; }
        setData(json.documentSigner);
      } catch {
        setError("Erro ao carregar documento");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Format CPF: 000.000.000-00
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const validateCpf = (cpfStr: string): boolean => {
    const digits = cpfStr.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    if (rem !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    return rem === parseInt(digits[10]);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    setCpfError("");
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureEmpty(true);
  };

  const handleAction = async (action: "sign" | "refuse") => {
    if (action === "sign") {
      // Validate CPF
      if (!validateCpf(cpf)) {
        setCpfError("CPF inválido. Verifique e tente novamente.");
        return;
      }

      // Validate 5 first digits match
      if (data?.signer?.cpfPrefix) {
        const inputPrefix = cpf.replace(/\D/g, "").slice(0, 5);
        if (inputPrefix !== data.signer.cpfPrefix) {
          setCpfError("Os 5 primeiros dígitos do CPF não conferem com o cadastro.");
          return;
        }
      }

      // Validate signature
      if (sigCanvas.current?.isEmpty()) {
        setSignatureEmpty(true);
        return;
      }
    }

    setProcessing(true);
    try {
      const payload: Record<string, unknown> = { action };

      if (action === "sign") {
        payload.cpf = cpf.replace(/\D/g, "");
        payload.signatureImage = sigCanvas.current?.getCanvas().toDataURL("image/png");
      }

      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(action === "sign" ? "signed" : "refused");
        setDone(true);
      } else {
        setError(json.error ?? "Erro ao processar");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#1E3A5F]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Erro</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
        {result === "signed" ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Documento Assinado!</h2>
            <p className="text-gray-500">Sua assinatura foi registrada com sucesso. Você pode fechar esta janela.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assinatura Recusada</h2>
            <p className="text-gray-500">Você recusou assinar este documento.</p>
          </>
        )}
      </motion.div>
    </div>
  );

  if (data?.status !== "PENDENTE") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
        {data?.status === "ASSINADO" ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Já Assinado</h2>
            <p className="text-gray-500 mt-2">Este documento já foi assinado por você.</p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Não Disponível</h2>
            <p className="text-gray-500 mt-2">Este link não está mais disponível.</p>
          </>
        )}
      </div>
    </div>
  );

  const doc = data?.document;
  const canSign = data?.canSign !== false;
  const waitingFor = data?.waitingFor;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#0D2340] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 relative flex-shrink-0">
            <Image src="/cimag-logo.png" alt="CIMAG Logo" fill className="object-contain" />
          </div>
          <div>
            <span className="text-white font-bold text-lg">CimagFlow</span>
            <p className="text-blue-200 text-xs">Assinatura Digital</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 mt-6">
        {/* Documento Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#1E3A5F]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{doc?.title}</h2>
              {doc?.description && <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span>Enviado por: <strong>{doc?.creatorName}</strong></span>
            </div>
            {doc?.deadline && (
              <div className="flex items-center gap-2 text-amber-600">
                <Calendar className="w-4 h-4" />
                <span>Prazo: {new Date(doc.deadline).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>

          {doc?.message && (
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Mensagem do remetente</p>
              <p className="text-sm text-gray-700">&quot;{doc.message}&quot;</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Olá, {data?.signer?.name}!</strong> Você é o <strong>{data?.signerOrder}º</strong> de <strong>{data?.totalSigners}</strong> assinante(s).
              {canSign
                ? " É sua vez de assinar. Ao clicar em \"Assinar Documento\", você concorda com o conteúdo apresentado."
                : ` Aguardando a assinatura de ${waitingFor}. Você será notificado por email quando for sua vez.`
              }
            </p>
          </div>

          {/* Visualizar conteúdo do documento */}
          {doc?.content && (
            <>
              <button onClick={() => setShowContent(!showContent)}
                className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors mb-4">
                <FileText className="w-4 h-4" /> {showContent ? "Ocultar" : "Ver"} Conteúdo do Documento
              </button>
              {showContent && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{doc.content}</pre>
                </div>
              )}
            </>
          )}

          {doc?.fileUrl && (
            <button onClick={() => setShowPdf(!showPdf)}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors mb-4">
              <Eye className="w-4 h-4" /> {showPdf ? "Ocultar" : "Visualizar"} PDF Anexo
            </button>
          )}
          {showPdf && doc?.fileUrl && (
            <iframe src={doc.fileUrl} className="w-full h-96 rounded-xl border border-gray-200 mb-4" title="Documento" />
          )}
        </motion.div>

        {/* Ordem de Assinatura */}
        {data?.allSigners && data.allSigners.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1E3A5F]" /> Ordem de Assinatura
            </h3>
            <div className="space-y-2">
              {data.allSigners.map((s: { name: string; type: string; order: number; status: string; signedAt: string | null }, idx: number) => {
                const statusInfo = STATUS_LABELS[s.status] || STATUS_LABELS.PENDENTE;
                const isMe = idx + 1 === data.signerOrder;
                return (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? "border-[#1E3A5F]/30 bg-blue-50/50" : "border-gray-100"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      s.status === "ASSINADO" ? "bg-emerald-100 text-emerald-700" :
                      s.status === "RECUSADO" ? "bg-red-100 text-red-700" :
                      isMe && canSign ? "bg-[#1E3A5F] text-white" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {s.status === "ASSINADO" ? <CheckCircle2 className="w-4 h-4" /> :
                       s.status === "RECUSADO" ? <XCircle className="w-4 h-4" /> :
                       s.order}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {s.name} {isMe && <span className="text-xs text-[#1E3A5F] font-semibold">(Você)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{TYPE_LABELS[s.type] || s.type}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Aguardando vez */}
        {!canSign && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
            <div className="flex items-center gap-3 text-amber-700">
              <Clock className="w-8 h-8" />
              <div>
                <h3 className="font-semibold">Aguardando sua vez</h3>
                <p className="text-sm text-amber-600">
                  O documento precisa ser assinado por <strong>{waitingFor}</strong> antes de você.
                  Você receberá um email quando for sua vez de assinar.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* CPF + Assinatura - só mostra se pode assinar */}
        {canSign && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <PenLine className="w-5 h-5 text-[#1E3A5F]" /> Assinar Documento
            </h3>

            {/* CPF Input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                CPF do Assinante
              </label>
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 ${
                  cpfError ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-[#1E3A5F]"
                }`}
              />
              {cpfError && (
                <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                  <AlertTriangle className="w-3 h-3" /> {cpfError}
                </p>
              )}
              {data?.signer?.cpfPrefix && (
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                  <Shield className="w-3 h-3" /> Os 5 primeiros dígitos serão validados com o cadastro
                </p>
              )}
            </div>

            {/* Signature Pad */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Desenhe sua Assinatura
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" /> Limpar
                </button>
              </div>
              <div className={`rounded-xl border-2 border-dashed bg-white overflow-hidden transition-colors ${
                !signatureEmpty ? "border-emerald-300" : "border-gray-200"
              }`}>
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="#1E3A5F"
                  canvasProps={{
                    className: "w-full",
                    style: { width: "100%", height: 160 },
                  }}
                  onBegin={() => setSignatureEmpty(false)}
                />
              </div>
              {signatureEmpty && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Use o mouse ou o dedo para desenhar sua assinatura acima
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("refuse")}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 border border-red-100"
              >
                <XCircle className="w-5 h-5" /> Recusar
              </button>
              <button
                onClick={() => handleAction("sign")}
                disabled={processing || cpf.replace(/\D/g, "").length < 11 || signatureEmpty}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 shadow-lg disabled:shadow-none"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
                Assinar Documento
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Ao assinar, você concorda com o conteúdo do documento. Seu CPF e assinatura serão registrados.
            </p>
          </motion.div>
        )}

        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-6 h-6 relative">
              <Image src="/cimag-logo.png" alt="CIMAG" fill className="object-contain" />
            </div>
            <span className="text-sm font-semibold text-gray-600">CimagFlow</span>
          </div>
          <p className="text-xs text-gray-400">Assinatura Digital • Documento legalmente válido</p>
        </div>
      </div>
    </div>
  );
}
