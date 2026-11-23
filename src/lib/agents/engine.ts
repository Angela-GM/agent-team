import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LlmUnavailableError } from "@/lib/llm";
import { developTask } from "./developer";
import { planTasks } from "./orchestrator";
import { formatIssues, testTask } from "./tester";
import type { AgentName, EventKind, Run, Task } from "./types";

// El bucle Orquestador -> Develop -> Testing se ejecuta paso a paso.
// Cada llamada a step() hace UNA acción (planificar, desarrollar o testear),
// la guarda en la base de datos y termina. Así cada petición dura pocos segundos
// y no choca con el tiempo máximo de las funciones de Vercel. El estado entero
// vive en Supabase, de modo que el bucle se puede retomar desde cualquier pestaña.

export type StepResult =
  | { state: "advanced"; runStatus: Run["status"] }
  | { state: "done"; runStatus: Run["status"] }
  | { state: "busy" }
  | { state: "retry"; retryAfter: number; message: string };

type Db = SupabaseClient;

// «Hasta que todo pasa», con un tope: si Testing nunca aprueba, el bucle no puede
// gastar la cuota del modelo sin fin. Tras 5 intentos la tarea se marca como fallida.
export const MAX_ATTEMPTS = 5;

export async function step(db: Db, runId: string): Promise<StepResult> {
  // El bloqueo dura más que el paso más largo posible (maxDuration = 120 s).
  const { data: claimed, error: claimError } = await db.rpc("claim_run_step", { p_run_id: runId, p_seconds: 150 });
  if (claimError) throw claimError;

  if (!claimed) {
    const { data: run } = await db.from("runs").select("status").eq("id", runId).single();
    if (run && (run.status === "completed" || run.status === "failed")) {
      return { state: "done", runStatus: run.status };
    }
    return { state: "busy" };
  }

  let agent: AgentName = "orchestrator";
  let taskId: string | null = null;

  try {
    const run = await getRun(db, runId);

    if (run.status === "planning") {
      await plan(db, run);
      return { state: "advanced", runStatus: "running" };
    }

    const tasks = await getTasks(db, runId);
    const current = tasks.find((t) => t.status !== "passed" && t.status !== "failed");

    if (!current) {
      const status = await finish(db, run, tasks);
      return { state: "done", runStatus: status };
    }

    taskId = current.id;
    if (current.status === "testing") {
      agent = "tester";
      await test(db, run, current);
    } else {
      agent = "developer";
      await develop(db, run, current, tasks);
    }
    return { state: "advanced", runStatus: "running" };
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      await log(db, runId, taskId, agent, "error", `El modelo está saturado. Reintento en ${err.retryAfterSeconds} s.`, {
        detail: err.message,
      });
      return { state: "retry", retryAfter: err.retryAfterSeconds, message: err.message };
    }

    const message = err instanceof Error ? err.message : String(err);
    await log(db, runId, taskId, agent, "error", `Error inesperado: ${message}`);
    // No dejar la tarea en curso colgada en "en desarrollo" o "en testing".
    if (taskId) await db.from("tasks").update({ status: "failed", agent: null }).eq("id", taskId);
    await db.from("runs").update({ status: "failed", error: message }).eq("id", runId);
    return { state: "done", runStatus: "failed" };
  } finally {
    await db.rpc("release_run_step", { p_run_id: runId });
  }
}

// ---------- Orquestador ----------

async function plan(db: Db, run: Run) {
  await log(db, run.id, null, "orchestrator", "thinking", "Analizando la petición y la web actual…");

  const { data, model, ms } = await planTasks(run.request, run.files);

  const rows = data.tasks.map((t, i) => ({
    run_id: run.id,
    position: i + 1,
    title: t.title,
    description: t.description,
    acceptance: t.acceptance,
    status: "pending",
    max_attempts: MAX_ATTEMPTS,
  }));
  const { error } = await db.from("tasks").insert(rows);
  if (error) throw error;

  await db.from("runs").update({ status: "running", summary: data.summary }).eq("id", run.id);
  await log(db, run.id, null, "orchestrator", "output", `Plan listo: ${data.tasks.length} tarea(s). ${data.summary}`, {
    model,
    ms,
    tasks: data.tasks.map((t) => t.title),
  });
}

async function finish(db: Db, run: Run, tasks: Task[]) {
  const passed = tasks.filter((t) => t.status === "passed").length;
  const failed = tasks.length - passed;
  const status = failed === 0 ? "completed" : "failed";
  const message =
    failed === 0
      ? `Petición terminada: las ${tasks.length} tareas han pasado Testing.`
      : `Petición terminada con ${failed} tarea(s) sin superar Testing tras el máximo de intentos.`;

  await db.from("runs").update({ status }).eq("id", run.id);
  await log(db, run.id, null, "orchestrator", failed === 0 ? "output" : "error", message, { passed, failed });
  return status;
}

// ---------- Develop ----------

async function develop(db: Db, run: Run, task: Task, tasks: Task[]) {
  const attempt = task.attempts + 1;

  if (task.status === "pending") {
    await log(db, run.id, task.id, "orchestrator", "info", `Asigna la tarea ${task.position}/${tasks.length} a Develop: «${task.title}».`);
  }

  await updateTask(db, task.id, { status: "developing", agent: "developer" });
  await log(
    db,
    run.id,
    task.id,
    "developer",
    "thinking",
    attempt === 1 ? `Trabajando en «${task.title}»…` : `Corrigiendo los fallos de Testing (intento ${attempt}/${task.max_attempts})…`,
  );

  const { data, model, ms } = await developTask(task, run.files);

  await updateTask(db, task.id, { status: "testing", agent: "tester", attempts: attempt, files: data.files });
  const changed = Object.keys(data.files).length;
  const fallback = changed ? "Cambios listos para revisar." : "No hace falta cambiar archivos: la web ya cumple la tarea.";
  await log(db, run.id, task.id, "developer", "output", data.notes || fallback, {
    model,
    ms,
    attempt,
    files: Object.keys(data.files),
  });
}

// ---------- Testing ----------

async function test(db: Db, run: Run, task: Task) {
  // El Orquestador reparte el trabajo a los dos: también es quien pasa la tarea a Testing.
  await log(db, run.id, task.id, "orchestrator", "info", `Pasa «${task.title}» a Testing para que la revise.`);
  await log(db, run.id, task.id, "tester", "thinking", `Revisando «${task.title}» (intento ${task.attempts}/${task.max_attempts})…`);

  const { data, model, ms } = await testTask(task, run.files);
  const meta = { model, ms, attempt: task.attempts, issues: data.issues, staticIssues: data.staticIssues };

  if (data.passed) {
    // Solo el código aprobado se incorpora a la web.
    const files = { ...run.files, ...task.files };
    await db.from("runs").update({ files }).eq("id", run.id);
    await updateTask(db, task.id, { status: "passed", agent: null, feedback: null });
    await log(db, run.id, task.id, "tester", "output", `Aprobada. ${data.summary}`, meta);
    return;
  }

  const feedback = formatIssues(data.issues);

  if (task.attempts >= task.max_attempts) {
    await updateTask(db, task.id, { status: "failed", agent: null, feedback });
    await log(db, run.id, task.id, "tester", "error", `Sigue fallando tras ${task.attempts} intentos (${data.issues.length} fallo(s)).`, meta);
    await log(db, run.id, task.id, "orchestrator", "info", `Descarta «${task.title}» y pasa a la siguiente tarea.`);
    return;
  }

  await updateTask(db, task.id, { status: "developing", agent: "developer", feedback });
  await log(db, run.id, task.id, "tester", "output", `Rechazada: ${data.issues.length} fallo(s).`, meta);
  await log(
    db,
    run.id,
    task.id,
    "orchestrator",
    "info",
    `Devuelve «${task.title}» a Develop con los fallos de Testing (quedan ${task.max_attempts - task.attempts} intento(s)).`,
  );
}

// ---------- Utilidades ----------

async function getRun(db: Db, id: string) {
  const { data, error } = await db.from("runs").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Run;
}

async function getTasks(db: Db, runId: string) {
  const { data, error } = await db.from("tasks").select("*").eq("run_id", runId).order("position");
  if (error) throw error;
  return data as Task[];
}

async function updateTask(db: Db, id: string, patch: Partial<Task>) {
  const { error } = await db.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

async function log(
  db: Db,
  runId: string,
  taskId: string | null,
  agent: AgentName,
  kind: EventKind,
  message: string,
  payload?: Record<string, unknown>,
) {
  await db.from("agent_events").insert({ run_id: runId, task_id: taskId, agent, kind, message, payload: payload ?? null });
}
