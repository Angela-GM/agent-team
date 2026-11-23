"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLatestWeb, type LatestWeb } from "@/lib/agents/latest-web";
import { STARTER_SITE } from "@/lib/agents/starter-site";
import { createClient } from "@/lib/supabase/client";
import { ResultPanel } from "./result-panel";

// La web tal como está ahora: la que dejó la última petición terminada, o la original.
export function CurrentWeb() {
  const [latest, setLatest] = useState<LatestWeb | null | undefined>(undefined);
  const [resetting, setResetting] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getLatestWeb(createClient()).then((web) => {
      if (!cancelled) setLatest(web);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function reset() {
    if (!confirm("La próxima petición partirá de la web original. El historial se mantiene. ¿Continuar?")) return;
    setResetting(true);
    await fetch("/api/web/reset", { method: "POST" });
    setResetting(false);
    setVersion((v) => v + 1);
  }

  const isOriginal = !latest || latest.request === "Volver a la web original";

  return (
    <section aria-label="Web actual">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">La web actual</h2>
        {latest && !isOriginal && (
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-surface disabled:opacity-50"
          >
            {resetting ? "Volviendo…" : "Volver a la web original"}
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        {latest === undefined ? (
          "Cargando…"
        ) : !isOriginal ? (
          <>
            Así la dejó la última petición,{" "}
            <Link href={`/runs/${latest!.id}`} className="text-orchestrator underline">
              «{latest!.request}»
            </Link>
            . La próxima parte de aquí.
          </>
        ) : (
          "La web de partida, de una panadería. Los agentes solo pueden tocar sus archivos HTML, CSS y JavaScript. Cada petición parte de cómo dejó la web la anterior."
        )}
      </p>
      {latest !== undefined && <ResultPanel files={latest?.files ?? STARTER_SITE} events={[]} />}
    </section>
  );
}
