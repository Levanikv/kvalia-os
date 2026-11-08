# Outils de l'agent (contrat MCP)

> Généré depuis `packages/core/src/tools.ts` par `pnpm doc:outils` — ne pas éditer à la main.
> Chaque outil est exposé tel quel par `apps/agent` (serveur MCP) et appelé par l'app via `executer()` : même entrée, même sortie, même règle.

15 outils. Ceux marqués **à confirmer** modifient beaucoup de données : l'agent demande avant.

## `ajouter_produit`

Ajoute un ou plusieurs articles à la liste de courses active. Crée le produit s'il n'existe pas. Fusionne les doublons (quantité cumulée).

**Entrée**
- `articles` : liste de objet { nom, quantite, unite }
- `origine` : `agent` · `siri` · `alexa` · `telegram` · `manuel` — défaut `"agent"`

**Sortie**
- `liste_id` : string (uuid)
- `lignes` : liste de objet { id, liste_id, produit_id, quantite, unite, coche, manque, origine }

## `liste_actuelle`

Renvoie la liste de courses active, groupée par rayon, avec les manques signalés.

**Entrée**
- (aucune)

**Sortie**
- `liste_id` : string (uuid) | null
- `rayons` : liste de objet { rayon, lignes }

## `ajouter_tache`

Crée une tâche. La date accepte « demain », « vendredi », « 12/11 » ou une date ISO.

**Entrée**
- `titre` : string
- `due` : string (optionnel) — Date relative ou ISO ; vide = sans échéance
- `priorite` : `basse` · `normale` · `haute` — défaut `"normale"`

**Sortie**
- `id` : string (uuid)
- `titre` : string
- `due` : string (date) | null
- `priorite` : `basse` · `normale` · `haute`
- `fait` : booléen

## `agenda_du_jour`

Les événements de l'agenda pour un jour (aujourd'hui par défaut). Stub en phase 0, réel en phase 1.

**Entrée**
- `jour` : string (date) (optionnel)

**Sortie**
- `jour` : string (date)
- `evenements` : liste de objet { id, titre, debut, fin, lieu }

## `brief`

Le condensé du jour : rendez-vous, séance, repas, tâches, habitudes, courses, dépenses de la semaine, alertes. Même données que la Home.

**Entrée**
- `jour` : string (date) (optionnel)

**Sortie**
- `jour` : string (date)
- `evenements` : liste de objet { id, titre, debut, fin, lieu }
- `taches` : liste de objet { id, titre, due, priorite, fait }
- `habitudes` : liste de objet { id, nom, moment, non_negociable, fait }
- `seance` : objet { id, type, titre, duree_min, etat, kcal, nb_exercices, nb_faits } | null
- `seances` : liste de objet { id, type, titre, duree_min, etat, kcal, nb_exercices, nb_faits } — défaut `[]`
- `repas` : liste de objet { repas, recette_id, recette, portions, pris }
- `courses` : objet { liste_id, articles, manques } | null
- `depenses_semaine` : nombre
- `objectifs` : liste de objet { id, titre, type, valeur, cible, echeance }
- `alertes` : liste de objet { document_id, titre, expiration }

## `parametres_sport`

Lit les paramètres du programme sportif (rythme salle/boxe, jours, durée, matériel, objectif, niveau, poids de secours). Ce sont les réglages de l'admin.

**Entrée**
- (aucune)

**Sortie**
- `rythme` : objet { salle, boxe } — défaut `{"salle":4,"boxe":1}`
- `jours_salle` : liste de entier — défaut `[1,2,4,5]`
- `jours_boxe` : liste de entier — défaut `[3]`
- `duree_min` : entier — défaut `60`
- `materiel` : liste de string — défaut `["barbell","dumbbell","cable","leverage machine","body weight","ez barbell","smith machine","weighted"]`
- `objectif` : `hypertrophie` · `force` · `perte_de_gras` · `endurance` — défaut `"hypertrophie"`
- `niveau` : `beginner` · `intermediate` · `advanced` — défaut `"intermediate"`
- `semaines` : entier — défaut `12`
- `poids_kg` : nombre (optionnel)
- `effort_s_par_serie` : entier — défaut `40`

## `regler_sport`

Modifie un ou plusieurs paramètres du programme sportif (ex. passer à 3 séances de salle, changer l'objectif). Ne régénère pas le programme : appeler generer_programme ensuite.

**Entrée**
- `rythme` : objet { salle, boxe } — défaut `{"salle":4,"boxe":1}` (optionnel)
- `jours_salle` : liste de entier — défaut `[1,2,4,5]` (optionnel)
- `jours_boxe` : liste de entier — défaut `[3]` (optionnel)
- `duree_min` : entier — défaut `60` (optionnel)
- `materiel` : liste de string — défaut `["barbell","dumbbell","cable","leverage machine","body weight","ez barbell","smith machine","weighted"]` (optionnel)
- `objectif` : `hypertrophie` · `force` · `perte_de_gras` · `endurance` — défaut `"hypertrophie"` (optionnel)
- `niveau` : `beginner` · `intermediate` · `advanced` — défaut `"intermediate"` (optionnel)
- `semaines` : entier — défaut `12` (optionnel)
- `poids_kg` : nombre (optionnel) (optionnel)
- `effort_s_par_serie` : entier — défaut `40` (optionnel)

**Sortie**
- `rythme` : objet { salle, boxe } — défaut `{"salle":4,"boxe":1}`
- `jours_salle` : liste de entier — défaut `[1,2,4,5]`
- `jours_boxe` : liste de entier — défaut `[3]`
- `duree_min` : entier — défaut `60`
- `materiel` : liste de string — défaut `["barbell","dumbbell","cable","leverage machine","body weight","ez barbell","smith machine","weighted"]`
- `objectif` : `hypertrophie` · `force` · `perte_de_gras` · `endurance` — défaut `"hypertrophie"`
- `niveau` : `beginner` · `intermediate` · `advanced` — défaut `"intermediate"`
- `semaines` : entier — défaut `12`
- `poids_kg` : nombre (optionnel)
- `effort_s_par_serie` : entier — défaut `40`

## `generer_programme` — à confirmer

Génère un programme complet (N semaines, blocs de 4 : progression puis décharge) à partir des paramètres et de la bibliothèque d'exercices. Remplace le programme actif : ses séances futures non faites sont supprimées. Action lourde → confirmer avec l'utilisateur avant.

**Entrée**
- `debut` : string (date) (optionnel) — Premier jour (lundi conseillé). Par défaut : lundi prochain.
- `parametres` : objet { rythme, jours_salle, jours_boxe, duree_min, materiel, objectif, niveau, semaines, poids_kg, effort_s_par_serie } (optionnel) — Surcharges ponctuelles ; sinon les réglages enregistrés.

**Sortie**
- `programme_id` : string (uuid)
- `nb_seances` : nombre
- `nb_exercices` : nombre
- `debut` : string
- `fin` : string
- `avertissements` : liste de string

## `seance_du_jour`

Les séances prévues pour un jour (aujourd'hui par défaut) avec leurs exercices, prescriptions, kcal prévues et cochées. Un jour peut avoir deux séances (ex. muscu + boxe) : `seances` les liste toutes (salle d'abord) ; `seance` est la principale (la première pas encore faite).

**Entrée**
- `jour` : string (date) (optionnel)

**Sortie**
- `jour` : string (date)
- `seance` : objet { id, jour, type, titre, etat, focus, bloc, semaine, duree_min, kcal, kcal_prevues, notes, exercices } | null
- `seances` : liste de objet { id, jour, type, titre, etat, focus, bloc, semaine, duree_min, kcal, kcal_prevues, notes, exercices }

## `cocher_exercice`

Coche (ou décoche) un exercice d'une séance. Le premier coché démarre la séance ; les kcal de la séance sont recalculées.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `fait` : booléen — défaut `true`

**Sortie**
- `seance_id` : string (uuid)
- `kcal` : nombre

## `terminer_seance`

Termine une séance : les exercices restants sont comptés comme faits, la durée réelle est mesurée depuis le premier coché, les kcal sont figées (MET × poids actuel × durée). Ressenti 1–5 optionnel.

**Entrée**
- `seance_id` : string (uuid)
- `ressenti` : entier (optionnel)
- `notes` : string (optionnel)

**Sortie**
- `seance_id` : string (uuid)
- `kcal` : nombre
- `duree_min` : nombre
- `poids_utilise` : nombre

## `noter_charge`

Note la charge soulevée (kg) et/ou les reps réalisées sur un exercice d'une séance. Sert aux graphes de progression et au pré-remplissage des séances suivantes.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `charge_kg` : nombre | null (optionnel)
- `reps_faites` : entier | null (optionnel)
- `note` : string | null (optionnel)

**Sortie**
- `id` : string (uuid)
- `exercice_id` : string
- `seance_id` : string (uuid)
- `charge_kg` : nombre | null
- `realise` : objet { reps_faites, note }

## `historique_exercice`

Les charges notées sur un exercice (référentiel), de la plus récente à la plus ancienne.

**Entrée**
- `exercice_id` : string
- `limite` : entier — défaut `12`

**Sortie**
- liste de objet { id, seance_id, jour, titre, charge_kg, series, reps, reps_faites, fait }

## `equivalents_exercice`

Propose des exercices équivalents (même muscle cible, matériel disponible, même nature) pour remplacer un exercice d'une séance — machine prise, douleur, envie de varier.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `limite` : entier — défaut `8`

**Sortie**
- liste de objet { id, nom, nom_fr, partie_corps, equipement, compose, raison, score }

## `remplacer_exercice`

Remplace un exercice d'une séance par un autre (id du référentiel, voir equivalents_exercice). portee = « seance » (cette séance seulement) ou « programme » (toutes les séances à venir du programme qui contiennent cet exercice). Demander la portée à l'utilisateur si elle n'est pas dite.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `nouvel_exercice_id` : string
- `portee` : `seance` · `programme` — défaut `"seance"`

**Sortie**
- `remplaces` : nombre
- `ancien` : string
- `nouveau` : string
- `nom` : string
- `portee` : `seance` · `programme`
