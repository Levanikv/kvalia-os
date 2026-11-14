"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPour, barrePour, estPleinEcran, moduleDepuisChemin, ongletActif } from "@kvalia/ui";
import { Icon } from "./Icon";

/**
 * Barre inférieure de l'application courante = « Tab bar skeleton » du design system : une pilule flottante
 * qui porte les onglets de l'app (Sport & Nutri : Jour · Programme · Exercices · Nutrition), et le bouton
 * d'action « + » (capture) à côté. Chaque app fournit ses onglets via le registre `onglets` (packages/ui).
 */
export function ModuleBar() {
  const pathname = usePathname();
  const mod = moduleDepuisChemin(pathname);
  const app = appPour(mod);
  const barre = barrePour(mod);
  if (barre.length === 0 || estPleinEcran(pathname)) return null;
  const actif = ongletActif(barre, pathname);
  const capture = !pathname.startsWith("/capture");

  return (
    <div
      data-module={app}
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-[var(--page-gutter)]"
      // Zone sûre basse : la barre reste au-dessus de l'indicateur d'accueil iPhone (jamais à moitié dessous).
      style={{ bottom: "max(var(--page-tabbar-offset), calc(env(safe-area-inset-bottom) + var(--stack-xs)))" }}
    >
      <div className="kv-tabbar-wrap pointer-events-auto">
        <nav aria-label="Navigation de l’application" className="kv-tabbar kv-tabbar-auto">
          {barre.map((o) => {
            const estActif = actif?.href === o.href;
            return (
              <Link
                key={o.href}
                href={o.href}
                aria-label={o.label}
                aria-current={estActif ? "page" : undefined}
                className={`kv-tab ${estActif ? "is-on" : ""}`}
              >
                <Icon name={o.icon} filled={estActif} size={24} />
              </Link>
            );
          })}
        </nav>
        {capture && (
          <Link href="/capture" aria-label="Capture rapide" className="kv-iconbtn kv-iconbtn-primary kv-iconbtn-lg kv-fab">
            <Icon name="add" size={28} />
          </Link>
        )}
      </div>
    </div>
  );
}
