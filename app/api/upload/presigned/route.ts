import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { fileName, contentType, isPublic } = await req.json();
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, isPublic ?? true);

    // Gerar URL pública do arquivo para acesso direto
    const bucketName = process.env.AWS_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "us-east-1";
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;

    return NextResponse.json({ uploadUrl, cloud_storage_path, fileUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao gerar URL" }, { status: 500 });
  }
}
