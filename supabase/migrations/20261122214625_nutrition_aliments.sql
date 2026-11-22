-- Nutrition : base d'aliments, journal détaillé et recettes avec macros.
--  · `aliments` : référentiel partagé — table CIQUAL 2020 de l'ANSES (aliments génériques, seed
--    supabase/seed/aliments_ciqual.json) + produits de marque trouvés sur Open Food Facts (mis en cache à la recherche)
--    + aliments saisis à la main. Valeurs pour 100 g.
--  · `journal_repas` : chaque ligne garde l'aliment, la quantité et les macros au moment de la saisie.
--  · `recettes` : macros par portion, repas possibles, étiquettes (avant / après séance, sèche, masse…), pour les
--    suggestions selon le reste du jour et le programme sportif. Règles : packages/core/src/nutrition.ts.
create extension if not exists pg_trgm with schema extensions;

alter type public.repas_type add value if not exists 'collation';

create table if not exists public.aliments (
  id             text primary key,                       -- « ciqual:25600 », « off:3329770077003 », « perso:<uuid> »
  source         text not null check (source in ('ciqual', 'off', 'perso')),
  nom            text not null check (length(trim(nom)) between 1 and 200),
  nom_recherche  text not null,                          -- minuscules, sans accents (rempli par le noyau / le seed)
  marque         text,
  groupe         text,
  sous_groupe    text,
  kcal           numeric not null check (kcal >= 0),     -- pour 100 g
  prot           numeric not null default 0,
  gluc           numeric not null default 0,
  lip            numeric not null default 0,
  sucres         numeric,
  fibres         numeric,
  sel            numeric,
  satures        numeric,
  portion_g      numeric check (portion_g is null or portion_g > 0),
  portion_nom    text,
  code_barres    text,
  nutriscore     text,
  cree_par       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);

create index if not exists aliments_recherche_idx on public.aliments using gin (nom_recherche extensions.gin_trgm_ops);
create index if not exists aliments_code_barres_idx on public.aliments (code_barres) where code_barres is not null;

alter table public.aliments enable row level security;
drop policy if exists "lecture_authentifiee" on public.aliments;
drop policy if exists "ajout_hors_ciqual" on public.aliments;
drop policy if exists "maj_hors_ciqual" on public.aliments;
create policy "lecture_authentifiee" on public.aliments for select to authenticated using (true);
-- La table CIQUAL ne s'écrit que par le seed (service role) ; l'app ajoute des produits Open Food Facts ou perso.
create policy "ajout_hors_ciqual" on public.aliments for insert to authenticated with check (source in ('off', 'perso'));
create policy "maj_hors_ciqual" on public.aliments for update to authenticated using (source in ('off', 'perso')) with check (source in ('off', 'perso'));

alter table public.journal_repas add column if not exists aliment_id text references public.aliments(id) on delete set null;
alter table public.journal_repas add column if not exists quantite_g numeric check (quantite_g is null or quantite_g > 0);
alter table public.journal_repas add column if not exists fibres numeric;
create index if not exists journal_repas_user_jour_idx on public.journal_repas (user_id, jour);

alter table public.recettes add column if not exists ref text;                       -- id de la recette de base (import idempotent)
alter table public.recettes add column if not exists kcal numeric;                   -- par portion
alter table public.recettes add column if not exists prot numeric;
alter table public.recettes add column if not exists gluc numeric;
alter table public.recettes add column if not exists lip numeric;
alter table public.recettes add column if not exists fibres numeric;
alter table public.recettes add column if not exists temps_min int;
alter table public.recettes add column if not exists repas text[] not null default '{}';   -- repas possibles (petit_dej, dejeuner, collation, diner, encas)
alter table public.recettes add column if not exists tags text[] not null default '{}';
alter table public.recettes add column if not exists ingredients_detail jsonb not null default '[]'::jsonb; -- [{aliment_id, nom, g}]
alter table public.recettes add column if not exists etapes text[] not null default '{}';
create unique index if not exists recettes_user_ref_idx on public.recettes (user_id, ref) where ref is not null;

-- Realtime : le journal se met à jour quand l'agent ajoute un repas.
alter table public.journal_repas replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'journal_repas') then
    alter publication supabase_realtime add table public.journal_repas;
  end if;
end $$;
