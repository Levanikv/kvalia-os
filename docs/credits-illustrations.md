# Crédits — illustrations d'exercices

Les illustrations au trait des exercices (`apps/web/public/illustrations/*.json`, affichées par
`IllustrationExercice`) ne sont pas de nous. Elles sont sous licence
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr) (CC BY-SA 4.0) :
on peut les utiliser et les modifier, à condition de **créditer les auteurs**, d'**indiquer les modifications** et de
**garder la même licence** pour ces fichiers. Le reste de l'app n'est pas concerné par cette licence.

## Source et auteurs

| Quoi | Auteur | Lien |
| --- | --- | --- |
| Copie reprise (tracés en fichiers texte, une pose par ligne, dossier `assets/art/`) | GymMane (InlitX) | <https://github.com/InlitX/GymMane> — voir son `CREDITS.md` |
| Illustrations d'origine (2 ou 3 poses par exercice, SVG 512 × 512) | Workout Guide, par Bryl Lim | <https://github.com/bryllim/workout-guide> |
| Dessins des poses sur lesquels Workout Guide s'appuie ; 88 illustrations en viennent directement | Everkinetic | <https://github.com/everkinetic/data> |
| Dessins de départ de `reverse-pec-deck` et `bayesian-cable-curl` | Open Exercise Art, par Alex Mollard | <https://github.com/AlexMollard/Open-Exercise-Art> |

Toutes ces sources sont sous CC BY-SA 4.0. GymMane a lui-même transformé les dessins (extraction du tracé de chaque
pose, vectorisation des dessins Everkinetic, poses intermédiaires d'Open Exercise Art) : c'est décrit dans son
`CREDITS.md`.

## Ce que nous avons modifié

Le script `packages/core/scripts/illustrations-gymmane.py` produit nos fichiers à partir de la copie de GymMane :

- **Sélection** : seules les illustrations associées à au moins un exercice de notre référentiel sont reprises
  (263 sur 394).
- **Format** : un fichier JSON par illustration, `{"poses": ["M…", "M…"]}` — l'attribut `d` de chaque pose, dans un
  cadre 512 × 512.
- **Allègement des tracés** (20 Mo → 5,6 Mo pour la sélection) : coordonnées arrondies à l'unité, tracés réécrits en
  commandes relatives compactes, courbes quasi droites (écart ≤ 0,5 unité) remplacées par des segments, segments de
  longueur nulle retirés. Le dessin n'est pas retouché ; l'écart reste sous le pixel à la taille d'affichage.
- **Recadrage** de quelques dessins qui débordaient du cadre : glissement de quelques unités (`lat-pulldown`,
  `close-grip-lat-pulldown`…), réduction pour `cable-rear-delt-row` (dessiné deux fois trop grand) et
  `smith-machine-bench-press`.
- **Couleur** : les tracés sont affichés d'une seule teinte, celle du thème (`currentColor`), et les poses alternent
  pour suggérer le mouvement.

## Correspondance avec nos exercices

`packages/core/src/illustrations.ts` (généré par le même script) associe le nom exact d'un exercice à son
illustration. La règle : **même mouvement, matériel équivalent** — sinon pas d'illustration, et l'app garde
l'animation du référentiel (© Gym visual, ADR 0019). Le script part du catalogue de GymMane (même identifiant
d'exercice, puis même nom, puis ses fusions à matériel égal), corrigé par deux listes relues à la main : `MANUEL`
(ajouts) et `REFUS` (associations de GymMane écartées).

Classiques du générateur (`CLASSIQUES` dans `sport.ts`) sans illustration, faute de dessin au même matériel :
Lever High Row, Dumbbell Incline Row, Smith Bent Over Row, Lever Front Pulldown, Lever Back Extension,
Dumbbell Standing Calf Raise, Lever Seated Crunch, Cable Side Bend, Lever Shrug.

## Où le crédit apparaît

- Sous une illustration, dans l'app : `CREDIT_ILLUSTRATION` (« Illustration : Workout Guide / Everkinetic — CC BY-SA 4.0 »),
  exporté par `@kvalia/core` et par le composant `IllustrationExercice`.
- Ici, pour le détail (sources, licence, modifications).

Pour régénérer : voir l'en-tête du script.
