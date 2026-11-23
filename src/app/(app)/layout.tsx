import Link from "next/link";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { AGENTS } from "@/lib/agents/labels";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-paper px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex gap-1" aria-hidden>
            {AGENTS.map((a) => (
              <span key={a.id} className={`size-2.5 rounded-full ${a.bg}`} />
            ))}
          </span>
          Agent Team
        </Link>
        <Suspense fallback={<div className="h-8 w-24 rounded-lg bg-surface" />}>
          <UserMenu />
        </Suspense>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Suspense fallback={<aside className="md:w-80 md:shrink-0 md:border-r md:border-line" />}>
          <Sidebar />
        </Suspense>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
