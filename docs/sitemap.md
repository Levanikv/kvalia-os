# KVALIA OS — Sitemap & conventions d'URL (v1)

Source de vérité pour le routing de `apps/web`. Une mini-app = un module = un préfixe d'URL = un accent de couleur (`data-module`).

## Arborescence

```
/                         Home — la journée (vue Jour, widgets)
├── /quotidien            Mini-app Quotidien (sous-onglets)
│   ├── /quotidien/courses            Liste active par rayon · mode magasin (?mode=magasin)
│   ├── /quotidien/courses/produits   Produits & stock maison
│   ├── /quotidien/taches             Tâches (dues, à venir, faites)
│   └── /quotidien/habitudes          Habitudes du jour + séries
├── /sport                Mini-app Sport (sombre)
│   ├── /sport                        Programme en cours (blocs / semaines) + séance du jour
│   ├── /sport/seance/[id]            Séance plein écran (vidéo, séries, minuteur)
│   ├── /sport/exercices/[id]         Fiche exercice (vidéo, muscles, consignes)
│   └── /sport/historique             Séances faites, progression par exercice
├── /nutrition            Mini-app Nutrition (clair)
│   ├── /nutrition                    Journal du jour (anneau, 3 barres, repas) · ?jour=YYYY-MM-DD
│   ├── /nutrition/plan               Plan de la semaine (7 × 3) · ?semaine=YYYY-MM-DD
│   ├── /nutrition/recettes           Recettes (base + versions temporaires)
│   └── /nutrition/recettes/[id]      Fiche recette (ingrédients, macros, substituts)
├── /finances             Mini-app Finances (perso / SASU via ?perimetre=)
│   ├── /finances                     À catégoriser (swipe) + résumé du mois
│   ├── /finances/transactions        Recherche, filtres, lien document
│   ├── /finances/budgets             Budgets par catégorie, reste à dépenser
│   └── /finances/comptes             Comptes, dernière sync, consentement
├── /documents            Mini-app Porte-documents
│   ├── /documents                    Coffre (grille par type, badges expiration, recherche)
│   ├── /documents/[id]               Aperçu plein écran, champs, envoyer, partager 24 h
│   └── /documents/nouveau            Ajout (fichier / photo / partage iOS) → validation du typage
├── /objectifs            Transverse
│   ├── /objectifs                    Liste + avancement
│   └── /objectifs/[id]               Détail, lié à un programme / budget / habitude
├── /capture              Feuille « + » (texte, micro) — aussi cible du raccourci iOS (?texte=)
├── /reglages
│   ├── /reglages                     Profil, thème, fenêtre de jeûne, ordre des rayons
│   ├── /reglages/widgets             Ordre et activation des widgets Home
│   ├── /reglages/modules             Modules activés, ordre de la tab bar
│   ├── /reglages/agent               Contexte / mémoire de l'agent (éditable)
│   └── /reglages/journal             Journal des appels d'outils (qui, quoi, quand)
├── /onboarding           Première ouverture : passkey, modules, import du seed
└── /connexion            Passkey (+ magic link en secours)
```

## Navigation

- **Tab bar (5)** : Home · Quotidien · Sport · Nutrition · Plus. « Plus » ouvre une feuille : Finances, Documents, Objectifs, Réglages. Ordre et contenu modifiables dans `/reglages/modules` (la tab bar reflète les modules activés).
- **Bouton « + » flottant** sur tous les écrans → `/capture` en feuille (texte ou micro navigateur). Le texte part à l'agent, la réponse s'affiche dans la feuille.
- **Header de mini-app** : titre du module, accent de couleur, action contextuelle à droite (ex. « Courses faites », « Démarrer »).
- **Sous-onglets** dans Quotidien (Courses / Tâches / Habitudes) : segmented control sous le header, pas de tab bar imbriquée.
- **Desktop (≥ 1024 px)** : la tab bar devient une sidebar à gauche, même ordre, même « + ».

## Conventions

- Préfixe = module. Le layout lit le premier segment et pose `data-module` sur `<html>` → l'accent et le thème (Sport sombre) suivent.
- Date dans la query, jamais dans le path : `?jour=2026-11-08`, `?semaine=2026-11-02`. Sans paramètre = aujourd'hui.
- États d'écran dans la query : `?mode=magasin` (courses plein écran sombre), `?perimetre=sasu`.
- Les ids sont les uuid Supabase ; pas de slugs.
- Les widgets Home ouvrent toujours un deep link de cette liste (jamais une route privée).
- Le raccourci iOS et Alexa n'ouvrent pas l'app : ils appellent l'API. Seul « voir la liste » ouvre `/quotidien/courses`.

## Écrans MVP par module (3–4 max)

| Module | Écrans v1 | Plus tard |
| --- | --- | --- |
| Home | Jour · réordonnancement des widgets | Semaine, mode focus |
| Quotidien | Courses (+ mode magasin) · Produits & stock · Tâches · Habitudes | Agenda complet |
| Sport | Programme · Séance plein écran · Fiche exercice · Historique | Charge / récupération |
| Nutrition | Journal · Plan semaine · Fiche recette · Pesée (feuille) | Scan, photo |
| Finances | À catégoriser · Transactions · Budgets · Comptes | Tracker SASU, abonnements |
| Documents | Coffre · Aperçu · Ajout | Mode voyage |
| Transverse | Objectifs · Capture · Réglages (4) · Onboarding · Connexion | Multi-utilisateur |

## 4 flux clés (à maquetter en FigJam)

1. **Capture rapide** : « + » → dicter « il me manque du skyr » → réponse de l'agent → badge manque sur la ligne.
2. **Courses faites** : liste → bouton → récap (cochées → stock, non cochées → report) → confirmer → recettes rétablies.
3. **Démarrer une séance** : widget Home → séance plein écran → exercice par exercice → terminer → ressenti.
4. **Catégoriser** : widget Finances → pile en swipe (gauche / droite / choisir) → règle apprise → fin de pile.
