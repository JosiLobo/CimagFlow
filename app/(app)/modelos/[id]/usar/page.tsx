import { Suspense } from "react";
import UsarModeloClient from "./_components/usar-modelo-client";

export const dynamic = "force-dynamic";

export default async function UsarModeloPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await Promise.resolve(params);
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full" /></div>}>
      <UsarModeloClient templateId={resolvedParams.id} />
    </Suspense>
  );
}
