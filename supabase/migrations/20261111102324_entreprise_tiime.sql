-- Entreprise (SASU) : données synchronisées depuis Tiime en lecture seule (ADR 0010).
-- Banque → comptes (source tiime, perimetre sasu) + transactions existantes ; factures, notes de frais, trajets IK : nouvelles tables.

-- ---------------------------------------------------------------------------
-- Jetons des intégrations : lisibles par la seule clé service role (agent).
-- RLS activée SANS politique : aucun accès pour anon / authenticated.
-- ---------------------------------------------------------------------------
create table if not exists public.connexions_externes (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  fournisseur             text not null,                -- 'tiime'
  jeton_rafraichissement  text,
  jeton_acces             text,
  acces_expire_le         timestamptz,
  derniere_sync           timestamptz,
  meta                    jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id, fournisseur)
);
alter table public.connexions_externes enable row level security;
create trigger set_updated_at before update on public.connexions_externes for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions : catégorie comptable et justificatifs venus de la source
-- ---------------------------------------------------------------------------
alter table public.transactions add column if not exists categorie_externe text;   -- libellé de l'imputation Tiime
alter table public.transactions add column if not exists nb_justificatifs int;     -- null = inconnu (source sans justificatifs)

-- ---------------------------------------------------------------------------
-- Factures émises par la SASU
-- ---------------------------------------------------------------------------
create table if not exists public.factures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       public.compte_source not null default 'tiime',
  externe_id   text not null,
  numero       text,
  titre        text,
  client       text,
  statut       text not null,                   -- statut Tiime : draft | saved | sent | paid | cancelled…
  emise_le     date,
  montant_ht   numeric not null default 0,
  montant_ttc  numeric not null default 0,
  document_id  uuid references public.documents(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, source, externe_id)
);

-- ---------------------------------------------------------------------------
-- Notes de frais (dépenses avancées ou indemnités kilométriques)
-- ---------------------------------------------------------------------------
create table if not exists public.notes_frais (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  source           public.compte_source not null default 'tiime',
  externe_id       text not null,
  nom              text,
  jour             date,
  type             text not null,               -- advanced_expense | travel
  statut           text,                        -- cycle Tiime : draft | saved…
  statut_paiement  text,                        -- remboursement : to_pay | paid…
  montant          numeric not null default 0,
  montant_tva      numeric not null default 0,
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, source, externe_id)
);

-- ---------------------------------------------------------------------------
-- Trajets professionnels (base des indemnités kilométriques)
-- ---------------------------------------------------------------------------
create table if not exists public.trajets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source        public.compte_source not null default 'tiime',
  externe_id    text not null,
  jour          date not null,
  depart        text,
  arrivee       text,
  distance_km   numeric not null default 0,     -- distance telle que Tiime la donne (total_distance, sinon distance)
  aller_retour  boolean not null default false,
  montant       numeric,                        -- indemnité calculée par Tiime, si connue
  commentaire   text,
  brut          jsonb,                          -- réponse source, pour les champs non mappés
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, source, externe_id)
);

do $$
declare t text;
begin
  foreach t in array array['factures','notes_frais','trajets']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create index if not exists factures_user_emise on public.factures (user_id, emise_le desc);
create index if not exists notes_frais_user_jour on public.notes_frais (user_id, jour desc);
create index if not exists trajets_user_jour on public.trajets (user_id, jour desc);
create index if not exists factures_document on public.factures (document_id) where document_id is not null;
