import type { Files } from "./agents/types";

// Construye un documento autocontenido para el <iframe srcdoc> de la vista previa:
// mete el CSS y el JS en línea y sustituye la navegación entre páginas por un
// mensaje al padre. El iframe va con sandbox SIN allow-same-origin, así que el
// código generado no puede leer la sesión ni nada de la app.
export function buildPreview(files: Files, path: string): string {
  let html = files[path];
  if (html === undefined) return `<p style="font-family:sans-serif">No existe ${escapeHtml(path)}.</p>`;

  html = html.replace(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (tag, href: string) => {
    const css = files[normalize(href)];
    return css === undefined ? tag : `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`;
  });

  html = html.replace(/<script\b([^>]*)src=["']([^"']+\.js)["']([^>]*)>\s*<\/script>/gi, (tag, _a, src: string) => {
    const js = files[normalize(src)];
    return js === undefined ? tag : `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`;
  });

  const bridge = `<script>
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  var href = a.getAttribute("href") || "";
  if (href.charAt(0) === "#") return;
  e.preventDefault();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return;
  parent.postMessage({ type: "agent-team:navigate", path: href.split(/[?#]/)[0].replace(/^\\.?\\//, "") }, "*");
});
// Después de los manejadores de la propia página: evita que el formulario navegue.
window.addEventListener("submit", function (e) { e.preventDefault(); });
</script>`;

  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}\n${bridge}`) : bridge + html;
}

function normalize(ref: string) {
  return ref.split(/[?#]/)[0].replace(/^\.?\//, "").toLowerCase();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
