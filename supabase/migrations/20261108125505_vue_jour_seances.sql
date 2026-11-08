-- vue_jour : plusieurs séances par jour (ex. muscu + boxe).
-- 'seances' liste toutes les séances du jour (salle avant boxe, puis ordre de création) ;
-- 'seance' reste pour compatibilité = la principale (la première pas encore faite, sinon la première),
-- même règle que seancePrincipale() dans packages/core/src/sport.ts.
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
