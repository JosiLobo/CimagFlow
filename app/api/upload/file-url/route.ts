import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl } from "@/lib/s3";
import { getBucketConfig } from "@/lib/aws-config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { cloud_storage_path, download } = await req.json();

    if (typeof cloud_storage_path !== "string" || !cloud_storage_path) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }

    // Local public path — return as-is
    if (cloud_storage_path.startsWith("/")) {
      return NextResponse.json({ url: cloud_storage_path });
    }

    // S3 full URL — extract the key
    let key = cloud_storage_path;
    if (cloud_storage_path.startsWith("https://") || cloud_storage_path.startsWith("http://")) {
      const { bucketName, region } = getBucketConfig();
      const s3Prefix = `https://${bucketName}.s3.${region}.amazonaws.com/`;
      const s3PrefixAlt = `https://${bucketName}.s3.amazonaws.com/`;
      if (cloud_storage_path.startsWith(s3Prefix)) {
        key = cloud_storage_path.slice(s3Prefix.length);
      } else if (cloud_storage_path.startsWith(s3PrefixAlt)) {
        key = cloud_storage_path.slice(s3PrefixAlt.length);
      } else {
        // External URL not from our bucket
        return NextResponse.json({ url: cloud_storage_path });
      }
    }

    const url = await getFileUrl(key, download ?? false);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Erro ao gerar URL:", error);
    return NextResponse.json({ error: "Erro ao obter URL" }, { status: 500 });
  }
}
