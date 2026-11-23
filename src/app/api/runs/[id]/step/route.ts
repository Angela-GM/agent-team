import { NextResponse, type NextRequest } from "next/server";
import { step } from "@/lib/agents/engine";
import { createClient } from "@/lib/supabase/server";

// Un paso = una llamada al modelo. 60 s es de sobra y entra en el plan gratuito de Vercel.
export const maxDuration = 60;

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
