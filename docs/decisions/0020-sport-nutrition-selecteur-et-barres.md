# 0020 — Sport & Nutrition : sélecteur dans l'en-tête, une barre par espace, « + » seulement là où il sert

**Date** : 26 nov. 2026 · **Statut** : acceptée · **Précise [0008](0008-navigation-menu-apps-barre-par-app.md)** (la barre par app reste la règle ; Sport & Nutrition en a désormais deux)

## Contexte

La barre unique « Jour · Programme · Exercices · Nutrition » mélangeait deux niveaux : trois écrans de Sport et un
module entier. Nutrition n'avait donc aucune barre à lui (les recettes étaient un lien en bas de page), le « + »
flottait partout pour la capture alors qu'en Sport il ne servait à rien, et les écrans empilaient tout (Programme :
huit blocs ; filtres sur deux rangées de puces). Demande de Levani : fluidifier, épurer, hiérarchiser.

## Décision

- **Sélecteur Sport / Nutrition dans l'en-tête** (`BasculeEspace`), sur les écrans principaux des deux espaces ; le
  jour affiché suit (`?jour=`). Les écrans de détail gardent la flèche retour, sans sélecteur.
- **Une barre par espace** (`onglets` du registre) : Sport = Accueil · Programme · Exos ; Nutrition = Accueil ·
  Recettes. L'onglet actif s'ouvre et affiche son nom.
- **Le « + » a un rôle ou n'existe pas** (`actionPour`) : en Nutrition il déploie l'ajout rapide (photo, scan, ajout à
  un repas) ; en Sport il disparaît ; ailleurs il reste la capture.
- **Une vue à la fois** : segmented control (`Segments`) plutôt qu'un long défilement. « Mes séances » rejoint
  l'onglet Programme (Semaine · Plan · Mes séances, `?vue=`) : tout ce qui se planifie est au même endroit.
- **Une page pour ajouter à un repas** (`/nutrition/ajouter`) : Pour toi (recettes proposées selon les calories
  restantes) · Recettes · Aliments. Les tuiles de repas (deux colonnes) y mènent par leur « + ».
- **Une grammaire de filtres** : recherche + une rangée de puces + feuille « Filtres ». Jamais deux rangées.
- **« Mes recettes »** vient du noyau : `lister_recettes` rend `perso` (créée par lui ou l'agent) et `utilisations`
  (notée au journal) — pas de règle dans l'app.

## Conséquences

- `docs/sitemap.md` (arborescence + Navigation v1.2) et le registre `packages/ui` font foi ; `barrePour()` rend la
  barre du module quand il en a une, `ongletActif()` accepte des préfixes rangés sous un onglet (`aussi`).
- La feuille d'ajout de Nutrition est posée dans `nutrition/layout.tsx` ; le « + » de la barre (hors de ce contexte)
  la demande par un événement (`EVENEMENT_AJOUT`), dans le geste — nécessaire pour ouvrir l'appareil photo.
- Capture reste accessible en Sport et Nutrition par le menu Applications.
