# 0021 — Sport : l'app s'adapte à la façon de s'entraîner (programme, à la carte, mes séances)

**Date** : 26 nov. 2026 · **Statut** : acceptée · **Précise [0002](0002-agent-first-noyau-unique.md)** (le noyau unique et le contrat d'outils restent ; c'est le produit qui n'est plus « IA d'abord »)

## Contexte

Sport partait d'une seule idée : l'onboarding génère un programme de plusieurs semaines, et tout l'écran tourne
autour. C'est trop étroit. Deux cas réels n'y entrent pas :

- celui qui **s'entraîne quand il peut** et n'a pas de programme — il veut dire « je m'entraîne aujourd'hui », choisir
  un type (full body, push…), voir la séance, la prendre ou la changer, la garder si elle lui plaît, démarrer ;
- celui qui **a déjà ses séances** et ses habitudes, et veut seulement suivre sa progression.

Demande de Levani : sortir du « IA first », demander à l'onboarding et s'adapter. L'IA peut aussi composer une
séance, mais c'est un bonus, pas le passage obligé.

## Décision

- **Un réglage `mode`** dans `ParametresSport` (`ModeSport`) : `programme` (défaut, comportement d'avant),
  `a_la_carte`, `mes_seances`. C'est la **première question de l'onboarding** ; les questions suivantes s'y adaptent
  (jours, échéance et date de départ seulement pour un programme ; ni durée ni matériel préféré avec ses propres
  séances) et **aucun programme n'est généré** hors du mode `programme`. Modifiable dans Réglages › Sport ;
  `generer_programme` le repasse en `programme`.
- **Séance à la carte** — outil `seance_a_la_carte` (type, durée, jour, `variante`) : le noyau compose une séance
  hors programme (`programme_id` nul) avec **les mêmes règles que le générateur** (`composerSeance` : classiques par
  créneau, matériel, niveau, douleurs, prescription selon l'objectif). `variante` + 1 = « une autre proposition »
  (elle remplace la précédente ; les types à deux versions alternent A / B, puis les classiques d'un créneau sur
  deux). Le remplacement d'un exercice reste `equivalents_exercice` + `remplacer_exercice`.
- **Favori** — outil `enregistrer_seance_favorite` : n'importe quelle séance devient une séance perso (« Mes
  séances »), relançable un autre jour (`planifier_seance_perso` à une date). Pas de nouvelle table.
- **Annuler** — outil `annuler_seance` : seulement hors programme et pas commencée. Une proposition jamais
  commencée disparaît le lendemain (`recaler_programme` ne recale que les séances du programme).
- **Garde-fous** : jamais deux séances de salle le même jour — `seance_a_la_carte` refuse si une séance du programme
  est prévue ce jour-là (la faire ou la reporter) ou si une séance est en cours.
- **Écrans** : `/sport/aujourdhui` (plein écran : type + durée, ou une de ses séances) → la séance, où une
  proposition porte « Une autre · Garder · Annuler » ; l'accueil Sport montre « On s'entraîne ? » quand il n'y a pas
  de programme à suivre, et un lien discret « composer une autre séance » un jour de repos du programme ; l'onglet
  Programme s'ouvre sur Mes séances hors mode `programme`.
- **Vocabulaire de l'interface** : « l'app » plutôt que « l'IA » dans les parcours Sport — ce sont des règles
  déterministes (ADR 0007), pas un modèle.

## Ce qui ne change pas

La règle 1 du repo : toute action de l'UI est d'abord un outil MCP dans `packages/core`. Les trois nouveaux outils
sont utilisables par l'agent (« compose-moi un pull de 45 min »). L'agent reste une porte d'entrée parmi d'autres ;
l'app est complète sans lui.

## Conséquences

- Pas de migration : `mode` vit dans les réglages JSON, les séances à la carte dans `seances` sans programme.
- Le « défi de la semaine » (séances prévues / faites) n'a de sens qu'avec un programme : hors programme, la tuile
  Semaine compte les séances faites.
- À faire plus tard si le besoin se confirme : un objectif hebdomadaire sans programme (« 3 séances par semaine »),
  la rotation automatique du type proposé selon ce qui a été travaillé récemment.
