-- Agent Team: espacio de trabajo de cada ejecución
-- Los agentes trabajan sobre una web pequeña (archivos HTML/CSS/JS).
-- runs.files  -> estado actual de la web: { "index.html": "...", "styles.css": "..." }
-- tasks.files -> cambios que propone Develop en su último intento
-- Solo cuando Testing aprueba una tarea, sus archivos se aplican a runs.files.

alter table public.runs
  add column files       jsonb not null default '{}'::jsonb,
  add column lock_until  timestamptz,   -- evita que dos pestañas ejecuten el mismo paso a la vez
  add column error       text;

alter table public.tasks
  add column agent       agent_name,                       -- agente que tiene la tarea ahora
  add column acceptance  jsonb not null default '[]'::jsonb, -- criterios de aceptación del Orquestador
  add column files       jsonb,                            -- propuesta de Develop
  drop column code;

-- Reclama el turno para ejecutar un paso de la run. Devuelve true si lo consigue.
-- security invoker: respeta RLS, así que solo funciona sobre runs propias.
create or replace function public.claim_run_step(p_run_id uuid, p_seconds int default 90)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.runs
       set lock_until = now() + make_interval(secs => p_seconds)
     where id = p_run_id
       and status in ('planning', 'running')
       and (lock_until is null or lock_until < now())
    returning id
  )
  select exists (select 1 from claimed);
$$;

create or replace function public.release_run_step(p_run_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.runs set lock_until = null where id = p_run_id;
$$;

grant execute on function public.claim_run_step(uuid, int) to authenticated;
grant execute on function public.release_run_step(uuid) to authenticated;
