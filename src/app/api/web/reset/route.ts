import { NextResponse } from "next/server";
import { STARTER_SITE } from "@/lib/agents/starter-site";
import { createClient } from "@/lib/supabase/server";

// Vuelve a la web original sin borrar el historial: deja una entrada "terminada"
// con la web de partida, que pasa a ser la base de la siguiente petición.
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("runs")
    .insert({
      request: "Volver a la web original",
      status: "completed",
      files: STARTER_SITE,
      summary: "La web vuelve a estar como al principio. La próxima petición parte de aquí.",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("agent_events").insert({
    run_id: data.id,
    agent: "orchestrator",
    kind: "info",
    message: "Web reiniciada: se vuelve a la web original.",
    payload: { base_run_id: null, reset: true },
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
