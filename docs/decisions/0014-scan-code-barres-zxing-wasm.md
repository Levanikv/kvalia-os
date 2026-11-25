# 0014 — Nutrition : scan du code-barres à la caméra, décodé sur le téléphone (ZXing en WebAssembly)

**Date** : 25 nov. 2026 · **Statut** : acceptée · Complète [0013](0013-base-aliments-ciqual-open-food-facts.md)

## Contexte

Ajouter un produit de marque demandait de taper son nom ou les 13 chiffres du code-barres. L'ADR 0013 avait écarté le
scan parce que l'API `BarcodeDetector` n'existe pas dans Safari iOS — or l'app vit sur l'iPhone. Levani veut ajouter
un repas en scannant l'emballage, vite.

## Décision

- **Source : Open Food Facts**, déjà branchée (ADR 0013) : la plus grosse base de produits vendus en France, gratuite,
  sans clé, interrogée par code-barres (`/api/v2/product/<code>`) puis mise en cache dans `aliments`. Un produit déjà
  scanné revient depuis la base, sans réseau externe. Pas de nouvel outil : le scan appelle `chercher_aliment`.
- **Décodage sur le téléphone** : la caméra arrière (`getUserMedia`) est lue en continu par `BarcodeDetector` quand le
  navigateur l'a (Android), sinon par le paquet `barcode-detector` (ZXing-C++ en WebAssembly, MIT) — c'est le cas sur
  iPhone. Chargé à la première ouverture du scanner seulement ; aucune image ne quitte le téléphone.
- **Le `.wasm` est servi par l'app** (`/zxing/zxing_reader.wasm`, copié depuis `node_modules` par
  `apps/web/scripts/copier-wasm.mjs` avant `next dev` / `next build`, non commité) : pas de CDN tiers.
- **Formats** : EAN-13, EAN-8, UPC-A, UPC-E, et les QR codes GS1 (« …/01/<GTIN>… ») qui remplacent peu à peu le
  code-barres sur les emballages. La règle `codeBarresDepuisScan` (core, testée) dit ce qui est un code produit.
- **Parcours** : bouton « Scanner » dans la barre d'action du journal (et dans le champ de recherche) → caméra →
  quantité pré-remplie avec la portion → « Ajouter ». Produit inconnu : message, puis recherche par nom ou saisie rapide.

## Conséquences

- Une dépendance de plus dans `apps/web` (`barcode-detector`, ~950 Ko de wasm mis en cache par le navigateur).
- iOS redemande parfois l'autorisation de la caméra dans une PWA installée : c'est le système, pas l'app.
- Les fiches Open Food Facts qui n'ont que l'énergie en kJ sont converties (÷ 4,184) au lieu d'être écartées.
- Reconnaissance d'un plat par photo : toujours à faire.
