import Link from "next/link";
import { Icon } from "@/components/Icon";

type Props = { href: string; icone: string; titre: string; detail: string; sous?: string; module?: string };

/** Point d'entrée vers un sous-module : icône, titre, un chiffre ou un état, une ligne de contexte. */
export function EntreeCarte({ href, icone, titre, detail, sous, module: mod }: Props) {
  return (
    <Link href={href} data-module={mod} className="tap block rounded-lg border border-line-default bg-surface-default p-4 active:opacity-80">
      <div className="flex items-center justify-between">
        <Icon name={icone} size={22} className="text-fg-brand" />
        <Icon name="chevron_right" size={18} className="text-fg-tertiary" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-fg-tertiary">{titre}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">{detail}</p>
      {sous && <p className="truncate text-xs text-fg-secondary">{sous}</p>}
    </Link>
  );
}
