# 0006 — Référentiel d'exercices : free-exercise-db-with-videos

**Date** : 7 nov. 2026 · **Statut** : acceptée

## Contexte

Il faut des vidéos de démonstration façon Freeletics, des métadonnées (muscles, matériel, difficulté) et une licence qui permet l'import.

## Décision

- Source : `imjosiel/free-exercise-db-api` (fork de `amiinwani/free-exercise-db-with-videos`) — 317 exercices, métadonnées MIT, vidéos 1080p H/F + affiches hébergées (R2).
- Import **en base** (`exercices_ref`) par `apps/agent/scripts/seed-exercices.mjs` ; pas d'appel API à l'exécution. Colonnes ajoutées : partie du corps, difficulté, composé, repères, erreurs, respiration, vidéos H/F, **MET**.
- Les noms restent en anglais en base ; l'app affiche `nom_fr` si rempli, sinon `nomAffiche()` (heuristique). L'agent pourra remplir `nom_fr`.

## Conséquences

- Aucune dépendance réseau tierce côté app hors les URLs médias.
- **Réserve** : la provenance des vidéos n'est pas documentée par l'auteur du dataset. Les URLs sont des données : on peut les remplacer (autre CDN, nos propres vidéos) sans toucher au code.
