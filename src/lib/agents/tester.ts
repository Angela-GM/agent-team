import "server-only";
import { getLlm, type JsonSchema } from "@/lib/llm";
import { runStaticChecks } from "./checks";
import { renderFiles } from "./files";
import type { Files, Task, TestIssue } from "./types";

const SYSTEM = `Eres Testing, el agente que revisa el trabajo de Develop.
Recibes una tarea con criterios de aceptación, la web antes del cambio y los archivos que propone Develop.

Revisa cada criterio de aceptación leyendo el código:
- Si un criterio no se cumple, o hay un error real (HTML roto, JavaScript que fallaría, enlaces rotos, se ha perdido contenido o navegación que existía), es un fallo.
- Sé exigente con los criterios, pero no inventes requisitos nuevos ni rechaces por gustos de estilo.
- Cada fallo debe decir qué criterio incumple y qué hay que cambiar, de forma concreta para que Develop lo arregle a la primera.
- Si todo se cumple, passed = true e issues vacío.
Escribe en español.`;

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    summary: { type: "string", description: "Veredicto en una frase." },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterion: { type: "string" },
          problem: { type: "string" },
        },
        required: ["criterion", "problem"],
      },
    },
  },
  required: ["passed", "summary", "issues"],
};

type Review = { passed: boolean; summary: string; issues: TestIssue[] };

export async function testTask(task: Task, workspace: Files) {
  const changes = task.files ?? {};

  // 1. Comprobaciones automáticas
  const staticIssues = runStaticChecks(changes, workspace);

  // 2. Revisión del modelo contra los criterios de aceptación
  const result = await getLlm().generateJson<Review>({
    system: SYSTEM,
    prompt: [
      `TAREA: ${task.title}`,
      `DESCRIPCIÓN: ${task.description}`,
      `CRITERIOS DE ACEPTACIÓN:\n${task.acceptance.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
      `WEB ANTES DEL CAMBIO:\n${renderFiles(workspace)}`,
      `ARCHIVOS QUE PROPONE DEVELOP:\n${renderFiles(changes)}`,
      staticIssues.length
        ? `LAS COMPROBACIONES AUTOMÁTICAS YA HAN DETECTADO ESTO (no lo repitas):\n${staticIssues.map((i) => `- ${i.problem}`).join("\n")}`
        : "Las comprobaciones automáticas (estructura HTML, enlaces, accesibilidad de formularios, sintaxis JS) han pasado.",
    ].join("\n\n"),
    schema: SCHEMA,
    temperature: 0.1,
  });

  const modelIssues = result.data.passed ? [] : (result.data.issues ?? []);
  const issues = [...staticIssues, ...modelIssues];

  return {
    ...result,
    data: {
      passed: issues.length === 0,
      summary: result.data.summary ?? "",
      issues,
      staticIssues: staticIssues.length,
    },
  };
}

export function formatIssues(issues: TestIssue[]) {
  return issues.map((i, n) => `${n + 1}. [${i.criterion}] ${i.problem}`).join("\n");
}
