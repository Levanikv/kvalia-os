import Link from "next/link";
import type { ReactNode } from "react";
import { executer, FUSEAU } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { aujourdhui, session } from "@/lib/session";

type Props = { searchParams: Promise<{ annee?: string }> };

const euros = (n: number, decimales = 0) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: decimales, maximumFractionDigits: decimales });

/** « aujourd'hui à 11:54 », « hier à 09:10 », sinon « le 3 nov. à 18:02 » (heure de Paris). */
function quand(iso: string, auj: string): string {
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const heure = d.toLocaleTimeString("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });
  const hier = new Date(`${auj}T12:00:00Z`);
  hier.setUTCDate(hier.getUTCDate() - 1);
  if (jour === auj) return `aujourd'hui à ${heure}`;
  if (jour === hier.toISOString().slice(0, 10)) return `hier à ${heure}`;
  return `le ${d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "short" })} à ${heure}`;
}

/** Vrai si la dernière synchro date de plus de 24 h (heure du serveur au moment du rendu). */
function plusDunJour(iso: string, maintenant: Date = new Date()): boolean {
  return maintenant.getTime() - new Date(iso).getTime() > 24 * 3600 * 1000;
}

/**
 * Entreprise — Pilotage de la SASU. Chiffres de l'année lus dans les tables synchronisées depuis Tiime
 * (outil pilotage_sasu, ADR 0010). La synchro elle-même passe par l'agent (secrets Tiime côté agent).
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const anneeCourante = Number(auj.slice(0, 4));
  const demandee = Number(sp.annee);
  const annee = Number.isInteger(demandee) && demandee >= 2000 && demandee <= anneeCourante ? demandee : anneeCourante;

  const p = await executer("pilotage_sasu", { annee }, { db: supabase, userId: user.id });
  const { factures: f, banque: b, notes_frais: n, indemnites_km: ik } = p;

  const jamaisSynchro = !p.derniere_sync;
  const vieille = p.derniere_sync ? plusDunJour(p.derniere_sync) : false;
  const partEncaissee = f.ca_facture_ttc > 0 ? Math.min(100, Math.round((f.encaisse_ttc / f.ca_facture_ttc) * 100)) : 0;

  const annees = [anneeCourante - 1, anneeCourante];
  const barre = (
    <div role="tablist" aria-label="Année" className="mx-4 flex rounded-full bg-surface-default p-1">
      {annees.map((a) => (
        <Link
          key={a}
          href={a === anneeCourante ? "/entreprise" : `/entreprise?annee=${a}`}
          role="tab"
          aria-selected={a === annee}
          className={`tap flex flex-1 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            a === annee ? "bg-surface-canvas text-fg-primary shadow-sm" : "text-fg-secondary"
          }`}
        >
          {a}
        </Link>
      ))}
    </div>
  );

  const sousTitre = jamaisSynchro ? "Pas encore synchronisé avec Tiime" : `Tiime · synchro ${quand(p.derniere_sync!, auj)}`;

  return (
    <ModuleFrame module="entreprise" titre="Entreprise" sousTitre={sousTitre} barre={barre}>
      {(jamaisSynchro || vieille) && (
        <div className="mt-1 flex gap-3 rounded-lg bg-feedback-info-subtle p-3 text-sm text-feedback-info-text">
          <Icon name="sync" size={20} className="shrink-0" />
          <p>
            {jamaisSynchro ? "Aucune donnée Tiime pour l’instant." : "Les chiffres datent de plus d’un jour."} Demande à l’agent :{" "}
            <span className="font-semibold">« synchronise Tiime »</span>.
          </p>
        </div>
      )}

      {/* Chiffre d'affaires */}
      <section className="relative mt-3 overflow-hidden rounded-xl border border-line-default bg-surface-default p-4">
        <div className="absolute inset-y-0 left-0 w-1 bg-action-primary" aria-hidden />
        <p className="type-overline text-fg-tertiary">Chiffre d’affaires facturé</p>
        <p className="type-numeric-lg mt-1 tracking-tight">{euros(f.ca_facture_ht)}</p>
        <p className="text-xs text-fg-secondary">
          HT · {euros(f.ca_facture_ttc)} TTC · {f.emises} facture{f.emises > 1 ? "s" : ""}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
          <div className="h-full rounded-full bg-action-primary" style={{ width: `${partEncaissee}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-fg-secondary">{partEncaissee} % encaissé</p>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tuile icone="payments" titre="Encaissé" valeur={euros(f.encaisse_ttc)} sous={`${f.payees} payée${f.payees > 1 ? "s" : ""} · TTC`} />
        <Tuile
          icone="schedule"
          titre="En attente"
          valeur={euros(f.en_attente_ttc)}
          sous={f.en_attente ? `${f.en_attente} facture${f.en_attente > 1 ? "s" : ""} · TTC` : "Rien à relancer"}
          alerte={f.en_attente > 0}
        />
      </div>

      {/* Compte pro */}
      <section className="mt-3 rounded-xl border border-line-default bg-surface-default p-4">
        <div className="flex items-center gap-2">
          <Icon name="account_balance" size={22} className="text-fg-brand" />
          <h2 className="text-sm font-semibold">Compte pro</h2>
        </div>
        <p className="type-numeric-lg mt-2 tracking-tight">{b.solde === null ? "—" : euros(b.solde, 2)}</p>
        <p className="text-xs text-fg-secondary">Solde actuel</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line-subtle pt-3 text-sm">
          <div>
            <dt className="text-xs text-fg-tertiary">Entrées {annee}</dt>
            <dd className="font-semibold text-feedback-success-text">+{euros(b.entrees)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-tertiary">Sorties {annee}</dt>
            <dd className="font-semibold">{euros(b.sorties)}</dd>
          </div>
        </dl>
        {b.sans_justificatif > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-feedback-warning-subtle px-3 py-2 text-sm text-feedback-warning-text">
            <Icon name="receipt_long" size={18} className="shrink-0" />
            {b.sans_justificatif} dépense{b.sans_justificatif > 1 ? "s" : ""} sans justificatif dans Tiime
          </p>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tuile
          icone="receipt"
          titre="Notes de frais"
          valeur={euros(n.montant)}
          sous={n.a_rembourser > 0 ? `${euros(n.a_rembourser, 2)} à te rembourser` : `${n.nombre} note${n.nombre > 1 ? "s" : ""}, tout remboursé`}
          alerte={n.a_rembourser > 0}
        />
        <Tuile
          icone="directions_car"
          titre="Indemnités km"
          valeur={ik.montant === null ? `${ik.km.toLocaleString("fr-FR")} km` : euros(ik.montant)}
          sous={`${ik.trajets} trajet${ik.trajets > 1 ? "s" : ""} · ${ik.km.toLocaleString("fr-FR")} km`}
        />
      </div>

      <p className="mt-5 mb-2 text-center text-xs text-fg-tertiary">
        Chiffres lus dans Tiime, sans rien y modifier. Ce n’est pas un avis comptable : valide-les avec ton comptable.
      </p>
    </ModuleFrame>
  );
}

function Tuile({ icone, titre, valeur, sous, alerte }: { icone: string; titre: string; valeur: string; sous: string; alerte?: boolean }): ReactNode {
  return (
    <section className="rounded-xl border border-line-default bg-surface-default p-4">
      <Icon name={icone} size={22} className={alerte ? "text-feedback-warning-text" : "text-fg-brand"} />
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-fg-tertiary">{titre}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">{valeur}</p>
      <p className={`truncate text-xs ${alerte ? "text-feedback-warning-text" : "text-fg-secondary"}`}>{sous}</p>
    </section>
  );
}
