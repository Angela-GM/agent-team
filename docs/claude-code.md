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
- Diseño paso a paso: cada llamada a `/api/runs/[id]/step` hace una sola acción (planificar, desarrollar o testear) y la guarda en Supabase. Así ninguna función pasa del límite de tiempo de Vercel y un bloqueo en la base de datos evita que dos pestañas ejecuten el mismo paso.
- Testing combina comprobaciones automáticas sin IA (estructura HTML, enlaces rotos, labels, sintaxis JS) con una revisión del modelo contra los criterios de aceptación. Solo el código aprobado entra en la web.
- Script `scripts/e2e-run.mjs` para probar el flujo completo. En la primera ejecución real, Testing rechazó dos veces a Develop (un enlace a una página que aún no existía y un selector CSS roto) y Develop lo corrigió: el bucle funciona.
- Viendo esa ejecución ajusté el prompt del Orquestador para que cree los archivos antes de enlazarlos.

### Fase 3 – La pantalla
- Antes de programar, Claude Code propuso un plan de diseño: en vez de un kanban, cada tarea es una pista (Pendiente → Develop → Testing → Aprobada) en la que se ve al marcador volver a Develop cuando Testing rechaza. Cada agente tiene su color en toda la interfaz.
- Datos en directo con Supabase Realtime; el navegador va pidiendo el siguiente paso al servidor y, si el modelo está saturado, muestra la cuenta atrás del reintento.
- Vista previa de la web generada en un iframe con `sandbox` sin `allow-same-origin`: el código que escribe la IA no puede leer la sesión del usuario.
- Para verificar la interfaz, Claude Code abrió la app en un navegador sin ventana (Playwright con Edge), hizo capturas en escritorio, móvil y modo oscuro, y las revisó. Así encontró y corrigió: contraste bajo en modo oscuro, la barra lateral empujando el contenido en el móvil y un fallo real del motor (si Develop no proponía cambios porque la web ya cumplía la tarea, se paraba toda la petición).

- Al probar la app vi que cada petición empezaba desde la web original y se perdía lo anterior. Lo planteé y lo cambiamos: el enunciado habla de «añadir una página **a esta web**», así que ahora cada petición parte de la web que dejó la última petición terminada (solo código aprobado), con la opción de empezar desde la original.

### Fase 4 – Publicación
- Claude Code creó el proyecto en Vercel con la CLI, lo conectó al repositorio de GitHub (cada push despliega) y subió solo las variables necesarias, leyéndolas de `.env.local` sin mostrarlas. La service role key de Supabase no está en Vercel.
- Antes de usar Groq como respaldo comprobó qué modelos tenía disponibles mi clave: el que había puesto por defecto ya no existía.
- Lanzó una petición real contra la URL de producción. Funcionó, pero un paso de Develop tardó 44 s con un límite de 60 s: añadió un presupuesto de tiempo por paso (la cadena de modelos nunca lo supera) y subió el límite de la función a 120 s.

<!-- Sigue añadiendo aquí: qué pediste, qué corregiste tú, qué decidiste. -->
