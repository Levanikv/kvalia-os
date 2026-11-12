"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { barrePour, estPleinEcran, moduleDepuisChemin } from "@kvalia/ui";
import { Icon } from "./Icon";

/** Bouton « + » flottant de secours : seulement quand l'app n'a pas de barre (la barre porte déjà le « + »). */
export function Fab() {
  const pathname = usePathname();
  if (pathname.startsWith("/capture") || estPleinEcran(pathname) || barrePour(moduleDepuisChemin(pathname)).length > 0) return null;
  return (
    <Link
      href="/capture"
      aria-label="Capture rapide"
      className="kv-iconbtn kv-iconbtn-primary kv-iconbtn-lg fixed right-[var(--page-gutter)] z-50"
      style={{ bottom: "calc(var(--page-tabbar-offset) + env(safe-area-inset-bottom))" }}
    >
      <Icon name="add" size={28} />
    </Link>
  );
}
