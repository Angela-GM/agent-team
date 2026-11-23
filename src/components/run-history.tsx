"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRuns } from "@/hooks/use-runs";
import { RUN_STATUS } from "@/lib/agents/labels";
import type { RunStatus } from "@/lib/agents/types";
import { formatDate } from "./format";

const DOT: Record<RunStatus, string> = {
  planning: "var(--orchestrator)",
  running: "var(--orchestrator)",
  completed: "var(--pass)",
  failed: "var(--fail)",
};

export function RunHistory() {
  const runs = useRuns();
  const params = useParams<{ id?: string }>();

  return (
    <nav aria-label="Peticiones anteriores" className="flex min-h-0 flex-col gap-2">
      <h2 className="text-sm font-semibold">Peticiones anteriores</h2>
      {runs === null ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay ninguna. Empieza con uno de los ejemplos.</p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-0.5 overflow-y-auto">
          {runs.map((r) => {
            const current = params?.id === r.id;
            return (
              <li key={r.id}>
                <Link
                  href={`/runs/${r.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`flex gap-2 rounded-lg px-2 py-1.5 text-sm ${current ? "bg-surface font-medium" : "hover:bg-surface"}`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${r.status === "running" || r.status === "planning" ? "animate-working" : ""}`}
                    style={{ background: DOT[r.status] }}
                    title={RUN_STATUS[r.status]}
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2">{r.request}</span>
                    <span className="text-xs text-muted">
                      {formatDate(r.created_at)}, {RUN_STATUS[r.status].toLowerCase()}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
