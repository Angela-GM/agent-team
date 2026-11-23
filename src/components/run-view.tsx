"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRun } from "@/hooks/use-run";
import { useRunDriver, type DriverState } from "@/hooks/use-run-driver";
import { AGENTS, RUN_STATUS } from "@/lib/agents/labels";
import type { AgentName, Run, Task } from "@/lib/agents/types";
import { AgentPanel, type AgentActivity } from "./agent-panel";
import { formatDuration } from "./format";
import { ResultPanel } from "./result-panel";
import { TaskTrack } from "./task-track";

export function RunView({ runId }: { runId: string }) {
  const { run, tasks, events, loaded, missing, refresh } = useRun(runId);
  const driver = useRunDriver(runId, run?.status, refresh);

  if (!loaded) return <p className="p-6 text-muted">Cargando la petición…</p>;
  if (missing || !run) {
    return (
      <div className="p-6">
        <p className="mb-2 font-medium">No se encuentra esta petición.</p>
        <Link href="/" className="text-orchestrator underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const active = activeAgent(run, tasks);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <RunHeader run={run} tasks={tasks} driver={driver} />

      <div className="grid gap-4 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <AgentPanel
            key={a.id}
            agent={a.id}
            activity={activityOf(a.id, run, active, events.some((e) => e.agent === a.id))}
            events={events.filter((e) => e.agent === a.id)}
          />
        ))}
      </div>

      <section aria-label="Tareas">
        <h2 className="mb-3 text-lg font-semibold">Tareas</h2>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
            {run.status === "planning"
              ? "El Orquestador está dividiendo la petición en tareas…"
              : "Esta petición no tiene tareas."}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {tasks.map((t) => (
              <TaskTrack key={t.id} task={t} total={tasks.length} events={events.filter((e) => e.task_id === t.id)} />
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Resultado">
        <h2 className="mb-3 text-lg font-semibold">La web</h2>
        <ResultPanel files={run.files} events={events} />
      </section>
    </div>
  );
}

// Quién tiene el turno ahora, según el estado guardado en la base de datos.
function activeAgent(run: Run, tasks: Task[]): AgentName | null {
  if (run.status === "planning") return "orchestrator";
  if (run.status !== "running") return null;
  const current = tasks.find((t) => t.status !== "passed" && t.status !== "failed");
  if (!current) return "orchestrator";
  if (current.status === "testing") return "tester";
  if (current.status === "developing") return "developer";
  return "orchestrator";
}

function activityOf(agent: AgentName, run: Run, active: AgentName | null, hasEvents: boolean): AgentActivity {
  if (run.status === "completed" || run.status === "failed") return hasEvents ? "done" : "idle";
  if (agent === active) return "working";
  return "waiting";
}

function RunHeader({ run, tasks, driver }: { run: Run; tasks: Task[]; driver: DriverState }) {
  const passed = tasks.filter((t) => t.status === "passed").length;
  const finished = run.status === "completed" || run.status === "failed";
  const statusColor =
    run.status === "completed" ? "var(--pass)" : run.status === "failed" ? "var(--fail)" : "var(--orchestrator)";

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full px-2.5 py-0.5 font-semibold text-surface" style={{ background: statusColor }}>
          {RUN_STATUS[run.status]}
        </span>
        {tasks.length > 0 && (
          <span className="text-muted">
            {passed} de {tasks.length} tareas aprobadas
          </span>
        )}
        <Elapsed from={run.created_at} to={finished ? run.updated_at : null} />
        <DriverNote driver={driver} />
      </div>
      <h1 className="text-2xl leading-snug font-semibold text-balance md:text-3xl">{run.request}</h1>
      {run.summary && <p className="max-w-3xl text-muted">{run.summary}</p>}
      {run.error && <p className="text-fail">Se ha detenido: {run.error}</p>}
    </header>
  );
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

function Elapsed({ from, to }: { from: string; to: string | null }) {
  const now = useNow(to === null);
  const end = to ? new Date(to).getTime() : now;
  return <span className="text-muted tabular-nums">{formatDuration(end - new Date(from).getTime())}</span>;
}

function DriverNote({ driver }: { driver: DriverState }) {
  const now = useNow(driver.kind === "waiting");
  if (driver.kind === "waiting") {
    const s = Math.max(0, Math.ceil((driver.until - now) / 1000));
    return (
      <span className="text-developer">
        {driver.reason}. Sigue en {s} s.
      </span>
    );
  }
  if (driver.kind === "error") return <span className="text-fail">Se ha parado: {driver.message}. Recarga la página para reintentar.</span>;
  return null;
}
