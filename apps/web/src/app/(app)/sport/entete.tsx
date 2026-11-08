import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@kvalia/core";
import { BandeJours } from "@/components/BandeJours";
import { Icon } from "@/components/Icon";
import { decaler, jourRelatif, marquesAutour, positionProgramme } from "./lib";

type Db = SupabaseClient<Database>;

/** Numéro de semaine ISO (repli quand aucun programme n'est actif). */
function semaineIso(jour: string): number {
  const d = new Date(jour + "T12:00:00Z");
  const jeudi = decaler(jour, 3 - ((d.getUTCDay() + 6) % 7));
  const debutAnnee = new Date(jeudi.slice(0, 4) + "-01-01T12:00:00Z");
  return Math.floor((new Date(jeudi + "T12:00:00Z").getTime() - debutAnnee.getTime()) / (7 * 86400000)) + 1;
}

/**
 * En-tête partagé de l'application Sport & Nutrition : le même sur `/sport` et `/nutrition`.
 * Pastille du jour (Aujourd'hui / Demain / Il y a n jours), date, semaine du programme, bouton « Aujourd'hui »
 * quand on s'est déplacé, et la bande de jours (un point par séance).
 */
export async function enteteJour(db: Db, jour: string, auj: string, base: "/sport" | "/nutrition") {
  const [marques, { data: programme }] = await Promise.all([
    marquesAutour(db, jour),
    db.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle(),
  ]);
  const pos = positionProgramme(programme, jour);
  const dansProgramme = pos && !pos.avant && !pos.apres;
  const semaine = dansProgramme ? `Semaine ${pos.semaine}${pos.total ? ` / ${pos.total}` : ""}` : `Sem. ${semaineIso(jour)}`;
  const date = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const estAuj = jour === auj;
  const nb = marques[jour]?.length ?? 0;

  const sousTitre = (
    <span className="flex items-center gap-1.5">
      <span
        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${estAuj ? "bg-accent text-white" : "bg-surface-3 text-text-2"}`}
      >
        {jourRelatif(jour, auj)}
      </span>
      <span className="truncate">
        {date} · {semaine}
        {nb > 1 ? ` · ${nb} séances` : ""}
      </span>
    </span>
  );
  const action = !estAuj ? (
    <Link href={base} className="tap flex items-center gap-1 rounded-full bg-surface-2 px-3 text-sm font-medium" aria-label="Revenir à aujourd’hui">
      <Icon name="today" size={18} /> Auj.
    </Link>
  ) : undefined;
  const barre = <BandeJours jour={jour} auj={auj} base={base} marques={marques} />;
  return { sousTitre, action, barre, programme, pos };
}
