-- Sport v1 : bibliothèque d'exercices avec vidéos, blocs / semaines, calories (MET × poids × durée).

-- Référentiel : champs du dataset free-exercise-db-with-videos (MIT) + MET pour l'estimation calorique.
alter table public.exercices_ref
  add column if not exists partie_corps  text,                 -- chest, back, upper legs…
  add column if not exists difficulte    text,                 -- beginner | intermediate | advanced
  add column if not exists compose       boolean not null default false,
  add column if not exists unilateral    boolean not null default false,
  add column if not exists alias         text[] not null default '{}',
  add column if not exists description   text,
  add column if not exists erreurs       text[] not null default '{}',
  add column if not exists reperes       text[] not null default '{}',   -- form cues
  add column if not exists respiration   text,
  add column if not exists video_url_f   text,                 -- démo modèle féminin
  add column if not exists image_url_f   text,
  add column if not exists met           numeric not null default 5.0;  -- Compendium of Physical Activities

create index if not exists exercices_ref_partie_idx on public.exercices_ref (partie_corps);
create index if not exists exercices_ref_equip_idx on public.exercices_ref (equipement);

-- Séances : structure du programme et dépense estimée
alter table public.seances
  add column if not exists titre      text,
  add column if not exists bloc       smallint,
  add column if not exists semaine    smallint,
  add column if not exists focus      text,          -- hypertrophie | force | mixte | deload
  add column if not exists kcal       numeric,       -- estimation, mise à jour à chaque exercice coché / à la fin
  add column if not exists debut_le   timestamptz;

create index if not exists seances_user_jour_idx on public.seances (user_id, jour);

-- Exercices de séance : durée estimée pour la répartition des calories
alter table public.exercices_seance
  add column if not exists duree_s   int,             -- estimée : séries × (effort + repos)
  add column if not exists kcal      numeric,
  add column if not exists fait_le   timestamptz;

-- Realtime pour la séance en cours
alter table public.seances replica identity full;
alter table public.exercices_seance replica identity full;
alter publication supabase_realtime add table public.seances, public.exercices_seance;

-- vue_jour : la séance porte son titre et ses kcal
drop function if exists public.vue_jour(date, uuid);
create function public.vue_jour(p_jour date default current_date, p_user_id uuid default null)
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
    'seance', (
      select jsonb_build_object('id', s.id, 'type', s.type, 'titre', s.titre, 'duree_min', s.duree_min, 'etat', s.etat, 'kcal', s.kcal,
        'nb_exercices', (select count(*) from exercices_seance x where x.seance_id = s.id),
        'nb_faits', (select count(*) from exercices_seance x where x.seance_id = s.id and x.fait))
      from seances s
      where s.user_id = coalesce(auth.uid(), p_user_id) and s.jour = p_jour
      order by s.created_at limit 1
    ),
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
