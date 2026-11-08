import Link from "next/link";
import { LIBELLES } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { libelleFocus, libelleType, positionProgramme, trierParJour } from "../lib";

/** Couleur d'une semaine dans la frise des phases (accent du module, intensité selon le focus). */
const TEINTE: Record<string, string> = {
  hypertrophie: "bg-accent",
  force: "bg-accent/70",
  mixte: "bg-accent/45",
  deload: "bg-surface-3",
};
const JOURS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];

/**
 * Programme : l'écran « immersif » du plan en cours, façon apps de coaching.
 * Hero (anneau d'avancement, semaine n / N, chiffres clés) → frise des phases (blocs, décharges, « tu es ici »)
 * → séances de la semaine en carrousel → semaine type → toutes les semaines → nouveau programme.
 */
export default async function Page() {
  const { supabase } = await session();
  const auj = aujourdhui();
  const { data: prog } = await supabase.from("programmes").select("*").eq("actif", true).maybeSingle();
  const { data: seancesBrutes } = prog
    ? await supabase
        .from("seances")
        .select("id, jour, type, titre, etat, bloc, semaine, focus, duree_min, kcal, created_at")
        .eq("programme_id", prog.id)
        .order("jour")
    : { data: [] };
  const seances = trierParJour(seancesBrutes ?? []);

  if (!prog) {
    return (
      <ModuleFrame module="sport" titre="Programme">
        <section className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface-2 p-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="relative">
            <Icon name="auto_awesome" size={32} className="text-accent" />
            <p className="mt-3 text-3xl font-semibold tracking-tight">Ton programme sur mesure</p>
            <p className="mt-2 text-sm text-text-2">
              Choisis ton objectif, ton rythme et ton matériel : l’agent construit des semaines en blocs de 4, avec progression et décharge.
            </p>
            <Link href="/sport/programme/nouveau" className="tap mt-6 flex items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white">
              <Icon name="bolt" size={20} filled /> Créer mon programme
            </Link>
          </div>
        </section>
      </ModuleFrame>
    );
  }

  const r = prog.rythme as {
    salle?: number;
    boxe?: number;
    objectif?: string;
    niveau?: string;
    duree_min?: number;
    bloc_semaines?: number;
    jours_salle?: number[];
    jours_boxe?: number[];
  };
  const pos = positionProgramme(prog, auj);
  const total = seances.length;
  const faites = seances.filter((s) => s.etat === "faite");
  const passees = seances.filter((s) => s.jour < auj);
  const regularite = passees.length ? Math.round((passees.filter((s) => s.etat === "faite").length / passees.length) * 100) : null;
  const kcal = faites.reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const pct = total ? faites.length / total : 0;

  const parSemaine = new Map<number, typeof seances>();
  for (const s of seances) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s]);
  const semaines = [...parSemaine.keys()].sort((a, b) => a - b);
  const nbSemaines = pos?.total ?? semaines.length;
  const semaineCourante = pos?.avant ? 1 : pos?.apres ? nbSemaines : (pos?.semaine ?? 1);
  const cetteSemaine = parSemaine.get(semaineCourante) ?? [];
  const focusDe = (n: number) => {
    const ss = parSemaine.get(n) ?? [];
    return ss.find((s) => s.type !== "boxe")?.focus ?? ss[0]?.focus ?? "mixte";
  };
  const blocs = Array.from({ length: Math.ceil(nbSemaines / 4) }, (_, i) => ({ bloc: i + 1, focus: focusDe(i * 4 + 1) }));
  const restantes = Math.max(0, nbSemaines - semaineCourante + (pos?.avant ? 1 : 0));
  const rayon = 15.5;
  const circ = 2 * Math.PI * rayon;

  return (
    <ModuleFrame module="sport" titre="Programme" sousTitre={prog.nom}>
      <RealtimeRefresh tables={["seances", "programmes"]} />

      {/* Hero */}
      <section className="relative mt-2 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/35 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            {pos?.avant ? "Commence bientôt" : pos?.apres ? "Programme terminé" : "Programme en cours"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{r.objectif ? (LIBELLES.objectif[r.objectif] ?? prog.nom) : prog.nom}</h2>
          <p className="text-sm text-text-2">
            {new Date(prog.debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} →{" "}
            {prog.fin ? new Date(prog.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "…"}
          </p>

          <div className="mt-5 flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r={rayon} fill="none" stroke="var(--surface-3)" strokeWidth="2.6" />
                <circle
                  cx="18"
                  cy="18"
                  r={rayon}
                  fill="none"
                  stroke="var(--module-accent)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray={`${pct * circ} ${circ}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-wide text-text-3">Semaine</span>
                <span className="text-3xl font-semibold leading-none tracking-tight">
                  {semaineCourante}
                  <span className="text-base font-normal text-text-3">/{nbSemaines}</span>
                </span>
                <span className="mt-0.5 text-[11px] text-text-2">{Math.round(pct * 100)} % fait</span>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-1 gap-3">
              <Chiffre label="Séances" valeur={`${faites.length}`} unite={`/ ${total}`} />
              <Chiffre label="Brûlées" valeur={kcal.toLocaleString("fr-FR")} unite="kcal" />
              <Chiffre
                label={regularite === null ? "Restantes" : "Régularité"}
                valeur={regularite === null ? `${restantes}` : `${regularite}`}
                unite={regularite === null ? "sem." : "%"}
              />
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5 text-xs">
            {r.niveau && <span className="rounded-full bg-surface-3 px-2.5 py-1">{LIBELLES.niveau[r.niveau] ?? r.niveau}</span>}
            <span className="rounded-full bg-surface-3 px-2.5 py-1">
              {r.salle ?? 0} muscu{r.boxe ? ` + ${r.boxe} boxe` : ""} / sem.
            </span>
            {r.duree_min && <span className="rounded-full bg-surface-3 px-2.5 py-1">{r.duree_min} min</span>}
          </div>
        </div>
      </section>

      {/* Frise des phases */}
      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Ton parcours</h2>
          <p className="text-xs text-text-2">
            {restantes > 0 ? `${restantes} semaine${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""}` : "Dernière ligne droite"}
          </p>
        </div>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: nbSemaines }, (_, i) => {
            const n = i + 1;
            const f = focusDe(n);
            const ici = n === semaineCourante && !pos?.avant && !pos?.apres;
            return (
              <div key={n} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={`w-full rounded-sm ${TEINTE[f] ?? "bg-accent/45"} ${f === "deload" ? "h-5" : "h-8"} ${n < semaineCourante ? "" : n === semaineCourante ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : "opacity-60"}`}
                  title={`Semaine ${n} · ${libelleFocus(f)}`}
                />
                <span className={`text-[9px] tabular-nums ${ici ? "font-semibold text-text" : "text-text-3"}`}>{n}</span>
              </div>
            );
          })}
        </div>
        <ul className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${blocs.length}, minmax(0, 1fr))` }}>
          {blocs.map((b) => (
            <li
              key={b.bloc}
              className={`rounded-md border px-2.5 py-2 ${pos && !pos.avant && pos.bloc === b.bloc ? "border-accent/60 bg-accent-soft" : "border-border bg-surface-2"}`}
            >
              <p className="text-[10px] uppercase tracking-wide text-text-3">Bloc {b.bloc}</p>
              <p className="truncate text-sm font-semibold">{libelleFocus(b.focus)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-3">3 semaines de progression, puis 1 de décharge (barre basse). Les exercices tournent d’un bloc à l’autre.</p>
      </section>

      {/* Cette semaine — carrousel */}
      {cetteSemaine.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Semaine {semaineCourante}</h2>
            <p className="text-xs text-text-2">{libelleFocus(focusDe(semaineCourante))}</p>
          </div>
          <ul className="bande-jours -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {cetteSemaine.map((s) => {
              const faite = s.etat === "faite";
              const aujourd = s.jour === auj;
              return (
                <li key={s.id} className="w-40 shrink-0">
                  <Link
                    href={`/sport/seance/${s.id}`}
                    className={`relative flex h-full flex-col overflow-hidden rounded-xl border p-3 active:opacity-90 ${aujourd ? "border-accent bg-accent-soft" : "border-border bg-surface-2"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium capitalize ${aujourd ? "text-accent" : "text-text-2"}`}>
                        {aujourd ? "Aujourd’hui" : new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                      </span>
                      <Icon
                        name={faite ? "check_circle" : s.type === "boxe" ? "sports_mma" : "fitness_center"}
                        size={18}
                        filled={faite}
                        className={faite ? "text-success" : s.type === "boxe" ? "text-[#f0872b]" : "text-accent"}
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">{s.titre ?? libelleType(s.type)}</p>
                    <p className="mt-auto pt-2 text-xs text-text-3">
                      {s.duree_min} min{faite ? ` · ${Number(s.kcal ?? 0)} kcal` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Semaine type */}
      {(r.jours_salle || r.jours_boxe) && (
        <section className="mt-6 rounded-lg border border-border bg-surface-2 p-4">
          <h2 className="text-sm font-semibold">Semaine type</h2>
          <ol className="mt-3 grid grid-cols-7 gap-1 text-center">
            {JOURS.map((j) => {
              const salle = (r.jours_salle ?? []).includes(j.v);
              const boxe = (r.jours_boxe ?? []).includes(j.v);
              return (
                <li key={j.v} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-text-3">{j.l}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${salle || boxe ? "bg-accent-soft" : "bg-surface-3"}`}>
                    {salle && <Icon name="fitness_center" size={16} className="text-accent" />}
                    {boxe && <Icon name="sports_mma" size={16} className="text-[#f0872b]" />}
                    {!salle && !boxe && <Icon name="bedtime" size={14} className="text-text-3" />}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Toutes les semaines */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Toutes les semaines</h2>
        <div className="mt-3 space-y-2">
          {semaines.map((n) => {
            const ss = parSemaine.get(n) ?? [];
            const bloc = ss[0]?.bloc ?? Math.ceil(n / 4);
            const ouverte = n === semaineCourante;
            const nbFaites = ss.filter((s) => s.etat === "faite").length;
            return (
              <details key={n} open={ouverte} className="group rounded-lg border border-border bg-surface-2">
                <summary className="tap flex cursor-pointer list-none items-center gap-3 px-4">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${ouverte ? "bg-accent text-white" : nbFaites === ss.length ? "bg-success/20 text-success" : "bg-surface-3"}`}
                  >
                    {nbFaites === ss.length && !ouverte ? <Icon name="check" size={16} /> : n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Semaine {n} <span className="text-text-3">· Bloc {bloc}</span>
                    </p>
                    <p className="truncate text-xs text-text-2">
                      {libelleFocus(focusDe(n)) ?? ""} · {new Date(ss[0].jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="text-xs text-text-2">
                    {nbFaites}/{ss.length}
                  </span>
                  <Icon name="expand_more" size={20} className="text-text-3 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="border-t border-border">
                  {ss.map((s) => (
                    <li key={s.id}>
                      <Link href={`/sport/seance/${s.id}`} className="tap flex items-center gap-3 px-4 active:opacity-80">
                        <Icon
                          name={s.etat === "faite" ? "check_circle" : s.type === "boxe" ? "sports_mma" : "fitness_center"}
                          size={20}
                          filled={s.etat === "faite"}
                          className={s.etat === "faite" ? "text-success" : s.jour === auj ? "text-accent" : "text-text-3"}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${s.jour === auj ? "font-semibold" : ""}`}>{s.titre ?? libelleType(s.type)}</p>
                          <p className="text-xs text-text-3">
                            {new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} · {s.duree_min} min
                            {s.etat === "faite" ? ` · ${s.kcal} kcal` : ""}
                          </p>
                        </div>
                        <Icon name="chevron_right" size={18} className="text-text-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href="/reglages/sport" className="tap flex items-center justify-center gap-2 rounded-full bg-surface-2 text-sm font-medium">
          <Icon name="tune" size={18} /> Paramètres
        </Link>
        <Link href="/sport/programme/nouveau" className="tap flex items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white">
          <Icon name="autorenew" size={18} /> Nouveau programme
        </Link>
      </div>
    </ModuleFrame>
  );
}

function Chiffre({ label, valeur, unite }: { label: string; valeur: string; unite: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-text-3">{label}</dt>
      <dd className="text-xl font-semibold leading-tight tracking-tight">
        {valeur} <span className="text-xs font-normal text-text-2">{unite}</span>
      </dd>
    </div>
  );
}
