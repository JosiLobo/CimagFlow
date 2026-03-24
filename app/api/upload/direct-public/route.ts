import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Upload direto: tenta S3 primeiro, fallback para armazenamento local
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo excede o tamanho máximo de 20MB" },
        { status: 400 }
      );
    }

    // Sanitizar nome do arquivo
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;

    // Tentar upload via S3 primeiro
    try {
      const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
        safeName,
        file.type,
        true
      );

      // Upload server-side para o S3
      const arrayBuffer = await file.arrayBuffer();
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: arrayBuffer,
        headers: { "Content-Type": file.type, "Content-Disposition": "inline" },
      });

      if (s3Response.ok) {
        return NextResponse.json({
          fileUrl: cloud_storage_path,
          fileName: file.name,
          cloud_storage_path,
          storage: "s3",
        });
      }
      // Se o upload S3 falhou, cai no fallback local abaixo
      console.warn("S3 upload failed, falling back to local storage");
    } catch (s3Error) {
      console.warn("S3 not available, using local storage:", (s3Error as Error).message);
    }

    // Fallback: salvar localmente em public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueName);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(filePath, bytes);

    const fileUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      cloud_storage_path: fileUrl,
      storage: "local",
    });
  } catch (error) {
    console.error("Erro no upload direto:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do arquivo" },
      { status: 500 }
    );
  }
}
