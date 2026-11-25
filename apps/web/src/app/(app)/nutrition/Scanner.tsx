"use client";
import { useEffect, useRef, useState } from "react";
import { codeBarresDepuisScan } from "@kvalia/core";
import { Icon } from "@/components/Icon";

/**
 * Scan d'un code-barres à la caméra arrière : le flux vidéo est lu en continu jusqu'au premier code produit
 * (EAN-13, EAN-8, UPC, ou QR code GS1), rendu par `onCode`. Le décodeur du navigateur sert quand il existe
 * (Android) ; sinon — Safari sur iPhone — c'est ZXing en WebAssembly, servi par l'app (`public/zxing`), chargé
 * à la première ouverture. Rien ne quitte le téléphone : seule la suite de chiffres part à la recherche.
 */

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code"] as const;
/** Pause entre deux lectures de l'image (ms) : fluide sans chauffer le téléphone. */
const PAUSE = 80;

type Detecteur = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetecteurNatif = { new (options: { formats: string[] }): Detecteur; getSupportedFormats: () => Promise<string[]> };

async function creerDetecteur(): Promise<Detecteur> {
  const natif = (globalThis as { BarcodeDetector?: DetecteurNatif }).BarcodeDetector;
  if (natif) {
    const connus = await natif.getSupportedFormats().catch(() => [] as string[]);
    if (connus.includes("ean_13")) return new natif({ formats: FORMATS.filter((f) => connus.includes(f)) });
  }
  const zxing = await import("barcode-detector/ponyfill");
  zxing.prepareZXingModule({
    overrides: {
      locateFile: (fichier: string, prefixe: string) => (fichier.endsWith(".wasm") ? `/zxing/${fichier}?v=${zxing.ZXING_WASM_VERSION}` : prefixe + fichier),
    },
  });
  return new zxing.BarcodeDetector({ formats: [...FORMATS] });
}

function messageErreur(e: unknown): string {
  const nom = e instanceof Error ? e.name : "";
  if (nom === "NotAllowedError" || nom === "SecurityError")
    return "La caméra est refusée. Autorise-la pour KVALIA (Réglages › Safari › Caméra), ou tape le code-barres.";
  if (nom === "NotFoundError" || nom === "OverconstrainedError") return "Aucune caméra trouvée sur cet appareil. Tape le code-barres.";
  return "La caméra ne démarre pas. Réessaie, ou tape le code-barres.";
}

type Props = { onCode: (code: string) => void; onAnnuler: () => void };

export function Scanner({ onCode, onAnnuler }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const piste = useRef<MediaStreamTrack | null>(null);
  const rappel = useRef(onCode);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lampe, setLampe] = useState<boolean | null>(null);

  useEffect(() => {
    rappel.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let actif = true;
    let flux: MediaStream | null = null;
    let minuterie: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("indisponible");
        // La caméra et le décodeur se préparent en même temps.
        const [f, detecteur] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          }),
          creerDetecteur(),
        ]);
        flux = f;
        const v = video.current;
        if (!actif || !v) return f.getTracks().forEach((t) => t.stop());
        v.srcObject = f;
        await v.play().catch(() => {});
        if (!actif) return;
        piste.current = f.getVideoTracks()[0] ?? null;
        const capacites = (piste.current?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setLampe(capacites.torch ? false : null);
        setPret(true);

        const lire = async () => {
          if (!actif) return;
          if (v.readyState >= 2) {
            const lus = await detecteur.detect(v).catch(() => []);
            for (const l of lus) {
              const code = codeBarresDepuisScan(l.rawValue);
              if (code && actif) {
                actif = false;
                navigator.vibrate?.(30);
                return rappel.current(code);
              }
            }
          }
          minuterie = setTimeout(lire, PAUSE);
        };
        lire();
      } catch (e) {
        if (actif) setErreur(messageErreur(e));
      }
    })();

    return () => {
      actif = false;
      clearTimeout(minuterie);
      flux?.getTracks().forEach((t) => t.stop());
      piste.current = null;
    };
  }, []);

  const basculerLampe = () => {
    const suivant = !lampe;
    piste.current
      ?.applyConstraints({ advanced: [{ torch: suivant } as MediaTrackConstraintSet] })
      .then(() => setLampe(suivant))
      .catch(() => setLampe(null));
  };

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <div className="relative aspect-[3/4] max-h-[52dvh] w-full overflow-hidden rounded-[var(--radius-card)] bg-black">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" aria-label="Aperçu de la caméra" />
        {!erreur && (
          <>
            {/* Viseur : le code se lit partout dans l'image, le cadre aide juste à bien se placer. */}
            <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-[34%] -translate-y-1/2 rounded-[var(--radius-input)] border-2 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
            {lampe !== null && (
              <button
                type="button"
                onClick={basculerLampe}
                aria-pressed={lampe}
                aria-label={lampe ? "Éteindre la lampe" : "Allumer la lampe"}
                className="kv-iconbtn absolute right-[var(--inset-sm)] top-[var(--inset-sm)] bg-black/55 text-white"
              >
                <Icon name={lampe ? "flashlight_off" : "flashlight_on"} size={22} />
              </button>
            )}
          </>
        )}
        {erreur && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--stack-sm)] p-[var(--inset-lg)] text-center text-white">
            <Icon name="no_photography" size={32} />
            <p className="type-body-sm">{erreur}</p>
          </div>
        )}
      </div>
      <p className="text-center type-body-sm text-fg-secondary" aria-live="polite">
        {erreur ? "" : pret ? "Place le code-barres du produit dans le cadre." : "Ouverture de la caméra…"}
      </p>
      <button type="button" onClick={onAnnuler} className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
        <Icon name="keyboard" size={20} />
        <span className="kv-btn-label">Chercher par nom</span>
      </button>
    </div>
  );
}
