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
│   ├── /sport/bienvenue              Onboarding muscu (première ouverture de Sport, plein écran sombre) : accueil → d'abord la façon
│   │                                 de s'entraîner (programme · à la carte · mes séances, ADR 0021), puis 10–16 questions selon ce choix
│   │                                 (roues : âge, taille, poids, poids cible, séances, échéance ; tuiles : morphologie, objectifs,
│   │                                 lieu, matériel, matériel préféré…)
│   │                                 → « Quand commencer ? » (jours de séance seulement, aujourd'hui possible) → génération → plan prêt (« Démarrer ma
│   │                                 séance du jour » si elle est aujourd'hui). « Plus tard » → reprise depuis la Home (?reprendre=1)
│   │                                 Hors programme : pas de génération — « M'entraîner maintenant » ou « Créer ma première séance »
│   ├── /sport/aujourdhui             S'entraîner aujourd'hui (plein écran) : Composer (type Full Body · Upper · Lower · Push · Pull ·
│   │                                 Legs + durée → l'app compose la séance) ou Mes séances (en lancer une) → la séance.
│   │                                 Une séance du programme prévue aujourd'hui est rappelée, pas remplacée
│   ├── /sport                        Accueil du jour (onglet Accueil) : en-tête partagé (sélecteur Sport / Nutrition, date,
│   │                                 bande de jours), ticket séance (À faire · En cours · Terminée · Prévue · Repos)
│   │                                 + « Pas dispo ? Reporter » (feuille : 7 jours, libre ou pris ; jour pris → décaler la suite
│   │                                 d'un créneau ou échanger) et, un jour sans séance, « Faire <séance> » (la prochaine vient à
│   │                                 aujourd'hui, les suivantes remontent d'un créneau) ; les séances manquées sont recalées à
│   │                                 l'ouverture ; puis deux tuiles de chiffres (la semaine, l'énergie du jour → Nutrition),
│   │                                 les défis du jour (« + 1 000 pas », cocher, feuille de saisie) et les records.
│   │                                 Sans programme à suivre (à la carte, mes séances) : ticket « On s'entraîne ? » → /sport/aujourdhui ;
│   │                                 jour de repos d'un programme : lien « Ou composer une autre séance »
│   │                                 Plusieurs séances par jour possibles (muscu + boxe) · ?jour=YYYY-MM-DD pour un autre jour
│   ├── /sport/seance/[id]            Séance (plein écran, « Home workflow ») : avant départ (chrono 0:00, Démarrer),
│   │                                 en cours (chrono, pause au tap, exercice en cours, fiche : séries Faite/En cours/
│   │                                 À faire, minuteur de repos, charge du jour, historique, remplacer), vidéo en feuille (16:9, hauteur du contenu),
│   │                                 quitter (le chrono continue), Terminer → exercices ratés → ressenti ; lecture seule
│   │                                 un autre jour ; résumé quand elle est faite. Séance hors programme pas encore commencée :
│   │                                 « Une autre » (nouvelle proposition, ?v=), « Garder » (→ Mes séances), « Annuler » ;
│   │                                 séance faite : « Garder dans mes séances »
│   ├── /sport/seance/[id]/fin        Fin de séance : kcal, volume, séries, exercices, défi de la semaine, ratés reprogrammés
│   │                                 → « Retour à l'accueil » (/sport?enregistree=1 : toast « Séance enregistrée »)
│   ├── /sport/exercices              Onglet Exos — bibliothèque (1 324 exercices animés, © Gym visual) : recherche, une rangée de
│   │                                 puces (partie du corps), feuille « Filtres » (matériel, polyarticulaires), 40 par page
│   ├── /sport/exercices/[id]         Fiche exercice : vidéo en boucle H/F, consignes, repères, erreurs, respiration
│   │                                 ; bascule Dessin / Vidéo quand un dessin au trait animé existe (443 exercices, CC BY-SA —
│   │                                 docs/credits-illustrations.md)
│   │                                 (?seance=<id> : prescription + « Fait → suivant »)
│   ├── /sport/programme              Onglet Programme, trois vues en segmented control (?vue=) :
│   │                                 · Semaine (défaut) — carte du programme (objectif, rythme, semaine n / N, fin), semaine jour
│   │                                   par jour, défis (#defis : pas, minutes, répétitions ou case ; ajout et modification en feuille)
│   │                                 · ?vue=plan — chiffres (séances, kcal, régularité), phases, toutes les semaines, méthode,
│   │                                   lien Historique, « Nouveau programme »
│   │                                 · ?vue=seances — Mes séances (séances perso) ; « Créer une séance » en barre d'action fixe
│   │                                 « Modifier le programme » = bouton de l'en-tête. Sans programme : « Construis ton
│   │                                 programme » (maquette 02) et Mes séances
│   ├── /sport/programme/modifier     Modifier le programme actif (plein écran) : semaine type jour par jour (repos, séance
│   │                                 générée, une de mes séances), durée, nombre de semaines, à partir de quand
│   ├── /sport/ma-seance/nouvelle     Créer une séance perso (plein écran) : nom, type, exercices (bibliothèque), séries,
│   │                                 reps, repos, charge, ordre
│   ├── /sport/ma-seance/[id]         Ma séance : modifier, « Au programme » (chaque semaine un jour ou une fois), supprimer
│   ├── /sport/programme/nouveau      Parcours plein écran (?modifier=1 : pré-rempli) : objectif → matériel préféré (mix, poids
│   │                                 libres, machines, poulies) → morphologie (silhouette + curseur) → échéance → rythme (jours,
│   │                                 séance générée ou une de mes séances par jour, durée) + premier jour → proposition (phases, semaine type) → génération → « C'est parti ». Sans
│   │                                 questions de profil (niveau, lieu, douleurs, repères : onboarding / Réglages › Sport)
│   └── /sport/historique             Séances faites par mois (kcal, durée, ressenti) — ouvert depuis Programme › Plan et les records
├── /nutrition            Mini-app Nutrition
│   ├── /nutrition                    Accueil du jour (onglet Accueil) · ?jour=YYYY-MM-DD : même en-tête que Sport, puis le bilan
│   │                                 en une carte (anneau : calories restantes, mangé découpé par macro ; mangées, brûlées ;
│   │                                 trois jauges) et les repas en tuiles — celui du moment en tête, en grand (ce qu'il vise,
│   │                                 l'idée de recette ajoutée d'un geste, « Comme hier » en petit), les autres sur deux colonnes
│   │                                 (illustration, calories, « + » → /nutrition/ajouter). Toucher un repas noté : ses lignes en
│   │                                 feuille (retirer, compléter). Le « + » de la barre se déploie : Photo du repas · Scanner un
│   │                                 produit · Ajouter à un repas
│   ├── /nutrition/ajouter            Ajouter à un repas (plein écran) · ?repas=&jour= : choix du repas, « Comme la dernière fois »,
│   │                                 puis trois sources en segmented control — Pour toi (recettes proposées selon les calories
│   │                                 et les protéines qu'il reste, ajout direct), Recettes (celles du repas, les siennes
│   │                                 d'abord), Aliments (recherche CIQUAL + Open Food Facts, scan du code-barres ou QR code GS1,
│   │                                 photo du repas estimée par IA, saisie rapide, récents → feuille d'ajout, quantité)
│   ├── /nutrition/plan               Plan de la semaine (7 × 3) · ?semaine=YYYY-MM-DD — à venir
│   ├── /nutrition/recettes           Onglet Recettes · ?repas= : « Toutes / Mes recettes » (créées, ou déjà notées au journal),
│   │                                 recherche, une rangée de puces (repas), feuille « Filtres » (avant / après la séance, riche
│   │                                 en protéines…) ; triées selon l'objectif du programme sportif
│   └── /nutrition/recettes/[id]      Fiche recette (macros par portion, ingrédients en grammes, étapes) ; « Ajouter au journal »
│                                     en barre fixe (repas, portions) · ?repas=&jour=
├── /finances             Mini-app Finances — perso (BoursoBank)
│   ├── /finances                     À catégoriser (swipe) + résumé du mois
│   ├── /finances/transactions        Recherche, filtres, lien document
│   ├── /finances/budgets             Budgets par catégorie, reste à dépenser
│   └── /finances/comptes             Comptes, dernière sync, consentement
├── /entreprise           Mini-app Entreprise — la SASU (Tiime)
│   ├── /entreprise                   Pilotage (données Tiime, outil pilotage_sasu) : CA facturé / encaissé, en attente, compte pro, notes de frais, IK · ?annee= — à venir : jauge « encore passable en frais », projection fin d'année
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
> v1.2 (26 nov., ADR 0020) — Sport & Nutrition : sélecteur dans l'en-tête, une barre par espace, « + » seulement là où il sert.

- **Menu « Applications »** (icône burger en haut à gauche, sur tous les écrans) : feuille qui monte du bas et liste les apps — Home · Quotidien · Sport & Nutrition · Finances · Entreprise · Documents · Objectifs · Réglages — avec une ligne de description chacune, l'app courante surlignée, et le bouton Capture en bas. Registre : `packages/ui/src/index.ts` (`menuApps`).
- **Barre inférieure par application** (`onglets` dans le registre, composant `ModuleBar`) : les entrées principales de l'app courante, à un tap. Sport : **Accueil · Programme · Exos** ; Nutrition : **Accueil · Recettes**. Quotidien : Courses · Tâches · Habitudes. Finances : Vue · Transactions · Budgets · Comptes. Entreprise : Pilotage · Factures · Charges · Échéances · Simuler. Home : Aujourd'hui · Objectifs · Documents. Réglages : Réglages · Sport · Nutrition · Journal. L'onglet actif — qui s'ouvre et affiche son nom, les autres restent des icônes — = le préfixe d'URL le plus long qui correspond ; un onglet peut ranger d'autres préfixes (`aussi` : `/sport/historique` → Programme).
- **Sport & Nutrition** : une seule application, deux espaces (préfixes `/sport` et `/nutrition`), chacun avec son accent, son identité et **sa barre**. On passe de l'un à l'autre par le **sélecteur de l'en-tête** (`BasculeEspace`, entre le menu et l'avatar, sur les écrans principaux) ; `?jour=YYYY-MM-DD` est conservé. Sous l'en-tête, les deux accueils ont **le même titre** (`sport/entete.tsx`) : surtitre « Aujourd'hui · Semaine n / N », la date en grand, bouton « Auj. » quand on s'est déplacé, et la **bande de jours** partagée (scrollable, le jour sélectionné centré, un point par séance).
- **Une vue à la fois** : quand un écran porte plusieurs choses, un **segmented control** (`Segments`) les sépare — Programme : Semaine · Plan · Mes séances (`?vue=`) ; Recettes : Toutes · Mes recettes ; Ajouter à un repas : Pour toi · Recettes · Aliments.
- **Filtres** (même grammaire partout — exercices, recettes) : la recherche (`ChampRecherche`), **une seule** rangée de puces pour le filtre principal (`Puces`), et le reste dans la feuille « Filtres » (`BoutonFiltres` : pastille = nombre d'actifs ; chaque filtre actif se retire d'un tap sous la rangée).
- **Plusieurs séances par jour** : un jour peut porter muscu + boxe (cocher le même jour dans les deux). Ordre d'affichage : salle puis boxe.
- **Parcours plein écran** (`ECRANS_PLEIN_ECRAN` dans `packages/ui`) : pas de barre inférieure ni de « + » ; fermer = croix en haut à gauche. Onboarding Sport : `/sport` redirige vers `/sport/bienvenue` tant qu'il n'y a ni programme ni onboarding terminé ou passé. **Façon de s'entraîner** (`mode` des réglages Sport, ADR 0021) : `programme` (semaines planifiées), `a_la_carte` (séance composée le jour même) ou `mes_seances` — l'accueil, l'onglet Programme (qui s'ouvre alors sur Mes séances) et l'onboarding s'y adaptent ; changeable dans Réglages › Sport.
- **Barre inférieure** (v3) : « Tab bar skeleton » du design system — pilule flottante (onglets du module) + le « + » à côté quand il a un rôle.
- **Feuilles modales** (`BottomSheet`, façon iOS : voile, poignée, zone sûre, Échap) pour tout ce qui est contextuel : menu apps, Terminer la séance (ressenti), détail d'un exercice (charge, reps, remplacer), équivalents. Pas de modale centrée.
- **Header de mini-app** : burger (ou flèche retour sur un écran de détail), titre + sous-titre (date, semaine), avatar à droite → Réglages, ou une action contextuelle.
- **Finances vs Entreprise** : Finances = comptes perso ; Entreprise = tout ce qui touche la SASU (comptes pro, factures, charges, échéances, simulateur, conseils). Une transaction appartient à l'un ou à l'autre (`perimetre`), jamais aux deux.
- **Bouton « + »** (`actionPour` dans le registre) : il n'est là que s'il sert. **Nutrition** : ajout rapide — il se déploie (voile, actions en cascade, le « + » tourne en croix) en Photo du repas · Scanner un produit · Ajouter à un repas (`AjoutRapide`). **Sport** : pas de « + » (les actions sont dans les écrans ; Capture reste dans le menu Applications). **Ailleurs** : → `/capture` (texte ou micro navigateur) ; le texte part à l'agent, la réponse s'affiche.
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
| Sport | Accueil · Programme (Semaine, Plan, Mes séances) · Exos · Séance plein écran · Fiche exercice · Historique | Charge / récupération |
| Nutrition | Accueil (bilan, repas en tuiles) · Ajouter à un repas (idées, recettes, aliments, scan, photo) · Recettes · Fiche recette — Plan semaine et pesée à venir | Photo affinée par la base d’aliments |
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
