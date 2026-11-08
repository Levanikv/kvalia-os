import Link from "next/link";
import type { ReactNode } from "react";
import { module, type ModuleKey } from "@kvalia/ui";
import { MenuApps } from "./MenuApps";
import { createClient } from "@/lib/supabase/server";

type Props = {
  module: ModuleKey;
  titre?: string;
  /** Petit texte sous le titre (date, sous-titre). */
  sousTitre?: string;
  /** Action contextuelle à droite du header (bouton). Remplace l'avatar. */
  action?: ReactNode;
  /** Remplace le burger à gauche (ex. bouton retour sur un écran de détail). */
  gauche?: ReactNode;
  /** Barre sous le header (filtres, bande de jours). */
  barre?: ReactNode;
  children: ReactNode;
};

/**
 * Cadre d'une mini-app : pose `data-module` (accent, thème), header avec menu apps + titre + avatar, contenu.
 * La barre inférieure de l'application et le bouton « + » vivent dans le layout (app), en dehors du cadre.
 */
export async function ModuleFrame({ module: key, titre, sousTitre, action, gauche, barre, children }: Props) {
  const m = module(key);
  const initiale = await initialeUtilisateur();
  return (
    <div data-module={key} className="min-h-dvh bg-surface text-text">
      <header className="sticky top-0 z-30 bg-surface/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-[var(--header-h)] max-w-lg items-center gap-2 px-3">
          {gauche ?? <MenuApps />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">{titre ?? m.titre}</h1>
            {sousTitre && <p className="truncate text-xs text-text-2">{sousTitre}</p>}
          </div>
          {action ?? (
            <Link
              href="/reglages"
              aria-label="Réglages et compte"
              className="tap flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
            >
              {initiale}
            </Link>
          )}
        </div>
        {barre && <div className="mx-auto max-w-lg pb-2">{barre}</div>}
      </header>
      <main className="contenu mx-auto max-w-lg px-4 pt-2">{children}</main>
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
