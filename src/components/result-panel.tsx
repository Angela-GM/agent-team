"use client";

import { useEffect, useRef, useState } from "react";
import { agentById } from "@/lib/agents/labels";
import type { AgentEvent, Files } from "@/lib/agents/types";
import { buildPreview } from "@/lib/preview";
import { formatTime } from "./format";

type Tab = "preview" | "code" | "log";

const TABS: { id: Tab; label: string }[] = [
  { id: "preview", label: "Vista previa" },
  { id: "code", label: "Código" },
  { id: "log", label: "Registro completo" },
];

export function ResultPanel({ files, events }: { files: Files; events: AgentEvent[] }) {
  const [tab, setTab] = useState<Tab>("preview");

  return (
    <section aria-label="Resultado" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div role="tablist" className="flex gap-1 border-b border-line px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "preview" && <Preview files={files} />}
      {tab === "code" && <Code files={files} />}
      {tab === "log" && <Log events={events} />}
    </section>
  );
}

function Preview({ files }: { files: Files }) {
  const pages = Object.keys(files).filter((p) => p.endsWith(".html")).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  const [chosen, setChosen] = useState("index.html");
  const page = pages.includes(chosen) ? chosen : (pages[0] ?? "index.html");
  const frame = useRef<HTMLIFrameElement>(null);
  // El React Compiler ya memoriza esto; no hace falta useMemo.
  const srcDoc = buildPreview(files, page);

  // Los enlaces dentro de la vista previa avisan al padre para cambiar de página.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "agent-team:navigate" && typeof e.data.path === "string") setChosen(e.data.path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken px-3 py-2 text-sm">
        <span className="text-muted">Página</span>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setChosen(p)}
            className={`rounded-md px-2 py-0.5 font-mono text-xs ${p === page ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}
          >
            {p}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">Solo incluye el código que ha aprobado Testing</span>
      </div>
      <iframe
        ref={frame}
        title={`Vista previa de ${page}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms"
        className="h-[520px] w-full bg-white"
      />
    </div>
  );
}

function Code({ files }: { files: Files }) {
  const paths = Object.keys(files).sort();
  const [chosen, setChosen] = useState(paths[0]);
  const path = paths.includes(chosen) ? chosen : paths[0];

  return (
    <div className="grid md:grid-cols-[12rem_1fr]">
      <ul className="flex gap-1 overflow-x-auto border-b border-line bg-sunken p-2 md:flex-col md:border-r md:border-b-0">
        {paths.map((p) => (
          <li key={p}>
            <button
              onClick={() => setChosen(p)}
              className={`w-full rounded-md px-2 py-1 text-left font-mono text-xs whitespace-nowrap ${p === path ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
      <pre className="h-[520px] overflow-auto p-4 font-mono text-xs leading-relaxed">
        <code>{files[path]}</code>
      </pre>
    </div>
  );
}

function Log({ events }: { events: AgentEvent[] }) {
  return (
    <ol className="max-h-[560px] divide-y divide-line overflow-auto">
      {events.map((e) => {
        const agent = agentById(e.agent);
        const model = typeof e.payload?.model === "string" ? e.payload.model : null;
        const ms = typeof e.payload?.ms === "number" ? e.payload.ms : null;
        return (
          <li key={e.id} className="flex gap-3 px-4 py-2 text-sm">
            <time className="w-16 shrink-0 text-xs text-muted tabular-nums">{formatTime(e.created_at)}</time>
            <span className={`w-24 shrink-0 text-xs font-semibold ${agent.text}`}>{agent.name}</span>
            <span className={`min-w-0 flex-1 ${e.kind === "error" ? "text-fail" : e.kind === "thinking" ? "text-muted" : ""}`}>
              {e.message}
              {model && (
                <span className="ml-2 text-xs text-muted">
                  {model}
                  {ms !== null && `, ${(ms / 1000).toFixed(1)} s`}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
