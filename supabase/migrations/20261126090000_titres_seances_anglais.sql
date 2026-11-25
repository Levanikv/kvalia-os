-- Noms de séances en anglais, comme en salle (ADR 0018) : les séances déjà générées gardaient leurs titres français.
-- Données seulement, rejouable sans effet : « Haut du corps A » → « Upper A », « Bas du corps B » → « Lower B »,
-- « Corps entier A » → « Full Body A », « Jambes » → « Legs », « Full body » → « Full Body ».
update public.seances
set titre = replace(replace(replace(replace(titre, 'Haut du corps', 'Upper'), 'Bas du corps', 'Lower'), 'Corps entier', 'Full Body'), 'Full body', 'Full Body')
where titre ~ '^(Haut du corps|Bas du corps|Corps entier|Full body)';

update public.seances set titre = 'Legs' where titre = 'Jambes';
