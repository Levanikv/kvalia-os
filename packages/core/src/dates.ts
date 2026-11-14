/** Dates calendaires côté utilisateur (le serveur tourne en UTC). */

/** Fuseau de l'utilisateur (v0 : un seul utilisateur, Paris). Le serveur tourne en UTC : « aujourd'hui » doit être calendaire côté utilisateur. */
export const FUSEAU = process.env.KVALIA_TZ ?? "Europe/Paris";

/** Date du jour (YYYY-MM-DD) dans le fuseau de l'utilisateur. */
export function aujourdhuiIso(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}

/** Décale un jour ISO de n jours (calendaire, sans fuseau). */
export function decalerJour(jour: string, n: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
