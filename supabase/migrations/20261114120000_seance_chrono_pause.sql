-- Séance en direct (workflow Home → séance) : chrono avec pause.
-- Le chrono = maintenant − debut_le − pause_cumul_s ; figé tant que pause_le est renseigné.
-- Les séries validées une à une et les exercices ratés vivent dans exercices_seance.realise (jsonb existant).
alter table public.seances
  add column if not exists pause_le      timestamptz,
  add column if not exists pause_cumul_s integer not null default 0;

comment on column public.seances.pause_le is 'Chrono en pause depuis (null = il tourne).';
comment on column public.seances.pause_cumul_s is 'Secondes de pause déjà cumulées, déduites de la durée réelle.';
