-- Agent Team: esquema inicial
-- runs         -> cada petición que hace el usuario
-- tasks        -> tareas en que el Orquestador divide la petición
-- agent_events -> registro de lo que hace cada agente (lo que se ve en pantalla)

-- ---------- Tipos ----------
create type run_status as enum ('planning', 'running', 'completed', 'failed');
create type task_status as enum ('pending', 'developing', 'testing', 'passed', 'failed');
create type agent_name as enum ('orchestrator', 'developer', 'tester');
create type event_kind as enum ('info', 'thinking', 'output', 'error');

-- ---------- Tablas ----------
create table public.runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  request     text not null check (char_length(request) between 3 and 2000),
  status      run_status not null default 'planning',
  summary     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.runs (id) on delete cascade,
  position      int not null,
  title         text not null,
  description   text not null,
  status        task_status not null default 'pending',
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  code          text,            -- última versión del código de Develop
  feedback      text,            -- último informe de Testing
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (run_id, position)
);

create table public.agent_events (
  id          bigint generated always as identity primary key,
  run_id      uuid not null references public.runs (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete cascade,
  agent       agent_name not null,
  kind        event_kind not null default 'info',
  message     text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index runs_user_created_idx on public.runs (user_id, created_at desc);
create index tasks_run_idx on public.tasks (run_id, position);
create index agent_events_run_idx on public.agent_events (run_id, id);

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger runs_updated_at before update on public.runs
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- Seguridad (RLS) ----------
-- Cada usuario solo ve y modifica sus propias ejecuciones.
alter table public.runs enable row level security;
alter table public.tasks enable row level security;
alter table public.agent_events enable row level security;

create or replace function public.owns_run(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.runs r
    where r.id = p_run_id and r.user_id = (select auth.uid())
  );
$$;

create policy "runs: own select" on public.runs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "runs: own insert" on public.runs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "runs: own update" on public.runs
  for update to authenticated using (user_id = (select auth.uid()));
create policy "runs: own delete" on public.runs
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "tasks: own select" on public.tasks
  for select to authenticated using (public.owns_run(run_id));
create policy "tasks: own insert" on public.tasks
  for insert to authenticated with check (public.owns_run(run_id));
create policy "tasks: own update" on public.tasks
  for update to authenticated using (public.owns_run(run_id));

create policy "events: own select" on public.agent_events
  for select to authenticated using (public.owns_run(run_id));
create policy "events: own insert" on public.agent_events
  for insert to authenticated with check (public.owns_run(run_id));

-- ---------- Realtime ----------
-- La pantalla se suscribe a estos cambios para mostrar el progreso en directo.
alter publication supabase_realtime add table public.runs, public.tasks, public.agent_events;
