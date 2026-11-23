"use client";

import { useEffect, useRef, useState } from "react";
import type { RunStatus } from "@/lib/agents/types";

export type DriverState =
  | { kind: "idle" }
  | { kind: "stepping" }
  | { kind: "waiting"; until: number; reason: string }
  | { kind: "error"; message: string };

type StepResponse =
  | { state: "advanced" | "done"; runStatus: RunStatus }
  | { state: "busy" }
  | { state: "retry"; retryAfter: number; message: string }
  | { error: string };

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

// Mientras la petición está en marcha y la página abierta, pide al servidor el
// siguiente paso una y otra vez. Cada paso es una llamada corta; el estado vive
// en Supabase, así que si se cierra la pestaña el trabajo se retoma al volver.
export function useRunDriver(runId: string, status: RunStatus | undefined, onStep: () => void) {
  const [state, setState] = useState<DriverState>({ kind: "idle" });
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  const active = status === "planning" || status === "running";

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      let failures = 0;
      while (!signal.aborted) {
        setState({ kind: "stepping" });
        let result: StepResponse;
        try {
          const res = await fetch(`/api/runs/${runId}/step`, { method: "POST", signal });
          result = await res.json();
        } catch {
          if (signal.aborted) return;
          result = { error: "Sin conexión con el servidor" };
        }
        if (signal.aborted) return;
        onStepRef.current();

        if ("error" in result) {
          failures += 1;
          if (failures >= 3) {
            setState({ kind: "error", message: result.error });
            return;
          }
          await sleep(3000, signal);
          continue;
        }
        failures = 0;

        if (result.state === "done") {
          setState({ kind: "idle" });
          return;
        }
        if (result.state === "retry") {
          setState({ kind: "waiting", until: Date.now() + result.retryAfter * 1000, reason: "El modelo está saturado" });
          await sleep(result.retryAfter * 1000, signal);
        } else if (result.state === "busy") {
          // Otra pestaña está ejecutando este paso: esperamos y seguimos mirando.
          setState({ kind: "waiting", until: Date.now() + 3000, reason: "Otra pestaña está ejecutando este paso" });
          await sleep(3000, signal);
        }
      }
    })();

    return () => controller.abort();
  }, [runId, active]);

  return active ? state : { kind: "idle" as const };
}
