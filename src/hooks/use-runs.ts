"use client";

import { useEffect, useState } from "react";
import type { RunStatus } from "@/lib/agents/types";
import { createClient } from "@/lib/supabase/client";

export type RunSummary = { id: string; request: string; status: RunStatus; created_at: string };

// Historial de peticiones del usuario, en directo.
export function useRuns() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("runs")
        .select("id, request, status, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) setRuns((data as RunSummary[]) ?? []);
    };

    const channel = supabase
      .channel("runs:list")
      .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, (p) => {
        const row = p.new as RunSummary;
        if (!row?.id) return;
        setRuns((list) => {
          const rest = (list ?? []).filter((r) => r.id !== row.id);
          const merged = { id: row.id, request: row.request, status: row.status, created_at: row.created_at };
          return [merged, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
        });
      })
      .subscribe();

    Promise.resolve().then(load);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return runs;
}
