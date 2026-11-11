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
│   ├── /sport                        Vue Jour (défaut) : en-tête partagé (pastille du jour, semaine), programme suivi,
│   │                                 séance(s) du jour (muscu + boxe possibles), semaine en cours, historique · énergie
│   │                                 (?jour=YYYY-MM-DD pour un autre jour)
│   ├── /sport/seance/[id]            Séance : exercices à cocher (vidéo au tap), kcal en direct, Terminer + ressenti
│   ├── /sport/exercices              Bibliothèque (317 vidéos) : recherche, partie du corps, matériel
│   ├── /sport/exercices/[id]         Fiche exercice : vidéo en boucle H/F, consignes, repères, erreurs, respiration
│   │                                 (?seance=<id> : prescription + « Fait → suivant »)
│   ├── /sport/programme              Programme actif : hero (anneau, semaine n / N, chiffres), frise des phases,
│   │                                 séances de la semaine en carrousel, semaine type, toutes les semaines
│   ├── /sport/programme/nouveau      Créer / régénérer, plein écran en étapes : objectif → niveau → semaine
│   │                                 → séance → matériel → aperçu → génération (sans barre ni « + »)
│   └── /sport/historique             Séances faites par mois (kcal, durée, ressenti)
├── /nutrition            Mini-app Nutrition (clair)
│   ├── /nutrition                    Journal du jour (anneau, 3 barres, repas) · ?jour=YYYY-MM-DD
│   ├── /nutrition/plan               Plan de la semaine (7 × 3) · ?semaine=YYYY-MM-DD
│   ├── /nutrition/recettes           Recettes (base + versions temporaires)
│   └── /nutrition/recettes/[id]      Fiche recette (ingrédients, macros, substituts)
├── /finances             Mini-app Finances — perso (BoursoBank)
│   ├── /finances                     À catégoriser (swipe) + résumé du mois
│   ├── /finances/transactions        Recherche, filtres, lien document
│   ├── /finances/budgets             Budgets par catégorie, reste à dépenser
│   └── /finances/comptes             Comptes, dernière sync, consentement
├── /entreprise           Mini-app Entreprise — la SASU (Tiime)
│   ├── /entreprise                   Pilotage : CA encaissé / facturé, charges, jauge « encore passable en frais », projection fin d'année
│   ├── /entreprise/factures          Factures et clients (émises, payées, en retard) · ?annee=
│   ├── /entreprise/charges           Dépenses pro, catégorie déductible, justificatif lié (→ /documents/[id])
│   ├── /entreprise/echeances         TVA, URSSAF, IR, CFE… avec montants estimés et rappels
│   └── /entreprise/simulateur        What-if : « si je facture X / passe Y en frais » → impact sur le net et l'impôt
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
│   ├── /reglages/sport               Admin du programme : rythme, jours, durée, matériel, objectif, niveau, poids → Générer
│   ├── /reglages/nutrition           Cible kcal de base, protéines, ajustement avec le sport
│   ├── /reglages/widgets             Ordre et activation des widgets Home
│   ├── /reglages/modules             Modules activés, ordre de la tab bar
│   ├── /reglages/agent               Contexte / mémoire de l'agent (éditable)
│   └── /reglages/journal             Journal des appels d'outils (qui, quoi, quand)
├── /onboarding           Première ouverture : passkey, modules, import du seed
└── /connexion            Passkey (+ magic link en secours)
```

## Navigation

> v1.1 (8 nov.) — la tab bar globale est remplacée par un **menu « Applications »** et une **barre inférieure par application**.

- **Menu « Applications »** (icône burger en haut à gauche, sur tous les écrans) : feuille qui monte du bas et liste les apps — Home · Quotidien · Sport & Nutrition · Finances · Entreprise · Documents · Objectifs · Réglages — avec une ligne de description chacune, l'app courante surlignée, et le bouton Capture en bas. Registre : `packages/ui/src/index.ts` (`menuApps`).
- **Barre inférieure par application** (`onglets` dans le registre, composant `ModuleBar`) : les entrées principales de l'app courante, à un tap. Sport & Nutrition : **Jour · Programme · Exercices · Nutrition**. Quotidien : Courses · Tâches · Habitudes. Finances : Vue · Transactions · Budgets · Comptes. Entreprise : Pilotage · Factures · Charges · Échéances · Simuler. Home : Aujourd'hui · Objectifs · Documents. Réglages : Réglages · Sport · Nutrition · Journal. L'onglet actif = le préfixe d'URL le plus long qui correspond (`/sport/seance/x` → Jour).
- **Sport & Nutrition** : une seule application, deux modules (préfixes `/sport` et `/nutrition`), chacun avec son accent et son identité (Sport sombre, Nutrition clair). **L'en-tête est le même** sur les deux (`sport/entete.tsx`) : pastille du jour (Aujourd'hui / Demain / Il y a n jours), date courte, « Semaine n / N » du programme (sinon semaine ISO), bouton « Auj. » quand on s'est déplacé. La **bande de jours** est partagée : scrollable, le jour sélectionné centré, un point par séance (deux = double séance), `?jour=YYYY-MM-DD` conservé en passant de l'un à l'autre.
- **Plusieurs séances par jour** : un jour peut porter muscu + boxe (cocher le même jour dans les deux). Ordre d'affichage : salle puis boxe.
- **Parcours plein écran** (`ECRANS_PLEIN_ECRAN` dans `packages/ui`) : pas de barre inférieure ni de « + » ; fermer = croix en haut à gauche.
- **Feuilles modales** (`BottomSheet`, façon iOS : voile, poignée, zone sûre, Échap) pour tout ce qui est contextuel : menu apps, Terminer la séance (ressenti), détail d'un exercice (charge, reps, remplacer), équivalents. Pas de modale centrée.
- **Header de mini-app** : burger (ou flèche retour sur un écran de détail), titre + sous-titre (date, semaine), avatar à droite → Réglages, ou une action contextuelle.
- **Finances vs Entreprise** : Finances = comptes perso ; Entreprise = tout ce qui touche la SASU (comptes pro, factures, charges, échéances, simulateur, conseils). Une transaction appartient à l'un ou à l'autre (`perimetre`), jamais aux deux.
- **Bouton « + » flottant** sur tous les écrans → `/capture` (texte ou micro navigateur). Le texte part à l'agent, la réponse s'affiche.
- **Desktop** : même shell, centré (max 32 rem) ; pas de sidebar pour l'instant.

## Conventions

- Préfixe = module. Le layout lit le premier segment et pose `data-module` sur `<html>` → l'accent et le thème (Sport sombre) suivent.
- Date dans la query, jamais dans le path : `?jour=2026-11-08`, `?semaine=2026-11-02`. Sans paramètre = aujourd'hui.
- États d'écran dans la query : `?mode=magasin` (courses plein écran sombre), `?annee=2026`.
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
| Finances | À catégoriser · Transactions · Budgets · Comptes | Abonnements oubliés, épargne |
| Entreprise | Pilotage · Factures · Charges · Échéances (+ simulateur en feuille) | Conseils de l'agent (juridique, investissement), devis, relances auto |
| Documents | Coffre · Aperçu · Ajout | Mode voyage |
| Transverse | Objectifs · Capture · Réglages (4) · Onboarding · Connexion | Multi-utilisateur |

## Entreprise — ce que le module doit savoir faire

- Encaisser une facture (PDF ou chiffre) → CA à jour, **impact immédiat** : ce qu'il reste de passable en frais au prorata de l'année, bénéfice projeté, impôt estimé (SASU à l'IR : le résultat remonte sur le foyer).
- Jauge de frais : plafond raisonnable de charges déductibles calculé sur le CA, consommé par les dépenses pro catégorisées.
- Échéancier fiscal et social avec montants estimés, rappels 15 jours avant.
- Simulateur what-if : facturer X de plus, passer Y en frais, se verser Z → effet sur le net et l'impôt.
- Conseils de l'agent : questions en langage naturel (« je peux passer mon vélo en frais ? »), **avec le disclaimer** : ce n'est pas un comptable, les chiffres se valident avec le sien.
- Source : Tiime, par son API interne en lecture seule (ADR 0010) — synchro par l'agent vers `comptes`/`transactions` (périmètre `sasu`), `factures`, `notes_frais`, `trajets` ; outils `synchroniser_tiime`, `pilotage_sasu`. Factures uploadées dans Documents (type `sasu`).

## 4 flux clés (à maquetter en FigJam)

1. **Capture rapide** : « + » → dicter « il me manque du skyr » → réponse de l'agent → badge manque sur la ligne.
2. **Courses faites** : liste → bouton → récap (cochées → stock, non cochées → report) → confirmer → recettes rétablies.
3. **Démarrer une séance** : widget Home → séance plein écran → exercice par exercice → terminer → ressenti.
4. **Catégoriser** : widget Finances → pile en swipe (gauche / droite / choisir) → règle apprise → fin de pile.
