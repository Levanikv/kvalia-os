"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPour, barrePour, estPleinEcran, moduleDepuisChemin, ongletActif } from "@kvalia/ui";
import { Icon } from "./Icon";

/** Barre inférieure contextuelle : les entrées de l'application courante (Sport & Nutri : Jour · Programme · Exercices · Nutrition). */
export function ModuleBar() {
  const pathname = usePathname();
  const mod = moduleDepuisChemin(pathname);
  const app = appPour(mod);
  const barre = barrePour(mod);
  if (barre.length === 0 || estPleinEcran(pathname)) return null;
  const actif = ongletActif(barre, pathname);

  return (
    <nav
      aria-label="Navigation de l’application"
      data-module={app}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-default bg-surface-canvas/90 pb-safe backdrop-blur-md"
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-stretch justify-around">
        {barre.map((o) => {
          const estActif = actif?.href === o.href;
          return (
            <li key={o.href} className="flex-1">
              <Link
                href={o.href}
                aria-current={estActif ? "page" : undefined}
                className={`tap flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${estActif ? "text-fg-brand" : "text-fg-secondary"}`}
              >
                <Icon name={o.icon} filled={estActif} />
                <span className="truncate">{o.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
