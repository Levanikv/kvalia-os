"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { module, moduleDepuisChemin, ongletPour, tabBar } from "@kvalia/ui";
import { Icon } from "./Icon";

/** Tab bar mobile (5 entrées) ; sidebar sur desktop. Chaque entrée porte l'accent de son module. */
export function TabBar() {
  const pathname = usePathname();
  const actif = ongletPour(moduleDepuisChemin(pathname));

  return (
    <nav
      aria-label="Modules"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-safe backdrop-blur-md lg:inset-y-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:pt-6"
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-stretch justify-around lg:h-auto lg:flex-col lg:justify-start lg:gap-1 lg:px-3">
        {tabBar.map((key) => {
          const m = module(key);
          const estActif = key === actif;
          return (
            <li key={key} data-module={key} className="flex-1 lg:flex-none">
              <Link
                href={m.path}
                aria-current={estActif ? "page" : undefined}
                className={`tap flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:rounded-md lg:px-3 lg:py-2 lg:text-sm ${
                  estActif ? "text-accent" : "text-text-2"
                }`}
              >
                <Icon name={m.icon} filled={estActif} />
                <span className="truncate">{m.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
