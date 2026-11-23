# Agent Team

Un equipo de 3 agentes de IA que trabajan juntos:

1. **Orquestador**: recibe una petición (p. ej. «añade una página de contacto»), la divide en tareas y las reparte.
2. **Develop**: hace cada tarea y genera el código.
3. **Testing**: revisa lo que ha hecho Develop y devuelve lo que falla, hasta que todo pasa (máx. 5 intentos por tarea).

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

## Decisiones sobre lo que el enunciado deja abierto

- **«Esta web».** El enunciado no dice sobre qué web trabajan los agentes. He elegido una web de ejemplo (una panadería, HTML/CSS/JS) para que el resultado se vea y se pueda navegar en la propia app. Cada petición parte de cómo dejó la web la anterior, como en un proyecto real; se puede volver a la web original en cualquier momento. La arquitectura no depende de esto: cambiar el tipo de proyecto es cambiar los prompts y las comprobaciones de Testing.
- **Qué comprueba Testing.** Combina comprobaciones automáticas sin IA (estructura HTML, enlaces rotos, etiquetas de formularios, sintaxis de JavaScript) con una revisión del modelo contra los criterios de aceptación que fija el Orquestador. No ejecuta la web en un navegador: en el plan gratuito de Vercel no es viable.
- **«Hasta que todo pasa».** El bucle Develop ↔ Testing se repite hasta que Testing aprueba, con un tope de 5 intentos por tarea para que un rechazo infinito no agote la cuota del modelo. Si se alcanza, la tarea queda como fallida y el equipo sigue con la siguiente.
- **El reparto.** El Orquestador asigna cada tarea a Develop, pasa el resultado a Testing y, si hay fallos, devuelve la tarea a Develop. Todo queda en el registro.
- **Coste cero.** Gemini en plan gratuito, con varios modelos en cadena por si uno está saturado y Groq como respaldo opcional. Límite de 50 peticiones al día por usuario.
- **El bucle avanza desde el navegador.** La página pide el siguiente paso al servidor; cada paso tiene un presupuesto de 100 s para el modelo y la función un máximo de 120 s (dentro del plan gratuito de Vercel). Si se cierra la pestaña, la petición se pausa y continúa al volver a abrirla.

## Cómo se ha construido con Claude Code

Ver [`docs/claude-code.md`](docs/claude-code.md).
