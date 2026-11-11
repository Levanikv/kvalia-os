# 0010 — Entreprise : synchro Tiime par son API interne, en lecture seule

**Date** : 11 nov. 2026 · **Statut** : acceptée

## Contexte

La SASU (KVALIA, société Tiime `626568`) tient sa banque, ses factures, ses notes de frais et ses frais kilométriques dans Tiime (offre Business + Tiime Factures). Le module Entreprise a besoin de ces chiffres (CA facturé / encaissé, frais, IK, solde pro).

Ce qu'on a vérifié le 11 nov. 2026 :

- **API officielle** : réservée aux éditeurs partenaires, sur demande (FAQ Tiime). Pas pour nous.
- **Make « Tiime Apps »** (connecteur officiel, `https://api.tiime.fr`) testé sur le compte : `/v1/companies` et `/v1/companies/{id}/invoices` répondent ; `bank_accounts` → **403** « Vous n'avez pas accès à cette fonctionnalité » ; `bank_transactions`, `expense_reports` → **404**. Les factures n'ont pas de statut de paiement. Insuffisant.
- **SDK communautaire** (`tiime-sdk`, prévu par le sitemap) : retiré de npm le 12 mai 2026.
- **API interne** de l'app web `apps.tiime.fr` (`https://chronos-api.tiime-apps.com/v1`, Auth0 `auth0.tiime.fr`) : couvre tout (banque, factures avec statut, notes de frais, trajets, véhicules). Documentée par rétro-ingénierie dans [eko/mcp-tiime](https://github.com/eko/mcp-tiime) (MIT, actif), qui sert de référence.

## Décision

- On synchronise **depuis l'API interne Tiime vers Supabase**, en **lecture seule** : aucune requête d'écriture vers Tiime (pas de POST/PATCH/PUT/DELETE côté Tiime) dans cette version.
- Le client vit dans `packages/core/src/tiime.ts` (fetch injecté, testable sans réseau) ; la synchro et les règles du pilotage dans `packages/core/src/entreprise.ts`.
- **Secrets** : `TIIME_EMAIL`, `TIIME_PASSWORD`, `TIIME_SOCIETE_ID` n'existent que dans le service `agent` (Railway) et le `.env` local. Le jeton de rafraîchissement Auth0 est stocké dans `connexions_externes`, table **sans politique RLS** (lisible par la seule clé service role, donc par l'agent seul).
- **Connexion avec code SMS** (le compte a la double authentification) : parcours Auth0 Universal Login porté depuis eko/mcp-tiime. Deux outils MCP : `connecter_tiime` (envoie le SMS) puis `valider_code_tiime` (donne le code). Première connexion possible aussi en terminal : `pnpm --filter @kvalia/agent tiime:connexion`. Ensuite l'agent vit sur le jeton de rafraîchissement.
- Les outils Tiime ne marchent que côté agent (le contexte web n'a pas de client Tiime) ; l'app lit les tables synchronisées.
- Données : banque → `comptes` (`source = tiime`, `perimetre = sasu`) + `transactions` (existantes) ; nouvelles tables `factures`, `notes_frais`, `trajets`. Clé de dédoublonnage = identifiant Tiime.

## Conséquences

- **Fragile par nature** : API non documentée, Tiime peut la changer sans prévenir. En cas de casse, comparer avec eko/mcp-tiime (`docs/api-tiime.md`) ou relire le JavaScript d'`apps.tiime.fr`. La version d'app envoyée (`tiime-app-version`) est réglable par `TIIME_APP_VERSION`.
- Probablement hors des conditions d'utilisation de Tiime ; usage strictement personnel, sur le compte de Levani. Le risque est accepté par Levani (11 nov. 2026).
- Le jeton de rafraîchissement donne accès à tout le compte Tiime : jamais renvoyé par un outil, jamais journalisé dans `appels_outils`.
- L'écriture (créer trajets IK, notes de frais, rattacher des justificatifs) fera l'objet d'un nouvel ADR, avec `toolsAvecConfirmation`.
- Si Tiime ouvre une API publique pour les clients, on remplace le client sans toucher aux tables ni aux outils.
