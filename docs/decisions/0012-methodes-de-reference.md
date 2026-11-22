# 0012 — Chaque programme suit une méthode de référence, sourcée

**Date** : 22 nov. 2026 · **Statut** : acceptée · complète les ADR 0007 et 0011

## Contexte

Levani : « notre agent crée les programmes, mais basés sur de vraies choses, pas au pif ». Recherche faite sur GitHub :
aucune source ouverte ne fournit des programmes fondés sur les preuves, prêts à brancher. Liftosaur a les programmes
connus (5/3/1, GZCLP…) mais en AGPL-3.0 — reprendre ses fichiers obligerait à publier KVALIA sous la même licence ;
wger et workout.cool sont surtout des bases d'exercices ; openweight n'est qu'un format.

## Décision

- **Une bibliothèque de méthodes dans le noyau** (`packages/core/src/methodes.ts`) : chaque méthode a un nom, un
  public (objectifs, niveaux), une prescription, une règle de progression et **ses sources** (titre + lien). Elles
  sont réécrites par nous d'après leurs publications ; aucun fichier n'est repris d'un projet sous AGPL / GPL.
- **Le générateur applique la méthode** choisie selon l'objectif et le niveau (`choisirMethode`) :
  force + débutant → progression linéaire (3×5) ; force + intermédiaire / avancé → 5/3/1 (vagues 5, 3, 5-3-1 sur le
  mouvement principal, puis décharge — nos blocs de 4 semaines ont déjà cette forme) ; perte de gras → sèche, charges
  maintenues ; endurance → endurance musculaire ; sinon → double progression. La méthode est enregistrée avec le
  programme (`programmes.rythme.methode`) et sa consigne de la semaine est écrite dans les notes des séances.
- **L'agent choisit et explique** : outil `lister_methodes` (méthodes, sources, méthode recommandée pour le profil) ;
  il peut en imposer une avec `generer_programme` (`parametres.methode`). Il ne compose toujours pas les séances
  ligne à ligne (ADR 0007) : il choisit parmi des méthodes réelles.
- **L'app montre la méthode et ses sources** : écran de proposition et onglet Programme.

## Conséquences

- Ajouter une méthode = une entrée dans `METHODES` + un test ; une méthode sans source est refusée par le test.
- Limites connues : 5/3/1 est rendu en répétitions et en consigne de pourcentages, sans calcul du « max
  d'entraînement » (pas encore de max par mouvement en base) ; la source de la sèche porte sur la nutrition (rythme de
  perte, protéines), le maintien des charges vient des recommandations générales ; certaines sources sont des
  présentations de la méthode d'origine (livres non consultables en ligne), c'est indiqué dans leur titre.
- L'objectif « force » n'a plus de premier bloc « hypertrophie » : la méthode de force s'applique dès la semaine 1.
