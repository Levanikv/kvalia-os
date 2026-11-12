import Link from "next/link";
import type { ReactNode } from "react";
import { module, type ModuleKey } from "@kvalia/ui";
import { MenuApps } from "./MenuApps";
import { createClient } from "@/lib/supabase/server";

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
  children: ReactNode;
};

/**
 * Cadre d'une mini-app : pose `data-module` (accent, thème), header avec menu apps + titre + avatar, contenu.
 * La barre inférieure de l'application et le bouton « + » vivent dans le layout (app), en dehors du cadre.
 */
export async function ModuleFrame({ module: key, titre, sousTitre, action, gauche, barre, surTitre, children }: Props) {
  const m = module(key);
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
      <main className="kv-ground-content contenu mx-auto max-w-lg px-[var(--page-gutter)] pt-[var(--stack-sm)]">{children}</main>
    </div>
  );
}

/** Initiale affichée dans l'avatar : prénom du profil, sinon email. */
async function initialeUtilisateur(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "?";
  const { data: profil } = await supabase.from("profils").select("prenom").eq("id", user.id).maybeSingle();
  const source = profil?.prenom || user.email || "?";
  return source.trim().charAt(0).toUpperCase();
}
