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
 * En-tête partagé des deux accueils (`/sport` et `/nutrition`) : le même, pour que passer de l'un à l'autre ne
 * déplace rien. Surtitre = où on en est (Aujourd'hui / Demain / Il y a n jours · semaine du programme), titre = la
 * date en grand, bouton « Aujourd'hui » quand on s'est déplacé, et la bande de jours (un point par séance).
 */
export async function enteteJour(db: Db, jour: string, auj: string, base: "/sport" | "/nutrition") {
  const [marques, { data: programme }] = await Promise.all([
    marquesAutour(db, jour),
    db.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle(),
  ]);
  const pos = positionProgramme(programme, jour);
  const dansProgramme = pos && !pos.avant && !pos.apres;
  const semaine = dansProgramme ? `Semaine ${pos.semaine}${pos.total ? ` / ${pos.total}` : ""}` : `Semaine ${semaineIso(jour)}`;
  const date = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  const estAuj = jour === auj;

  const surTitre = `${jourRelatif(jour, auj)} · ${semaine}`;
  const titre = date.charAt(0).toUpperCase() + date.slice(1);
  const action = !estAuj ? (
    <Link href={base} className="kv-btn kv-btn-secondary kv-btn-md shrink-0" aria-label="Revenir à aujourd’hui">
      <Icon name="today" size={18} />
      <span className="kv-btn-label">Auj.</span>
    </Link>
  ) : undefined;
  const barre = <BandeJours jour={jour} auj={auj} base={base} marques={marques} />;
  return { surTitre, titre, action, barre, programme, pos };
}
