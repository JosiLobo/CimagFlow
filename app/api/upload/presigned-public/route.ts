import { NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

// API pública para gerar URLs de upload (sem autenticação)
// Usada no formulário público de demandas
export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json();

    // Validar tipo de arquivo permitido
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido" },
        { status: 400 }
      );
    }

    // Validar nome do arquivo
    if (!fileName || fileName.length > 255) {
      return NextResponse.json(
        { error: "Nome de arquivo inválido" },
        { status: 400 }
      );
    }

    // Gerar URL de upload (público)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      true // isPublic
    );

    // Gerar URL pública do arquivo para acesso direto
    const bucketName = process.env.AWS_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "us-east-1";
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path,
      fileUrl,
      fileName,
    });

  } catch (error) {
    console.error("Erro ao gerar URL de upload público: - route.ts:63", error);
    return NextResponse.json(
      { error: "Erro ao gerar URL de upload" },
      { status: 500 }
    );
  }
}
