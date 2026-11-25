// Copie le décodeur de codes-barres (ZXing en WebAssembly) dans public/zxing : l'app le sert elle-même, sans CDN.
// Lancé avant `next dev` et `next build` (voir package.json) ; le fichier copié n'est pas commité.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = dirname(fileURLToPath(import.meta.url));
// zxing-wasm est une dépendance de barcode-detector : on le résout depuis là.
const depuisDetecteur = createRequire(createRequire(import.meta.url).resolve("barcode-detector"));
const source = depuisDetecteur.resolve("zxing-wasm/reader/zxing_reader.wasm");
const dossier = join(ici, "..", "public", "zxing");
mkdirSync(dossier, { recursive: true });
copyFileSync(source, join(dossier, "zxing_reader.wasm"));
console.log("Décodeur de codes-barres copié dans public/zxing/");
