# Cómo he usado Claude Code

Claude Code ha sido mi equipo de desarrollo para **construir** la app: escribir el código, la base de datos, las pruebas y el despliegue. Los agentes de la app (Orquestador, Develop y Testing) son otra cosa: se ejecutan en Vercel y llaman a la API de un modelo (Gemini, con Groq de respaldo) cada vez que alguien hace una petición. Mi suscripción de Claude no da acceso a la API ni se puede usar dentro de una app publicada, así que la app tiene sus propias claves.

Por eso en el repositorio aparece Claude como coautor de los commits: lo he dejado a propósito, porque el enunciado pide usar Claude Code y quiero que se vea cómo.

## Cómo trabajé

- **Primero el plan, después el código.** Le pasé el enunciado y le pedí un plan por fases. Hasta que no lo aprobé, no se escribió nada.
- **Por fases, y cada fase probada antes de seguir.** Base y login → agentes → pantalla → publicación. Al final de cada una, una prueba real (login de verdad, peticiones reales a Gemini, la app abierta en un navegador) y un commit.
- **Yo decido, Claude Code propone.** Cuando había varias opciones (base de datos, qué hacer con un límite del plan gratuito, cómo interpretar el enunciado) me las planteaba con una recomendación y la decisión era mía.
- **Comprobar en lugar de suponer.** Le pedí que verificara las cosas contra la realidad: qué modelos daba de verdad mi clave de Gemini y de Groq, la documentación de la versión de Next.js instalada, y capturas de la interfaz en lugar de dar por bueno el código.

## Mis decisiones

| Momento | Qué decidí |
|---|---|
| Antes de empezar | Supabase como base de datos y un login sencillo con usuario de prueba |
| Modelo de los agentes | Pregunté por qué hacía falta otra IA si ya usaba Claude Code. Al ver la diferencia entre construir la app y lo que la app ejecuta, elegimos Gemini en plan gratuito |
| Supabase sin hueco | El plan gratuito no me dejaba crear un tercer proyecto: decidí pausar uno de los míos en vez de cambiar de base de datos |
| Repositorio | Pedí crear el repositorio y subir el código antes de crear la base de datos |
| Probando la app | **Vi que cada petición empezaba desde la web original y se perdía lo anterior.** Lo cambiamos: ahora cada petición parte de cómo dejó la web la anterior, como en un proyecto real |
| Revisión del enunciado | Pedí repasar el enunciado buscando lo que no estaba claro. De ahí salieron cinco ajustes que aprobé: el Orquestador también pasa el trabajo a Testing, 5 intentos por tarea, 50 peticiones al día, un botón para volver a la web original y Groq como respaldo |
| ¿Web o terminal? | Me planteé si el entregable tenía que ser una web o solo agentes en la terminal. Lo resolvimos con el enunciado (Next.js, Vercel y «una dirección que podamos abrir» obligan a una web) y decidí mantener la web de ejemplo como proyecto sobre el que trabajan los agentes |
| Publicación | Saqué la clave de Groq, elegí en qué equipo de Vercel publicar y que lo hiciera Claude Code con la CLI |

## Qué hizo Claude Code en cada fase

### Fase 1 – Base del proyecto
- Generó el proyecto con Next.js 16. Como esta versión trae cambios importantes (Middleware pasa a llamarse **Proxy**, Cache Components activado), leyó la documentación incluida en `node_modules/next/dist/docs` antes de escribir código, en lugar de fiarse de lo que sabía.
- El primer build falló porque con Cache Components leer la sesión fuera de un `<Suspense>` es un error. Lo corrigió siguiendo la guía oficial.
- Esquema SQL con RLS para que cada usuario solo vea lo suyo, y Realtime activado para la pantalla en directo.
- Probó el login de punta a punta (contraseña buena, mala, redirecciones) y que un usuario sin sesión no puede leer ni escribir nada.

### Fase 2 – Los agentes
- Antes de elegir modelo consultó qué modelos de Gemini tenía mi clave y los probó: algunos daban 503 (saturados), uno ya no estaba disponible y otro se quedaba colgado. Por eso el cliente prueba una cadena de modelos y, si fallan todos, el paso se reintenta sin perder nada.
- Diseño paso a paso: cada llamada a `/api/runs/[id]/step` hace una sola acción (planificar, desarrollar o testear) y la guarda en Supabase. Así ninguna función pasa del límite de tiempo de Vercel, y un bloqueo en la base de datos evita que dos pestañas ejecuten el mismo paso.
- Testing combina comprobaciones automáticas sin IA (estructura HTML, enlaces rotos, etiquetas de formularios, sintaxis JS) con una revisión del modelo contra los criterios de aceptación que fija el Orquestador. Solo el código aprobado entra en la web.
- Script `scripts/e2e-run.mjs` para probar el flujo completo. En la primera ejecución real, Testing rechazó dos veces a Develop (un enlace a una página que aún no existía y un selector CSS roto) y Develop lo corrigió. Viendo esa ejecución, Claude Code ajustó el prompt del Orquestador para que cree los archivos antes de enlazarlos.

### Fase 3 – La pantalla
- Propuso un plan de diseño antes de programar: en vez de un kanban, cada tarea es una pista (Pendiente → Develop → Testing → Aprobada) en la que se ve el marcador volver a Develop cuando Testing rechaza. Cada agente tiene su color en toda la interfaz.
- Datos en directo con Supabase Realtime. Vista previa de la web generada en un iframe aislado (`sandbox` sin `allow-same-origin`), para que el código que escribe la IA no pueda leer la sesión.
- Abrió la app en un navegador sin ventana (Playwright con Edge) e hizo capturas en escritorio, móvil y modo oscuro mientras los agentes trabajaban.

### Fase 4 – Publicación
- Creó el proyecto en Vercel con la CLI, lo conectó al repositorio de GitHub (cada push despliega) y subió solo las variables necesarias, sin mostrarlas. La clave secreta de Supabase no está en Vercel.
- Lanzó una petición real contra la URL de producción.

## Lo que encontramos al probar, y cómo se arregló

| Problema | Cómo apareció | Solución |
|---|---|---|
| Si Develop no proponía cambios porque la web ya cumplía la tarea, se paraba toda la petición | Una petición real desde la pantalla | Testing comprueba si la web actual ya cumple los criterios |
| Una petición detenida dejaba la tarea «en desarrollo» para siempre | La misma prueba | La tarea en curso se marca como fallida |
| Contraste bajo en modo oscuro y la barra lateral empujando el contenido en el móvil | Capturas de la interfaz | Colores por variables y barra plegable en el móvil |
| El modelo de Groq por defecto ya no existía | Consultar los modelos de mi clave antes de usarlo | Cambio a `openai/gpt-oss-120b`, probado |
| Un paso de Develop tardó 44 s con un límite de 60 s | Petición real en producción | Presupuesto de tiempo por paso y límite de la función a 120 s |

## Lo que supervisé

- Que no se subiera ninguna clave: `.env.local` está fuera de git y se revisó el historial completo buscando claves.
- Claude Code pedía permiso antes de acciones con efectos fuera del código (crear el repositorio, publicar, cambiar datos). En una ocasión el propio sistema de permisos bloqueó una acción que yo no había pedido (crear un segundo usuario de prueba) y no se hizo.
