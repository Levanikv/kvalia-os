# 0008 — Navigation : menu Applications + barre par app + feuilles

**Date** : 8 nov. 2026 · **Statut** : acceptée (remplace la tab bar globale de la sitemap v1)

## Contexte

Avec 8 applications, une tab bar globale à 5 entrées + menu avatar ne donnait pas d'accès rapide aux sous-modules (Programme, Exercices…). Retour de Levani après la première nuit de test.

## Décision

- **Menu « Applications »** (burger en haut à gauche) : feuille listant les apps avec description, l'actuelle surlignée. Registre : `menuApps` dans `packages/ui`.
- **Barre inférieure par application** (`onglets`, composant `ModuleBar`) : ses entrées principales. Sport & Nutrition : Jour · Programme · Exercices · Nutrition.
- **Feuilles modales** (`BottomSheet`, façon iOS) pour tout le contextuel ; pas de modale centrée.
- **Bande de jours** scrollable, jour sélectionné centré, partagée Sport / Nutrition via `?jour=`.
- Écrans de détail : flèche retour à gauche, pas de burger.

## Conséquences

- `docs/sitemap.md` section Navigation mise à jour ; `tabBar` et `menuHeader` du registre sont dépréciés.
- Chaque nouvelle app définit ses `onglets` dans le registre avant d'exister dans l'UI.
