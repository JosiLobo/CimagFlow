import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { cloud_storage_path, isPublic } = await req.json();

    // If already a direct URL or local public path, return as-is.
    if (typeof cloud_storage_path === "string") {
      if (cloud_storage_path.startsWith("http://") || cloud_storage_path.startsWith("https://") || cloud_storage_path.startsWith("/")) {
        return NextResponse.json({ url: cloud_storage_path });
      }
    }

    const url = await getFileUrl(cloud_storage_path, isPublic ?? true);
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao obter URL" }, { status: 500 });
  }
}
