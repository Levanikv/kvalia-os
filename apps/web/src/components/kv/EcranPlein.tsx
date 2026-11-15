import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../Icon";

type Props = {
  /** Lien de retour (chevron) ou de fermeture (croix) en haut à gauche. */
  retour: string;
  ferme?: boolean;
  surTitre?: string;
  titre: string;
  sousTitre?: ReactNode;
  /** Action à droite de l'en-tête (facultative). */
  action?: ReactNode;
  /** Barre d'action collée en bas (boutons). */
  pied?: ReactNode;
  children: ReactNode;
};

/**
 * Écran plein écran de l'app Sport (édition, création) : pas de barre d'app ni de « + ».
 * Zones sûres iPhone : en-tête sous la barre d'état, barre d'action au-dessus de l'indicateur d'accueil,
 * contenu qui laisse la place à la barre.
 */
export function EcranPlein({ retour, ferme, surTitre, titre, sousTitre, action, pied, children }: Props) {
  return (
    <div data-module="sport" className="kv-ground min-h-dvh bg-surface-page text-fg-primary">
      <header className="sticky top-0 z-30 bg-surface-page/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-[var(--inline-md)] px-[var(--page-gutter)] pt-[var(--stack-sm)]">
          <Link href={retour} className="kv-iconbtn kv-iconbtn-glass" aria-label={ferme ? "Fermer" : "Retour"}>
            <Icon name={ferme ? "close" : "chevron_left"} size={24} />
          </Link>
          <div className="flex-1" />
          {action}
        </div>
        <div className="mx-auto max-w-lg px-[var(--page-gutter)] pb-[var(--stack-sm)] pt-[var(--stack-md)]">
          {surTitre && <p className="kv-overline truncate text-fg-brand">{surTitre}</p>}
          <h1 className="type-display-md">{titre}</h1>
          {sousTitre && <div className="mt-[var(--stack-2xs)] type-body-sm text-fg-secondary">{sousTitre}</div>}
        </div>
      </header>
      <main
        className="kv-ground-content cascade mx-auto flex max-w-lg flex-col gap-[var(--stack-lg)] px-[var(--page-gutter)] pt-[var(--stack-sm)]"
        style={{
          paddingBottom: pied
            ? "calc(var(--control-xl) + var(--stack-xl) * 2 + env(safe-area-inset-bottom))"
            : "calc(var(--stack-xl) + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      {pied && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-surface-page/85 px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))] pt-[var(--stack-sm)] backdrop-blur-md">
          <div className="mx-auto max-w-lg">{pied}</div>
        </div>
      )}
    </div>
  );
}
