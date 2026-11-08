# 0007 — Programme sportif généré par règles déterministes dans core

**Date** : 8 nov. 2026 · **Statut** : acceptée

## Contexte

Levani veut un programme sur 12 semaines « créé par son agent », modulable dans l'admin, et des séances cohérentes semaine après semaine.

## Décision

- La génération est une **fonction pure de règles** (`genererProgramme` dans `packages/core/src/sport.ts`), pas un prompt LLM : paramètres (rythme, jours, durée, matériel, objectif, niveau, semaines) → split selon le nombre de jours → créneaux par muscle → sélection déterministe (score + rotation par bloc) → progression en blocs de 4 (3 semaines + décharge) → kcal par exercice (MET × poids × durée).
- L'agent (LLM) **appelle** `generer_programme` et explique le résultat ; il ne compose pas les séances lui-même. Il peut ajuster par `regler_sport` + regénération, ou `remplacer_exercice`.
- Les paramètres vivent dans `profils.reglages.sport` et sont modifiables dans `/reglages/sport` (admin) comme par l'agent.

## Conséquences

- Reproductible et testable (vitest, faux client) ; un bug se corrige dans une règle, pas dans un prompt.
- Les évolutions (supersets, charges cibles depuis l'historique, périodisation) sont des règles supplémentaires dans core.
- Si un jour on veut de la variété « créative », on fera générer des **paramètres** par le LLM, jamais les lignes de séance.
