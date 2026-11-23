import type { Files } from "./types";

// Web de partida sobre la que trabajan los agentes en cada petición.
export const STARTER_SITE: Files = {
  "index.html": `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panadería Lumbre</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <a class="logo" href="index.html">Panadería Lumbre</a>
    <nav>
      <a href="index.html" aria-current="page">Inicio</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h1>Pan de masa madre, hecho cada mañana</h1>
      <p>Horno de leña en el centro de Valencia desde 1987.</p>
    </section>

    <section class="products">
      <h2>Lo más pedido</h2>
      <ul>
        <li><strong>Hogaza de centeno</strong> · 4,20 €</li>
        <li><strong>Barra rústica</strong> · 1,60 €</li>
        <li><strong>Croissant de mantequilla</strong> · 1,90 €</li>
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <p>© Panadería Lumbre · Calle del Horno 12, Valencia</p>
  </footer>
</body>
</html>
`,
  "styles.css": `:root {
  --bg: #fffaf3;
  --text: #2b2118;
  --accent: #b5532c;
  --muted: #7a6a5c;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eadfd2;
}

.logo { font-weight: 700; color: var(--accent); text-decoration: none; }
nav a { margin-left: 1rem; color: var(--text); text-decoration: none; }
nav a[aria-current="page"] { color: var(--accent); font-weight: 600; }

main { max-width: 60rem; margin: 0 auto; padding: 2rem 1.5rem; }
.hero h1 { font-size: 2.2rem; margin: 0 0 .5rem; }
.hero p { color: var(--muted); }
.products ul { padding-left: 1.2rem; }

.site-footer {
  text-align: center;
  padding: 1.5rem;
  color: var(--muted);
  border-top: 1px solid #eadfd2;
}
`,
};
