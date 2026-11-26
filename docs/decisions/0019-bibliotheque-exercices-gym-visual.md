# 0019 — Bibliothèque d'exercices : 1 324 exercices animés (données MIT, médias © Gym visual)

**Date** : 26 nov. 2026 · **Statut** : acceptée · **Remplace [0006](0006-bibliotheque-exercices.md)**

## Contexte

La réserve de l'ADR 0006 s'est réalisée : le stockage tiers qui hébergeait les vidéos et les affiches n'est plus
public (erreur 401 sur chaque fichier) — plus aucune démonstration ne chargeait. La bibliothèque elle-même était
courte (317 exercices, dont 111 au poids du corps et 5 à la Smith) : pas de développé couché à la Smith, peu de
machines. Levani veut une bibliothèque moderne, rapide, avec les machines des salles actuelles.

Trois options ont été comparées (26 nov.) : ce jeu animé ; `free-exercise-db` (domaine public, 876 exercices, photos
fixes datées, en anglais) ; l'API MuscleWiki (1 900+ vidéos, payante). Levani a choisi le jeu animé.

## Décision

- **Source** : `hasaneyldrm/exercises-dataset`, figée au commit `7455efa` — 1 324 exercices avec partie du corps,
  muscles, matériel et **consignes en français**. 48 exercices à la Smith, 101 sur machines guidées, hack squat,
  presse, pec deck.
- **Licence** : données et textes sous MIT. **Animations et vignettes © Gym visual** (https://gymvisual.com/),
  redistribuées par l'auteur du jeu avec leur permission, en 180 × 180 uniquement. L'app affiche la mention
  « © Gym visual — gymvisual.com » sous chaque animation et sous la bibliothèque. La réutilisation reste soumise aux
  conditions de Gym visual : à revoir si l'app sort de l'usage personnel.
- **Médias non copiés** : les URLs pointent vers le CDN jsDelivr sur le commit figé (immuable, cache mondial). Une
  animation pèse ≈ 120 Ko, une vignette ≈ 9 Ko ; la liste n'affiche que 40 exercices à la fois.
- **Import** : `packages/core/scripts/exercices-gym-visual.py` construit `supabase/seed/exercices_ref.source.json`
  (une ligne = une ligne de `exercices_ref`, identifiants `gv-0001`…, source `gym-visual`) ; difficulté, composé /
  isolation, unilatéral et MET sont déduits du nom et du matériel. `apps/agent/src/semer-exercices.ts` le sème **au
  démarrage de l'agent** si la base n'est pas à jour (ou `pnpm --filter @kvalia/agent seed:exercices`).
- **Ancienne bibliothèque rangée, pas supprimée** : ses lignes restent (des séances faites y renvoient) mais ne sont
  plus proposées — générateur, équivalents, bibliothèque et sélecteur filtrent sur `SOURCE_EXERCICES`. Leurs liens
  vidéo morts sont retirés ; à nom identique, elles reprennent l'animation de la nouvelle.
- **Générateur** : classiques (ADR 0016) et noms d'usage (ADR 0018) refaits sur les nouveaux noms, avec les machines
  modernes (Smith Machine Bench Press, Machine Chest Press, Pec Deck, Hack Squat, Leg Press, Machine Row…). Le
  matériel d'une salle complète inclut maintenant presse et hack squat (`sled machine`).

## Conséquences

- Plus de vidéo 1080p ni de démonstrateur H / F : une animation 180 × 180 sur fond blanc.
- Dépendance à un tiers pour les médias (dépôt GitHub servi par jsDelivr) : si elle casse, les URLs sont des données
  — on les réécrit vers notre propre stockage (Supabase Storage) sans toucher au code.
- Pas de repères techniques, d'erreurs fréquentes ni de consigne de respiration dans ce jeu : ces rubriques sont vides
  pour les nouveaux exercices.
- Le jeu date d'avant certaines machines récentes (pendulum squat, belt squat, hip thrust guidé) : absentes.
- Un programme déjà généré garde ses anciens exercices : en générer un nouveau pour passer sur la nouvelle
  bibliothèque.
