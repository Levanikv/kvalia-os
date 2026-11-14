import Link from "next/link";
import { Icon } from "@/components/Icon";

type Props = { jour: string; cible: number; consomme: number; brule: number; seancePrevue: number };

/** Énergie · aujourd'hui (Home workflow) : jauge en arc — mangé vs cible, brûlé vs prévu — et les kcal restantes. */
export function EnergieJour({ jour, cible, consomme, brule, seancePrevue }: Props) {
  const reste = cible - consomme;
  const objectifBrule = Math.max(brule, brule + seancePrevue);
  const arc = (r: number, frac: number) => {
    const f = Math.min(1, Math.max(0, frac));
    const a = Math.PI * (1 - f);
    return `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${(100 + r * Math.cos(a)).toFixed(2)} ${(100 - r * Math.sin(a)).toFixed(2)}`;
  };
  return (
    <section
      data-module="sport"
      data-theme="dark"
      className="kv-ground overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised"
    >
      <div className="kv-ground-content flex flex-col gap-[var(--stack-md)] p-[var(--inset-lg)]">
        <div className="flex items-center justify-between">
          <h2 className="kv-overline">Énergie · {jour}</h2>
          <Link href="/nutrition" className="flex items-center gap-[var(--inline-xs)] type-label-md text-fg-brand">
            Nutrition <Icon name="chevron_right" size={18} />
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-[260px]">
          <svg viewBox="0 0 200 108" className="w-full" role="img" aria-label={`${reste} kcal restantes sur ${cible}`}>
            <path d={arc(84, 1)} className="stroke-data-track" strokeWidth="14" fill="none" strokeLinecap="round" />
            {consomme > 0 && (
              <path d={arc(84, consomme / Math.max(1, cible))} className="stroke-fg-primary" strokeWidth="14" fill="none" strokeLinecap="round" />
            )}
            <path d={arc(62, 1)} className="stroke-data-track" strokeWidth="10" fill="none" strokeLinecap="round" />
            {brule > 0 && (
              <path d={arc(62, brule / Math.max(1, objectifBrule))} className="stroke-action-primary" strokeWidth="10" fill="none" strokeLinecap="round" />
            )}
          </svg>
          <p className="absolute inset-x-0 bottom-0 text-center">
            <span className="block type-display-md">{reste.toLocaleString("fr-FR")}</span>
            <span className="kv-overline">kcal restantes</span>
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-[var(--inline-md)]">
          <div>
            <dt className="flex items-center gap-[var(--inline-xs)] kv-overline">
              <span className="h-2 w-2 rounded-full bg-fg-primary" aria-hidden /> Mangées
            </dt>
            <dd className="type-title-sm">
              {consomme.toLocaleString("fr-FR")} / {cible.toLocaleString("fr-FR")}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-[var(--inline-xs)] kv-overline">
              <span className="h-2 w-2 rounded-full bg-action-primary" aria-hidden /> Brûlées
            </dt>
            <dd className="type-title-sm">
              {brule} / {objectifBrule}
            </dd>
          </div>
          <div>
            <dt className="kv-overline">Séance</dt>
            <dd className="type-title-sm">{seancePrevue > 0 ? `≈ +${seancePrevue}` : brule > 0 ? `+${brule}` : "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
