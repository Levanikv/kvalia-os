# 0017 — Sport : déplacer une séance, le programme suit sans surcharge

**Date** : 25 nov. 2026 · **Statut** : acceptée · Complète [0007](0007-generateur-deterministe.md)

## Contexte

Un programme pose ses séances sur des jours fixes, mais la vraie vie a des désistements et des empêchements — et,
à l'inverse, des jours libres où l'on irait bien à la salle. Jusqu'ici une séance ne pouvait être démarrée que le
jour prévu : une séance manquée restait derrière soi, sans moyen simple de la rattraper.

## Décision

- **Un outil, `deplacer_seance`** (`seance_id`, `jour`, `si_occupe`) ; règle `deplacerSeance` dans `sport.ts`.
  Seule une séance **pas encore commencée** se déplace, jamais dans le passé.
- **Jamais deux séances de salle le même jour** (la boxe peut partager un jour, elle se déplace seule) :
  - jour visé libre → seule cette séance bouge, son ancien jour devient un jour de repos ;
  - jour visé pris, **« décaler »** (défaut) → la séance en place glisse au créneau suivant — le prochain jour de
    salle habituel, ou le jour libéré s'il vient avant —, et ainsi de suite **jusqu'au premier créneau libre**.
    Semaine pleine : tout glisse d'un créneau et la fin du programme recule d'autant ;
  - jour visé pris, **« échanger »** → les deux séances intervertissent leurs jours, rien d'autre ne bouge.
- **L'ordre et le contenu des séances ne changent pas** : pas de séance supprimée, pas de volume ajouté. On ne
  « rattrape » pas en doublant ; on décale.
- **S'entraîner un jour sans séance** = déplacer la prochaine séance à aujourd'hui (jour libre) : le nombre de
  séances de la semaine reste le même.
- **Écran** : sous la séance, « Pas dispo ? Reporter » (feuille : sept jours, libre ou pris) ; un jour de repos,
  « Faire cette séance » sous le ticket de la prochaine séance.

## Conséquences

- Les numéros de semaine, de bloc et la phase restent attachés à chaque séance : après un décalage, une séance de
  la « semaine 3 » peut tomber le lundi de la semaine calendaire suivante.
- Le défi de la semaine compte les séances réellement posées dans la semaine : il suit les déplacements.
- Sauter une séance (la retirer du programme) n'est pas couvert : à ajouter si le besoin apparaît.
