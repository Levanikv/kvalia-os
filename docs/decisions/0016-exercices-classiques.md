# 0016 — Sport : des exercices classiques, simples à installer — pas de farfelus

**Date** : 25 nov. 2026 · **Statut** : acceptée · Complète [0007](0007-generateur-deterministe.md) et [0011](0011-programme-fonde-sur-les-preuves.md)

## Contexte

Le générateur choisissait au score dans tout le référentiel (317 exercices) et tournait parmi les quatre meilleurs.
Résultat : des séances avec un curl à plat ventre sur banc incliné, un écarté sur ballon, un leg curl à genoux, un
développé Arnold, un crunch vélo à 45°… et des exercices d'isolation qui changeaient d'une semaine sur l'autre.
Levani veut du simple et efficace : pas d'exercice farfelu, pas d'installation pénible.

Les sources de l'ADR 0011 vont dans le même sens : le type de matériel et la variété d'exercices ne changent pas le
résultat de façon fiable ; ce qui compte est le volume, la charge progressive et la régularité — donc des gestes
connus, sur lesquels on ajoute de la charge de semaine en semaine.

## Décision

- **Une liste de classiques par créneau** (`CLASSIQUES` dans `sport.ts`, noms du référentiel, du plus au moins
  recommandé) : développé couché, rowing à la poulie, tirage vertical, développé haltères assis, squat, presse,
  soulevé de terre jambes tendues, leg extension, leg curl, curl barre, extension à la poulie, crunch à la poulie…
  Le générateur prend **le premier classique disponible** (matériel, niveau, douleurs, morphologie), ceux du matériel
  préféré d'abord, et n'alterne qu'entre **les deux premiers** d'un bloc à l'autre.
- **Les mêmes exercices toutes les semaines d'un bloc** : plus de rotation hebdomadaire des isolations.
- **Un filtre « farfelu »** (`simplicite()`) : ballon, à plat ventre ou sur le dos sur banc incliné, à un bras ou une
  jambe, à genoux, en rotation, sangles, chaises, landmine, variantes exotiques. Hors classiques (peu de matériel),
  ces exercices ne sont choisis que s'il ne reste rien d'autre pour le créneau.
- **Équivalents** (`equivalents_exercice`) : les classiques remontent, les farfelus descendent.
- **Agent** : `creer_seance_perso` demande 5 à 6 exercices classiques, gros mouvements d'abord, sans variante
  exotique sauf demande explicite.

## Conséquences

- En salle, un programme de 4 ou 5 séances ne contient que des classiques (testé).
- Moins de variété : c'est voulu. Pour varier, on remplace un exercice à la main (les équivalents restent proposés).
- La liste est à tenir à jour si le référentiel d'exercices change (un test vérifie que chaque nom existe).
- Un programme déjà généré n'est pas modifié : il faut en générer un nouveau pour en profiter.
