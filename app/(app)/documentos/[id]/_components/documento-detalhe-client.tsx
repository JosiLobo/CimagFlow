"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Send, XCircle, CheckCircle2, Clock, User, Calendar, ArrowLeft, Loader2, Eye, Copy, Printer, Paperclip } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  RASCUNHO: { label: "Rascunho", bg: "bg-gray-100", color: "text-gray-600" },
  EM_ANDAMENTO: { label: "Em Andamento", bg: "bg-amber-50", color: "text-amber-700" },
  CONCLUIDO: { label: "Concluído", bg: "bg-emerald-50", color: "text-emerald-700" },
  CANCELADO: { label: "Cancelado", bg: "bg-red-50", color: "text-red-600" },
};

const signerStatusConfig: Record<string, { label: string; bg: string }> = {
  PENDENTE: { label: "Pendente", bg: "bg-amber-100 text-amber-700" },
  ASSINADO: { label: "Assinado", bg: "bg-emerald-100 text-emerald-700" },
  RECUSADO: { label: "Recusado", bg: "bg-red-100 text-red-600" },
};

export default function DocumentoDetalheClient({ id }: { id: string }) {
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);

  const fetchDoc = async () => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      setDoc(data.document ?? null);
      if (data.document?.fileUrl) {
        let fUrl = data.document.fileUrl as string;
        // Local files: normalize path and use directly (Next.js serves public/ at root)
        if (fUrl.startsWith("/public/")) fUrl = fUrl.replace("/public/", "/");
        if (fUrl.startsWith("/uploads/") || fUrl.startsWith("/public/uploads/")) {
          setFileUrl(fUrl.replace("/public/uploads/", "/uploads/"));
        } else {
          // S3/remote path — resolve via API
          const urlRes = await fetch("/api/upload/file-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cloud_storage_path: fUrl }),
          });
          const urlData = await urlRes.json();
          setFileUrl(urlData.url ?? null);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDoc(); }, [id]);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/documents/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { alert("Enviado para assinatura!"); fetchDoc(); }
      else alert(data.error ?? "Erro ao enviar");
    } finally { setSending(false); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancelar?")) return;
    await fetch(`/api/documents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELADO" }) });
    fetchDoc();
  };

  const copySignLink = (token: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}/assinar/${token}`);
    alert("Link copiado!");
  };

  const handlePrintContract = async () => {
    if (!doc?.content) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const headerImg = doc?.template?.headerImage;
    const footerImg = doc?.template?.footerImage;

    const container = document.createElement("div");
    container.style.fontFamily = "'Times New Roman', Georgia, serif";
    container.style.color = "#1f2937";
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.6";

    if (headerImg) {
      const img = document.createElement("img");
      img.src = headerImg;
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      container.appendChild(img);
    }

    const content = document.createElement("div");
    content.style.padding = "30px 40px";
    content.innerHTML = doc?.content ?? "";
    container.appendChild(content);

    if (doc?.status === "CONCLUIDO" && doc?.signers?.length) {
      const signersDiv = document.createElement("div");
      signersDiv.style.padding = "0 40px";
      signersDiv.style.marginTop = "32px";
      signersDiv.style.paddingTop = "24px";
      signersDiv.style.borderTop = "1px solid #e5e7eb";
      signersDiv.innerHTML = `
        <h3 style="text-align:center;margin-bottom:20px;">Assinaturas</h3>
        ${doc.signers.map((s: any) => `
          <div style="display:inline-block;width:45%;vertical-align:top;margin-right:4%;text-align:center;margin-bottom:16px;">
            ${s.signatureImage ? `<img src="${s.signatureImage}" style="width:180px;height:auto;margin:0 auto;display:block;" />` : ""}
            <div style="font-weight:bold;border-top:1px solid #ccc;padding-top:4px;margin-top:4px;">${s.signer?.name}</div>
            <div style="font-size:12px;color:#6b7280;">${s.status === "ASSINADO" ? `Assinado em ${new Date(s.signedAt).toLocaleDateString("pt-BR")} às ${new Date(s.signedAt).toLocaleTimeString("pt-BR")}` : s.status}</div>
            ${s.ipAddress ? `<div style="font-size:10px;color:#9ca3af;">IP: ${s.ipAddress}</div>` : ""}
          </div>
        `).join("")}
      `;
      container.appendChild(signersDiv);
    }

    if (doc.company?.itemsFileName) {
      const anexo = document.createElement("div");
      anexo.style.padding = "0 40px";
      anexo.style.marginTop = "16px";
      anexo.style.paddingTop = "12px";
      anexo.style.borderTop = "1px solid #e5e7eb";
      anexo.style.fontSize = "13px";
      anexo.style.color = "#374151";
      anexo.innerHTML = `<strong>Anexo de Itens:</strong> ${doc.company.itemsFileName}`;
      container.appendChild(anexo);
    }

    if (footerImg) {
      const img = document.createElement("img");
      img.src = footerImg;
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      container.appendChild(img);
    }

    const filename = `${(doc?.title ?? "documento").replace(/[^a-zA-Z0-9À-ú ]/g, "").trim().replace(/\s+/g, "_")}.pdf`;
    html2pdf().set({
      margin: [0, 0, 0, 0],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(container).save();
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" /></div>;
  if (!doc) return <div className="text-center py-24 text-gray-400"><p>Documento não encontrado</p><Link href="/documentos" className="text-emerald-600 hover:underline text-sm mt-2 block">Voltar</Link></div>;

  const cfg = statusConfig[doc.status] ?? statusConfig.RASCUNHO;
  const signedCount = doc.signers?.filter((s: any) => s.status === "ASSINADO")?.length ?? 0;
  const totalSigners = doc.signers?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documentos" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
          <p className="text-sm text-gray-500">Criado em {new Date(doc.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Detalhes</h3>
            {doc.description && <p className="text-sm text-gray-600 mb-4">{doc.description}</p>}
            {doc.message && <div className="bg-blue-50 rounded-xl p-3 mb-4"><p className="text-xs text-blue-600 font-medium mb-1">Mensagem</p><p className="text-sm text-gray-700">{doc.message}</p></div>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {doc.deadline && <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4 text-gray-400" /><span>Prazo: {new Date(doc.deadline).toLocaleDateString("pt-BR")}</span></div>}
              <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4 text-gray-400" /><span>{doc.creator?.name}</span></div>
            </div>
            {doc.content && (
              <div className="mt-4">
                <button onClick={() => setShowContent(!showContent)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <FileText className="w-4 h-4" /> {showContent ? "Ocultar" : "Ver"} Contrato
                </button>
                {showContent && (
                  <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden" ref={contractRef}>
                    <div className="bg-gray-100 overflow-y-auto" style={{ maxHeight: "70vh" }}>
                      <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: "210mm" }}>
                        {doc.template?.headerImage && (
                          <img src={doc.template.headerImage} alt="Cabeçalho" className="w-full h-auto" />
                        )}
                        <div
                          className="px-10 py-8 text-gray-800 text-[14px] leading-relaxed"
                          style={{ fontFamily: "'Times New Roman', 'Georgia', serif" }}
                          dangerouslySetInnerHTML={{ __html: doc.content }}
                        />
                        {doc.status === "CONCLUIDO" && doc.signers?.length > 0 && (
                          <div className="px-10 pb-8">
                            <div className="border-t border-gray-200 pt-6 mt-4">
                              <h4 className="text-sm font-bold text-gray-700 mb-4">Assinaturas</h4>
                              <div className="grid grid-cols-2 gap-4">
                                {doc.signers.map((s: any) => (
                                  <div key={s.id} className="text-center">
                                    {s.signatureImage && (
                                      <img src={s.signatureImage} alt={`Assinatura de ${s.signer?.name}`} className="h-16 mx-auto mb-1" />
                                    )}
                                    <div className="border-t border-gray-300 pt-1">
                                      <p className="text-xs font-semibold text-gray-800">{s.signer?.name}</p>
                                      {s.signedAt && <p className="text-[10px] text-gray-500">Assinado em {new Date(s.signedAt).toLocaleDateString("pt-BR")} às {new Date(s.signedAt).toLocaleTimeString("pt-BR")}</p>}
                                      {s.ipAddress && <p className="text-[10px] text-gray-400">IP: {s.ipAddress}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {doc.template?.footerImage && (
                          <img src={doc.template.footerImage} alt="Rodapé" className="w-full h-auto mt-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {fileUrl && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowPdf(!showPdf)} className="flex items-center gap-2 text-[#1E3A5F] hover:underline text-sm font-medium">
                    <Eye className="w-4 h-4" /> {showPdf ? "Ocultar" : "Visualizar"} PDF
                  </button>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-600 hover:underline text-sm font-medium">
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
                {showPdf && <iframe src={fileUrl} className="w-full h-96 rounded-xl border border-gray-200" title="Documento PDF" />}
              </div>
            )}
            {doc.company?.itemsFileUrl && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Paperclip className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800">Anexo de Itens — {doc.company.name}</p>
                    <p className="text-xs text-emerald-600 truncate">{doc.company.itemsFileName || "Arquivo anexado"}</p>
                  </div>
                  <a
                    href={doc.company.itemsFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> Baixar
                  </a>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Assinantes</h3>
              <span className="text-sm text-gray-500">{signedCount}/{totalSigners} assinado(s)</span>
            </div>
            {(doc.signers?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum assinante</p>
            ) : (
              <div className="space-y-2">
                {doc.signers?.map((ds: any, i: number) => {
                  const scfg = signerStatusConfig[ds.status] ?? signerStatusConfig.PENDENTE;
                  return (
                    <div key={ds.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-8 h-8 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{ds.signer?.name}</p>
                        <p className="text-xs text-gray-400">{ds.signer?.email}</p>
                        {ds.signedAt && <p className="text-xs text-emerald-600">Assinado em {new Date(ds.signedAt).toLocaleDateString("pt-BR")}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${scfg.bg}`}>{scfg.label}</span>
                      {ds.status === "PENDENTE" && (
                        <button onClick={() => copySignLink(ds.token)} className="text-gray-400 hover:text-[#1E3A5F]" title="Copiar link">
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Ações</h3>
            <div className="space-y-2">
              {doc.status === "RASCUNHO" && (
                <button onClick={handleSend} disabled={sending || totalSigners === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar para Assinatura
                </button>
              )}
              {doc.status === "EM_ANDAMENTO" && signedCount === 0 && (
                <button onClick={handleCancel}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-medium text-sm transition-colors">
                  <XCircle className="w-4 h-4" /> Cancelar
                </button>
              )}
              {doc.status === "CONCLUIDO" && doc.content && (
                <button onClick={handlePrintContract}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
              )}
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#152d4a] text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
                  <Download className="w-4 h-4" /> Baixar Documento
                </a>
              )}
            </div>
          </motion.div>
          {totalSigners > 0 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Progresso</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#1E3A5F]">{signedCount}/{totalSigners}</div>
                <p className="text-sm text-gray-500">assinaturas</p>
                <div className="mt-3 bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 rounded-full h-2 transition-all" style={{ width: `${totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0}%` }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
