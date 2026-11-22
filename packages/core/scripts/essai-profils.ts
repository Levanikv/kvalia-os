/**
 * Essai hors-ligne : la semaine 1 du programme selon le matériel préféré et la morphologie (sans réseau).
 *   pnpm --filter @kvalia/core exec tsx scripts/essai-profils.ts
 */
import { PARAMETRES_SPORT_DEFAUT, type ParametresSport, genererProgramme } from "../src/sport";
import { USER, exercicesRef, fausseDb } from "../test/fausse-db";

const refs = exercicesRef();
const parId = new Map(refs.map((x) => [x.id, x]));
const profils: Array<[string, NonNullable<ParametresSport["profil"]>]> = [
  ["mix", { preference_materiel: "mix" }],
  ["poids libres", { preference_materiel: "poids_libres" }],
  ["machines", { preference_materiel: "machines" }],
  ["poulies", { preference_materiel: "poulies" }],
  ["rond + genou", { preference_materiel: "mix", morpho: "rond", douleurs: ["genou"] }],
];
for (const [nom, profil] of profils) {
  const db = fausseDb({ exercices_ref: refs, programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [{ id: USER, reglages: {} }] });
  await genererProgramme(
    db,
    USER,
    { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 4, boxe: 0 }, jours_boxe: [], poids_kg: 82, objectif: "perte_de_gras", profil },
    "2026-11-09",
  );
  console.log(`\n===== ${nom} =====`);
  let dans = 0;
  let total = 0;
  for (const s of db.tables.seances.filter((s: any) => s.semaine === 1)) {
    const exos = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).sort((a: any, b: any) => a.ordre - b.ordre);
    console.log(`${s.titre} · ${s.duree_min} min`);
    for (const e of exos) {
      const r = parId.get(e.exercice_id);
      total++;
      if (r?.equipement && ["cable", "leverage machine", "smith machine", "sled machine", "barbell", "dumbbell", "ez barbell"].includes(r.equipement)) dans++;
      console.log(`   ${r?.nom} [${r?.equipement}] ${e.series}×${e.reps}`);
    }
  }
  console.log(`(${dans}/${total} avec charge externe)`);
}
