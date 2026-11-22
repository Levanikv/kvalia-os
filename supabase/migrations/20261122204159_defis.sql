-- Défis du programme (Sport) : petites habitudes chiffrées à tenir en plus des séances — « 10 000 pas par jour »,
-- « 10 min de mobilité », « 50 pompes », ou une simple case à cocher. Un défi vaut certains jours de la semaine
-- (tous par défaut) entre `debut` et `fin` (par défaut la fin du programme actif) ; le suivi garde une valeur par jour.
-- Règles (cible atteinte, série, semaine) : packages/core/src/defis.ts.
create table if not exists public.defis (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  programme_id   uuid references public.programmes(id) on delete set null,
  nom            text not null check (length(trim(nom)) between 1 and 60),
  mesure         text not null default 'case' check (mesure in ('pas', 'minutes', 'repetitions', 'case')),
  cible          int not null default 1 check (cible between 1 and 100000),
  jours_semaine  int[] not null default '{0,1,2,3,4,5,6}'
                 check (cardinality(jours_semaine) between 1 and 7 and jours_semaine <@ '{0,1,2,3,4,5,6}'::int[]),
  debut          date not null default current_date,
  fin            date check (fin is null or fin >= debut),
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.defis_suivi (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  defi_id     uuid not null references public.defis(id) on delete cascade,
  jour        date not null,
  valeur      numeric not null default 0 check (valeur >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (defi_id, jour)
);

create index if not exists defis_user_idx on public.defis (user_id, actif);
create index if not exists defis_suivi_user_jour_idx on public.defis_suivi (user_id, jour);

do $$
declare t text;
begin
  foreach t in array array['defis', 'defis_suivi'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- Realtime : la Home Sport et l'onglet Programme se mettent à jour quand l'agent note un défi.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'defis') then
    alter publication supabase_realtime add table public.defis;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'defis_suivi') then
    alter publication supabase_realtime add table public.defis_suivi;
  end if;
end $$;

-- vue_jour : ajoute 'defis' (défis qui valent ce jour-là, valeur notée, cible, atteint). Le reste est inchangé.
create or replace function public.vue_jour(p_jour date default current_date, p_user_id uuid default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with s as (
    select jsonb_build_object('id', s.id, 'type', s.type, 'titre', s.titre, 'duree_min', s.duree_min, 'etat', s.etat, 'kcal', s.kcal,
        'nb_exercices', (select count(*) from exercices_seance x where x.seance_id = s.id),
        'nb_faits', (select count(*) from exercices_seance x where x.seance_id = s.id and x.fait)) as j,
      row_number() over (order by (s.type = 'boxe'), s.created_at, s.id) as rang,
      s.etat
    from seances s
    where s.user_id = coalesce(auth.uid(), p_user_id) and s.jour = p_jour
  )
  select jsonb_build_object(
    'jour', p_jour,
    'evenements', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'titre', e.titre, 'debut', e.debut, 'fin', e.fin, 'lieu', e.lieu) order by e.debut)
      from evenements_cache e
      where e.user_id = coalesce(auth.uid(), p_user_id) and e.debut::date = p_jour
    ), '[]'::jsonb),
    'taches', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'titre', t.titre, 'due', t.due, 'priorite', t.priorite, 'fait', t.fait) order by t.priorite desc, t.due)
      from taches t
      where t.user_id = coalesce(auth.uid(), p_user_id) and not t.fait and (t.due is null or t.due <= p_jour)
    ), '[]'::jsonb),
    'habitudes', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'nom', h.nom, 'moment', h.moment, 'non_negociable', h.non_negociable,
        'fait', exists (select 1 from habitudes_log l where l.habitude_id = h.id and l.jour = p_jour and l.fait)) order by h.ordre)
      from habitudes h
      where h.user_id = coalesce(auth.uid(), p_user_id) and h.actif
    ), '[]'::jsonb),
    'seance', (select s.j from s order by (s.etat = 'faite'), s.rang limit 1),
    'seances', coalesce((select jsonb_agg(s.j order by s.rang) from s), '[]'::jsonb),
    'defis', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'nom', d.nom, 'mesure', d.mesure, 'cible', d.cible,
        'valeur', coalesce(ds.valeur, 0), 'atteint', coalesce(ds.valeur, 0) >= d.cible) order by d.created_at)
      from defis d
      left join defis_suivi ds on ds.defi_id = d.id and ds.jour = p_jour
      where d.user_id = coalesce(auth.uid(), p_user_id) and d.actif
        and d.debut <= p_jour and (d.fin is null or d.fin >= p_jour)
        and extract(dow from p_jour)::int = any (d.jours_semaine)
    ), '[]'::jsonb),
    'repas', coalesce((
      select jsonb_agg(jsonb_build_object('repas', pl.repas, 'recette_id', r.id, 'recette', r.nom, 'portions', pl.portions, 'pris', pl.pris) order by pl.repas)
      from plans_repas_lignes pl join recettes r on r.id = pl.recette_id
      where pl.user_id = coalesce(auth.uid(), p_user_id) and pl.jour = p_jour
    ), '[]'::jsonb),
    'courses', (
      select jsonb_build_object('liste_id', li.id,
        'articles', (select count(*) from lignes g where g.liste_id = li.id and not g.coche),
        'manques', (select count(*) from lignes g where g.liste_id = li.id and g.manque))
      from listes li
      where li.user_id = coalesce(auth.uid(), p_user_id) and li.etat = 'active'
      order by li.creee_le desc limit 1
    ),
    'depenses_semaine', coalesce((
      select -sum(tr.montant)
      from transactions tr
      where tr.user_id = coalesce(auth.uid(), p_user_id) and tr.montant < 0
        and tr.jour >= date_trunc('week', p_jour)::date and tr.jour <= p_jour
    ), 0),
    'objectifs', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'titre', o.titre, 'type', o.type, 'valeur', o.valeur, 'cible', o.cible, 'echeance', o.echeance))
      from objectifs o
      where o.user_id = coalesce(auth.uid(), p_user_id) and o.actif
    ), '[]'::jsonb),
    'alertes', coalesce((
      select jsonb_agg(jsonb_build_object('document_id', d.id, 'titre', d.titre, 'expiration', d.expiration) order by d.expiration)
      from documents d
      where d.user_id = coalesce(auth.uid(), p_user_id) and d.expiration is not null and d.expiration <= p_jour + 30
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.vue_jour(date, uuid) to authenticated, service_role;
