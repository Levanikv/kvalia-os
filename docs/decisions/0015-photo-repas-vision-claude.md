# 0015 — Nutrition : estimer un repas à partir d'une photo (modèle de vision Claude)

**Date** : 25 nov. 2026 · **Statut** : acceptée · Complète [0013](0013-base-aliments-ciqual-open-food-facts.md) et [0014](0014-scan-code-barres-zxing-wasm.md)

## Contexte

Le code-barres couvre les produits emballés, pas une assiette cuisinée ou un plat au restaurant. Levani veut pointer
la caméra sur son repas et obtenir une estimation des calories, sans chercher chaque aliment.

## Décision

- **Un outil, `estimer_repas_photo`** : photo (base64) → aliments de l'assiette, poids, calories, macros, niveau de
  confiance, remarque. Il **ne note rien** : l'utilisateur ajuste les grammes ou retire un élément, puis chaque
  aliment est noté par `ajouter_au_journal` (saisie libre, macros figées).
- **Modèle** : Claude (`claude-opus-5-5`, effort bas, sortie structurée par JSON Schema), appelé avec le SDK officiel
  `@anthropic-ai/sdk` depuis un paquet à part, **`packages/vision`**, serveur uniquement. Le noyau reste sans SDK et
  importable côté navigateur ; il reçoit l'analyseur par `ContexteOutil.vision` (injectable : tests sans réseau).
  Si le modèle décline une photo, l'API la rejoue sur un modèle de repli (`fallbacks: "default"`).
- **Règles dans le noyau** (`photo.ts`, testées) : la consigne donnée au modèle, puis le nettoyage de sa réponse —
  éléments sans nom ou sans poids écartés, valeurs bornées, calories recalculées depuis les macros (4 / 4 / 9) quand
  elles s'en écartent de plus de 30 %, total recalculé. C'est une exception assumée à « pas de LLM dans les règles »
  (ADR 0007, 0013) : lire une photo ne se fait pas par règles ; le LLM propose, les règles et l'utilisateur valident.
- **Parcours** : bouton « Photo » (barre d'action, champ de recherche, carte d'un repas) → appareil photo du
  téléphone (`<input capture>`, fiable dans une PWA iOS) → photo réduite à 1 280 px sur le téléphone → analyse →
  liste ajustable → « Ajouter ». Une précision libre (« cuit à l'huile », « riz complet ») relance l'analyse.

## Conséquences

- **Une clé `ANTHROPIC_API_KEY`** sur les services `web` et `agent` (Railway). Sans elle, l'outil répond par une
  erreur qui dit quoi configurer ; le reste de l'app n'est pas touché.
- Chaque analyse est un appel payant au modèle (une image et quelques centaines de tokens de réponse).
- La photo part chez Anthropic pour l'analyse ; elle n'est ni stockée par l'app ni écrite dans le journal des appels
  d'outils (champ masqué).
- Une estimation sur photo reste approximative (quantités, matières grasses cachées) : la confiance et la remarque
  sont affichées, et tout s'ajuste avant l'ajout.
- Server actions : taille de corps portée à 4 Mo (`next.config.ts`).
