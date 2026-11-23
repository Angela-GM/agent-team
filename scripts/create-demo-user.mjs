// Crea (o actualiza) el usuario de prueba en Supabase Auth.
// Uso: node --env-file=.env.local scripts/create-demo-user.mjs
// Necesita SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL y DEMO_PASSWORD en .env.local.
// La service role key solo se usa aquí, en local; nunca se sube ni va a Vercel.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL ?? process.env.NEXT_PUBLIC_DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    "Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL (o NEXT_PUBLIC_DEMO_EMAIL) y DEMO_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await supabase.auth.admin.listUsers();
if (listError) throw listError;

const existing = list.users.find((u) => u.email === email);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Usuario de prueba actualizado: ${email}`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Usuario de prueba creado: ${email}`);
}
