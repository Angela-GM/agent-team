import "server-only";
import { getLlm, type JsonSchema } from "@/lib/llm";
import { renderFiles, toFiles } from "./files";
import type { Files, Task } from "./types";

const SYSTEM = `Eres Develop, el agente desarrollador de un equipo.
Trabajas sobre una web estática: solo archivos .html, .css y .js (JavaScript clásico, sin módulos, sin librerías ni CDNs externos).

Recibes una tarea con criterios de aceptación y la web actual. Si Testing ha rechazado tu intento anterior, recibes sus fallos: corrígelos todos.

Reglas:
- Devuelve el contenido COMPLETO de cada archivo que crees o modifiques (nunca fragmentos ni "..." ).
- Devuelve solo los archivos que cambian. Si la web actual ya cumple todos los criterios, devuelve files vacío y explícalo en notes.
- Rutas en minúsculas, relativas y sin "./" (ej.: "contacto.html", "js/form.js").
- Los enlaces entre páginas son relativos (href="contacto.html").
- Mantén el estilo, la cabecera, la navegación y el pie de la web existente en todas las páginas.
- HTML válido y accesible: lang, title, labels en formularios.
- No inventes funcionalidades de servidor: un formulario puede validar en el navegador y mostrar un mensaje, pero no enviar datos de verdad.`;

const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    notes: { type: "string", description: "Qué has hecho, en 1-3 frases." },
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  required: ["notes", "files"],
};

type DevOutput = { notes: string; files: { path: string; content: string }[] };

export async function developTask(task: Task, workspace: Files) {
  const retry = task.feedback && task.files;

  const prompt = [
    `TAREA: ${task.title}`,
    `DESCRIPCIÓN: ${task.description}`,
    `CRITERIOS DE ACEPTACIÓN:\n${task.acceptance.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
    `WEB ACTUAL:\n${renderFiles(workspace)}`,
    retry ? `TU INTENTO ANTERIOR (rechazado):\n${renderFiles(task.files!)}` : "",
    retry ? `FALLOS QUE HA ENCONTRADO TESTING (corrígelos todos):\n${task.feedback}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await getLlm().generateJson<DevOutput>({
    system: SYSTEM,
    prompt,
    schema: SCHEMA,
    temperature: 0.4,
  });

  // Puede no devolver archivos si la web ya cumple la tarea (p. ej. otra tarea lo hizo antes).
  // No es un error: Testing comprobará los criterios contra la web actual.
  const files = toFiles(result.data.files);

  return { ...result, data: { notes: result.data.notes ?? "", files } };
}
