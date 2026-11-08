# 0003 — Supabase avec RLS dès le départ, un seul utilisateur en v1

**Date** : 7 nov. 2026 · **Statut** : acceptée

## Contexte

Produit personnel aujourd'hui, peut-être partagé demain. Les données sont sensibles (finances, santé, documents).

## Décision

- Toute table porte `user_id` et des politiques owner ; les référentiels sont en lecture `authenticated`.
- Côté web : client SSR avec la clé publique et les cookies (RLS actif). Côté agent : clé service role + `KVALIA_USER_ID`, et les règles filtrent explicitement sur `user_id`.
- Un seul projet Supabase (prod), eu-west-3. Pas de staging en v1 : on teste sur le téléphone.
- `vue_jour(p_jour, p_user_id)` filtre sur `coalesce(auth.uid(), p_user_id)` pour servir les deux contextes.

## Conséquences

- Passer au multi-utilisateur ne demandera pas de réécrire le schéma, seulement l'auth de l'agent (0005).
- Les tests de règles tournent sur un faux client ; les migrations sont jouées sur le vrai projet avec soin (runbook).
