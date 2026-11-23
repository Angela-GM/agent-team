import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// Cliente para Server Components, Server Actions y Route Handlers.
// Actúa con la sesión del usuario, así que las políticas RLS se aplican siempre.
export async function createClient() {
  // supabase-js usa Date.now() al crear el cliente; con Cache Components hay
  // que marcar antes que esto ocurre en tiempo de petición, no al prerenderizar.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
