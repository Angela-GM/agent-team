import { Suspense } from "react";
import { RunView } from "@/components/run-view";

export default function RunPage({ params }: PageProps<"/runs/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Cargando la petición…</p>}>
      <RunPageContent params={params} />
    </Suspense>
  );
}

async function RunPageContent({ params }: { params: PageProps<"/runs/[id]">["params"] }) {
  const { id } = await params;
  return <RunView key={id} runId={id} />;
}
