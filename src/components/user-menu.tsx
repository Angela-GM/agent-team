import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{email}</span>
      <form action={logout}>
        <button className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface">Salir</button>
      </form>
    </div>
  );
}
