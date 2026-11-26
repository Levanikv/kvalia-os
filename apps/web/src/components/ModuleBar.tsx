"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { actionPour, barrePour, estPleinEcran, moduleDepuisChemin, ongletActif } from "@kvalia/ui";
import { AjoutRapide } from "./AjoutRapide";
import { Icon } from "./Icon";

/**
 * Barre inférieure du module courant = « Tab bar skeleton » du design system : une pilule flottante qui porte ses
 * onglets (registre `onglets`, packages/ui) — l'onglet actif s'ouvre et affiche son nom, les autres restent des
 * icônes. À côté, le « + » quand il a un rôle (`actionPour`) : ajout rapide en Nutrition (scan, photo, repas),
 * capture pour l'agent ailleurs ; Sport n'en a pas.
 */
export function ModuleBar() {
  const pathname = usePathname();
  const mod = moduleDepuisChemin(pathname);
  const barre = barrePour(mod);
  if (barre.length === 0 || estPleinEcran(pathname)) return null;
  const actif = ongletActif(barre, pathname);
  const action = pathname.startsWith("/capture") ? null : actionPour(mod);

  return (
    <div
      data-module={mod}
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
                className={`kv-tab ${estActif ? "is-on onglet-actif" : ""}`}
              >
                <Icon name={o.icon} filled={estActif} size={24} />
                {estActif && <span className="type-label-lg">{o.label}</span>}
              </Link>
            );
          })}
        </nav>
        {/* `key` : le « + » se replie à chaque changement d'écran. */}
        {action === "ajout_repas" && <AjoutRapide key={pathname} />}
        {action === "capture" && (
          <Link href="/capture" aria-label="Capture rapide" className="kv-iconbtn kv-iconbtn-primary kv-iconbtn-lg kv-fab">
            <Icon name="add" size={28} />
          </Link>
        )}
      </div>
    </div>
  );
}
