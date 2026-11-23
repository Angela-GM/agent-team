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

  useEffect(() => {
    let cancelled = false;
    getLatestWeb(createClient()).then((web) => {
      if (!cancelled) setLatest(web);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Web actual">
      <h2 className="mb-1 text-lg font-semibold">La web actual</h2>
      <p className="mb-3 text-sm text-muted">
        {latest === undefined ? (
          "Cargando…"
        ) : latest ? (
          <>
            Así la dejó la última petición,{" "}
            <Link href={`/runs/${latest.id}`} className="text-orchestrator underline">
              «{latest.request}»
            </Link>
            . La próxima parte de aquí, salvo que marques «Empezar desde la web original».
          </>
        ) : (
          "La web de partida, de una panadería. Los agentes solo pueden tocar sus archivos HTML, CSS y JavaScript."
        )}
      </p>
      {latest !== undefined && <ResultPanel files={latest?.files ?? STARTER_SITE} events={[]} />}
    </section>
  );
}
