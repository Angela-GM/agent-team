import { agentById } from "@/lib/agents/labels";
import type { AgentEvent, AgentName } from "@/lib/agents/types";
import { formatTime } from "./format";

export type AgentActivity = "working" | "waiting" | "idle" | "done";

const ACTIVITY_LABEL: Record<AgentActivity, string> = {
  working: "Trabajando",
  waiting: "Esperando turno",
  idle: "Sin trabajo",
  done: "Ha terminado",
};

export function AgentPanel({
  agent,
  activity,
  events,
}: {
  agent: AgentName;
  activity: AgentActivity;
  events: AgentEvent[];
}) {
  const info = agentById(agent);
  const latest = events.at(-1);
  const history = events.slice(-5, -1).reverse();

  return (
    <section
      aria-label={`Agente ${info.name}`}
      className="flex min-w-0 flex-col rounded-xl border border-line bg-surface"
      style={{ borderTopColor: info.color, borderTopWidth: 3 }}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <h3 className={`text-base font-semibold ${info.text}`}>{info.name}</h3>
          <p className="text-xs text-muted">{info.role}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium" aria-live="polite">
          <span
            className={`size-2 rounded-full ${activity === "working" ? "animate-working" : ""}`}
            style={{ background: activity === "working" || activity === "done" ? info.color : "var(--line)" }}
          />
          {ACTIVITY_LABEL[activity]}
        </span>
      </header>

      <div className="flex-1 px-4 py-3">
        {latest ? (
          <p className={`text-sm leading-relaxed ${latest.kind === "error" ? "text-fail" : ""}`}>
            {latest.message}
          </p>
        ) : (
          <p className="text-sm text-muted">Todavía no ha hecho nada en esta petición.</p>
        )}
      </div>

      {history.length > 0 && (
        <ol className="space-y-1.5 border-t border-line px-4 py-3">
          {history.map((e) => (
            <li key={e.id} className="flex gap-2 text-xs text-muted">
              <time className="shrink-0 tabular-nums">{formatTime(e.created_at)}</time>
              <span className={`line-clamp-2 ${e.kind === "error" ? "text-fail" : ""}`}>{e.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
