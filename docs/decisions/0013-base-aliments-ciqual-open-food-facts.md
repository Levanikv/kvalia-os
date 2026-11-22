# 0013 — Nutrition : aliments CIQUAL en base, Open Food Facts à la recherche, suggestions par règles

**Date** : 22 nov. 2026 · **Statut** : acceptée

## Contexte

Levani veut un module Nutrition au niveau des meilleures apps de nutrition sportive : une très grosse base
d'aliments, des recettes liées au programme sportif, et des conseils dynamiques (« il me reste 300 kcal : quoi manger
pour mon encas ? »).

## Décision

- **Deux sources d'aliments, une seule table** (`aliments`, valeurs pour 100 g) :
  - **CIQUAL 2020** (ANSES, Licence Ouverte Etalab) : 3 092 aliments génériques en base, chargés par
    `pnpm --filter @kvalia/agent seed:aliments` depuis `supabase/seed/aliments_ciqual.json` (converti par
    `packages/core/scripts/ciqual-vers-json.py` ; énergie UE, sinon facteurs de Jones, sinon 4 / 4 / 9 kcal par g).
    Fiable, en français, sans réseau.
  - **Open Food Facts** (ODbL) : produits de marque et codes-barres, interrogés à la recherche puis **mis en cache**
    dans `aliments` (source `off`). Aucune donnée personnelle n'est envoyée : seulement le texte cherché.
  - La recherche se fait en deux temps dans l'app : la base tout de suite, Open Food Facts juste après.
- **Journal** (`journal_repas`) : chaque ligne fige ses macros à la saisie (aliment × quantité, recette × portions,
  ou saisie libre). Cinq repas : petit-déjeuner, collation (matin), déjeuner, encas (après-midi), dîner.
- **Recettes** : 36 recettes de départ (`recettes-base.ts`, généré), macros calculées depuis CIQUAL, étiquetées
  (avant / après la séance, sèche, masse, léger…) ; importées une fois par utilisateur.
- **Suggestions par règles, pas par LLM** (même logique que l'ADR 0007) : `budgetRepas` (reste du jour − repas
  principaux à venir, plafonné à la part du repas) puis `classerSuggestions` (au plus près du budget, protéines
  manquantes, glucides avant la séance, protéines après, léger en sèche, dense en prise de muscle). L'agent appelle
  `suggerer_repas` et explique.

## Conséquences

- Six outils : `chercher_aliment`, `journal_du_jour`, `ajouter_au_journal`, `supprimer_du_journal`,
  `lister_recettes`, `suggerer_repas`.
- Open Food Facts est une base collaborative : des fiches peuvent être fausses ou incomplètes (celles sans énergie
  sont écartées). ODbL : citer la source ; si un jour la base d'aliments est redistribuée, elle doit l'être sous ODbL.
- Le scan du code-barres à la caméra n'est pas fait (l'API n'existe pas dans Safari iOS) : on tape le code.
- Le plan de la semaine, la pesée et la liste de courses depuis les recettes restent à faire.
- Skyr et whey ne sont pas dans CIQUAL : les recettes utilisent des moyennes d'étiquettes (dans le générateur).
