import type { Files } from "./types";

export const MAX_FILE_CHARS = 60_000;
const VALID_PATH = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(html|css|js)$/;

export function isValidPath(path: string) {
  return VALID_PATH.test(path);
}

// Convierte la salida del modelo [{path, content}] en Files, normalizando rutas.
export function toFiles(list: { path: string; content: string }[]): Files {
  const files: Files = {};
  for (const { path, content } of list ?? []) {
    const clean = String(path ?? "").trim().replace(/^\.?\//, "").toLowerCase();
    files[clean] = String(content ?? "");
  }
  return files;
}

// Texto con todos los archivos, para pasárselo a un agente.
export function renderFiles(files: Files, title = "ARCHIVOS") {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return `${title}: (ninguno)`;
  return entries.map(([path, content]) => `--- ${path} ---\n${content}`).join("\n\n");
}
