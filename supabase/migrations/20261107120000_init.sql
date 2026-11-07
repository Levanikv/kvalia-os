-- KVALIA OS — schéma initial (phase 0)
-- Principes : user_id partout + RLS dès le départ (multi-utilisateur plus tard sans migration),
-- 3 entités transverses (produits, objectifs, documents) + une fonction `vue_jour` qui agrège la journée.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profil (1 ligne par utilisateur, réglages de l'app en JSON)
-- ---------------------------------------------------------------------------
create table public.profils (
  id          uuid primary key references auth.users(id) on delete cascade,
  prenom      text,
  reglages    jsonb not null default '{}'::jsonb, -- ordre des widgets, modules actifs, thème, fenêtre de jeûne, ordre des rayons…
  contexte_agent text,                            -- mémoire injectée à chaque appel de l'agent (objectifs, règles, préférences)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- TRANSVERSE
-- ---------------------------------------------------------------------------
create table public.produits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nom         text not null,
  rayon       text,                      -- rayon du magasin (ordre géré dans profils.reglages)
  unite       text not null default 'pièce', -- g | ml | pièce
  code_barres text,
  kcal_100    numeric, prot_100 numeric, gluc_100 numeric, lip_100 numeric,
  substituts  uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, nom)
);

create type public.objectif_type as enum ('sport', 'epargne', 'habitude', 'autre');
create table public.objectifs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titre       text not null,
  type        public.objectif_type not null default 'autre',
  cible       numeric,
  valeur      numeric not null default 0,
  unite       text,
  echeance    date,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type public.document_type as enum ('identite', 'logement', 'voiture', 'sante', 'sasu', 'banque', 'contrat', 'voyage', 'facture', 'autre');
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titre       text not null,
  type        public.document_type not null default 'autre',
  fichier_path text,                     -- chemin dans le bucket "documents" (<user_id>/<uuid>.<ext>)
  mime        text,
  numero      text,
  expiration  date,
  entite      text,                      -- voiture | logement | sasu | personne…
  tags        text[] not null default '{}',
  texte       text,                      -- texte extrait (OCR) pour la recherche
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- QUOTIDIEN
-- ---------------------------------------------------------------------------
create type public.priorite as enum ('basse', 'normale', 'haute');
create table public.taches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titre       text not null,
  due         date,
  priorite    public.priorite not null default 'normale',
  fait        boolean not null default false,
  fait_le     timestamptz,
  document_id uuid references public.documents(id) on delete set null,
  evenement_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type public.moment_journee as enum ('matin', 'midi', 'soir', 'coucher', 'libre');
create table public.habitudes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  nom            text not null,
  moment         public.moment_journee not null default 'libre',
  non_negociable boolean not null default false,
  actif          boolean not null default true,
  ordre          int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.habitudes_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  habitude_id uuid not null references public.habitudes(id) on delete cascade,
  jour        date not null default current_date,
  fait        boolean not null default true,
  unique (habitude_id, jour)
);

create table public.evenements_cache (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,             -- id Google Calendar
  calendrier  text,
  titre       text not null,
  debut       timestamptz not null,
  fin         timestamptz,
  lieu        text,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- COURSES
-- ---------------------------------------------------------------------------
create type public.liste_etat as enum ('active', 'faite', 'archivee');
create table public.listes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  etat        public.liste_etat not null default 'active',
  creee_le    timestamptz not null default now(),
  faite_le    timestamptz
);

create type public.ligne_origine as enum ('manuel', 'plan', 'agent', 'siri', 'alexa', 'telegram');
create table public.lignes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  liste_id    uuid not null references public.listes(id) on delete cascade,
  produit_id  uuid not null references public.produits(id) on delete restrict,
  quantite    numeric not null default 1,
  unite       text,
  coche       boolean not null default false,
  manque      boolean not null default false,  -- signalé par "il me manque X"
  origine     public.ligne_origine not null default 'manuel',
  created_at  timestamptz not null default now(),
  unique (liste_id, produit_id)
);

create table public.stock (
  user_id     uuid not null references auth.users(id) on delete cascade,
  produit_id  uuid not null references public.produits(id) on delete cascade,
  quantite    numeric not null default 0,
  unite       text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, produit_id)
);

-- ---------------------------------------------------------------------------
-- SPORT
-- ---------------------------------------------------------------------------
create table public.programmes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nom           text not null,
  objectif_id   uuid references public.objectifs(id) on delete set null,
  debut         date not null,
  fin           date,
  rythme        jsonb not null default '{}'::jsonb, -- {"salle": 4, "boxe": 1, "bloc_semaines": 4}
  materiel      text[] not null default '{}',
  actif         boolean not null default true,
  genere_par    text,                              -- "agent" | "manuel"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create type public.seance_type as enum ('upper', 'lower', 'push', 'pull', 'legs', 'full', 'boxe', 'hiit', 'maison', 'cardio', 'repos');
create type public.seance_etat as enum ('prevue', 'en_cours', 'faite', 'sautee');
create table public.seances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  programme_id  uuid references public.programmes(id) on delete cascade,
  jour          date not null,
  type          public.seance_type not null,
  duree_min     int,
  etat          public.seance_etat not null default 'prevue',
  ressenti      smallint check (ressenti between 1 and 5),
  notes         text,
  faite_le      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Référentiel partagé (ExerciseDB / wger) : lecture pour tous les utilisateurs connectés, écriture par le service role.
create table public.exercices_ref (
  id                  text primary key,          -- id ExerciseDB (exr_…) ou wger
  source              text not null default 'exercisedb',
  nom                 text not null,
  nom_fr              text,
  muscles             text[] not null default '{}',
  muscles_secondaires text[] not null default '{}',
  equipement          text,
  video_url           text,
  gif_url             text,
  image_url           text,
  consignes           text[] not null default '{}',
  updated_at          timestamptz not null default now()
);

create table public.exercices_seance (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  seance_id     uuid not null references public.seances(id) on delete cascade,
  exercice_id   text not null references public.exercices_ref(id),
  ordre         int not null default 0,
  series        int not null default 3,
  reps          text not null default '10',   -- "10" | "8-12" | "AMRAP"
  charge_kg     numeric,
  repos_s       int not null default 90,
  fait          boolean not null default false,
  realise       jsonb,                           -- [{"reps": 10, "charge_kg": 60}, …]
  substitut_de  text references public.exercices_ref(id)
);

-- ---------------------------------------------------------------------------
-- NUTRITION
-- ---------------------------------------------------------------------------
create type public.repas_type as enum ('petit_dej', 'dejeuner', 'diner', 'encas');
create table public.recettes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  nom                text not null,
  type               public.repas_type not null,
  portions           int not null default 1,
  conservation_jours int,
  batch              boolean not null default false,
  instructions       text,
  actif              boolean not null default true,
  version_de         uuid references public.recettes(id) on delete cascade, -- variante temporaire (substitution) de cette recette de base
  temporaire         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  recette_id  uuid not null references public.recettes(id) on delete cascade,
  produit_id  uuid not null references public.produits(id) on delete restrict,
  quantite    numeric not null,
  unite       text,
  optionnel   boolean not null default false
);

create table public.plans_repas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  semaine     date not null,              -- lundi de la semaine
  genere_par  text,
  valide      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, semaine)
);

create table public.plans_repas_lignes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_id     uuid not null references public.plans_repas(id) on delete cascade,
  jour        date not null,
  repas       public.repas_type not null,
  recette_id  uuid not null references public.recettes(id) on delete restrict,
  portions    numeric not null default 1,
  pris        boolean not null default false,
  unique (plan_id, jour, repas)
);

create type public.journal_source as enum ('plan', 'scan', 'phrase', 'manuel');
create table public.journal_repas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  jour        date not null default current_date,
  repas       public.repas_type not null,
  recette_id  uuid references public.recettes(id) on delete set null,
  produit_id  uuid references public.produits(id) on delete set null,
  libelle     text,
  portions    numeric not null default 1,
  kcal        numeric, prot numeric, gluc numeric, lip numeric,
  source      public.journal_source not null default 'manuel',
  created_at  timestamptz not null default now()
);

create table public.pesees (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  jour        date not null default current_date,
  poids_kg    numeric not null,
  note        text,
  unique (user_id, jour)
);

-- ---------------------------------------------------------------------------
-- FINANCES
-- ---------------------------------------------------------------------------
create type public.perimetre as enum ('perso', 'sasu');
create type public.compte_source as enum ('csv', 'enable_banking', 'tiime', 'manuel');
create table public.comptes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  nom                 text not null,
  banque              text,                      -- "BoursoBank" | "Tiime"
  perimetre           public.perimetre not null default 'perso',
  source              public.compte_source not null default 'manuel',
  externe_id          text,
  solde               numeric,
  devise              text not null default 'EUR',
  derniere_sync       timestamptz,
  consentement_expire date,                      -- DSP2 : 90 jours
  actif               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nom         text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  icone       text,
  couleur     text,
  perimetre   public.perimetre,                  -- null = les deux
  ordre       int not null default 0,
  unique (user_id, nom)
);

create type public.categorise_par as enum ('regle', 'agent', 'manuel');
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  compte_id      uuid not null references public.comptes(id) on delete cascade,
  jour           date not null,
  montant        numeric not null,               -- négatif = dépense
  libelle        text not null,
  libelle_brut   text,
  categorie_id   uuid references public.categories(id) on delete set null,
  categorise_par public.categorise_par,
  document_id    uuid references public.documents(id) on delete set null,
  externe_id     text,
  empreinte      text not null,                  -- hash(date + montant + libellé brut) pour le dédoublonnage
  recurrente     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (compte_id, empreinte)
);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  categorie_id uuid not null references public.categories(id) on delete cascade,
  mois         date not null,                    -- 1er du mois
  montant      numeric not null,
  unique (user_id, categorie_id, mois)
);

create table public.regles_categorisation (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  motif        text not null,                    -- motif ILIKE sur le libellé, ex. '%basic-fit%'
  categorie_id uuid not null references public.categories(id) on delete cascade,
  priorite     int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AGENT — journal des appels d'outils (debug + garde-fous)
-- ---------------------------------------------------------------------------
create type public.canal as enum ('claude', 'siri', 'telegram', 'alexa', 'app', 'job');
create table public.appels_outils (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  outil       text not null,
  canal       public.canal not null default 'claude',
  entree      jsonb,
  sortie      jsonb,
  succes      boolean not null default true,
  duree_ms    int,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profils','produits','objectifs','documents','taches','habitudes','stock','programmes','seances','recettes','comptes','transactions']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
create index on public.produits (user_id);
create index on public.objectifs (user_id) where actif;
create index on public.documents (user_id, type);
create index on public.documents (user_id, expiration) where expiration is not null;
create index on public.taches (user_id, due) where not fait;
create index on public.habitudes (user_id) where actif;
create index on public.habitudes_log (user_id, jour);
create index on public.evenements_cache (user_id, debut);
create index on public.listes (user_id) where etat = 'active';
create index on public.lignes (liste_id);
create index on public.seances (user_id, jour);
create index on public.exercices_seance (seance_id, ordre);
create index on public.recettes (user_id, type) where actif;
create index on public.ingredients (recette_id);
create index on public.ingredients (produit_id);
create index on public.plans_repas_lignes (plan_id, jour);
create index on public.journal_repas (user_id, jour);
create index on public.transactions (user_id, jour desc);
create index on public.transactions (compte_id, jour desc);
create index on public.transactions (user_id, categorie_id);
create index on public.budgets (user_id, mois);
create index on public.appels_outils (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS : chaque table appartient à son user_id
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'produits','objectifs','documents','taches','habitudes','habitudes_log','evenements_cache',
    'listes','lignes','stock','programmes','seances','exercices_seance',
    'recettes','ingredients','plans_repas','plans_repas_lignes','journal_repas','pesees',
    'comptes','categories','transactions','budgets','regles_categorisation','appels_outils'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.profils enable row level security;
create policy "own_profile_select" on public.profils for select to authenticated using (id = (select auth.uid()));
create policy "own_profile_update" on public.profils for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.exercices_ref enable row level security;
create policy "exercices_read" on public.exercices_ref for select to authenticated using (true);
-- pas de policy d'écriture : seul le service role (jobs d'import) écrit

-- ---------------------------------------------------------------------------
-- Storage : bucket privé "documents", un dossier par utilisateur
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- VUE JOUR : tout ce qui est daté pour un jour donné, en un appel (source de la Home et du brief)
-- ---------------------------------------------------------------------------
create or replace function public.vue_jour(p_jour date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'jour', p_jour,
    'evenements', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'titre', e.titre, 'debut', e.debut, 'fin', e.fin, 'lieu', e.lieu) order by e.debut)
      from evenements_cache e
      where e.user_id = auth.uid() and e.debut::date = p_jour
    ), '[]'::jsonb),
    'taches', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'titre', t.titre, 'due', t.due, 'priorite', t.priorite, 'fait', t.fait) order by t.priorite desc, t.due)
      from taches t
      where t.user_id = auth.uid() and not t.fait and (t.due is null or t.due <= p_jour)
    ), '[]'::jsonb),
    'habitudes', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'nom', h.nom, 'moment', h.moment, 'non_negociable', h.non_negociable,
        'fait', exists (select 1 from habitudes_log l where l.habitude_id = h.id and l.jour = p_jour and l.fait)) order by h.ordre)
      from habitudes h
      where h.user_id = auth.uid() and h.actif
    ), '[]'::jsonb),
    'seance', (
      select jsonb_build_object('id', s.id, 'type', s.type, 'duree_min', s.duree_min, 'etat', s.etat,
        'nb_exercices', (select count(*) from exercices_seance x where x.seance_id = s.id))
      from seances s
      where s.user_id = auth.uid() and s.jour = p_jour
      order by s.created_at limit 1
    ),
    'repas', coalesce((
      select jsonb_agg(jsonb_build_object('repas', pl.repas, 'recette_id', r.id, 'recette', r.nom, 'portions', pl.portions, 'pris', pl.pris) order by pl.repas)
      from plans_repas_lignes pl join recettes r on r.id = pl.recette_id
      where pl.user_id = auth.uid() and pl.jour = p_jour
    ), '[]'::jsonb),
    'courses', (
      select jsonb_build_object('liste_id', li.id,
        'articles', (select count(*) from lignes g where g.liste_id = li.id and not g.coche),
        'manques', (select count(*) from lignes g where g.liste_id = li.id and g.manque))
      from listes li
      where li.user_id = auth.uid() and li.etat = 'active'
      order by li.creee_le desc limit 1
    ),
    'depenses_semaine', coalesce((
      select -sum(tr.montant)
      from transactions tr
      where tr.user_id = auth.uid() and tr.montant < 0
        and tr.jour >= date_trunc('week', p_jour)::date and tr.jour <= p_jour
    ), 0),
    'objectifs', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'titre', o.titre, 'type', o.type, 'valeur', o.valeur, 'cible', o.cible, 'echeance', o.echeance))
      from objectifs o
      where o.user_id = auth.uid() and o.actif
    ), '[]'::jsonb),
    'alertes', coalesce((
      select jsonb_agg(jsonb_build_object('document_id', d.id, 'titre', d.titre, 'expiration', d.expiration) order by d.expiration)
      from documents d
      where d.user_id = auth.uid() and d.expiration is not null and d.expiration <= p_jour + 30
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.vue_jour(date) to authenticated;
