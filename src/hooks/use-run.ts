"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentEvent, Run, Task } from "@/lib/agents/types";
import { createClient } from "@/lib/supabase/client";

type RunData = { run: Run | null; tasks: Task[]; events: AgentEvent[]; loaded: boolean; missing: boolean };

const EMPTY: RunData = { run: null, tasks: [], events: [], loaded: false, missing: false };

// Carga una petición con sus tareas y eventos, y la mantiene al día con Supabase Realtime.
// refresh() permite releer todo (lo usa el motor tras cada paso, por si se pierde algún evento).
export function useRun(runId: string) {
  const [data, setData] = useState<RunData>(EMPTY);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [run, tasks, events] = await Promise.all([
      supabase.from("runs").select("*").eq("id", runId).maybeSingle(),
      supabase.from("tasks").select("*").eq("run_id", runId).order("position"),
      supabase.from("agent_events").select("*").eq("run_id", runId).order("id"),
    ]);
    setData({
      run: (run.data as Run) ?? null,
      tasks: (tasks.data as Task[]) ?? [],
      events: (events.data as AgentEvent[]) ?? [],
      loaded: true,
      missing: !run.data,
    });
  }, [runId]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase
      .channel(`run:${runId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "runs", filter: `id=eq.${runId}` }, (p) => {
        setData((d) => ({ ...d, run: { ...d.run, ...(p.new as Run) } }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `run_id=eq.${runId}` }, (p) => {
        const task = p.new as Task;
        if (!task?.id) return;
        setData((d) => {
          const others = d.tasks.filter((t) => t.id !== task.id);
          return { ...d, tasks: [...others, task].sort((a, b) => a.position - b.position) };
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events", filter: `run_id=eq.${runId}` }, (p) => {
        const event = p.new as AgentEvent;
        setData((d) => (d.events.some((e) => e.id === event.id) ? d : { ...d, events: [...d.events, event] }));
      })
      .subscribe();

    // Primera carga (después de suscribirse, para no perder cambios entre medias)
    Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [runId, refresh]);

  return { ...data, refresh };
}
