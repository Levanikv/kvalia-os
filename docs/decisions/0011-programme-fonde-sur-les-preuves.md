# 0011 — Programme fondé sur les preuves : matériel préféré, morphologie, douleurs

**Date** : 22 nov. 2026 · **Statut** : acceptée · complète l'ADR 0007 (générateur déterministe)

## Contexte

Levani veut des programmes « qui fonctionnent, pas chelous », adaptés à la personne : choisir son matériel préféré
(poulies, poids libres, machines, mix) et sa morphologie — deux personnes de 95 kg peuvent être très différentes — et
que le programme s'appuie sur les meilleures sources récentes.

## Ce que disent les sources

- **ACSM, Position Stand 2026** (« Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical
  Performance in Healthy Adults: An Overview of Reviews », 137 revues systématiques) : le plus gros gain est de
  s'entraîner régulièrement ; hypertrophie ≈ 10 séries par groupe musculaire et par semaine ; force = charges lourdes
  (≈ 80 % du max), 2–3 séries par exercice ; aller à l'échec, le type de matériel (machines ou poids libres) et la
  périodisation complexe ne changent pas le résultat de façon fiable ; individualiser selon les goûts et la sécurité
  pour tenir dans la durée. <https://acsm.org/resistance-training-guidelines-update-2026/>
- **Haugen et al. 2023**, méta-analyse (13 études, 1 016 adultes) : pas de différence entre poids libres et machines
  pour l'hypertrophie ni la force globale ; la force progresse surtout sur le geste entraîné. Conclusion des auteurs :
  le choix relève des préférences et des objectifs. <https://pmc.ncbi.nlm.nih.gov/articles/PMC10426227/>
- **Volume** : relation dose-réponse avec rendements décroissants (Schoenfeld, Ogborn & Krieger 2017 ; méta-régression
  de Pelland et al., prépublication SportRxiv). <https://sportrxiv.org/index.php/server/preprint/view/460>
- **Somatotypes** (ecto / méso / endomorphe) : aucune preuve solide qu'ils doivent changer l'entraînement ; ce qui
  compte est la composition corporelle (masse maigre, masse grasse).
  <https://mennohenselmans.com/endomorph-ectomorph-mesomorph-diet-workout/>

## Décision

1. **Les sources deviennent des règles du noyau**, pas un prompt : l'agent ne compose toujours pas les séances
   (ADR 0007). Quand une source change, on change une règle et son test, et on met ce fichier à jour.
2. **Matériel préféré** (`profil.preference_materiel` : `mix`, `poids_libres`, `machines`, `poulies`). Puisque le
   matériel ne change pas le résultat, la préférence décide : pour chaque créneau, si la famille préférée offre un bon
   exercice (motif préféré du créneau), on ne choisit que dans cette famille ; sinon elle garde un avantage au score.
   Une préférence n'impose jamais un exercice hors sujet (les jambes gardent un vrai composé).
3. **Morphologie** (`profil.morpho` : `mince`, `athletique`, `costaud`, `rond`) = composition corporelle « à l'œil »,
   pas un somatotype. Elle sert à :
   - estimer la **masse maigre** (masse grasse supposée : 12 / 15 / 20 / 30 % pour un homme, +8 points pour une
     femme) → métabolisme de base = moyenne de Mifflin-St Jeor et de Katch-McArdle, protéines = 2,4 g/kg de masse
     maigre ; à poids égal, « costaud » a une cible plus haute que « rond » ;
   - pour `rond` : écarter les exercices au poids du corps qui font porter ou projeter tout son poids (tractions,
     dips, sauts, burpees, course) au profit des versions guidées et d'un cardio sans impact.
   Elle ne change **ni le split, ni le volume, ni les répétitions** : rien ne le justifie.
4. **Douleurs** (`profil.douleurs`) : elles étaient demandées mais ignorées. Chaque zone écarte maintenant les
   mouvements à risque (genou : fentes, sauts ; dos : soulevés de terre, rowing buste penché ; épaule : derrière la
   nuque, dips…), sauf s'il ne reste rien d'autre pour le créneau.
5. **Deux corrections de bon sens** : le tirage vertical principal n'est plus un tirage bras tendus ; le finisher
   cardio de 8 min est un effort continu (vélo, elliptique, tapis), plus 8 min de burpees.

## Conséquences

- Les deux questions sont posées avant de créer un programme (onboarding, « Nouveau programme ») et modifiables dans
  Réglages › Sport ; l'agent les règle par `regler_sport` (profil).
- Les pourcentages de masse grasse sont des ordres de grandeur : à remplacer par une mesure (balance, plis) si on en a
  une un jour.
- Pas de question sur la longueur des segments ou le somatotype : aucune règle fiable à en tirer.
- Essai hors-ligne : `pnpm --filter @kvalia/core exec tsx scripts/essai-profils.ts`.
