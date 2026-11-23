import { NextResponse, type NextRequest } from "next/server";
import { STARTER_SITE } from "@/lib/agents/starter-site";
import { createClient } from "@/lib/supabase/server";

// Límite para proteger la cuota gratuita del modelo.
const MAX_RUNS_PER_DAY = 20;

// Crea una petición nueva. Los agentes se ponen en marcha llamando a /api/runs/[id]/step.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const request = String(body.request ?? "").trim();
  if (request.length < 3 || request.length > 2000) {
    return NextResponse.json({ error: "La petición debe tener entre 3 y 2000 caracteres." }, { status: 400 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_RUNS_PER_DAY) {
    return NextResponse.json(
      { error: `Has llegado al límite de ${MAX_RUNS_PER_DAY} peticiones en 24 h.` },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("runs")
    .insert({ request, files: STARTER_SITE })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("agent_events").insert({
    run_id: data.id,
    agent: "orchestrator",
    kind: "info",
    message: `Petición recibida: «${request}»`,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
