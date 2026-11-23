"use client";

import { useState } from "react";
import { TASK_STATUS } from "@/lib/agents/labels";
import type { AgentEvent, Task, TestIssue } from "@/lib/agents/types";

// La pista de una tarea: Pendiente → Develop → Testing → Aprobada.
// El marcador avanza por las estaciones; cuando Testing rechaza, vuelve a Develop.
const STATIONS = [
  { key: "pending", label: "Pendiente", color: "var(--muted)" },
  { key: "developing", label: "Develop", color: "var(--developer)" },
  { key: "testing", label: "Testing", color: "var(--tester)" },
  { key: "passed", label: "Aprobada", color: "var(--pass)" },
] as const;

const POSITION: Record<Task["status"], number> = { pending: 0, developing: 1, testing: 2, passed: 3, failed: 3 };

export function TaskTrack({ task, events, total }: { task: Task; events: AgentEvent[]; total: number }) {
  const [open, setOpen] = useState(false);

  const position = POSITION[task.status];
  const failed = task.status === "failed";
  const rejections = events.filter((e) => e.agent === "tester" && Array.isArray(e.payload?.issues) && (e.payload.issues as unknown[]).length > 0);
  const lastIssues = (rejections.at(-1)?.payload?.issues ?? []) as TestIssue[];
  const files = Object.keys(task.files ?? {});
  const markerColor = failed ? "var(--fail)" : STATIONS[position].color;
  const isMoving = task.status === "developing" || task.status === "testing";

  return (
    <li className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 font-medium">
            <span className="mr-2 text-sm text-muted tabular-nums">
              {task.position}/{total}
            </span>
            {task.title}
          </p>
          <span
            className="shrink-0 text-xs font-semibold"
            style={{ color: failed ? "var(--fail)" : task.status === "passed" ? "var(--pass)" : "var(--muted)" }}
          >
            {TASK_STATUS[task.status]}
          </span>
        </div>

        {/* Pista */}
        <div className="relative" aria-hidden>
          <div className="absolute top-[7px] right-[7px] left-[7px] h-0.5 bg-line" />
          <div
            className="absolute top-[7px] left-[7px] h-0.5 transition-[width] duration-700 ease-out"
            style={{ width: `calc(${(position / 3) * 100}% - ${(position / 3) * 14}px)`, background: markerColor }}
          />
          <ol className="relative flex justify-between">
            {STATIONS.map((s, i) => {
              const reached = i <= position;
              const here = i === position;
              return (
                <li key={s.key} className="flex flex-col items-center gap-1 first:items-start last:items-end">
                  <span
                    className={`block size-4 rounded-full border-2 bg-surface transition-colors duration-500 ${here && isMoving ? "animate-working" : ""}`}
                    style={{
                      borderColor: reached ? (here ? markerColor : s.color) : "var(--line)",
                      background: here ? markerColor : reached ? s.color : undefined,
                    }}
                  />
                  <span className={`text-[11px] ${here ? "font-semibold" : "text-muted"}`} style={here ? { color: markerColor } : undefined}>
                    {i === 3 && failed ? "Fallida" : s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5" title={`Intentos: ${task.attempts} de ${task.max_attempts}`}>
            Intentos
            {Array.from({ length: task.max_attempts }, (_, i) => (
              <span
                key={i}
                className="size-2 rounded-full border"
                style={{
                  borderColor: i < task.attempts ? "var(--developer)" : "var(--line)",
                  background: i < task.attempts ? "var(--developer)" : "transparent",
                }}
              />
            ))}
          </span>
          {rejections.length > 0 && (
            <span style={{ color: "var(--fail)" }}>
              Testing la ha devuelto {rejections.length} {rejections.length === 1 ? "vez" : "veces"}
            </span>
          )}
          <span className="ml-auto">{open ? "Ocultar detalle" : "Ver detalle"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line bg-sunken px-4 py-4 text-sm">
          <p className="text-muted">{task.description}</p>

          <div>
            <h4 className="mb-1 font-semibold">Criterios de aceptación</h4>
            <ul className="list-disc space-y-0.5 pl-5">
              {task.acceptance.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          {lastIssues.length > 0 && (
            <div>
              <h4 className="mb-1 font-semibold" style={{ color: task.status === "passed" ? "var(--muted)" : "var(--fail)" }}>
                {task.status === "passed" ? "Fallos que se corrigieron en el último rechazo" : "Último informe de Testing"}
              </h4>
              <ul className="space-y-1.5">
                {lastIssues.map((issue, i) => (
                  <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
                    <span className="font-medium">{issue.criterion}:</span> {issue.problem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {files.length > 0 && (
            <p className="text-muted">
              Archivos que toca: <span className="font-mono text-ink">{files.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}
