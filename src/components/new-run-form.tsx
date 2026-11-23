"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  "Añade una página de contacto a esta web",
  "Añade una sección de horarios con los días y horas de apertura",
  "Crea una página de carta con todos los productos y sus precios",
  "Haz que el menú se convierta en un botón desplegable en el móvil",
];

export function NewRunForm() {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(json.error ?? "No se ha podido crear la petición.");
      return;
    }
    setRequest("");
    router.push(`/runs/${json.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="request" className="text-sm font-semibold">
        ¿Qué quieres cambiar en la web?
      </label>
      <textarea
        id="request"
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        rows={3}
        maxLength={2000}
        required
        placeholder="Por ejemplo: añade una página de contacto"
        className="resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-orchestrator"
      />
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setRequest(ex)}
            className="rounded-full border border-line px-2.5 py-1 text-left text-xs text-muted hover:border-orchestrator hover:text-ink"
          >
            {ex}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending || request.trim().length < 3}
        className="rounded-lg bg-orchestrator px-4 py-2 text-sm font-semibold text-surface hover:opacity-90 disabled:opacity-50"
      >
        {sending ? "Enviando…" : "Enviar al equipo"}
      </button>
    </form>
  );
}
