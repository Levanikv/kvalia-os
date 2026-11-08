import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Props = { titre: string; icone: string; href?: string; module?: string; children: ReactNode; vide?: string };

/** Carte widget de la Home : titre + icône à l'accent du module, lien vers la mini-app. */
export function Carte({ titre, icone, href, module: mod, children, vide }: Props) {
  const entete = (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name={icone} className="text-fg-brand" size={22} />
        <h2 className="text-sm font-semibold">{titre}</h2>
      </div>
      {href && <Icon name="chevron_right" className="text-fg-tertiary" size={20} />}
    </div>
  );
  const corps = (
    <div data-module={mod} className="rounded-lg border border-line-default bg-surface-default p-4">
      {entete}
      {children ?? <p className="text-sm text-fg-tertiary">{vide}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block active:opacity-80">
      {corps}
    </Link>
  ) : (
    corps
  );
}
