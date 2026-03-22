import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const fileName = file.name;

    // Try to extract text from the PDF content
    let pdfText = "";
    try {
      const pdfParse = require("pdf-parse");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdfParse(buffer);
      pdfText = result.text?.substring(0, 5000) || "";
    } catch {
      // Fallback to filename analysis if PDF parsing fails
    }

    const suggestions = pdfText
      ? analyzeContent(pdfText, fileName)
      : analyzeFileName(fileName);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Erro ao analisar PDF:", error);
    return NextResponse.json(
      { error: "Erro ao analisar arquivo" },
      { status: 500 }
    );
  }
}

function analyzeContent(text: string, fileName: string): {
  number: string;
  title: string;
  description: string;
  type: string;
  openingDate: string;
  closingDate: string;
  value: string;
} {
  const normalized = text.replace(/\s+/g, " ");

  // Extract bid number patterns common in Brazilian public bids
  let number = "";
  const numberPatterns = [
    /(?:edital|pregão|pregao|dispensa|licitação|licitacao|concorrência|concorrencia|tomada|inexigibilidade|chamada|convite|leilão|leilao|credenciamento)\s*(?:n[°ºo.]?\s*|nº\s*)?(\d{1,4}[\s]*[\/\-][\s]*\d{4})/i,
    /(?:processo|procedimento)\s*(?:licitatório|licitatorio|administrativo)?\s*(?:n[°ºo.]?\s*|nº\s*)?(\d{1,4}[\s]*[\/\-][\s]*\d{4})/i,
    /n[°ºo.]\s*(\d{1,4}\s*[\/\-]\s*\d{4})/i,
    /(\d{1,4}\/\d{4})/,
  ];
  for (const pattern of numberPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      number = match[1].replace(/\s/g, "");
      break;
    }
  }

  // Identify bid type from content
  let type = "PREGAO_ELETRONICO";
  const typeMap: [RegExp, string][] = [
    [/pregão\s*eletrônico|pregao\s*eletronico/i, "PREGAO_ELETRONICO"],
    [/pregão|pregao/i, "PREGAO"],
    [/dispensa\s*(?:de\s*)?licitação|dispensa\s*(?:de\s*)?licitacao/i, "DISPENSA"],
    [/inexigibilidade/i, "INEXIGIBILIDADE"],
    [/concorrência|concorrencia/i, "CONCORRENCIA"],
    [/chamada\s*pública|chamada\s*publica/i, "CHAMADA_PUBLICA"],
    [/tomada\s*de\s*preços|tomada\s*de\s*precos/i, "TOMADA_PRECOS"],
    [/credenciamento/i, "CREDENCIAMENTO"],
    [/convite/i, "CONVITE"],
    [/leilão|leilao/i, "LEILAO"],
    [/concurso/i, "CONCURSO"],
    [/compra\s*direta/i, "COMPRA_DIRETA"],
  ];
  for (const [pattern, value] of typeMap) {
    if (pattern.test(normalized)) {
      type = value;
      break;
    }
  }

  // Extract title / object
  let title = "";
  const objectPatterns = [
    /(?:objeto|OBJETO)\s*[:\-–]\s*(.{10,200}?)(?:\.|,\s*conforme|,\s*de\s*acordo|,\s*nos\s*termos)/i,
    /(?:objeto|OBJETO)\s*[:\-–]\s*(.{10,200})/i,
    /(?:tem\s*por\s*objeto|tem\s*como\s*objeto)\s*(?:a\s*|o\s*)?(.{10,200}?)(?:\.|,\s*conforme)/i,
  ];
  for (const pattern of objectPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      title = match[1].trim().replace(/\s+/g, " ");
      if (title.length > 150) title = title.substring(0, 150) + "...";
      break;
    }
  }

  // Extract description - broader context
  let description = "";
  const descPatterns = [
    /(?:objeto|OBJETO)\s*[:\-–]\s*(.{10,500}?)(?:\n|\d+[\.\)]\s|(?:cl[áa]usula|cap[ií]tulo|se[çc][ãa]o))/i,
    /(?:objeto|OBJETO)\s*[:\-–]\s*(.{10,500})/i,
  ];
  for (const pattern of descPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      description = match[1].trim().replace(/\s+/g, " ");
      if (description.length > 400) description = description.substring(0, 400) + "...";
      break;
    }
  }

  // Extract dates
  let openingDate = "";
  let closingDate = "";
  const datePatterns = [
    /(?:data\s*(?:de\s*)?abertura|sessão\s*(?:pública|publica)|abertura\s*(?:das\s*propostas|dos\s*envelopes))\s*[:\-–]?\s*(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})/i,
    /(?:dia|data)\s*(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})\s*(?:,?\s*(?:às|as)\s*\d{1,2}[h:]\d{0,2})?\s*(?:,?\s*(?:para|na|no)\s*(?:abertura|sessão|sessao))/i,
  ];
  for (const pattern of datePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      let year = match[3];
      if (year.length === 2) year = "20" + year;
      openingDate = `${year}-${month}-${day}`;
      break;
    }
  }

  const closingPatterns = [
    /(?:data\s*(?:de\s*)?(?:encerramento|fechamento|término|termino|fim)|(?:encerramento|recebimento)\s*(?:das\s*propostas|dos\s*envelopes))\s*[:\-–]?\s*(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})/i,
    /(?:até|ate)\s*(?:o\s*dia|a\s*data\s*de?)\s*(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})/i,
  ];
  for (const pattern of closingPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      let year = match[3];
      if (year.length === 2) year = "20" + year;
      closingDate = `${year}-${month}-${day}`;
      break;
    }
  }

  // Extract estimated value
  let value = "";
  const valuePatterns = [
    /(?:valor\s*(?:global|total|estimado|máximo|maximo|de\s*referência|de\s*referencia))\s*[:\-–]?\s*(?:R\$\s*)?([\d\.]+,\d{2})/i,
    /R\$\s*([\d\.]+,\d{2})\s*\(.*?(?:reais|mil|milhão|milhões|milh[oõ]es)/i,
  ];
  for (const pattern of valuePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      value = match[1].replace(/\./g, "").replace(",", ".");
      break;
    }
  }

  // Fallback to file name if content doesn't yield results
  if (!number) {
    const fallback = analyzeFileName(fileName);
    number = fallback.number;
  }
  if (!title) {
    title = fileName.replace(/\.(pdf|PDF)$/, "").replace(/[_-]/g, " ");
  }

  return { number, title, description, type, openingDate, closingDate, value };
}

function analyzeFileName(fileName: string): {
  number: string;
  title: string;
  description: string;
  type: string;
  openingDate: string;
  closingDate: string;
  value: string;
} {
  const nameWithoutExt = fileName.replace(/\.(pdf|PDF)$/, "");

  let number = "";
  const numberMatch = nameWithoutExt.match(/(\d{1,4})[\/\-_](\d{4})/);
  if (numberMatch) {
    number = `${numberMatch[1]}/${numberMatch[2]}`;
  }

  let type = "PREGAO_ELETRONICO";
  const typeMap: [RegExp, string][] = [
    [/pregão|pregao/i, "PREGAO_ELETRONICO"],
    [/dispensa/i, "DISPENSA"],
    [/inexigibilidade/i, "INEXIGIBILIDADE"],
    [/concorrência|concorrencia/i, "CONCORRENCIA"],
    [/chamada/i, "CHAMADA_PUBLICA"],
    [/credenciamento/i, "CREDENCIAMENTO"],
    [/leilão|leilao/i, "LEILAO"],
    [/tomada/i, "TOMADA_PRECOS"],
  ];
  for (const [pattern, value] of typeMap) {
    if (pattern.test(nameWithoutExt)) {
      type = value;
      break;
    }
  }

  const title = nameWithoutExt.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

  return { number, title, description: "", type, openingDate: "", closingDate: "", value: "" };
}
