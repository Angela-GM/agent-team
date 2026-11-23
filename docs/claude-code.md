# Cómo he usado Claude Code

Claude Code ha sido el equipo de desarrollo para **construir** la app. Los agentes de la app (Orquestador, Develop y Testing) son otra cosa: se ejecutan en Vercel y llaman a la API de un modelo (Gemini) cada vez que alguien hace una petición. La suscripción de Claude no da acceso a la API ni se puede usar dentro de una app publicada, así que la app tiene su propia clave.

## Diario

### Fase 1 – Base del proyecto
- Le pasé el enunciado y le pedí un plan por fases antes de escribir código. Decidí yo el stack (Supabase, login de prueba) y el reparto de fases.
- Generó el proyecto con `create-next-app` (Next.js 16). Como esta versión trae cambios (Middleware pasa a llamarse **Proxy**, Cache Components activado), le hice leer la documentación incluida en `node_modules/next/dist/docs` antes de escribir código, en lugar de fiarse de lo que sabía.
- El primer build falló porque con Cache Components leer la sesión fuera de un `<Suspense>` es un error. Lo corrigió siguiendo la guía oficial: la cabecera se prerenderiza y el usuario llega en streaming.
- Esquema SQL con RLS para que cada usuario solo vea lo suyo, y Realtime activado para la pantalla en directo.

### Fase 2 – Los agentes
- Antes de elegir modelo, Claude Code consultó qué modelos de Gemini tenía disponibles mi clave y los probó. Algunos daban 503 (saturados) o se quedaban colgados, así que el cliente prueba una cadena de modelos con timeout y, si fallan todos, el paso se reintenta más tarde sin perder estado.
- Diseño paso a paso: cada llamada a `/api/runs/[id]/step` hace una sola acción (planificar, desarrollar o testear) y la guarda en Supabase. Así ninguna función pasa de 60 s (límite de Vercel gratis) y un bloqueo en la base de datos evita que dos pestañas ejecuten el mismo paso.
- Testing combina comprobaciones automáticas sin IA (estructura HTML, enlaces rotos, labels, sintaxis JS) con una revisión del modelo contra los criterios de aceptación. Solo el código aprobado entra en la web.
- Script `scripts/e2e-run.mjs` para probar el flujo completo. En la primera ejecución real, Testing rechazó dos veces a Develop (un enlace a una página que aún no existía y un selector CSS roto) y Develop lo corrigió: el bucle funciona.
- Viendo esa ejecución ajusté el prompt del Orquestador para que cree los archivos antes de enlazarlos.

<!-- Sigue añadiendo aquí: qué pediste, qué corregiste tú, qué decidiste. -->
