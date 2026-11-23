import { NextResponse, type NextRequest } from "next/server";
import { step } from "@/lib/agents/engine";
import { createClient } from "@/lib/supabase/server";

// Un paso = una llamada al modelo (con su cadena de alternativas, máx. 100 s; ver LLM_BUDGET_MS).
// 120 s entra en el plan gratuito de Vercel.
export const maxDuration = 120;

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/runs/[id]/step">) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const result = await step(supabase, id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
