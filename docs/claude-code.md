# Cómo he usado Claude Code

Claude Code ha sido el equipo de desarrollo para **construir** la app. Los agentes de la app (Orquestador, Develop y Testing) son otra cosa: se ejecutan en Vercel y llaman a la API de un modelo (Gemini) cada vez que alguien hace una petición. La suscripción de Claude no da acceso a la API ni se puede usar dentro de una app publicada, así que la app tiene su propia clave.

## Diario

### Fase 1 – Base del proyecto
- Le pasé el enunciado y le pedí un plan por fases antes de escribir código. Decidí yo el stack (Supabase, login de prueba) y el reparto de fases.
- Generó el proyecto con `create-next-app` (Next.js 16). Como esta versión trae cambios (Middleware pasa a llamarse **Proxy**, Cache Components activado), le hice leer la documentación incluida en `node_modules/next/dist/docs` antes de escribir código, en lugar de fiarse de lo que sabía.
- El primer build falló porque con Cache Components leer la sesión fuera de un `<Suspense>` es un error. Lo corrigió siguiendo la guía oficial: la cabecera se prerenderiza y el usuario llega en streaming.
- Esquema SQL con RLS para que cada usuario solo vea lo suyo, y Realtime activado para la pantalla en directo.

<!-- Sigue añadiendo aquí: qué pediste, qué corregiste tú, qué decidiste. -->
