# Agent Team

Un equipo de 3 agentes de IA que trabajan juntos:

1. **Orquestador**: recibe una petición (p. ej. «añade una página de contacto»), la divide en tareas y las reparte.
2. **Develop**: hace cada tarea y genera el código.
3. **Testing**: revisa lo que ha hecho Develop y devuelve lo que falla, hasta que todo pasa (máx. 3 intentos por tarea).

En pantalla se ve qué hace cada agente y en qué estado está cada tarea, en directo.

## Stack

- **Next.js 16** (App Router, Cache Components) + TypeScript + Tailwind
- **Supabase**: Postgres, Auth (login) y Realtime (actualización en directo)
- **Vercel**: despliegue
- **LLM**: Gemini (plan gratuito); el proveedor se cambia con `LLM_PROVIDER`

## Puesta en marcha en local

```bash
npm install
cp .env.example .env.local   # y rellena los valores
```

1. En Supabase, abre **SQL Editor** y ejecuta `supabase/migrations/0001_init.sql`.
2. Crea el usuario de prueba:
   ```bash
   node --env-file=.env.local scripts/create-demo-user.mjs
   ```
3. Arranca:
   ```bash
   npm run dev
   ```

## Base de datos

| Tabla | Qué guarda |
|---|---|
| `runs` | Cada petición del usuario y su estado (`planning`, `running`, `completed`, `failed`) |
| `tasks` | Las tareas del Orquestador: estado (`pending`, `developing`, `testing`, `passed`, `failed`), intentos, código y último informe de Testing |
| `agent_events` | Registro de lo que hace cada agente; es lo que alimenta la pantalla |

Todas las tablas tienen RLS: cada usuario solo ve sus propias ejecuciones. El servidor actúa con la sesión del usuario, no con la service role key.

## Seguridad

- Ninguna clave está en el repositorio (`.env*` está en `.gitignore`; solo se sube `.env.example`).
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en local para crear el usuario de prueba. No va a Vercel.

## Cómo se ha construido con Claude Code

Ver [`docs/claude-code.md`](docs/claude-code.md).
