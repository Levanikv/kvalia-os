import Link from "next/link";
import type { ReactNode } from "react";
import { barrePour, module, type ModuleKey } from "@kvalia/ui";
import { MenuApps } from "./MenuApps";
import { initialeUtilisateur } from "@/lib/session";

type Props = {
  module: ModuleKey;
  titre?: string;
  /** Petit texte sous le titre (date, sous-titre) — peut porter un indicateur (pastille). */
  sousTitre?: ReactNode;
  /** Action contextuelle à droite du header (bouton). Remplace l'avatar. */
  action?: ReactNode;
  /** Remplace le burger à gauche (ex. bouton retour sur un écran de détail). */
  gauche?: ReactNode;
  /** Barre sous le header (filtres, bande de jours). */
  barre?: ReactNode;
  /** Surtitre mono au-dessus du titre (« Sport · bloc force S3/8 »). Avec lui, le titre passe en grand (display). */
  surTitre?: ReactNode;
  /**
   * Barre d'action collée en bas (le ou les CTA de l'écran) : toujours visible, posée au-dessus de la barre de l'app
   * et de l'indicateur d'accueil iPhone ; le contenu qui défile lui laisse la place.
   */
  pied?: ReactNode;
  children: ReactNode;
};

/** Bas de la barre de l'app (même calcul que `ModuleBar`), pour poser la barre d'action juste au-dessus. */
const BAS_BARRE_APP = "max(var(--page-tabbar-offset), calc(env(safe-area-inset-bottom) + var(--stack-xs)))";

/**
 * Cadre d'une mini-app : pose `data-module` (accent, thème), header avec menu apps + titre + avatar, contenu.
 * La barre inférieure de l'application et le bouton « + » vivent dans le layout (app), en dehors du cadre.
 */
export async function ModuleFrame({ module: key, titre, sousTitre, action, gauche, barre, surTitre, pied, children }: Props) {
  const m = module(key);
  const aBarreApp = barrePour(key).length > 0;
  const basPied = aBarreApp ? `calc(${BAS_BARRE_APP} + var(--tabbar-h) + var(--stack-sm))` : "calc(env(safe-area-inset-bottom) + var(--stack-lg))";
  const initiale = await initialeUtilisateur();
  return (
    <div data-module={key} className="kv-ground relative min-h-dvh overflow-clip bg-surface-page text-fg-primary">
      <header className="sticky top-0 z-30 bg-surface-page/85 pt-safe backdrop-blur-md">
        <div className={`mx-auto flex max-w-lg gap-2 px-3 ${surTitre ? "items-end py-[var(--stack-sm)]" : "h-[var(--header-h)] items-center"}`}>
          {gauche ?? <MenuApps />}
          <div className="min-w-0 flex-1">
            {surTitre && <div className="kv-overline truncate text-fg-brand">{surTitre}</div>}
            <h1 className={`truncate ${surTitre ? "type-display-md" : "type-title-md"}`}>{titre ?? m.titre}</h1>
            {sousTitre && <div className="truncate type-body-sm text-fg-secondary">{sousTitre}</div>}
          </div>
          {action ?? (
            <Link
              href="/reglages"
              aria-label="Réglages et compte"
              className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle type-label-md text-fg-brand"
            >
              {initiale}
            </Link>
          )}
        </div>
        {barre && <div className="mx-auto max-w-lg pb-2">{barre}</div>}
      </header>
      <main
        className="kv-ground-content contenu mx-auto max-w-lg px-[var(--page-gutter)] pt-[var(--stack-sm)]"
        style={pied ? { paddingBottom: `calc(${basPied} + var(--control-xl) + var(--stack-xl))` } : undefined}
      >
        {children}
      </main>
      {pied && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-surface-page from-55% to-transparent px-[var(--page-gutter)] pt-[var(--stack-xl)]"
          style={{ paddingBottom: basPied }}
        >
          <div className="pointer-events-auto mx-auto max-w-lg">{pied}</div>
        </div>
      )}
    </div>
  );
}
