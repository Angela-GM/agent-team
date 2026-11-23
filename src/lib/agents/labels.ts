import type { AgentName, RunStatus, TaskStatus } from "./types";

// Nombres y colores visibles. Sin "server-only": se usa en el navegador.
export const AGENTS: { id: AgentName; name: string; role: string; color: string; text: string; bg: string }[] = [
  {
    id: "orchestrator",
    name: "Orquestador",
    role: "Divide la petición en tareas y las reparte",
    color: "var(--orchestrator)",
    text: "text-orchestrator",
    bg: "bg-orchestrator",
  },
  {
    id: "developer",
    name: "Develop",
    role: "Escribe el código de cada tarea",
    color: "var(--developer)",
    text: "text-developer",
    bg: "bg-developer",
  },
  {
    id: "tester",
    name: "Testing",
    role: "Revisa el código y devuelve lo que falla",
    color: "var(--tester)",
    text: "text-tester",
    bg: "bg-tester",
  },
];

export const agentById = (id: AgentName) => AGENTS.find((a) => a.id === id)!;

export const TASK_STATUS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  developing: "En desarrollo",
  testing: "En testing",
  passed: "Aprobada",
  failed: "Fallida",
};

export const RUN_STATUS: Record<RunStatus, string> = {
  planning: "Planificando",
  running: "En marcha",
  completed: "Completada",
  failed: "Con fallos",
};
