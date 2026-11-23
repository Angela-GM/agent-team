# Cómo he usado Claude Code

He construido esta app dirigiendo a Claude Code como si fuera mi equipo de desarrollo: yo marcaba el rumbo, tomaba las decisiones de producto y de infraestructura, probaba el resultado y pedía correcciones; Claude Code escribía el código, proponía alternativas y ejecutaba las pruebas automáticas.

Hay dos IAs distintas en este proyecto y conviene no mezclarlas:

- **Claude Code** es la herramienta con la que he **construido** la app.
- **Los agentes de la app** (Orquestador, Develop y Testing) se ejecutan en Vercel y llaman a la API de Gemini, con Groq de respaldo. Mi suscripción de Claude no da acceso a la API ni puede usarse dentro de una app publicada, así que la app tiene sus propias claves.

Claude aparece como coautor de los commits a propósito: el enunciado pide usar Claude Code y prefiero que se vea cómo.

## Mi forma de trabajar con Claude Code

1. **Entender antes de construir.** Empecé pasándole el enunciado y pidiendo un análisis de lo que pedía, antes de escribir una línea. Después le pedí un plan por fases y no avanzamos hasta que lo aprobé.
2. **Una fase cada vez, cerrada con una prueba real.** Base y login → agentes → pantalla → publicación. Ninguna fase se daba por terminada solo porque compilara: tenía que funcionar con datos reales y quedar subida en un commit.
3. **Las decisiones las tomo yo.** Cuando había varias opciones, le pedía que me las planteara con pros, contras y una recomendación, y elegía yo.
4. **Comprobar en lugar de suponer.** Le exigía verificar contra la realidad: qué modelos daban de verdad mis claves de Gemini y Groq, la documentación de la versión de Next.js instalada (que trae cambios importantes) y capturas de la interfaz en lugar de dar el código por bueno.
5. **Probar yo misma.** Además de las pruebas automáticas, usé la app como la usaría un evaluador, y ahí encontré el fallo más importante del proyecto.

## Decisiones que tomé

| Tema | Decisión |
|---|---|
| Base de datos y acceso | Supabase, que da base de datos, login y tiempo real en un solo servicio, y un login sencillo con usuario de prueba para el evaluador |
| Qué IA usan los agentes | Me pregunté por qué hacía falta otra IA si ya usaba Claude Code. Separé construir la app de lo que la app ejecuta y elegí Gemini en plan gratuito para no gastar dinero, como pide el enunciado |
| Límite del plan gratuito | Supabase no me dejaba crear un tercer proyecto. En lugar de cambiar de base de datos y rehacer el login, pausé uno de mis proyectos |
| Orden del trabajo | Subir el código a GitHub antes de crear la base de datos, para tener el repositorio controlado desde el principio |
| Cómo crece la web | **Probando la app detecté que cada petición empezaba desde cero y se perdía el trabajo anterior.** Decidí que cada petición parta de cómo dejó la web la anterior, como en un proyecto real, con la opción de volver a la original |
| Lo que el enunciado no aclara | Pedí repasar el enunciado buscando ambigüedades y decidí cómo resolver cada una: el Orquestador reparte el trabajo a Develop **y** a Testing; «hasta que todo pasa» con un tope de 5 intentos para no agotar la cuota; 50 peticiones al día para que varios evaluadores no se queden sin margen; un botón para reiniciar la web; y Groq como respaldo si Gemini cae durante la evaluación |
| ¿Web o terminal? | Me planteé si el entregable eran agentes en la terminal. Lo contrasté con el enunciado (Next.js, Vercel y «una dirección que podamos abrir» exigen una web) y decidí mantener una web de ejemplo como proyecto sobre el que trabajan los agentes, para que el resultado se vea y se pueda navegar |
| Publicación | Elegí el equipo de Vercel, que solo vayan a producción las variables imprescindibles (sin la clave secreta de Supabase) y que el repositorio despliegue solo en cada push |

## Lo que llevé yo directamente

- **Infraestructura y cuentas:** creé y configuré el proyecto de Supabase, ejecuté las migraciones SQL, saqué las claves de Gemini y Groq y gestioné el hueco del plan gratuito.
- **Secretos:** las claves viven solo en mi `.env.local` y en Vercel. Revisamos el historial completo de git para confirmar que no se había subido ninguna.
- **Pruebas manuales:** lancé peticiones propias desde la app (un logo en la cabecera, una página de carta, un formulario de contacto…) para ver el comportamiento real con varias peticiones seguidas.
- **Revisión del enunciado y de la entrega:** qué pide exactamente, qué queda abierto y cómo justificarlo (está en la sección de decisiones del README).

## Cómo quedó construido (ejecutado con Claude Code)

### Fase 1 – Base del proyecto
- Next.js 16. Al ser una versión con cambios importantes (Middleware pasa a llamarse **Proxy**, Cache Components activado), se trabajó con la documentación incluida en el paquete y no con lo que el modelo sabía de versiones anteriores.
- Esquema SQL con seguridad por filas (cada usuario solo ve lo suyo) y Realtime para la pantalla en directo.
- Login probado de punta a punta: contraseña buena, mala, redirecciones y que sin sesión no se puede leer ni escribir nada.

### Fase 2 – Los agentes
- Antes de elegir modelo se probaron los que daba mi clave de Gemini: algunos estaban saturados, uno ya no existía y otro se colgaba. Por eso hay una cadena de modelos con reintentos y Groq de respaldo.
- Ejecución paso a paso: cada llamada hace una sola acción (planificar, desarrollar o testear) y la guarda en Supabase, así nunca se supera el límite de tiempo de Vercel y el trabajo se puede retomar.
- Testing combina comprobaciones automáticas sin IA (estructura HTML, enlaces rotos, etiquetas de formularios, sintaxis JS) con una revisión del modelo contra los criterios de aceptación. Solo el código aprobado entra en la web.
- En la primera ejecución real, Testing rechazó dos veces a Develop por errores reales y Develop los corrigió: el bucle funciona.

### Fase 3 – La pantalla
- Cada tarea es una pista (Pendiente → Develop → Testing → Aprobada) en la que se ve el marcador volver a Develop cuando Testing rechaza. Cada agente tiene su color en toda la interfaz.
- Vista previa de la web generada en un iframe aislado, para que el código que escribe la IA no pueda acceder a la sesión.
- Revisada con capturas reales en escritorio, móvil y modo oscuro.

### Fase 4 – Publicación
- Proyecto en Vercel conectado al repositorio y prueba de punta a punta contra la URL de producción.

## Fallos encontrados al probar y cómo se resolvieron

| Problema | Cómo apareció | Solución |
|---|---|---|
| Cada petición empezaba desde la web original y se perdía lo anterior | **Lo detecté yo usando la app** | Cada petición parte de la web que dejó la anterior |
| Si Develop no tenía nada que cambiar, se paraba toda la petición | Petición real desde la pantalla | Testing comprueba si la web ya cumple los criterios |
| Una petición detenida dejaba una tarea «en desarrollo» para siempre | La misma prueba | La tarea en curso se marca como fallida |
| Contraste bajo en modo oscuro y la barra lateral tapando el trabajo en el móvil | Capturas de la interfaz | Colores por variables y barra plegable en el móvil |
| El modelo de Groq previsto ya no existía | Comprobar los modelos de mi clave antes de usarlo | Cambio a `openai/gpt-oss-120b`, probado |
| Un paso tardó 44 s con un límite de 60 s | Petición real en producción | Presupuesto de tiempo por paso y límite de la función a 120 s |

## Qué aprendí

- Con IA, el trabajo se desplaza de escribir código a **dirigir, decidir y verificar**. Los fallos más importantes no los habría encontrado leyendo el código: aparecieron al usar la app.
- Pedir siempre un plan antes del código y una prueba real después de cada fase evita acumular errores.
- Un enunciado corto deja muchas decisiones abiertas. Es mejor detectarlas y justificarlas por escrito que dar por hecha la primera interpretación.
