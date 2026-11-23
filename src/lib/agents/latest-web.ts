import type { SupabaseClient } from "@supabase/supabase-js";
import type { Files } from "./types";

export type LatestWeb = { id: string; request: string; files: Files };

// Última petición terminada del usuario: su web es el punto de partida de la siguiente.
// Sirve en servidor y en navegador (RLS limita a las peticiones propias).
export async function getLatestWeb(db: SupabaseClient): Promise<LatestWeb | null> {
  const { data } = await db
    .from("runs")
    .select("id, request, files")
    .in("status", ["completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LatestWeb) ?? null;
}
