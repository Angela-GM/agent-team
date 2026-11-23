// Prueba de punta a punta: inicia sesión con el usuario de prueba, crea una
// petición y ejecuta el bucle de agentes hasta el final, mostrando cada paso.
// Uso: node --env-file=.env.local scripts/e2e-run.mjs "añade una página de contacto"
//      BASE_URL=https://tu-app.vercel.app node --env-file=.env.local scripts/e2e-run.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const request = process.argv[2] ?? "Añade una página de contacto a esta web";

// --- Login a través del formulario real (envío HTML sin JavaScript) ---
const jar = new Map();
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
const store = (res) => {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const value = pair.slice(i + 1);
    if (value) jar.set(pair.slice(0, i), value);
    else jar.delete(pair.slice(0, i));
  }
};

const html = await (await fetch(`${BASE}/login`)).text();
const form = new FormData();
for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
  const name = m[0].match(/name="([^"]*)"/)?.[1];
  const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
  if (name) form.append(name, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}
form.append("email", process.env.NEXT_PUBLIC_DEMO_EMAIL);
form.append("password", process.env.DEMO_PASSWORD);
const login = await fetch(`${BASE}/login`, { method: "POST", body: form, redirect: "manual" });
store(login);
if (login.status !== 303) throw new Error(`Login falló (${login.status})`);
console.log("✓ Sesión iniciada\n");

const api = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie: cookie(), "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  store(res);
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${json.error}`);
  return json;
};

// --- Lectura de eventos con el cliente de Supabase (misma sesión, RLS) ---
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
await db.auth.signInWithPassword({ email: process.env.NEXT_PUBLIC_DEMO_EMAIL, password: process.env.DEMO_PASSWORD });

const ICON = { orchestrator: "🧭 Orquestador", developer: "🛠️  Develop    ", tester: "🧪 Testing    " };
let lastEvent = 0;
async function printEvents(runId) {
  const { data } = await db.from("agent_events").select("*").eq("run_id", runId).gt("id", lastEvent).order("id");
  for (const e of data ?? []) {
    lastEvent = e.id;
    const extra = e.payload?.model ? `  (${e.payload.model}, ${(e.payload.ms / 1000).toFixed(1)} s)` : "";
    console.log(`${ICON[e.agent]} [${e.kind}] ${e.message}${extra}`);
    for (const issue of e.payload?.issues ?? []) console.log(`      - [${issue.criterion}] ${issue.problem}`);
  }
}

// --- Bucle ---
const started = Date.now();
const { id } = await api("/api/runs", { request });
console.log(`Petición ${id}: «${request}»\n`);

for (let i = 0; i < 60; i++) {
  const result = await api(`/api/runs/${id}/step`);
  await printEvents(id);
  if (result.state === "done") {
    console.log(`\n■ Run ${result.runStatus} en ${((Date.now() - started) / 1000).toFixed(0)} s`);
    break;
  }
  if (result.state === "retry") await new Promise((r) => setTimeout(r, result.retryAfter * 1000));
  if (result.state === "busy") await new Promise((r) => setTimeout(r, 2000));
}

const { data: tasks } = await db.from("tasks").select("position,title,status,attempts").eq("run_id", id).order("position");
console.log("\nTareas:");
for (const t of tasks) console.log(`  ${t.position}. [${t.status}] ${t.title} (intentos: ${t.attempts})`);
const { data: run } = await db.from("runs").select("files").eq("id", id).single();
console.log("\nArchivos finales:", Object.keys(run.files).join(", "));
