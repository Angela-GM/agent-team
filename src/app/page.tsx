import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

// Con Cache Components, lo que lee la sesión va dentro de <Suspense>:
// la cabecera sale al instante y el usuario llega en streaming.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Agent Team</h1>
        <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="flex flex-1 items-center justify-center p-6 text-zinc-500">
        Panel de agentes (Fase 3).
      </main>
    </div>
  );
}

async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-zinc-500">{email}</span>
      <form action={logout}>
        <button className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Salir
        </button>
      </form>
    </div>
  );
}
