"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { estPleinEcran } from "@kvalia/ui";
import { Icon } from "./Icon";

/** Bouton « + » flottant : capture rapide (texte, micro). Masqué sur la page de capture et les parcours plein écran. */
export function Fab() {
  const pathname = usePathname();
  if (pathname.startsWith("/capture") || estPleinEcran(pathname)) return null;
  return (
    <Link
      href="/capture"
      aria-label="Capture rapide"
      className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-action-primary text-fg-on-brand shadow-lg shadow-black/20 transition-transform active:scale-95"
      style={{ bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 16px)" }}
    >
      <Icon name="add" size={28} />
    </Link>
  );
}
