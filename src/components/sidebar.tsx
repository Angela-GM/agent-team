"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { NewRunForm } from "./new-run-form";
import { RunHistory } from "./run-history";

// En escritorio siempre visible. En el móvil, dentro de una petición, se pliega
// para que lo primero que se vea sea el trabajo de los agentes.
export function Sidebar() {
  const params = useParams<{ id?: string }>();
  const inRun = Boolean(params?.id);
  const [openInRun, setOpenInRun] = useState(false);
  const open = !inRun || openInRun;

  return (
    <aside className="flex flex-col gap-4 border-b border-line p-4 md:sticky md:top-0 md:h-[calc(100dvh-57px)] md:w-80 md:shrink-0 md:gap-6 md:border-r md:border-b-0 md:p-5">
      {inRun && (
        <button
          type="button"
          onClick={() => setOpenInRun((o) => !o)}
          aria-expanded={openInRun}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm font-medium md:hidden"
        >
          {openInRun ? "Ocultar nueva petición e historial" : "Nueva petición e historial"}
        </button>
      )}
      <div className={`${open ? "flex" : "hidden"} min-h-0 flex-1 flex-col gap-6 md:flex`}>
        <NewRunForm />
        <RunHistory />
      </div>
    </aside>
  );
}
