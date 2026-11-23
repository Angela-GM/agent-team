import { CurrentWeb } from "@/components/current-web";
import { AGENTS } from "@/lib/agents/labels";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-6">
      <header className="max-w-2xl">
        <h1 className="mb-3 text-2xl leading-snug font-semibold text-balance md:text-3xl">
          Pide un cambio en la web y mira cómo lo hacen tres agentes
        </h1>
        <p className="text-muted">
          Escribe la petición a la izquierda. Verás en directo cómo se reparten el trabajo, qué hace cada uno y en
          qué estado está cada tarea, hasta que todo pasa las pruebas.
        </p>
      </header>

      <ol className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((a, i) => (
          <li key={a.id} className="rounded-xl border border-line bg-surface p-4" style={{ borderTopColor: a.color, borderTopWidth: 3 }}>
            <p className="mb-1 text-sm text-muted">Paso {i + 1}</p>
            <h2 className={`font-semibold ${a.text}`}>{a.name}</h2>
            <p className="text-sm">{a.role}</p>
          </li>
        ))}
      </ol>

      <CurrentWeb />
    </div>
  );
}
