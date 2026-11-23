// Archivos de la web: ruta -> contenido
export type Files = Record<string, string>;

export type AgentName = "orchestrator" | "developer" | "tester";
export type RunStatus = "planning" | "running" | "completed" | "failed";
export type TaskStatus = "pending" | "developing" | "testing" | "passed" | "failed";
export type EventKind = "info" | "thinking" | "output" | "error";

export type Run = {
  id: string;
  user_id: string;
  request: string;
  status: RunStatus;
  summary: string | null;
  files: Files;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  run_id: string;
  position: number;
  title: string;
  description: string;
  acceptance: string[];
  status: TaskStatus;
  agent: AgentName | null;
  attempts: number;
  max_attempts: number;
  files: Files | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentEvent = {
  id: number;
  run_id: string;
  task_id: string | null;
  agent: AgentName;
  kind: EventKind;
  message: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type TestIssue = { criterion: string; problem: string };
