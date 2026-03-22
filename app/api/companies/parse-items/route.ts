import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import * as XLSX from "xlsx";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ParsedItem {
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const VALID_UNITS = ["UN", "KG", "L", "M", "M²", "M³", "CX", "PCT", "HR", "DIA", "MÊS", "SV"];

function normalizeUnit(raw: string): string {
  if (!raw) return "UN";
  const u = raw.toString().trim().toUpperCase()
    .replace("UND", "UN")
    .replace("UNID", "UN")
    .replace("UNIDADE", "UN")
    .replace("LITRO", "L")
    .replace("LITROS", "L")
    .replace("METRO", "M")
    .replace("METROS", "M")
    .replace("CAIXA", "CX")
    .replace("PACOTE", "PCT")
    .replace("HORA", "HR")
    .replace("HORAS", "HR")
    .replace("SERVIÇO", "SV")
    .replace("SERVICO", "SV");
  return VALID_UNITS.includes(u) ? u : "UN";
}

function parseNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  let str = val.toString().trim().replace(/R\$\s*/gi, "");
  // Brazilian format: 1.234,56 → 1234.56
  if (/\d\.\d{3}/.test(str) || str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function isHeaderLine(text: string): boolean {
  const l = text.toLowerCase();
  return /^(item|n[º°]|#|nome|produto|descri[çc][aã]o|especifica|total|subtotal|soma|valor\s*total|cabecalho|cabe[çc]alho|seq|ord)\b/.test(l);
}

function splitNameDescription(fullText: string, existingDesc: string): { name: string; description: string } {
  if (existingDesc) {
    return { name: fullText, description: existingDesc };
  }
  // Always carry full text into description
  if (fullText.length <= 80) {
    return { name: fullText, description: fullText };
  }
  // Shorten name: split at first separator after 10 chars
  const sepMatch = fullText.match(/^(.{10,80}?)[,;\-–—\.]\s/);
  if (sepMatch) {
    return { name: sepMatch[1].trim(), description: fullText };
  }
  // Truncate to ~80 chars at word boundary
  const words = fullText.split(/\s+/);
  let shortName = "";
  for (const w of words) {
    if ((shortName + " " + w).trim().length > 80) break;
    shortName = (shortName + " " + w).trim();
  }
  return { name: shortName || fullText.slice(0, 80), description: fullText };
}

function parseSpreadsheet(buffer: Buffer): ParsedItem[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 1) return [];

  // Log raw data for debugging
  console.log(`[parseitems] Total rows: ${rows.length}, cols in first row: ${rows[0]?.length}`);
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    console.log(`[parseitems] Row ${i}: ${JSON.stringify(rows[i])}`);
  }

  // Find header row and map each column
  let headerRowIdx = -1;
  let nameCol = -1, descCol = -1, unitCol = -1, qtyCol = -1, priceCol = -1, totalCol = -1, objetoCol = -1;

  for (let hri = 0; hri < Math.min(rows.length, 5); hri++) {
    const headers = rows[hri].map((h: unknown) => String(h ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
    let nc = -1, dc = -1, uc = -1, qc = -1, pc = -1, tc = -1, oc = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      // Valor Total must be checked BEFORE valor unitário/preço
      if (tc === -1 && /valor\s*total|total\s*r?\$|total\s*geral|subtotal|v\.?\s*total/.test(h)) { tc = i; continue; }
      // Valor Unitário / Preço
      if (pc === -1 && /preco|unitario|valor\s*unit|v\.?\s*unit|preco\s*unit|custo/.test(h)) { pc = i; continue; }
      // Quantidade
      if (qc === -1 && /qtd|quant|quantidade|^qt$/.test(h)) { qc = i; continue; }
      // Unidade
      if (uc === -1 && /^un$|^und$|unid|medida/.test(h)) { uc = i; continue; }
      // Objeto (separate from descrição)
      if (oc === -1 && /^objeto$|objeto\s*do|objeto\s*contrat/.test(h) && !/valor|preco|total/.test(h)) { oc = i; continue; }
      // Descrição (must not contain valor/preco/total)
      if (dc === -1 && /descr|especif|detalhe|observ|complement/.test(h) && !/valor|preco|total/.test(h)) { dc = i; continue; }
      // Item/Nome (must not contain valor/preco/total)
      if (nc === -1 && /item|nome|produto|material|servico/.test(h) && !/valor|preco|total/.test(h)) { nc = i; continue; }
      // Generic "valor" only if nothing else matched
      if (pc === -1 && tc === -1 && /^valor$/.test(h)) { pc = i; continue; }
    }

    // Need at least a name-like column + some numeric column
    if ((nc >= 0 || dc >= 0 || oc >= 0) && (qc >= 0 || pc >= 0 || tc >= 0)) {
      headerRowIdx = hri;
      nameCol = nc; descCol = dc; unitCol = uc; qtyCol = qc; priceCol = pc; totalCol = tc; objetoCol = oc;
      break;
    }
  }

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

  // Fallback: no headers detected
  if (headerRowIdx === -1 && rows.length > 0) {
    const colCount = rows[0].length;
    if (colCount >= 5) {
      nameCol = 0; descCol = 1; qtyCol = 2; priceCol = 3; totalCol = 4;
    } else if (colCount >= 4) {
      nameCol = 0; qtyCol = 1; priceCol = 2; totalCol = 3;
    } else if (colCount >= 3) {
      nameCol = 0; qtyCol = 1; priceCol = 2;
    } else if (colCount >= 2) {
      nameCol = 0; priceCol = 1;
    } else {
      nameCol = 0;
    }
  }

  console.log(`[parseitems] Mapped cols => Item: ${nameCol}, Objeto: ${objetoCol}, Desc: ${descCol}, Unid: ${unitCol}, Qtd: ${qtyCol}, PUnit: ${priceCol}, VTotal: ${totalCol}, headerRow: ${headerRowIdx}`);

  const items: ParsedItem[] = [];
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(c => !String(c ?? "").trim())) continue;

    // Read each column directly
    const colName = nameCol >= 0 ? String(row[nameCol] ?? "").trim() : "";
    const colObjeto = objetoCol >= 0 ? String(row[objetoCol] ?? "").trim() : "";
    const colDesc = descCol >= 0 ? String(row[descCol] ?? "").trim() : "";
    const colUnit = unitCol >= 0 ? String(row[unitCol] ?? "").trim() : "";
    const colQty = qtyCol >= 0 ? parseNumber(row[qtyCol]) : 0;
    const colPrice = priceCol >= 0 ? parseNumber(row[priceCol]) : 0;
    const colTotal = totalCol >= 0 ? parseNumber(row[totalCol]) : 0;

    // Skip totals/empty rows
    const nameLower = colName.toLowerCase();
    if (nameLower === "total" || nameLower === "subtotal" || nameLower === "valor total" || nameLower === "soma") continue;

    // Determine item name (objeto) and description
    let itemName = "";
    let itemDesc = "";

    // If there's a dedicated "Objeto" column, use it as the name
    if (colObjeto) {
      itemName = colObjeto;
      itemDesc = colDesc || colObjeto;
    } else if (/^\d+$/.test(colName)) {
      // "Item" column is just a number (1, 2, 3) — description has the real content
      if (colDesc) {
        itemName = colDesc;
        itemDesc = colDesc;
      } else {
        // Try next column after nameCol
        for (let c = nameCol + 1; c < row.length; c++) {
          if (c === descCol || c === unitCol || c === qtyCol || c === priceCol || c === totalCol || c === objetoCol) continue;
          const val = String(row[c] ?? "").trim();
          if (val && !/^\d+([.,]\d+)?$/.test(val)) {
            itemName = val;
            itemDesc = val;
            break;
          }
        }
      }
    } else if (colName) {
      itemName = colName;
      itemDesc = colDesc || colName;
    } else if (colDesc) {
      itemName = colDesc;
      itemDesc = colDesc;
    }

    if (!itemName) continue;

    // Determine unitPrice and totalPrice
    let unitPrice = colPrice;
    const qty = colQty || 1;
    let totalPrice = colTotal;
    if (unitPrice <= 0 && totalPrice > 0) {
      unitPrice = Math.round((totalPrice / qty) * 100) / 100;
    }
    if (totalPrice <= 0 && unitPrice > 0) {
      totalPrice = Math.round(qty * unitPrice * 100) / 100;
    }

    items.push({
      name: itemName,
      description: itemDesc,
      unit: colUnit ? normalizeUnit(colUnit) : "UN",
      quantity: qty,
      unitPrice,
      totalPrice,
    });
  }

  console.log(`[parseitems] Extracted ${items.length} items`);
  items.forEach((it, i) => console.log(`[parseitems] Item ${i}: name="${it.name.substring(0, 50)}" desc="${it.description.substring(0, 50)}" qty=${it.quantity} unitPrice=${it.unitPrice} totalPrice=${it.totalPrice}`));

  return items;
}

function mergeTextLines(rawLines: string[]): string[] {
  const result: string[] = [];
  for (const line of rawLines) {
    // Lines that start a new entry
    const startsNewEntry =
      /^\d+[\.)\-–—\s]+\S/.test(line) ||
      /^[•\-\*]\s+\S/.test(line) ||
      isHeaderLine(line) ||
      /^-{3,}|^={3,}|^\*{3,}/.test(line) ||
      (line.includes("|") && line.split("|").length >= 3) ||
      (line.includes("\t") && line.split("\t").length >= 3);

    if (startsNewEntry || result.length === 0) {
      result.push(line);
      continue;
    }

    // Data-only lines (price, unit, pure number) stay separate
    const isPriceOnly = /^\s*R?\$?\s*[\d.,]+\s*$/.test(line);
    const isUnitOnly = /^(UN|KG|L|M|M²|M³|CX|PCT|HR|DIA|MÊS|SV|UND|UNID|UNIDADE)$/i.test(line.trim());
    const isNumericOnly = /^[\d.,\s]+$/.test(line.trim());

    if (isPriceOnly || isUnitOnly || isNumericOnly || line.length < 3) {
      result.push(line);
      continue;
    }

    // Text continuation line — merge only if previous is also text (no price/unit ending)
    const prev = result[result.length - 1];
    const prevEndsWithData =
      /R?\$\s*[\d.,]+\s*$/.test(prev) ||
      /^[\d.,\s]+$/.test(prev.trim()) ||
      /^(UN|KG|L|M|M²|M³|CX|PCT|HR|DIA|MÊS|SV|UND|UNID|UNIDADE)$/i.test(prev.trim());

    if (prevEndsWithData) {
      result.push(line);
    } else {
      result[result.length - 1] += " " + line;
    }
  }
  return result;
}

function parseTextContent(text: string): ParsedItem[] {
  const lines = mergeTextLines(text.split("\n").map(l => l.trim()).filter(Boolean));

  // === Pass 1: Detect delimited tabular data (pipe, tab, semicolon) ===
  const delimCounts = { pipe: 0, tab: 0, semi: 0 };
  for (const line of lines) {
    if (line.includes("|")) delimCounts.pipe++;
    if (line.includes("\t")) delimCounts.tab++;
    if (line.includes(";") && line.split(";").length >= 3) delimCounts.semi++;
  }
  let delim = "";
  if (delimCounts.pipe >= 3) delim = "|";
  else if (delimCounts.tab >= 3) delim = "\t";
  else if (delimCounts.semi >= 3) delim = ";";

  if (delim) {
    const delimLines = lines.filter(l => l.includes(delim));
    if (delimLines.length >= 2) {
      const firstCols = delimLines[0].split(delim).map(c => c.trim().toLowerCase());
      let nameCol = 0, descCol = -1, unitCol = -1, qtyCol = -1, priceCol = -1, totalCol = -1;
      let startIdx = 0;
      for (let i = 0; i < firstCols.length; i++) {
        const c = firstCols[i];
        if (/item|nome|servi|prod|objeto|material/.test(c) && !/valor|pre|total/.test(c)) { nameCol = i; startIdx = 1; }
        else if (descCol === -1 && /desc|especif|detalhe|observ|complement/.test(c) && !/valor|pre|total/.test(c)) { descCol = i; startIdx = 1; }
        else if (/^un$|unid|medida|^und$/.test(c)) { unitCol = i; startIdx = 1; }
        else if (/qtd|quant/.test(c)) { qtyCol = i; startIdx = 1; }
        else if (totalCol === -1 && /valor\s*total|total\s*r?\$|v\.?\s*total|subtotal/.test(c)) { totalCol = i; startIdx = 1; }
        else if (priceCol === -1 && /pre|unit[aá]|r\$|custo|valor\s*unit|v\.?\s*unit/.test(c)) { priceCol = i; startIdx = 1; }
        else if (priceCol === -1 && totalCol === -1 && /valor/.test(c)) { priceCol = i; startIdx = 1; }
      }
      const items: ParsedItem[] = [];
      for (let i = startIdx; i < delimLines.length; i++) {
        const cols = delimLines[i].split(delim).map(c => c.trim());
        const rawName = (cols[nameCol] || "").replace(/^\d+[\.\)\-\s]+/, "").trim();
        const rawDesc = descCol >= 0 && cols[descCol] ? cols[descCol] : "";
        if (!rawName && !rawDesc) continue;
        if (/^(total|subtotal|soma|valor total)$/i.test(rawName)) continue;

        let iName = "";
        let iDesc = "";

        if (/^\d+$/.test(rawName) && rawDesc) {
          const split = splitNameDescription(rawDesc, "");
          iName = split.name;
          iDesc = rawDesc;
        } else if (rawName) {
          if (rawDesc) {
            iName = rawName;
            iDesc = rawDesc;
          } else {
            const split = splitNameDescription(rawName, "");
            iName = split.name;
            iDesc = rawName.length > 80 ? rawName : "";
          }
        } else {
          continue;
        }

        const up = priceCol >= 0 && cols[priceCol] ? parseNumber(cols[priceCol]) : 0;
        const total = totalCol >= 0 && cols[totalCol] ? parseNumber(cols[totalCol]) : 0;
        const qty = qtyCol >= 0 && cols[qtyCol] ? parseNumber(cols[qtyCol]) || 1 : 1;
        const calcUnitPrice = up > 0 ? up : total > 0 ? Math.round((total / qty) * 100) / 100 : 0;
        const calcTotal = total > 0 ? total : up > 0 ? Math.round(qty * up * 100) / 100 : 0;
        items.push({
          name: iName,
          description: iDesc,
          unit: unitCol >= 0 && cols[unitCol] ? normalizeUnit(cols[unitCol]) : "UN",
          quantity: qty,
          unitPrice: calcUnitPrice,
          totalPrice: calcTotal,
        });
      }
      if (items.length > 0) return items;
    }
  }

  // === Pass 2: Line-by-line with R$ / price parsing ===
  const itemsPass2: ParsedItem[] = [];
  for (const line of lines) {
    if (line.length < 3) continue;
    if (isHeaderLine(line)) continue;

    const priceMatch = line.match(/R?\$\s*([\d.,]+)\s*$/)
      || line.match(/([\d.]+,\d{2})\s*$/)
      || line.match(/\b(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/);
    const price = priceMatch ? parseNumber(priceMatch[1]) : 0;

    let remaining = priceMatch ? line.slice(0, priceMatch.index).trim() : line;

    let quantity = 1;
    let unit = "UN";
    const qtyMatch = remaining.match(/(\d+[.,]?\d*)\s*(UN|KG|L|M|CX|PCT|HR|DIA|MÊS|SV|UND|UNID|UNIDADE|LITRO|LITROS|METRO|METROS|CAIXA|PACOTE|HORA|HORAS|SERVI[ÇC]O)?\s*$/i);
    if (qtyMatch && price > 0) {
      quantity = parseNumber(qtyMatch[1]) || 1;
      unit = qtyMatch[2] ? normalizeUnit(qtyMatch[2]) : "UN";
      remaining = remaining.slice(0, qtyMatch.index).trim();
    }

    remaining = remaining.replace(/^\d+[\.\)\-–—\s]+/, "").trim();
    remaining = remaining.replace(/[\.\-–—_\s]+$/, "").trim();

    if (remaining.length < 2) continue;
    if (price === 0 && !priceMatch && quantity === 1) continue;

    const { name: p2Name, description: p2Desc } = splitNameDescription(remaining, "");
    const p2Total = Math.round((quantity || 1) * price * 100) / 100;
    itemsPass2.push({
      name: p2Name,
      description: p2Desc,
      unit,
      quantity: quantity || 1,
      unitPrice: price,
      totalPrice: p2Total,
    });
  }
  if (itemsPass2.length > 0) return itemsPass2;

  // === Pass 3: Multi-line grouping for PDFs that split table cells onto separate lines ===
  // Use original (unmerged) lines for price/text proximity detection
  const origLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const textLines: { text: string; idx: number }[] = [];
  const priceLines: { price: number; idx: number }[] = [];

  for (let i = 0; i < origLines.length; i++) {
    const line = origLines[i];
    if (isHeaderLine(line)) continue;

    const priceM = line.match(/R?\$\s*([\d.,]+)/) || line.match(/^([\d.]+,\d{2})$/);
    if (priceM) {
      const p = parseNumber(priceM[1]);
      if (p > 0) priceLines.push({ price: p, idx: i });
    } else if (!/^\d+([.,]\d+)?$/.test(line.trim()) && line.length >= 3 && !/^\d+[\.\)\-\s]*$/.test(line.trim())) {
      textLines.push({ text: line.replace(/^\d+[\.\)\-–—\s]+/, "").trim(), idx: i });
    }
  }

  if (textLines.length > 0 && priceLines.length > 0) {
    // Group consecutive text lines into single descriptions
    const groupedTexts: { text: string; startIdx: number; endIdx: number }[] = [];
    for (const tl of textLines) {
      const last = groupedTexts[groupedTexts.length - 1];
      if (last && tl.idx - last.endIdx <= 1) {
        last.text += " " + tl.text;
        last.endIdx = tl.idx;
      } else {
        groupedTexts.push({ text: tl.text, startIdx: tl.idx, endIdx: tl.idx });
      }
    }

    const usedPrices = new Set<number>();
    const itemsPass3: ParsedItem[] = [];
    for (const grp of groupedTexts) {
      if (grp.text.length < 3) continue;
      let bestPriceIdx = -1;
      let bestDist = Infinity;
      for (let pi = 0; pi < priceLines.length; pi++) {
        const dist = priceLines[pi].idx - grp.endIdx;
        if (dist > 0 && dist <= 5 && dist < bestDist && !usedPrices.has(pi)) {
          bestDist = dist;
          bestPriceIdx = pi;
        }
      }
      if (bestPriceIdx >= 0) {
        usedPrices.add(bestPriceIdx);
        let qty = 1;
        let unitStr = "UN";
        for (let j = grp.endIdx + 1; j < priceLines[bestPriceIdx].idx; j++) {
          const betweenLine = origLines[j]?.trim();
          if (!betweenLine) continue;
          if (/^\d+([.,]\d+)?$/.test(betweenLine)) {
            qty = parseNumber(betweenLine) || 1;
          } else if (/^(UN|KG|L|M|M²|M³|CX|PCT|HR|DIA|MÊS|SV|UND|UNID|UNIDADE)$/i.test(betweenLine)) {
            unitStr = normalizeUnit(betweenLine);
          }
        }
        const { name: p3Name, description: p3Desc } = splitNameDescription(grp.text, "");
        const p3Price = priceLines[bestPriceIdx].price;
        const p3Total = Math.round(qty * p3Price * 100) / 100;
        itemsPass3.push({
          name: p3Name,
          description: p3Desc,
          unit: unitStr,
          quantity: qty,
          unitPrice: p3Price,
          totalPrice: p3Total,
        });
      }
    }
    if (itemsPass3.length > 0) return itemsPass3;
  }

  // === Pass 4: R$ fallback - any line containing R$ or values in 1.234,56 format ===
  const itemsPass4: ParsedItem[] = [];
  for (const line of lines) {
    const match = line.match(/R?\$\s*([\d.,]+)/) || line.match(/\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/);
    if (!match) continue;
    const price = parseNumber(match[1]);
    if (price <= 0) continue;
    const name = line.slice(0, match.index).replace(/^\d+[\.\)\-–—\s]+/, "").replace(/[\.\)\-–—_\s]+$/, "").trim();
    if (name.length < 2) continue;
    const { name: p4Name, description: p4Desc } = splitNameDescription(name, "");
    itemsPass4.push({ name: p4Name, description: p4Desc, unit: "UN", quantity: 1, unitPrice: price, totalPrice: price });
  }
  if (itemsPass4.length > 0) return itemsPass4;

  // === Pass 5: Ultimate fallback - extract text lines as service names ===
  const itemsPass5: ParsedItem[] = [];
  for (const line of lines) {
    if (line.length < 5) continue;
    if (isHeaderLine(line)) continue;
    if (/^[\d\s.,\-\/]+$/.test(line)) continue;
    if (/^-{3,}|^={3,}|^\*{3,}/.test(line)) continue;
    const cleaned = line.replace(/^\d+[\.\)\-–—\s]+/, "").trim();
    if (cleaned.length < 3) continue;
    const { name: p5Name, description: p5Desc } = splitNameDescription(cleaned, "");
    itemsPass5.push({ name: p5Name, description: p5Desc, unit: "UN", quantity: 1, unitPrice: 0, totalPrice: 0 });
  }
  return itemsPass5;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as Record<string, unknown>)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = (file.name || "").toLowerCase();
    let items: ParsedItem[] = [];

    console.log(`[parseitems] Processing file: ${file.name} (${file.size} bytes, type: ${file.type}) - route.ts:329`);

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv") || fileName.endsWith(".ods")) {
      try {
        items = parseSpreadsheet(buffer);
        console.log(`[parseitems] Spreadsheet parsed: ${items.length} items - route.ts:334`);
      } catch (xlsErr) {
        console.error("[parseitems] Spreadsheet parse error: - route.ts:336", xlsErr);
        return NextResponse.json({ error: "Erro ao ler planilha. Verifique se o arquivo está correto." }, { status: 400 });
      }
    } else if (fileName.endsWith(".pdf")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const pdfData = await pdfParse(buffer);
        console.log(`[parseitems] PDF text extracted: ${pdfData.text.length} chars - route.ts:344`);
        items = parseTextContent(pdfData.text);
      } catch (pdfErr) {
        console.error("[parseitems] PDF parse error: - route.ts:347", pdfErr);
        return NextResponse.json({ error: "Erro ao ler PDF. Verifique se o arquivo está correto." }, { status: 400 });
      }
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
        const result = await mammoth.extractRawText({ buffer });
        console.log(`[parseitems] DOCX text extracted: ${result.value.length} chars - route.ts:355`);
        items = parseTextContent(result.value);
      } catch (docErr) {
        console.error("[parseitems] DOCX parse error: - route.ts:358", docErr);
        return NextResponse.json({ error: "Erro ao ler documento Word. Verifique se o arquivo está correto." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Formato não suportado. Use PDF, XLS, XLSX, CSV, DOCX." }, { status: 400 });
    }

    console.log(`[parseitems] Parsed ${items.length} items`);

    // Save the file (S3 with local fallback)
    let fileUrl = "";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    try {
      const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(safeName, file.type || "application/octet-stream", true);
      const s3Res = await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(buffer), headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (s3Res.ok) {
        fileUrl = cloud_storage_path;
        console.log(`[parseitems] File saved to S3: ${cloud_storage_path} - route.ts:376`);
      } else {
        throw new Error("S3 upload failed");
      }
    } catch (s3Err) {
      console.warn("[parseitems] S3 failed, saving locally: - route.ts:381", (s3Err as Error).message);
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, uniqueName);
        await writeFile(filePath, new Uint8Array(buffer));
        fileUrl = `/uploads/${uniqueName}`;
        console.log(`[parseitems] File saved locally: ${fileUrl} - route.ts:388`);
      } catch (localErr) {
        console.error("[parseitems] Local save also failed: - route.ts:390", localErr);
      }
    }

    return NextResponse.json({ items, count: items.length, fileUrl, fileName: file.name });
  } catch (error) {
    console.error("[parseitems] Error: - route.ts:396", error);
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 500 });
  }
}
