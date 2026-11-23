import { isValidPath, MAX_FILE_CHARS } from "./files";
import type { Files, TestIssue } from "./types";

// Comprobaciones automáticas (sin IA) que hace Testing antes de revisar con el modelo.
// Son deterministas: si fallan, la tarea no pasa aunque al modelo le parezca bien.
export function runStaticChecks(changes: Files, workspace: Files): TestIssue[] {
  const issues: TestIssue[] = [];
  const merged: Files = { ...workspace, ...changes };

  for (const [path, content] of Object.entries(changes)) {
    if (!isValidPath(path)) {
      issues.push({ criterion: "Ruta de archivo válida", problem: `"${path}" no es una ruta válida (solo .html, .css o .js, en minúsculas y relativa).` });
      continue;
    }
    if (!content.trim()) {
      issues.push({ criterion: "Archivo con contenido", problem: `${path} está vacío.` });
      continue;
    }
    if (content.length > MAX_FILE_CHARS) {
      issues.push({ criterion: "Tamaño razonable", problem: `${path} supera ${MAX_FILE_CHARS} caracteres.` });
    }
    if (/\.\.\.\s*$|<!--\s*\.\.\.|\/\/\s*\.\.\.|resto (del|de los) (código|archivo)/i.test(content)) {
      issues.push({ criterion: "Archivo completo", problem: `${path} parece incompleto (contiene "..." o un marcador de código omitido).` });
    }

    if (path.endsWith(".html")) checkHtml(path, content, merged, issues);
    if (path.endsWith(".js")) checkJs(path, content, issues);
  }

  return issues;
}

function checkHtml(path: string, html: string, merged: Files, issues: TestIssue[]) {
  const required: [RegExp, string][] = [
    [/<!doctype html>/i, "<!doctype html>"],
    [/<html[^>]*\blang=/i, '<html lang="...">'],
    [/<title>[^<]+<\/title>/i, "<title> con texto"],
    [/<meta[^>]+viewport/i, '<meta name="viewport">'],
    [/<\/body>\s*<\/html>\s*$/i, "cierre </body></html> al final"],
  ];
  for (const [re, label] of required) {
    if (!re.test(html)) issues.push({ criterion: "Estructura HTML", problem: `${path}: falta ${label}.` });
  }

  // Enlaces y recursos internos que no existen
  const refs = [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(ref)) continue;
    const target = ref.split(/[?#]/)[0].replace(/^\.?\//, "").toLowerCase();
    if (target && !(target in merged)) {
      issues.push({ criterion: "Enlaces internos", problem: `${path} enlaza a "${ref}", que no existe.` });
    }
  }

  // Inputs con id sin <label for>, ni aria-label
  const labels = new Set([...html.matchAll(/<label[^>]*\bfor=["']([^"']+)["']/gi)].map((m) => m[1]));
  for (const m of html.matchAll(/<(input|textarea|select)\b([^>]*)>/gi)) {
    const attrs = m[2];
    if (/type=["'](hidden|submit|button|reset)["']/i.test(attrs)) continue;
    if (/aria-label(ledby)?=/i.test(attrs)) continue;
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (!id || !labels.has(id)) {
      issues.push({ criterion: "Accesibilidad", problem: `${path}: un <${m[1]}> no tiene <label for> asociado ni aria-label.` });
    }
  }
}

function checkJs(path: string, js: string, issues: TestIssue[]) {
  if (/^\s*(import|export)\s/m.test(js)) {
    issues.push({ criterion: "JavaScript clásico", problem: `${path} usa import/export; debe ser JavaScript sin módulos.` });
    return;
  }
  try {
    // Solo compila para detectar errores de sintaxis; no se ejecuta.
    new Function(js);
  } catch (err) {
    issues.push({ criterion: "JavaScript sin errores de sintaxis", problem: `${path}: ${(err as Error).message}` });
  }
}
