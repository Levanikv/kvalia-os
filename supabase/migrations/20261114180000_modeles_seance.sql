-- Séances personnalisées (« Mes séances ») : modèles réutilisables, ajoutés au programme (un jour de la semaine,
-- récurrent, ou une date) ou utilisés pour bâtir un programme (semaine type). Règles : packages/core/src/sport.ts.
create table if not exists public.modeles_seance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nom         text not null check (length(trim(nom)) between 1 and 60),
  type        public.seance_type not null default 'full',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.modeles_seance_exercices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  modele_id    uuid not null references public.modeles_seance(id) on delete cascade,
  exercice_id  text not null references public.exercices_ref(id),
  ordre        int not null default 0,
  series       int not null default 3 check (series between 1 and 10),
  reps         text not null default '10',
  repos_s      int not null default 90 check (repos_s between 0 and 600),
  charge_kg    numeric
);

create index if not exists modeles_seance_user_idx on public.modeles_seance (user_id);
create index if not exists modeles_seance_exercices_modele_idx on public.modeles_seance_exercices (modele_id, ordre);

-- Une séance planifiée peut venir d'un modèle (affichage « Ma séance », remplacement par jour de semaine).
alter table public.seances add column if not exists modele_id uuid references public.modeles_seance(id) on delete set null;

do $$
declare t text;
begin
  foreach t in array array['modeles_seance', 'modeles_seance_exercices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;
