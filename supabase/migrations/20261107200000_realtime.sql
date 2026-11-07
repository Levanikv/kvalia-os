-- Realtime : l'app écoute les changements sur les tables du quotidien (une ligne ajoutée par l'agent apparaît sans recharger).
-- La RLS s'applique aux événements Realtime ; replica identity full permet de filtrer UPDATE/DELETE sur user_id.
alter table public.lignes replica identity full;
alter table public.listes replica identity full;
alter table public.taches replica identity full;
alter table public.habitudes_log replica identity full;
alter table public.habitudes replica identity full;

alter publication supabase_realtime add table public.lignes, public.listes, public.taches, public.habitudes_log, public.habitudes;
