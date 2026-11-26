import Link from "next/link";
import { ESPACES_SPORT_NUTRITION } from "@kvalia/ui";
import { Icon } from "./Icon";

type Props = {
  actif: "sport" | "nutrition";
  /** Jour affiché (`?jour=`) : conservé en passant d'un espace à l'autre. */
  jour?: string;
};

/**
 * Sélecteur Sport / Nutrition de l'en-tête : les deux espaces d'une même application, à un tap l'un de l'autre.
 * Chacun garde son accent (l'icône prend la couleur de son module) et le jour affiché suit.
 */
export function BasculeEspace({ actif, jour }: Props) {
  return (
    <nav aria-label="Sport ou Nutrition" className="bascule">
      {ESPACES_SPORT_NUTRITION.map((e) => {
        const on = e.key === actif;
        return (
          <Link
            key={e.key}
            href={jour ? `${e.path}?jour=${jour}` : e.path}
            aria-current={on ? "page" : undefined}
            className={`bascule-item ${on ? "is-on" : ""}`}
          >
            <span data-module={e.key} className="flex">
              <Icon name={e.icon} size={18} filled={on} className={on ? "text-fg-brand" : ""} />
            </span>
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
