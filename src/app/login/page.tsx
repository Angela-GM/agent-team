import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Agent Team" };

export default function LoginPage() {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Agent Team</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Orquestador, Develop y Testing trabajando juntos.
        </p>
        <LoginForm demoEmail={demoEmail} />
        {demoEmail && (
          <p className="mt-6 text-xs text-muted">
            Usuario de prueba: <code>{demoEmail}</code>. La contraseña va en la entrega.
          </p>
        )}
      </div>
    </main>
  );
}
