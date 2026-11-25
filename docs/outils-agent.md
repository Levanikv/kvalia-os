# Outils de l'agent (contrat MCP)

> Généré depuis `packages/core/src/tools.ts` par `pnpm doc:outils` — ne pas éditer à la main.
> Chaque outil est exposé tel quel par `apps/agent` (serveur MCP) et appelé par l'app via `executer()` : même entrée, même sortie, même règle.

43 outils. Ceux marqués **à confirmer** modifient beaucoup de données : l'agent demande avant.

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
- `defis` : liste de objet { id, nom, mesure, cible, valeur, atteint } — défaut `[]`
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
- `methode` : `double_progression` · `progression_lineaire` · `cinq_trois_un` · `seche` · `endurance_musculaire` (optionnel)
- `poids_kg` : nombre (optionnel)
- `effort_s_par_serie` : entier — défaut `40`
- `seances_perso` : liste de objet { jour, modele_id } — défaut `[]`
- `profil` : objet { sexe, age, taille_cm, poids_kg, activite, objectifs, poids_cible_kg, seances_semaine, jours, duree_min, lieu, salle, materiel_maison, evenement, echeance_semaines, niveau, douleurs, nutrition, morpho, preference_materiel } (optionnel)
- `onboarding` : objet { etape, termine, passe } (optionnel)

## `regler_sport`

Modifie un ou plusieurs paramètres du programme sportif (ex. passer à 3 séances de salle, changer l'objectif). Accepte aussi `profil` (réponses de l'onboarding : sexe, âge, taille, poids, objectifs, jours, durée, lieu, matériel, échéance, niveau, douleurs, choix nutrition, `preference_materiel` : mix / poids_libres / machines / poulies, `morpho` : mince / athletique / costaud / rond) — il est fusionné au profil existant et recalcule rythme, jours, durée, objectif, niveau, semaines et matériel ; si le choix nutrition est « ia » ou « saisie », la cible kcal et les protéines suivent. `onboarding` mémorise l'étape où reprendre. Ne régénère pas le programme : appeler generer_programme ensuite.

**Entrée**
- `rythme` : objet { salle, boxe } — défaut `{"salle":4,"boxe":1}` (optionnel)
- `jours_salle` : liste de entier — défaut `[1,2,4,5]` (optionnel)
- `jours_boxe` : liste de entier — défaut `[3]` (optionnel)
- `duree_min` : entier — défaut `60` (optionnel)
- `materiel` : liste de string — défaut `["barbell","dumbbell","cable","leverage machine","body weight","ez barbell","smith machine","weighted"]` (optionnel)
- `objectif` : `hypertrophie` · `force` · `perte_de_gras` · `endurance` — défaut `"hypertrophie"` (optionnel)
- `niveau` : `beginner` · `intermediate` · `advanced` — défaut `"intermediate"` (optionnel)
- `semaines` : entier — défaut `12` (optionnel)
- `methode` : `double_progression` · `progression_lineaire` · `cinq_trois_un` · `seche` · `endurance_musculaire` (optionnel) (optionnel)
- `poids_kg` : nombre (optionnel) (optionnel)
- `effort_s_par_serie` : entier — défaut `40` (optionnel)
- `seances_perso` : liste de objet { jour, modele_id } — défaut `[]` (optionnel)
- `profil` : objet { sexe, age, taille_cm, poids_kg, activite, objectifs, poids_cible_kg, seances_semaine, jours, duree_min, lieu, salle, materiel_maison, evenement, echeance_semaines, niveau, douleurs, nutrition, morpho, preference_materiel } (optionnel) (optionnel)
- `onboarding` : objet { etape, termine, passe } (optionnel) (optionnel)

**Sortie**
- `rythme` : objet { salle, boxe } — défaut `{"salle":4,"boxe":1}`
- `jours_salle` : liste de entier — défaut `[1,2,4,5]`
- `jours_boxe` : liste de entier — défaut `[3]`
- `duree_min` : entier — défaut `60`
- `materiel` : liste de string — défaut `["barbell","dumbbell","cable","leverage machine","body weight","ez barbell","smith machine","weighted"]`
- `objectif` : `hypertrophie` · `force` · `perte_de_gras` · `endurance` — défaut `"hypertrophie"`
- `niveau` : `beginner` · `intermediate` · `advanced` — défaut `"intermediate"`
- `semaines` : entier — défaut `12`
- `methode` : `double_progression` · `progression_lineaire` · `cinq_trois_un` · `seche` · `endurance_musculaire` (optionnel)
- `poids_kg` : nombre (optionnel)
- `effort_s_par_serie` : entier — défaut `40`
- `seances_perso` : liste de objet { jour, modele_id } — défaut `[]`
- `profil` : objet { sexe, age, taille_cm, poids_kg, activite, objectifs, poids_cible_kg, seances_semaine, jours, duree_min, lieu, salle, materiel_maison, evenement, echeance_semaines, niveau, douleurs, nutrition, morpho, preference_materiel } (optionnel)
- `onboarding` : objet { etape, termine, passe } (optionnel)

## `generer_programme` — à confirmer

Génère un programme complet (N semaines, blocs de 4 : progression puis décharge) à partir des paramètres et de la bibliothèque d'exercices, en suivant une méthode de référence choisie selon l'objectif et le niveau (voir lister_methodes ; `parametres.methode` en impose une). Les règles suivent les recommandations actuelles (une dizaine de séries par muscle et par semaine, charges progressives ; poids libres et machines se valent, donc le matériel préféré du profil oriente le choix ; la morphologie et les douleurs écartent les exercices mal adaptés) — avant de générer pour quelqu'un dont on ne connaît ni le matériel préféré ni la morphologie, les demander et les enregistrer avec regler_sport (profil). Remplace le programme actif à partir du premier jour (`debut`) : l'ancien s'arrête la veille, ses séances non faites (prévues, sautées, en cours) à partir de cette date sont remplacées — y compris celle du jour si debut = aujourd'hui ; avant cette date il continue ; les séances faites restent et ne sont pas doublées. Action lourde → confirmer avec l'utilisateur avant.

**Entrée**
- `debut` : string (date) (optionnel) — Premier jour souhaité (aujourd'hui possible). Un programme commence toujours un jour de séance : si ce jour n'en est pas un, le début passe au prochain jour de séance. Par défaut : le prochain jour de séance à partir de demain. Les séances de l'ancien programme sont remplacées à partir de ce jour.
- `parametres` : objet { rythme, jours_salle, jours_boxe, duree_min, materiel, objectif, niveau, semaines, methode, poids_kg, effort_s_par_serie, seances_perso, profil, onboarding } (optionnel) — Surcharges ponctuelles ; sinon les réglages enregistrés.

**Sortie**
- `programme_id` : string (uuid)
- `nb_seances` : nombre
- `nb_exercices` : nombre
- `debut` : string
- `fin` : string
- `methode` : string — Nom de la méthode suivie ; détail et sources par lister_methodes
- `avertissements` : liste de string

## `lister_methodes`

Les méthodes d'entraînement de référence sur lesquelles les programmes sont construits (double progression, progression linéaire, 5/3/1, sèche charges maintenues, endurance musculaire) : pour qui, ce qu'elles prescrivent, la règle de progression et leurs sources. `recommandee` = celle que le générateur prendrait pour le profil actuel (objectif + niveau). À appeler avant generer_programme pour expliquer le choix, ou pour en imposer une autre via parametres.methode si l'utilisateur le demande.

**Entrée**
- (aucune)

**Sortie**
- `recommandee` : `double_progression` · `progression_lineaire` · `cinq_trois_un` · `seche` · `endurance_musculaire`
- `methodes` : liste de objet { id, nom, pour, resume, progression, objectifs, niveaux, sources }

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

## `demarrer_seance`

Démarre une séance (« je commence ma séance ») : lance le chrono sans rien cocher. Sans effet si elle tourne déjà ou est faite. Ensuite : valider_serie au fil des séries, terminer_seance à la fin.

**Entrée**
- `seance_id` : string (uuid)

**Sortie**
- `seance_id` : string (uuid)
- `etat` : string
- `debut_le` : string | null

## `chrono_seance`

Met en pause ou relance le chrono d'une séance en cours (le temps de pause n'est pas compté dans la durée ni les kcal).

**Entrée**
- `seance_id` : string (uuid)
- `action` : `pause` · `reprendre`

**Sortie**
- `seance_id` : string (uuid)
- `en_pause` : booléen
- `chrono_s` : nombre

## `valider_serie`

Valide la série suivante d'un exercice de la séance (reps et charge réellement faites ; sinon la prescription). La première série démarre la séance ; la dernière coche l'exercice et recalcule les kcal.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `reps` : entier | null (optionnel)
- `charge_kg` : nombre | null (optionnel)

**Sortie**
- `seance_id` : string (uuid)
- `series_faites` : nombre
- `series` : nombre
- `exercice_fait` : booléen
- `kcal` : nombre | null

## `terminer_seance`

Termine une séance : les exercices restants sont comptés comme faits, sauf ceux passés dans `rates` (exercices_seance ids), qui sont reprogrammés en fin de la prochaine séance prévue du programme. Durée réelle = chrono, pauses déduites ; kcal figées (MET × poids actuel × durée). Ressenti 1–5 optionnel. Demande d'abord s'il y a des exercices ratés quand tout n'est pas coché.

**Entrée**
- `seance_id` : string (uuid)
- `ressenti` : entier (optionnel)
- `notes` : string (optionnel)
- `rates` : liste de string (uuid) — défaut `[]`

**Sortie**
- `seance_id` : string (uuid)
- `kcal` : nombre
- `duree_min` : nombre
- `poids_utilise` : nombre
- `rates` : liste de objet { exercice_seance_id, exercice_id, reprogramme }

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

Propose des exercices équivalents (même muscle cible, matériel disponible, même nature) pour remplacer un exercice d'une séance — machine prise, douleur, envie de varier. Les classiques (simples à installer) sortent en premier : proposer ceux-là d'abord.

**Entrée**
- `exercice_seance_id` : string (uuid)
- `limite` : entier — défaut `8`

**Sortie**
- liste de objet { id, nom, nom_fr, partie_corps, equipement, compose, raison, score, image_url, video_url }

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

## `lister_seances_perso`

Liste les séances personnalisées de l'utilisateur (« Mes séances ») : nom, type, exercices (id du référentiel, séries, reps, repos, charge), et les jours de la semaine où elles sont posées dans le programme.

**Entrée**
- (aucune)

**Sortie**
- liste de objet { id, nom, type, notes, jours_semaine, exercices }

## `creer_seance_perso`

Crée une séance personnalisée réutilisable (« Mes séances ») : nom, type (full, upper, lower, push, pull, legs, hiit, cardio, maison) et exercices du référentiel dans l'ordre (séries, reps, repos en s, charge facultative). Rester simple et efficace : 5 à 6 exercices classiques, faciles à installer (développé couché, rowing, tirage vertical, squat ou presse, soulevé de terre jambes tendues, curl, extension à la poulie…), gros mouvements d'abord ; pas de variantes exotiques (ballon, à un bras, à genoux, à plat ventre sur banc incliné) sauf demande explicite. Elle n'est pas planifiée : pour la mettre au programme, appeler planifier_seance_perso.

**Entrée**
- `nom` : string (trim)
- `type` : `full` · `upper` · `lower` · `push` · `pull` · `legs` · `hiit` · `cardio` · `maison` — défaut `"full"`
- `notes` : string | null (optionnel)
- `exercices` : liste de objet { exercice_id, series, reps, repos_s, charge_kg }

**Sortie**
- `id` : string (uuid)
- `nom` : string
- `nb_exercices` : nombre
- `duree_min` : nombre

## `modifier_seance_perso`

Modifie une séance personnalisée (remplace nom, type et toute la liste d'exercices). Ses séances déjà planifiées à venir et non faites sont mises à jour ; l'historique ne bouge pas.

**Entrée**
- `nom` : string (trim)
- `type` : `full` · `upper` · `lower` · `push` · `pull` · `legs` · `hiit` · `cardio` · `maison` — défaut `"full"`
- `notes` : string | null (optionnel)
- `exercices` : liste de objet { exercice_id, series, reps, repos_s, charge_kg }
- `id` : string (uuid)

**Sortie**
- `id` : string (uuid)
- `nom` : string
- `nb_exercices` : nombre
- `seances_mises_a_jour` : nombre

## `supprimer_seance_perso` — à confirmer

Supprime une séance personnalisée. Si elle était posée sur un jour de la semaine du programme, ce jour repasse en séance générée à partir d'aujourd'hui. Confirmer avant.

**Entrée**
- `id` : string (uuid)

**Sortie**
- `id` : string (uuid)
- `supprime` : booléen

## `planifier_seance_perso`

Met une séance personnalisée au planning : soit chaque semaine un jour donné (jour_semaine 0 = dimanche … 6 = samedi) à partir d'a_partir_de (aujourd'hui par défaut) dans le programme actif — elle remplace la séance générée ce jour-là ; soit une seule fois à une date (remplace la séance de salle non faite prévue ce jour). Demander « chaque semaine ou une fois ? » si ce n'est pas dit.

**Entrée**
- `modele_id` : string (uuid)
- `jour_semaine` : entier (optionnel)
- `date` : string (date) (optionnel)
- `a_partir_de` : string (date) (optionnel)

**Sortie**
- `mode` : `chaque_semaine` · `une_fois`
- `jour_semaine` : nombre (optionnel)
- `nb_seances` : nombre (optionnel)
- `depuis` : string (optionnel)
- `seance_id` : string (uuid) (optionnel)
- `jour` : string (optionnel)
- `remplace` : nombre (optionnel)

## `modifier_programme` — à confirmer

Modifie le programme actif sans en créer un nouveau : jours de salle (0 = dimanche … 6 = samedi), durée des séances, nombre de semaines (la fin suit), séances perso posées par jour de semaine. Les séances non démarrées à partir d'a_partir_de (aujourd'hui par défaut, jamais avant) sont reposées ; semaines, blocs et phases restent ceux du programme ; faites et en cours ne bougent pas. Pour changer d'objectif, c'est generer_programme. Confirmer avant.

**Entrée**
- `jours_salle` : liste de entier (optionnel)
- `duree_min` : entier (optionnel)
- `semaines` : entier (optionnel)
- `seances_perso` : liste de objet { jour, modele_id } (optionnel)
- `a_partir_de` : string (date) (optionnel)

**Sortie**
- `programme_id` : string (uuid)
- `depuis` : string
- `fin` : string
- `nb_seances` : nombre
- `avertissements` : liste de string

## `reinitialiser_sport` — à confirmer

TEMPORAIRE (tests v0) : remet l'app Sport à zéro — supprime programmes, séances, séances perso, défis, réglages et onboarding Sport (pas les pesées ni la nutrition). Irréversible : ne l'appeler que si Levani le demande explicitement, après confirmation.

**Entrée**
- `confirmer` : literal

**Sortie**
- `supprime` : objet { seances, programmes, seances_perso, defis }

## `lister_defis`

Liste les défis de l'utilisateur (ex. 10 000 pas par jour, 10 min de mobilité, 50 pompes, une case « pas de sucre ») et leur état pour un jour (aujourd'hui par défaut) : valeur notée, cible atteinte, série de jours tenus, bilan de la semaine. du_jour = le défi vaut ce jour-là.

**Entrée**
- `jour` : string (date) (optionnel) — YYYY-MM-DD (aujourd'hui par défaut)

**Sortie**
- liste de objet { id, nom, mesure, cible, jours_semaine, libelle_jours, debut, fin, actif, du_jour, termine, a_venir, unite, valeur, atteint, serie, semaine }

## `creer_defi`

Ajoute un défi au programme : un nom, une mesure (pas, minutes, repetitions, ou case pour juste cocher), une cible par jour, les jours de la semaine (tous par défaut). Il commence aujourd'hui et s'arrête à la fin du programme actif, sauf dates données. Demander la cible si elle n'est pas claire.

**Entrée**
- `nom` : string (trim) — Ce qu'il faut faire, ex. « Marcher », « Gainage », « Pas de sucre »
- `mesure` : `pas` · `minutes` · `repetitions` · `case` — défaut `"case"` — pas, minutes, repetitions, ou case (juste fait / pas fait)
- `cible` : entier (optionnel) — Objectif du jour (ex. 10000 pas, 10 minutes, 50 reps). Ignoré pour « case ».
- `jours_semaine` : liste de entier (optionnel) — Jours où le défi vaut (0 = dimanche … 6 = samedi). Tous les jours par défaut.
- `debut` : string (date) (optionnel) — Premier jour (aujourd'hui par défaut)
- `fin` : string (date) | null (optionnel) — Dernier jour ; par défaut la fin du programme actif ; null = sans fin

**Sortie**
- `id` : string (uuid)
- `nom` : string
- `mesure` : `pas` · `minutes` · `repetitions` · `case`
- `cible` : nombre
- `jours_semaine` : liste de nombre
- `libelle_jours` : string
- `debut` : string
- `fin` : string | null

## `modifier_defi`

Modifie un défi (nom, mesure, cible, jours, dates) ou le met en pause (actif=false) / le relance (actif=true). L'historique déjà noté ne bouge pas.

**Entrée**
- `nom` : string (trim) (optionnel) — Ce qu'il faut faire, ex. « Marcher », « Gainage », « Pas de sucre »
- `mesure` : `pas` · `minutes` · `repetitions` · `case` — défaut `"case"` (optionnel) — pas, minutes, repetitions, ou case (juste fait / pas fait)
- `cible` : entier (optionnel) (optionnel) — Objectif du jour (ex. 10000 pas, 10 minutes, 50 reps). Ignoré pour « case ».
- `jours_semaine` : liste de entier (optionnel) (optionnel) — Jours où le défi vaut (0 = dimanche … 6 = samedi). Tous les jours par défaut.
- `debut` : string (date) (optionnel) (optionnel) — Premier jour (aujourd'hui par défaut)
- `fin` : string (date) | null (optionnel) (optionnel) — Dernier jour ; par défaut la fin du programme actif ; null = sans fin
- `id` : string (uuid)
- `actif` : booléen (optionnel) — false = mettre le défi en pause (l'historique reste)

**Sortie**
- `id` : string (uuid)
- `nom` : string
- `mesure` : `pas` · `minutes` · `repetitions` · `case`
- `cible` : nombre
- `jours_semaine` : liste de nombre
- `libelle_jours` : string
- `debut` : string
- `fin` : string | null
- `actif` : booléen

## `noter_defi`

Note la progression d'un défi pour un jour (aujourd'hui par défaut, jamais dans le futur) : « j'ai fait 8 500 pas » → valeur=8500 ; « +10 min de gainage » → ajouter=10 ; « défi pas de sucre tenu » → fait=true. Appeler lister_defis d'abord pour trouver l'id.

**Entrée**
- `defi_id` : string (uuid)
- `jour` : string (date) (optionnel) — Jour concerné (aujourd'hui par défaut, jamais dans le futur)
- `valeur` : nombre (optionnel) — Valeur totale du jour (remplace) — ex. 8500 pas
- `ajouter` : nombre (optionnel) — Ajoute à la valeur du jour (négatif pour retirer) — ex. +1000 pas, +5 min
- `fait` : booléen (optionnel) — Pour un défi à cocher (ou pour marquer la cible atteinte d'un coup)

**Sortie**
- `defi_id` : string (uuid)
- `nom` : string
- `jour` : string
- `valeur` : nombre
- `cible` : nombre
- `atteint` : booléen

## `supprimer_defi` — à confirmer

Supprime un défi et tout son historique. Irréversible : pour simplement l'arrêter en gardant l'historique, préférer modifier_defi avec actif=false. Confirmer avant.

**Entrée**
- `id` : string (uuid)

**Sortie**
- `id` : string (uuid)
- `supprime` : booléen

## `chercher_aliment`

Cherche un aliment dans la base (3 000 aliments génériques de la table CIQUAL de l'ANSES + produits de marque d'Open Food Facts) par nom (« skyr », « riz basmati cuit ») ou par code-barres. Rend les valeurs pour 100 g et la portion usuelle. À appeler avant ajouter_au_journal pour obtenir l'aliment_id.

**Entrée**
- `requete` : string (trim) — Nom de l'aliment ou code-barres (8 à 14 chiffres)
- `distant` : booléen — défaut `true` — Interroger aussi Open Food Facts (produits de marque)

**Sortie**
- `aliments` : liste de objet { id, nom, marque, source, kcal, prot, gluc, lip, fibres, portion_g, portion_nom, nutriscore }
- `open_food_facts` : `consulte` · `ignore` · `indisponible`

## `journal_du_jour`

Le journal alimentaire d'un jour (aujourd'hui par défaut) : cible kcal (base + sport), mangé, reste, protéines / glucides / lipides et leurs cibles, puis les lignes par repas (petit-déjeuner, collation, déjeuner, encas, dîner).

**Entrée**
- `jour` : string (date) (optionnel)

**Sortie**
- `jour` : string
- `base` : nombre
- `brule` : nombre
- `cible` : nombre
- `consomme` : nombre
- `reste` : nombre
- `proteines` : nombre
- `proteines_cible` : nombre
- `glucides` : nombre
- `lipides` : nombre
- `macros_cible` : objet { prot, gluc, lip }
- `repas` : liste de objet { repas, libelle, kcal, lignes }

## `ajouter_au_journal`

Note quelque chose de mangé : un aliment de la base (aliment_id de chercher_aliment + quantite_g), une recette (recette_id + portions) ou une saisie libre (libelle + kcal, et si possible prot / gluc / lip). Sans repas précisé, c'est le repas du moment. « J'ai mangé 150 g de skyr » → chercher_aliment puis cet outil.

**Entrée**
- `jour` : string (date) (optionnel) — Jour concerné (aujourd'hui par défaut)
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner` (optionnel) — petit_dej, collation (matin), dejeuner, encas (après-midi), diner ; par défaut le repas du moment
- `aliment_id` : string (optionnel) — Identifiant d'un aliment trouvé par chercher_aliment (avec quantite_g)
- `quantite_g` : nombre (optionnel) — Quantité en grammes (ou ml) pour un aliment
- `recette_id` : string (uuid) (optionnel) — Identifiant d'une recette (avec portions)
- `portions` : nombre (optionnel) — Nombre de portions de la recette (1 par défaut)
- `libelle` : string (trim) (optionnel) — Saisie libre : ce qui a été mangé (avec kcal)
- `kcal` : nombre (optionnel)
- `prot` : nombre (optionnel)
- `gluc` : nombre (optionnel)
- `lip` : nombre (optionnel)

**Sortie**
- `id` : string (uuid)
- `jour` : string
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner`
- `libelle` : string
- `kcal` : nombre
- `prot` : nombre
- `gluc` : nombre
- `lip` : nombre

## `supprimer_du_journal`

Retire une ligne du journal alimentaire (id donné par journal_du_jour).

**Entrée**
- `id` : string (uuid)

**Sortie**
- `id` : string (uuid)
- `supprime` : booléen

## `estimer_repas_photo`

Estime un repas à partir de sa photo : les aliments de l'assiette, leur poids, leurs calories et leurs macros, avec un niveau de confiance. Ne note rien : après ajustement, chaque élément se note avec ajouter_au_journal (libelle + kcal + prot / gluc / lip). `precision` sert à dire ce que la photo ne montre pas (« cuit à l'huile », « riz complet »).

**Entrée**
- `image_base64` : string — La photo du repas, encodée en base64 (sans préfixe « data: »), 5 Mo au plus
- `type_image` : `image/jpeg` · `image/png` · `image/webp` — défaut `"image/jpeg"`
- `precision` : string (trim) (optionnel) — Ce que la photo ne montre pas : « riz complet », « cuit à l'huile d'olive », « assiette de 27 cm »

**Sortie**
- `plat` : string
- `elements` : liste de objet { libelle, quantite_g, kcal, prot, gluc, lip }
- `total` : objet { kcal, prot, gluc, lip }
- `confiance` : `haute` · `moyenne` · `faible`
- `remarque` : string

## `repeter_repas`

Refait un repas à l'identique : recopie dans le journal du jour (aujourd'hui par défaut) ce qui avait été noté à ce repas la dernière fois, ou le jour `depuis`. « Même petit-déjeuner qu'hier » → cet outil.

**Entrée**
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner` — Le repas à refaire
- `jour` : string (date) (optionnel) — Jour où le noter (aujourd'hui par défaut)
- `depuis` : string (date) (optionnel) — Jour à recopier (par défaut : la dernière fois que ce repas a été noté, dans les 14 jours)

**Sortie**
- `jour` : string
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner`
- `depuis` : string
- `lignes` : nombre
- `kcal` : nombre

## `lister_recettes`

Les recettes avec leurs macros par portion, les repas où elles ont leur place et leurs étiquettes (riche_proteines, avant_seance, apres_seance, seche, masse, leger, rapide, vegetarien, batch). Filtrable par repas.

**Entrée**
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner` (optionnel)

**Sortie**
- liste de objet { id, nom, repas, tags, temps_min, kcal, prot, gluc, lip, fibres }

## `suggerer_repas`

« Il me reste 300 kcal, je mange quoi ? » : pour un repas (celui du moment par défaut), calcule le budget de calories à partir de ce qu'il reste aujourd'hui et propose les recettes les mieux adaptées — au plus près du budget, en comblant les protéines manquantes, et selon le sport (glucides avant la séance, protéines après, léger en sèche, dense en prise de muscle). `budget_kcal` impose un budget précis.

**Entrée**
- `jour` : string (date) (optionnel)
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner` (optionnel)
- `budget_kcal` : entier (optionnel)

**Sortie**
- `jour` : string
- `repas` : `petit_dej` · `collation` · `dejeuner` · `encas` · `diner`
- `libelle_repas` : string
- `reste_kcal` : nombre
- `reste_proteines` : nombre
- `budget_kcal` : nombre
- `sport` : objet { objectif, seance_a_venir, seance_faite }
- `message` : string
- `suggestions` : liste de objet { id, nom, repas, tags, temps_min, kcal, prot, gluc, lip, fibres, portions, raison }

## `connecter_tiime`

Connecte l'agent au compte Tiime de la SASU. À utiliser quand une synchro Tiime échoue faute de connexion (« connexion requise », jeton expiré) ou quand Levani demande de (re)connecter Tiime. Tiime demande alors une vérification : si `attend_code` est faux, c'est une notification dans l'app Tiime sur l'iPhone — demander à Levani de la valider puis appeler valider_code_tiime sans code ; si `attend_code` est vrai, demander le code reçu (SMS, e-mail) puis appeler valider_code_tiime avec. Ne jamais demander son mot de passe.

**Entrée**
- `methode` : `push` · `sms` · `email` (optionnel) — Méthode de vérification ; par défaut celle que Tiime propose (notification dans l'app)

**Sortie**
- `statut` : `connecte` · `code_requis`
- `methode` : string | null
- `attend_code` : booléen — Vrai : demander un code ; faux : faire valider la notification dans l'app Tiime
- `message` : string

## `valider_code_tiime`

Termine la connexion Tiime lancée par connecter_tiime : avec le code reçu (SMS, e-mail), ou sans code une fois la notification validée dans l'app Tiime. Si la réponse est encore `code_requis`, le code était faux ou la notification pas encore validée : redemander à Levani.

**Entrée**
- `code` : string (regex) (optionnel) — Code de vérification reçu par Levani ; vide pour une notification validée dans l'app

**Sortie**
- `statut` : `connecte` · `code_requis`
- `methode` : string | null
- `attend_code` : booléen — Vrai : demander un code ; faux : faire valider la notification dans l'app Tiime
- `message` : string

## `synchroniser_tiime`

Rapatrie depuis Tiime (lecture seule, rien n'est modifié dans Tiime) : compte pro et ses transactions, factures émises avec leur statut, notes de frais, trajets d'indemnités kilométriques. À appeler avant de répondre sur les chiffres de la SASU si la dernière synchro date de plus d'un jour, ou quand Levani le demande. Sans `depuis`, reprend depuis la dernière synchro (ou le 1er janvier de l'année précédente la première fois).

**Entrée**
- `depuis` : string (date) (optionnel) — Date de départ des transactions (YYYY-MM-DD)

**Sortie**
- `depuis` : string
- `comptes` : nombre
- `transactions` : nombre
- `factures` : nombre
- `notes_frais` : nombre
- `trajets` : nombre
- `avertissements` : liste de string

## `pilotage_sasu`

Chiffres de la SASU sur une année à partir des données Tiime synchronisées : CA facturé (HT/TTC), encaissé, factures en attente, solde et flux du compte pro, dépenses sans justificatif, notes de frais (dont à rembourser), indemnités kilométriques. Regarder `derniere_sync` : si elle est ancienne, proposer synchroniser_tiime. Rappeler que ce n'est pas un avis comptable.

**Entrée**
- `annee` : entier (optionnel) — Année civile ; par défaut l'année en cours

**Sortie**
- `annee` : nombre
- `derniere_sync` : string | null
- `factures` : objet { emises, ca_facture_ht, ca_facture_ttc, payees, encaisse_ttc, en_attente, en_attente_ttc }
- `banque` : objet { solde, entrees, sorties, operations, sans_justificatif }
- `notes_frais` : objet { nombre, montant, a_rembourser }
- `indemnites_km` : objet { trajets, km, montant }
