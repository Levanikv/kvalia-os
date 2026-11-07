import type { ReactNode } from "react";
import { module, type ModuleKey } from "@kvalia/ui";
import { MenuHeader } from "./MenuHeader";
import { createClient } from "@/lib/supabase/server";

type Props = {
  module: ModuleKey;
  titre?: string;
  /** Petit texte sous le titre (date, sous-titre). */
  sousTitre?: string;
  /** Action contextuelle à droite du header (bouton). */
  action?: ReactNode;
  /** Barre sous le header (segmented control, filtres). */
  barre?: ReactNode;
  children: ReactNode;
};

/**
 * Cadre d'une mini-app : pose `data-module` (accent, thème), header avec titre + menu, contenu.
 * La tab bar et le bouton « + » vivent dans le layout (app), en dehors du cadre.
 */
export async function ModuleFrame({ module: key, titre, sousTitre, action, barre, children }: Props) {
  const m = module(key);
  const initiale = await initialeUtilisateur();
  return (
    <div data-module={key} className="min-h-dvh bg-surface text-text lg:pl-56">
      <header className="sticky top-0 z-30 bg-surface/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-[var(--header-h)] max-w-lg items-center justify-between px-4 lg:max-w-3xl">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{titre ?? m.titre}</h1>
            {sousTitre && <p className="truncate text-xs text-text-2">{sousTitre}</p>}
          </div>
          <div className="flex items-center gap-2">
            {action}
            <MenuHeader initiale={initiale} />
          </div>
        </div>
        {barre && <div className="mx-auto max-w-lg px-4 pb-2 lg:max-w-3xl">{barre}</div>}
      </header>
      <main className="contenu mx-auto max-w-lg px-4 pt-2 lg:max-w-3xl">{children}</main>
    </div>
  );
}

/** Initiale affichée dans l'avatar : prénom du profil, sinon email. */
async function initialeUtilisateur(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "?";
  const { data: profil } = await supabase.from("profils").select("prenom").eq("id", user.id).maybeSingle();
  const source = profil?.prenom || user.email || "?";
  return source.trim().charAt(0).toUpperCase();
}
