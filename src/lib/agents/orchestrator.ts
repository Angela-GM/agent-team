import "server-only";
import { getLlm, type JsonSchema } from "@/lib/llm";
import { renderFiles } from "./files";
import type { Files } from "./types";

export const MAX_TASKS = 5;

export type PlannedTask = { title: string; description: string; acceptance: string[] };
export type Plan = { summary: string; tasks: PlannedTask[] };

const SYSTEM = `Eres el Orquestador de un equipo de desarrollo con dos agentes más:
- Develop: escribe y modifica archivos de una web estática (solo HTML, CSS y JavaScript sin módulos ni librerías externas).
- Testing: revisa lo que hace Develop contra unos criterios de aceptación.

Tu trabajo: leer la petición del usuario y la web actual, y dividir la petición en tareas pequeñas, concretas y ordenadas.

Reglas:
- Entre 1 y ${MAX_TASKS} tareas. Prefiere pocas tareas bien definidas.
- Cada tarea debe poder hacerse y comprobarse por sí sola, en orden.
- Ordena las dependencias: primero se crea un archivo y después se enlaza desde otras páginas (nunca enlaces a páginas que aún no existen).
- Cada tarea lleva de 2 a 4 criterios de aceptación verificables leyendo el código (nada que requiera un servidor, una base de datos o enviar correos de verdad).
- Respeta el estilo y la estructura de la web actual.
- Escribe en español.`;

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Una o dos frases: cómo vas a abordar la petición." },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título corto, en imperativo." },
          description: { type: "string", description: "Qué hay que hacer y en qué archivos." },
          acceptance: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "acceptance"],
      },
    },
  },
  required: ["summary", "tasks"],
};

export async function planTasks(request: string, files: Files) {
  const result = await getLlm().generateJson<Plan>({
    system: SYSTEM,
    prompt: `PETICIÓN DEL USUARIO:\n${request}\n\nWEB ACTUAL:\n${renderFiles(files)}`,
    schema: SCHEMA,
    temperature: 0.3,
  });

  const tasks = (result.data.tasks ?? [])
    .filter((t) => t?.title && t?.description)
    .slice(0, MAX_TASKS)
    .map((t) => ({
      title: t.title.slice(0, 200),
      description: t.description.slice(0, 2000),
      acceptance: (t.acceptance ?? []).map(String).slice(0, 6),
    }));

  if (!tasks.length) throw new Error("El Orquestador no devolvió ninguna tarea");

  return { ...result, data: { summary: result.data.summary ?? "", tasks } };
}
