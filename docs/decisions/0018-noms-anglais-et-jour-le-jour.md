# 0018 — Sport : noms en anglais comme en salle, et un programme qui se vit au jour le jour

**Date** : 26 nov. 2026 · **Statut** : acceptée · Complète [0016](0016-exercices-classiques.md) et [0017](0017-deplacer-une-seance.md)

## Contexte

Deux retours de Levani après usage :

1. En salle, personne ne dit « tirage vertical prise large » ni « Haut du corps A » : on dit *Lat Pulldown*, *Upper A*,
   *Push / Pull / Legs*. Les noms traduits ou hérités du référentiel (« Lever Leg Extension », « Sled 45 Degree Wide
   Leg Press ») ne ressemblaient à rien de connu.
2. Beaucoup de gens — lui compris — ne savent pas à l'avance quels jours ils s'entraîneront. Les jours choisis à
   l'onboarding sont une intention, pas un contrat : un jour libre, on veut faire **la séance suivante de la file**
   (lundi Push, mardi Pull…), et une séance manquée ne doit ni se perdre ni tout faire capoter.

## Décision

- **Noms des séances et des exercices en anglais, descriptions en français.**
  - Séances : `Push`, `Pull`, `Legs`, `Upper A / B`, `Lower A / B`, `Full Body A / B` (titres générés et libellés de
    type). Une migration de données renomme les séances déjà en base.
  - Exercices : `nomUsuel()` (core) rend le nom d'usage — une table pour les classiques (*Leg Press*, *Romanian
    Deadlift*, *Face Pull*, *Skull Crusher*…), un simple nettoyage du jargon pour les autres. `nomAffiche()` côté web
    l'appelle ; `nom_fr` n'est plus affiché.
  - Tout le reste de l'interface reste en français (consignes, muscles, matériel, boutons).
- **Le programme est une file de séances, les jours ne sont que des créneaux.**
  - **Un jour en plus** : « Faire <séance> » un jour sans séance amène la prochaine à aujourd'hui **et fait remonter
    toutes les suivantes d'un créneau** (`deplacer_seance` avec `suite: "avancer"`). L'ordre ne change jamais.
  - **Séance manquée** : à l'ouverture de Sport, une séance prévue un jour passé et jamais commencée est recalée
    (`recaler_programme`) : la plus ancienne prend le prochain créneau, les suivantes suivent, le programme s'allonge
    d'autant. Rien n'est supprimé, rien n'est doublé.
  - **Empêchement connu d'avance** : « Reporter » (ADR 0017), inchangé.

## Conséquences

- « Faire <séance> » un jour en plus ajoute une séance à la semaine : c'est le choix de l'utilisateur ce jour-là, le
  programme ne l'y pousse pas. Le programme se termine alors un créneau plus tôt.
- Le recalage écrit en base pendant l'affichage de la page Sport (une lecture quand il n'y a rien à faire). La Home
  ne le déclenche pas : elle peut montrer l'ancien placement jusqu'à l'ouverture de Sport.
- Une séance qu'on ne veut vraiment pas faire revient tant qu'elle n'est pas faite : « sauter une séance » reste à
  ajouter.
- La règle « pas d'anglais dans l'UI » garde une exception écrite : noms de séances et d'exercices (CLAUDE.md).
